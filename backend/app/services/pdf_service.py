import io
from decimal import Decimal
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def generate_payslip_pdf(
    company_name: str,
    period_label: str,  # e.g., "September 2026"
    employee_data: dict[str, Any],
    payslip_data: dict[str, Any],
) -> bytes:
    """
    Generates a clean, professional PDF payslip and returns raw PDF bytes.

    :param company_name: Name of the company (e.g., "PeoplePay360 Inc.")
    :param period_label: "September 2026"
    :param employee_data: dict containing name, code, department, bank details
    :param payslip_data: dict containing lines, scheduled_days, payable_days, gross_pay, net_pay
    :return: bytes of the generated PDF
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
    story.append(Paragraph(f"<b>{company_name}</b>", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"Salary Slip for <b>{period_label}</b>", subtitle_style))
    story.append(Spacer(1, 16))

    # 2. Employee Info Grid
    emp_info_data = [
        [
            Paragraph("Employee Name:", label_style),
            Paragraph(str(employee_data.get("name", "N/A")), value_style),
            Paragraph("Employee Code:", label_style),
            Paragraph(str(employee_data.get("employee_code", "N/A")), value_style),
        ],
        [
            Paragraph("Department:", label_style),
            Paragraph(str(employee_data.get("department", "General")), value_style),
            Paragraph("Designation:", label_style),
            Paragraph(str(employee_data.get("job_title", "Staff")), value_style),
        ],
        [
            Paragraph("Scheduled Days:", label_style),
            Paragraph(str(payslip_data.get("scheduled_days", 0)), value_style),
            Paragraph("Payable Days:", label_style),
            Paragraph(str(payslip_data.get("payable_days", 0)), value_style),
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

    # 3. Separate Earnings vs Deductions
    earnings = []
    deductions = []

    for line in payslip_data.get("lines", []):
        cat = line.get("category", "").upper()
        item = (line.get("name", line.get("code")), Decimal(str(line.get("amount", 0))))
        if cat in ("GROSS", "NET"):
            continue  # Skip totals here; displayed separately below
        if (
            cat == "DEDUCTION"
            or "DEDUCTION" in line.get("code", "")
            or line.get("code") in ("PF", "PT", "TAX")
        ):
            deductions.append(item)
        else:
            earnings.append(item)

    # Balance table rows
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

    gross_pay = Decimal(str(payslip_data.get("gross_pay", 0)))
    net_pay = Decimal(str(payslip_data.get("net_pay", 0)))
    total_deductions = gross_pay - net_pay

    # Totals row
    salary_rows.append([
        Paragraph("<b>Total Gross</b>", label_style),
        Paragraph(f"<b>₹ {gross_pay:,.2f}</b>", label_style),
        Paragraph("<b>Total Deductions</b>", label_style),
        Paragraph(f"<b>₹ {total_deductions:,.2f}</b>", label_style),
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
                f"<b>₹ {net_pay:,.2f}</b>",
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
            "This is a computer-generated document and does not require a physical signature.",
            footer_style,
        )
    )

    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
