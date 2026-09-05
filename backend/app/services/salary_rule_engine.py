"""
Salary Rule Calculation Engine & Restricted Expression Evaluator.

Provides:
- AST-based restricted mathematical expression parser and evaluator (No eval/exec)
- Single documented financial rounding policy: Decimal arithmetic with ROUND_HALF_UP to 2 decimal places
- CalculationContext data model
- SalaryRuleResult data model
- Formula validation, dependency checking, and circular dependency detection
- SalaryRuleEngine for executing a sequence of salary rules against a CalculationContext
"""

import ast
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from typing import Any

from app.models.salary_rule import ComputationType, SalaryRule, SalaryRuleCategory
from app.models.salary_structure import SalaryStructure

# Documented single rounding policy for all financial calculations in PeoplePay360
CURRENCY_PRECISION = Decimal("0.01")
ROUNDING_STRATEGY = ROUND_HALF_UP


def round_currency(val: Decimal) -> Decimal:
    """Round a Decimal amount to 2 decimal places using ROUND_HALF_UP."""
    return val.quantize(CURRENCY_PRECISION, rounding=ROUNDING_STRATEGY)


# ---------------------------------------------------------------------------
# Calculation Context & Results
# ---------------------------------------------------------------------------
@dataclass
class CalculationContext:
    """
    Explicit context supplied to the SalaryRuleEngine for computation.

    Contains contract remuneration data and relevant operational metrics
    (attendance, time off) necessary to resolve rules.
    """

    employee_id: int | None = None
    contract_id: int | None = None
    contract_wage: Decimal = Decimal("0.00")
    worked_days: int = 0
    worked_minutes: int = 0
    overtime_minutes: int = 0
    approved_time_off_days: Decimal = Decimal("0.00")
    approved_time_off_hours: Decimal = Decimal("0.00")
    rule_results: dict[str, Decimal] = field(default_factory=dict)

    def get_symbol_value(self, name: str) -> Decimal | None:
        """
        Lookup variable value by name (case-insensitive).
        Checks calculated rule results first, then context metrics.
        """
        upper_name = name.strip().upper()
        if upper_name in self.rule_results:
            return self.rule_results[upper_name]

        # Context aliases
        context_map: dict[str, Decimal] = {
            "CONTRACT_WAGE": self.contract_wage,
            "WAGE": self.contract_wage,
            "WORKED_DAYS": Decimal(str(self.worked_days)),
            "WORKED_MINUTES": Decimal(str(self.worked_minutes)),
            "OVERTIME_MINUTES": Decimal(str(self.overtime_minutes)),
            "TIME_OFF_DAYS": self.approved_time_off_days,
            "TIME_OFF_HOURS": self.approved_time_off_hours,
        }
        return context_map.get(upper_name)


@dataclass
class SalaryRuleResult:
    """Internal calculation output for a single salary rule line item."""

    rule_id: int
    code: str
    name: str
    category: SalaryRuleCategory
    sequence: int
    amount: Decimal
    computation_type: ComputationType
    formula_detail: str | None = None


# ---------------------------------------------------------------------------
# Restricted AST Expression Evaluator
# ---------------------------------------------------------------------------
ALLOWED_AST_NODES = (
    ast.Expression,
    ast.BinOp,
    ast.UnaryOp,
    ast.Constant,
    ast.Name,
    ast.Load,
    # Math operators
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.UAdd,
    ast.USub,
)

DISALLOWED_NAMES = {
    "__IMPORT__",
    "EXEC",
    "EVAL",
    "OPEN",
    "GLOBALS",
    "LOCALS",
    "BUILTINS",
    "PRINT",
    "IMPORT",
}


def extract_formula_identifiers(formula: str) -> list[str]:
    """
    Parse expression and return all unique referenced variable/rule identifiers in uppercase.
    Raises ValueError if formula contains syntax errors or disallowed AST constructs.
    """
    if not formula or not formula.strip():
        return []

    try:
        tree = ast.parse(formula.strip(), mode="eval")
    except SyntaxError as e:
        raise ValueError(f"Invalid formula syntax: {e}") from e

    identifiers: list[str] = []
    for node in ast.walk(tree):
        if not isinstance(node, ALLOWED_AST_NODES):
            raise ValueError(
                f"Disallowed expression node '{type(node).__name__}'. Only basic arithmetic expressions are permitted."
            )
        if isinstance(node, ast.Name):
            norm_name = node.id.strip().upper()
            if norm_name in DISALLOWED_NAMES or norm_name.startswith("__"):
                raise ValueError(f"Access to identifier '{node.id}' is forbidden.")
            if norm_name not in identifiers:
                identifiers.append(norm_name)

    return identifiers


