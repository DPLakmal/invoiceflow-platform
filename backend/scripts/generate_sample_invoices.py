import os
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

SAMPLE_DIR = Path(__file__).resolve().parent.parent / "sample_invoices"
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)


def create_sample_pdf_1():
    """Generates a standard invoice from Acme Cloud Technologies."""
    pdf_path = SAMPLE_DIR / "sample_invoice_acme.pdf"
    doc = SimpleDocTemplate(str(pdf_path), pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()

    elements = []

    # Title & Header
    elements.append(Paragraph("<b>Acme Cloud Technologies Inc</b>", styles["Title"]))
    elements.append(Paragraph("123 Innovation Way, Suite 400, San Francisco, CA 94105", styles["Normal"]))
    elements.append(Paragraph("Email: billing@acmecloud.com | Phone: (555) 019-2834", styles["Normal"]))
    elements.append(Spacer(1, 15))

    # Invoice Details Table
    header_data = [
        [Paragraph("<b>Bill To:</b>", styles["Normal"]), Paragraph("<b>Invoice Details:</b>", styles["Normal"])],
        [
            Paragraph("InvoiceFlow Platform<br/>742 Evergreen Terrace<br/>Springfield, OR", styles["Normal"]),
            Paragraph("<b>Invoice #:</b> INV-2024-8841<br/><b>Date:</b> 2024-10-10<br/><b>Due Date:</b> 2024-11-10<br/><b>P.O. #:</b> PO-99120", styles["Normal"])
        ]
    ]
    t_header = Table(header_data, colWidths=[260, 260])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(t_header)
    elements.append(Spacer(1, 20))

    # Line Items
    items_data = [
        ["Description", "Qty", "Unit Price", "Total"],
        ["Dedicated Cloud Server - 16 vCPU, 64GB RAM", "2.0", "$450.00", "$900.00"],
        ["Object Storage (10TB Block Storage Tier 1)", "1.0", "$120.00", "$120.00"],
        ["Enterprise DDoS Protection & WAF", "1.0", "$250.00", "$250.00"],
        ["Kubernetes Managed Cluster Support", "1.0", "$300.00", "$300.00"]
    ]
    t_items = Table(items_data, colWidths=[280, 50, 90, 100])
    t_items.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    elements.append(t_items)
    elements.append(Spacer(1, 15))

    # Financial Summary
    summary_data = [
        ["", "Subtotal:", "$1,570.00"],
        ["", "Tax (8.25%):", "$129.53"],
        ["", "Total Amount:", "$1,699.53"]
    ]
    t_summary = Table(summary_data, colWidths=[310, 110, 100])
    t_summary.setStyle(TableStyle([
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (1, -1), (-1, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (1, -1), (-1, -1), colors.HexColor("#0f172a")),
        ('LINEABOVE', (1, -1), (-1, -1), 1, colors.HexColor("#0f172a")),
    ]))
    elements.append(t_summary)
    elements.append(Spacer(1, 30))

    elements.append(Paragraph("<b>Terms:</b> Payment is due within 30 days of invoice date.", styles["Italic"]))

    doc.build(elements)
    print(f"Created sample PDF: {pdf_path}")
    return str(pdf_path)


def create_sample_pdf_2():
    """Generates an invoice from Apex Hardware Solutions."""
    pdf_path = SAMPLE_DIR / "sample_invoice_apex.pdf"
    doc = SimpleDocTemplate(str(pdf_path), pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()

    elements = []

    elements.append(Paragraph("<b>Apex Hardware Solutions LLC</b>", styles["Title"]))
    elements.append(Paragraph("500 Tech Parkway, Austin, TX 78701 | support@apexhardware.com", styles["Normal"]))
    elements.append(Spacer(1, 15))

    header_data = [
        [Paragraph("<b>Customer:</b>", styles["Normal"]), Paragraph("<b>Billing Info:</b>", styles["Normal"])],
        [
            Paragraph("DevOps Engineering Ltd<br/>Austin, TX", styles["Normal"]),
            Paragraph("<b>Invoice Number:</b> INV-7729<br/><b>Invoice Date:</b> 2024-09-15<br/><b>Due Date:</b> 2024-10-15", styles["Normal"])
        ]
    ]
    t_header = Table(header_data, colWidths=[260, 260])
    elements.append(t_header)
    elements.append(Spacer(1, 20))

    items_data = [
        ["Description", "Qty", "Unit Price", "Total"],
        ["Dell PowerEdge R750 Rack Server", "1.0", "$3,200.00", "$3,200.00"],
        ["Cisco 48-Port Gigabit Managed Switch", "2.0", "$650.00", "$1,300.00"],
        ["Cat6A Shielded Ethernet Cable Spool (1000ft)", "1.0", "$210.00", "$210.00"]
    ]
    t_items = Table(items_data, colWidths=[280, 50, 90, 100])
    t_items.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    elements.append(t_items)
    elements.append(Spacer(1, 15))

    summary_data = [
        ["", "Subtotal:", "$4,710.00"],
        ["", "Tax (6.00%):", "$282.60"],
        ["", "Discount:", "$100.00"],
        ["", "Total Amount:", "$4,892.60"]
    ]
    t_summary = Table(summary_data, colWidths=[310, 110, 100])
    t_summary.setStyle(TableStyle([
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (1, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    elements.append(t_summary)

    doc.build(elements)
    print(f"Created sample PDF: {pdf_path}")
    return str(pdf_path)


if __name__ == "__main__":
    create_sample_pdf_1()
    create_sample_pdf_2()
