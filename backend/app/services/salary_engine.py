import ast
import operator
from decimal import Decimal, ROUND_HALF_UP
from typing import Any


class FormulaSecurityError(Exception):
    """Raised when a salary formula contains disallowed expressions or syntax."""
    pass


class SafeFormulaEvaluator:
    """
    Safely parses and evaluates mathematical formulas using Python's AST (Abstract Syntax Tree).
    Blocks arbitrary code execution, functions, imports, and attributes.
    """

    ALLOWED_OPERATORS = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
    }

    ALLOWED_UNARY = {
        ast.UAdd: operator.pos,
        ast.USub: operator.neg,
    }

    @classmethod
    def evaluate(cls, expression: str, context: dict[str, Decimal | float | int]) -> Decimal:
        """
        Evaluates a formula string safely against a dictionary of available variable values.
        
        Example:
            evaluate("BASIC + HRA - PF", {"BASIC": 50000, "HRA": 20000, "PF": 3000})
            Returns: Decimal('67000.00')
        """
        try:
            tree = ast.parse(expression.strip(), mode="eval")
        except SyntaxError as exc:
            raise FormulaSecurityError(f"Invalid syntax in formula '{expression}': {exc}")

        result = cls._eval_node(tree.body, context)
        return Decimal(str(result)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @classmethod
    def _eval_node(cls, node: ast.AST, context: dict[str, Any]) -> Decimal:
        # 1. Numbers (e.g. 50000, 0.40)
        if isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float, Decimal)):
                return Decimal(str(node.value))
            raise FormulaSecurityError(f"Disallowed constant type: {type(node.value)}")

        # 2. Variable names (e.g. BASIC, contract_wage, payable_days)
        if isinstance(node, ast.Name):
            var_name = node.id
            if var_name in context:
                return Decimal(str(context[var_name]))
            raise FormulaSecurityError(f"Unknown variable '{var_name}' referenced in formula.")

        # 3. Operations (+, -, *, /)
        if isinstance(node, ast.BinOp):
            op_type = type(node.op)
            if op_type not in cls.ALLOWED_OPERATORS:
                raise FormulaSecurityError(f"Unsupported operator: {op_type.__name__}")

            left = cls._eval_node(node.left, context)
            right = cls._eval_node(node.right, context)

            if op_type is ast.Div and right == Decimal("0"):
                raise FormulaSecurityError("Division by zero in formula computation.")

            op_func = cls.ALLOWED_OPERATORS[op_type]
            return op_func(left, right)

        # 4. Unary operations (+x, -x)
        if isinstance(node, ast.UnaryOp):
            op_type = type(node.op)
            if op_type not in cls.ALLOWED_UNARY:
                raise FormulaSecurityError(f"Unsupported unary operator: {op_type.__name__}")
            operand = cls._eval_node(node.operand, context)
            return cls.ALLOWED_UNARY[op_type](operand)

        # Block everything else (function calls, imports, attribute lookups)
        raise FormulaSecurityError(f"Disallowed expression syntax: {type(node).__name__}")


def compute_salary_line(
    rule_code: str,
    method: str,  # 'FIXED', 'PERCENTAGE', 'FORMULA'
    amount: Decimal | None,
    percentage_base: str | None,
    percentage_rate: Decimal | None,
    formula_expression: str | None,
    context: dict[str, Decimal],
    quantity: Decimal = Decimal("1.0"),
) -> Decimal:
    """
    Computes the final amount for a single salary rule according to its calculation method.
    """
    base_val = Decimal("0.00")

    if method == "FIXED":
        base_val = amount or Decimal("0.00")

    elif method == "PERCENTAGE":
        if not percentage_base or percentage_base not in context:
            raise FormulaSecurityError(f"Base '{percentage_base}' not found in prior rules.")
        rate = (percentage_rate or Decimal("0.00")) / Decimal("100.00")
        base_val = context[percentage_base] * rate

    elif method == "FORMULA":
        if not formula_expression:
            raise FormulaSecurityError(f"Rule '{rule_code}' requires a formula expression.")
        base_val = SafeFormulaEvaluator.evaluate(formula_expression, context)

    else:
        raise ValueError(f"Unknown salary rule calculation method: {method}")

    # Multiply by quantity (default 1.0) and round to 2 decimal places
    total = (base_val * quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return total