def evaluate_expression(formula: str, symbols: dict[str, Decimal]) -> Decimal:
    """
    Safely evaluate a mathematical expression against a dictionary of symbol values using AST traversal.
    Zero use of eval() or exec().
    All operations performed using Python Decimal.
    """
    if not formula or not formula.strip():
        return Decimal("0.00")

    try:
        tree = ast.parse(formula.strip(), mode="eval")
    except SyntaxError as e:
        raise ValueError(f"Invalid formula syntax: {e}") from e

    def _eval_node(node: ast.AST) -> Decimal:
        if isinstance(node, ast.Expression):
            return _eval_node(node.body)

        elif isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float, str)):
                try:
                    return Decimal(str(node.value))
                except InvalidOperation as e:
                    raise ValueError(f"Invalid numeric literal '{node.value}' in formula.") from e
            raise ValueError(f"Unsupported constant type in formula: {type(node.value)}")

        elif isinstance(node, ast.Name):
            ident = node.id.strip().upper()
            if ident in DISALLOWED_NAMES or ident.startswith("__"):
                raise ValueError(f"Forbidden variable access '{node.id}'.")
            if ident not in symbols:
                raise ValueError(f"Unknown or uncalculated variable reference '{node.id}' in formula.")
            return symbols[ident]

        elif isinstance(node, ast.UnaryOp):
            operand = _eval_node(node.operand)
            if isinstance(node.op, ast.UAdd):
                return operand
            elif isinstance(node.op, ast.USub):
                return -operand
            raise ValueError(f"Unsupported unary operator '{type(node.op).__name__}'.")

        elif isinstance(node, ast.BinOp):
            left = _eval_node(node.left)
            right = _eval_node(node.right)
            if isinstance(node.op, ast.Add):
                return left + right
            elif isinstance(node.op, ast.Sub):
                return left - right
            elif isinstance(node.op, ast.Mult):
                return left * right
            elif isinstance(node.op, ast.Div):
                if right == Decimal("0"):
                    raise ZeroDivisionError("Division by zero in formula.")
                return left / right
            raise ValueError(f"Unsupported binary operator '{type(node.op).__name__}'.")

        raise ValueError(f"Unsupported expression construct '{type(node).__name__}'.")

    raw_result = _eval_node(tree)
    return round_currency(raw_result)


# ---------------------------------------------------------------------------
# Dependency Validation & Cycle Detection
# ---------------------------------------------------------------------------
def detect_circular_dependencies(rules: list[SalaryRule]) -> None:
    """
    Build dependency graph for a collection of rules and detect cycles or forward references.
    Raises ValueError on cycle or invalid reference.
    """
    # Map code -> sequence
    rule_map: dict[str, SalaryRule] = {r.code.strip().upper(): r for r in rules}
    adj_list: dict[str, list[str]] = {}

    for rule in rules:
        code = rule.code.strip().upper()
        dependencies: list[str] = []

        if rule.computation_type == ComputationType.PERCENTAGE:
            if rule.percentage_base:
                base_code = rule.percentage_base.strip().upper()
                dependencies.append(base_code)

        elif rule.computation_type == ComputationType.FORMULA:
            if rule.formula:
                identifiers = extract_formula_identifiers(rule.formula)
                # Filter out standard context constants like CONTRACT_WAGE, WAGE, etc.
                context_constants = {
                    "CONTRACT_WAGE",
                    "WAGE",
                    "WORKED_DAYS",
                    "WORKED_MINUTES",
                    "OVERTIME_MINUTES",
                    "TIME_OFF_DAYS",
                    "TIME_OFF_HOURS",
                }
                rule_deps = [ident for ident in identifiers if ident not in context_constants]
                dependencies.extend(rule_deps)

        # Validate sequence ordering: all referenced rules must exist and have lower sequence
        for dep in dependencies:
            if dep not in rule_map:
                raise ValueError(
                    f"Rule '{code}' references undefined rule code '{dep}'."
                )
            dep_rule = rule_map[dep]
            if dep_rule.sequence >= rule.sequence:
                raise ValueError(
                    f"Rule '{code}' (sequence {rule.sequence}) references '{dep}' "
                    f"(sequence {dep_rule.sequence}). Dependencies must have a strictly lower sequence."
                )

        adj_list[code] = dependencies

    # Cycle detection using standard DFS with visited states: 0=unvisited, 1=visiting, 2=visited
    state: dict[str, int] = {code: 0 for code in adj_list}

    def _dfs(node: str, path: list[str]) -> None:
        state[node] = 1
        path.append(node)
        for neighbor in adj_list.get(node, []):
            if state[neighbor] == 1:
                cycle_str = " -> ".join(path[path.index(neighbor):] + [neighbor])
                raise ValueError(f"Circular dependency detected in salary rules: {cycle_str}")
            elif state[neighbor] == 0:
                _dfs(neighbor, path)
        path.pop()
        state[node] = 2

    for node in adj_list:
        if state[node] == 0:
            _dfs(node, [])


