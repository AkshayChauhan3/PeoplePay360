"""
PDF Payslip Generation Service — PeoplePay360

Generates a formatted, professional PDF salary slip from a persistent Payslip ORM model.
Uses ReportLab with styled tables, itemized earnings/deductions, and INR currency formatting.
"""

import io
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models.payslip import Payslip


def generate_payslip_pdf(
    payslip: Payslip,
    company_name: str = "PeoplePay360 Technologies Pvt Ltd",
) -> bytes:
    """
    Generates a PDF salary slip for an employee payslip and returns the raw PDF bytes.

    :param payslip: ORM Payslip instance with joined employee, payrun, contract, and lines.
    :param company_name: Name of the organization header.
    :return: Binary PDF content.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "PayslipTitle",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1e293b"),
        alignment=1,  # Centered
    )
    subtitle_style = ParagraphStyle(
        "PayslipSubtitle",
        parent=styles["Normal"],
        fontSize=11,
        textColor=colors.HexColor("#64748b"),
        alignment=1,
    )
    label_style = ParagraphStyle(
        "LabelStyle",
        parent=styles["Normal"],
        fontSize=9,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#334155"),
    )
    value_style = ParagraphStyle(
        "ValueStyle",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#1e293b"),
    )

    story = []

    # 1. Header
    period_str = f"{payslip.period_start.strftime('%d %b %Y')} – {payslip.period_end.strftime('%d %b %Y')}"
    story.append(Paragraph(f"<b>{company_name}</b>", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"Salary Slip for <b>{period_str}</b>", subtitle_style))
    story.append(Spacer(1, 16))

    # 2. Employee Info Grid
    emp = payslip.employee
    dept_name = emp.department.name if emp and emp.department else "N/A"
    job_title = emp.job_position.name if emp and emp.job_position else "N/A"
    emp_name = f"{emp.first_name} {emp.last_name}" if emp else "N/A"
    emp_code = emp.employee_code if emp else "N/A"
    contract_ref = payslip.contract.contract_number if payslip.contract else "N/A"
    contact_info = emp.email if emp and emp.email else "N/A"

    # Masked banking details for payroll confidentiality
    raw_acct = emp.bank_account_number if emp and emp.bank_account_number else None
    if raw_acct and len(raw_acct) > 4:
        masked_acct = f"•••• {raw_acct[-4:]}"
    elif raw_acct:
        masked_acct = raw_acct
    else:
        masked_acct = "N/A"

    bank_display = f"{emp.bank_name} ({masked_acct})" if (emp and emp.bank_name and raw_acct) else (emp.bank_name or masked_acct)
    ifsc_display = emp.ifsc_code if emp and emp.ifsc_code else "N/A"
    if emp and emp.pan_number:
        tax_str = f"{ifsc_display} (PAN: {emp.pan_number})"
    else:
        tax_str = ifsc_display

    emp_info_data = [
        [
            Paragraph("Employee Name:", label_style),
            Paragraph(emp_name, value_style),
            Paragraph("Employee Code:", label_style),
            Paragraph(emp_code, value_style),
        ],
        [
            Paragraph("Department:", label_style),
            Paragraph(dept_name, value_style),
            Paragraph("Designation:", label_style),
            Paragraph(job_title, value_style),
        ],
        [
            Paragraph("Contract Ref:", label_style),
            Paragraph(contract_ref, value_style),
            Paragraph("Email / Contact:", label_style),
            Paragraph(contact_info, value_style),
        ],
        [
            Paragraph("Bank / Account:", label_style),
            Paragraph(bank_display, value_style),
            Paragraph("IFSC / Tax:", label_style),
            Paragraph(tax_str, value_style),
        ],
        [
            Paragraph("Worked Days:", label_style),
            Paragraph(f"{payslip.worked_days} days", value_style),
            Paragraph("Status:", label_style),
            Paragraph(f"<b>{payslip.status.value}</b>", value_style),
        ],
    ]

    info_table = Table(emp_info_data, colWidths=[100, 170, 100, 170])
    info_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(info_table)
    story.append(Spacer(1, 18))

    # 3. Categorize Earnings vs Deductions
    earnings: list[tuple[str, Decimal]] = []
    deductions: list[tuple[str, Decimal]] = []

    for line in payslip.lines:
        cat = line.category.value if hasattr(line.category, "value") else str(line.category)
        if cat in ("GROSS", "NET"):
            continue  # Exclude summary lines from itemized rows; displayed in totals
        if cat == "DEDUCTION":
            deductions.append((line.name or line.code, line.amount))
        else:
            earnings.append((line.name or line.code, line.amount))

    max_rows = max(len(earnings), len(deductions), 1)
    salary_rows = [
        [
            Paragraph("<b>Earnings</b>", label_style),
            Paragraph("<b>Amount (INR)</b>", label_style),
            Paragraph("<b>Deductions</b>", label_style),
            Paragraph("<b>Amount (INR)</b>", label_style),
        ]
    ]

    for i in range(max_rows):
        earn_name, earn_val = earnings[i] if i < len(earnings) else ("", "")
        ded_name, ded_val = deductions[i] if i < len(deductions) else ("", "")

        salary_rows.append([
            Paragraph(earn_name, value_style),
            Paragraph(f"₹ {earn_val:,.2f}" if earn_val != "" else "", value_style),
            Paragraph(ded_name, value_style),
            Paragraph(f"₹ {ded_val:,.2f}" if ded_val != "" else "", value_style),
        ])

    # Totals row
    salary_rows.append([
        Paragraph("<b>Total Gross</b>", label_style),
        Paragraph(f"<b>₹ {payslip.gross_amount:,.2f}</b>", label_style),
        Paragraph("<b>Total Deductions</b>", label_style),
        Paragraph(f"<b>₹ {payslip.deduction_amount:,.2f}</b>", label_style),
    ])

    salary_table = Table(salary_rows, colWidths=[170, 100, 170, 100])
    salary_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#f1f5f9")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(salary_table)
    story.append(Spacer(1, 16))

    # 4. Highlighted Net Salary Box
    net_box_data = [
        [
            Paragraph(
                "<b>NET TAKE-HOME PAY:</b>",
                ParagraphStyle(
                    "NetLabel",
                    parent=label_style,
                    fontSize=12,
                    textColor=colors.HexColor("#0f172a"),
                ),
            ),
            Paragraph(
                f"<b>₹ {payslip.net_amount:,.2f}</b>",
                ParagraphStyle(
                    "NetValue",
                    parent=label_style,
                    fontSize=14,
                    textColor=colors.HexColor("#15803d"),
                ),
            ),
        ]
    ]
    net_table = Table(net_box_data, colWidths=[270, 270])
    net_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#dcfce7")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#86efac")),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(net_table)
    story.append(Spacer(1, 24))

    # 5. Footer Notice
    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.HexColor("#94a3b8"),
        alignment=1,
    )
    story.append(
        Paragraph(
            "This is a computer-generated document from PeoplePay360 and does not require a physical signature.",
            footer_style,
        )
    )

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
