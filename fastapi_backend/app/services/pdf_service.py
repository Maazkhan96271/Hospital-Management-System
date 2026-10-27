"""PDF Generation service for branded medical receipts and invoices using ReportLab."""

import io
from datetime import datetime
from typing import Optional, List, Dict, Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT


def generate_invoice_pdf(
    invoice_number: str,
    patient_name: str,
    patient_id: int,
    doctor_name: str,
    issued_date: str,
    payment_status: str,
    payment_method: str,
    items: List[Dict[str, Any]],
    total_amount: float,
    paid_amount: float,
    notes: Optional[str] = None,
    patient_email: Optional[str] = None,
) -> bytes:
    """
    Generate a branded, professional medical invoice and payment receipt PDF.
    Returns bytes buffer ready for HTTP streaming response or file storage.
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

    # Custom branded typography styles
    hospital_title_style = ParagraphStyle(
        "HospitalTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1e3a8a"),  # Deep Navy Blue
        alignment=TA_LEFT,
    )

    hospital_sub_style = ParagraphStyle(
        "HospitalSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#475569"),  # Slate Grey
        alignment=TA_LEFT,
    )

    doc_type_style = ParagraphStyle(
        "DocType",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0f172a"),
        alignment=TA_RIGHT,
    )

    doc_meta_style = ParagraphStyle(
        "DocMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#64748b"),
        alignment=TA_RIGHT,
    )

    meta_label_style = ParagraphStyle(
        "MetaLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#334155"),
    )

    meta_val_style = ParagraphStyle(
        "MetaVal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1e293b"),
    )

    table_cell_right = ParagraphStyle(
        "TableCellRight",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
        alignment=TA_RIGHT,
    )

    paid_badge_style = ParagraphStyle(
        "PaidBadge",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#15803d"),  # Emerald Green
        alignment=TA_RIGHT,
    )

    footer_style = ParagraphStyle(
        "FooterText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#94a3b8"),
        alignment=TA_CENTER,
    )

    story = []

    # 1. Hospital Header with Branding Banner
    header_data = [
        [
            Paragraph("<b>MediCare Hospital & Research Institute</b>", hospital_title_style),
            Paragraph("<b>OFFICIAL PAYMENT RECEIPT</b>", doc_type_style),
        ],
        [
            Paragraph(
                "NABH & JCI Accredited Tertiary Healthcare Center<br/>"
                "100 Healthcare Parkway, Medical District, NY 10001<br/>"
                "Emergency Tel: +1 (800) 555-CARE • billing@medicare-hms.com",
                hospital_sub_style,
            ),
            Paragraph(
                f"Receipt No: <b>{invoice_number}</b><br/>"
                f"Date: <b>{issued_date}</b><br/>"
                f"Status: <font color='#15803d'><b>{payment_status.upper()}</b></font>",
                doc_meta_style,
            ),
        ],
    ]

    header_table = Table(header_data, colWidths=[3.8 * inch, 3.2 * inch])
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
        ])
    )
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a8a"), spaceAfter=12))

    # 2. Patient & Encounter Details Table (2-Column Grid)
    info_data = [
        [
            Paragraph("<b>PATIENT INFORMATION</b>", meta_label_style),
            Paragraph("<b>CLINICAL ENCOUNTER DETAILS</b>", meta_label_style),
        ],
        [
            Paragraph(
                f"Patient Name: <b>{patient_name}</b><br/>"
                f"Patient ID: <b>#{patient_id}</b><br/>"
                f"Email: {patient_email or 'On File'}",
                meta_val_style,
            ),
            Paragraph(
                f"Attending Doctor: <b>{doctor_name}</b><br/>"
                f"Payment Method: <b>{payment_method or 'Cash'}</b><br/>"
                f"Settlement Time: <b>{datetime.now().strftime('%Y-%m-%d %H:%M')}</b>",
                meta_val_style,
            ),
        ],
    ]

    info_table = Table(info_data, colWidths=[3.5 * inch, 3.5 * inch])
    info_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(info_table)
    story.append(Spacer(1, 14))

    # 3. Itemized Bill Table (Consultation, Pharmacy, Labs)
    items_header = [
        Paragraph("<b>#</b>", table_header_style),
        Paragraph("<b>Service Description / Item Name</b>", table_header_style),
        Paragraph("<b>Qty</b>", table_header_style),
        Paragraph("<b>Unit Price</b>", table_header_style),
        Paragraph("<b>Total Amount</b>", table_header_style),
    ]

    items_table_data = [items_header]

    for idx, item in enumerate(items, start=1):
        desc = item.get("description", "Medical Service")
        qty = item.get("quantity", 1)
        unit_price = item.get("unit_price", 0.0)
        line_total = item.get("total", qty * unit_price)

        items_table_data.append([
            Paragraph(str(idx), table_cell_style),
            Paragraph(str(desc), table_cell_style),
            Paragraph(str(qty), table_cell_style),
            Paragraph(f"${unit_price:.2f}", table_cell_style),
            Paragraph(f"${line_total:.2f}", table_cell_right),
        ])

    items_table = Table(
        items_table_data,
        colWidths=[0.4 * inch, 3.6 * inch, 0.7 * inch, 1.1 * inch, 1.2 * inch],
    )
    items_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (0, -1), "CENTER"),
            ("ALIGN", (2, 0), (2, -1), "CENTER"),
            ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(items_table)
    story.append(Spacer(1, 10))

    # 4. Totals and Payment Summary Box
    balance_due = max(0.0, total_amount - paid_amount)
    totals_data = [
        [
            Paragraph("<b>Payment Remarks:</b><br/>" + (notes or "Fully settled at hospital cash/billing desk."), table_cell_style),
            Paragraph("Subtotal:", meta_label_style),
            Paragraph(f"${total_amount:.2f}", table_cell_right),
        ],
        [
            "",
            Paragraph("Hospital Tax (0%):", meta_label_style),
            Paragraph("$0.00", table_cell_right),
        ],
        [
            "",
            Paragraph("<b>Grand Total:</b>", meta_label_style),
            Paragraph(f"<b>${total_amount:.2f}</b>", table_cell_right),
        ],
        [
            "",
            Paragraph("<b>Amount Paid:</b>", meta_label_style),
            Paragraph(f"<b>${paid_amount:.2f}</b>", table_cell_right),
        ],
        [
            "",
            Paragraph("<b>Balance Due:</b>", meta_label_style),
            Paragraph(f"<b>${balance_due:.2f}</b>", table_cell_right),
        ],
    ]

    totals_table = Table(totals_data, colWidths=[4.2 * inch, 1.4 * inch, 1.4 * inch])
    totals_table.setStyle(
        TableStyle([
            ("SPAN", (0, 0), (0, 4)),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BACKGROUND", (1, 2), (-1, 3), colors.HexColor("#f0fdf4")),  # Soft green highlight for Paid
            ("GRID", (1, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(totals_table)
    story.append(Spacer(1, 24))

    # 5. Authorization Stamp & Signature Section
    stamp_data = [
        [
            Paragraph(
                "<b>Notice:</b> This is an official computer-generated receipt.<br/>"
                "Please retain this document for medical reimbursement & insurance claims.",
                footer_style,
            ),
            Paragraph(
                "<b>Authorized Signatory</b><br/>"
                "<i>MediCare Billing & Accounts Office</i><br/>"
                "Date: " + datetime.now().strftime("%Y-%m-%d"),
                doc_meta_style,
            ),
        ]
    ]

    stamp_table = Table(stamp_data, colWidths=[4.2 * inch, 2.8 * inch])
    stamp_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(KeepTogether([stamp_table]))
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceAfter=8))
    story.append(Paragraph("MediCare Hospital Management System • EMR & HIS Billing Engine", footer_style))

    doc.build(story)
    return buffer.getvalue()