# ---------------------------------------------------------------------------
# Salary Rule Calculation Engine
# ---------------------------------------------------------------------------
class SalaryRuleEngine:
    """
    Deterministic calculation engine that evaluates salary structure rules.

    Execution Lifecycle:
    1. Filter active rules and sort strictly by ascending sequence.
    2. Validate dependencies & cycles before execution.
    3. Initialize symbol table with CalculationContext values.
    4. Compute each rule based on ComputationType (FIXED, PERCENTAGE, FORMULA).
    5. Round each result to 2 decimal places (ROUND_HALF_UP).
    6. Record amount in symbol table for subsequent rules to reference.
    7. Return ordered SalaryRuleResult objects.
    """

    @classmethod
    def calculate(
        cls,
        structure: SalaryStructure,
        context: CalculationContext,
    ) -> list[SalaryRuleResult]:
        """
        Execute rules for the given salary structure against context.
        """
        # 1. Filter active rules and sort by sequence ascending
        active_rules = [r for r in structure.rules if r.is_active]
        active_rules.sort(key=lambda r: r.sequence)

        # 2. Validate dependencies & cycle detection
        detect_circular_dependencies(active_rules)

        # 3. Symbol table seeded with context
        symbols: dict[str, Decimal] = {
            "CONTRACT_WAGE": context.contract_wage,
            "WAGE": context.contract_wage,
            "WORKED_DAYS": Decimal(str(context.worked_days)),
            "WORKED_MINUTES": Decimal(str(context.worked_minutes)),
            "OVERTIME_MINUTES": Decimal(str(context.overtime_minutes)),
            "TIME_OFF_DAYS": context.approved_time_off_days,
            "TIME_OFF_HOURS": context.approved_time_off_hours,
        }
        # Pre-seed any results already in context
        for k, v in context.rule_results.items():
            symbols[k.strip().upper()] = v

        results: list[SalaryRuleResult] = []

        # 4. Evaluate each rule in sequence
        for rule in active_rules:
            code = rule.code.strip().upper()
            amount = Decimal("0.00")
            formula_detail: str | None = None

            if rule.computation_type == ComputationType.FIXED:
                amount = rule.fixed_amount if rule.fixed_amount is not None else Decimal("0.00")
                amount = round_currency(amount)
                formula_detail = f"Fixed amount {amount}"

            elif rule.computation_type == ComputationType.PERCENTAGE:
                base_code = rule.percentage_base.strip().upper() if rule.percentage_base else ""
                if base_code not in symbols:
                    raise ValueError(
                        f"Rule '{code}' references base rule '{base_code}' which has not been calculated."
                    )
                base_val = symbols[base_code]
                rate = rule.percentage if rule.percentage is not None else Decimal("0.00")
                # Calculation: base_val * rate / 100
                raw_amount = (base_val * rate) / Decimal("100")
                amount = round_currency(raw_amount)
                formula_detail = f"{base_code} ({base_val}) * {rate}%"

            elif rule.computation_type == ComputationType.FORMULA:
                if not rule.formula:
                    raise ValueError(f"Formula missing for rule '{code}'.")
                amount = evaluate_expression(rule.formula, symbols)
                formula_detail = rule.formula

            # Store computed amount in symbol table for downstream rules
            symbols[code] = amount

            results.append(
                SalaryRuleResult(
                    rule_id=rule.id,
                    code=code,
                    name=rule.name,
                    category=rule.category,
                    sequence=rule.sequence,
                    amount=amount,
                    computation_type=rule.computation_type,
                    formula_detail=formula_detail,
                )
            )

        return results

