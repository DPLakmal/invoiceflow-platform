import pytest
from datetime import date
from app.services.parser import invoice_parser


SAMPLE_INVOICE_TEXT = """
Acme Cloud Technologies Inc
123 Innovation Way, Suite 400, San Francisco, CA 94105
billing@acmecloud.com

Bill To:
InvoiceFlow Platform
742 Evergreen Terrace

Invoice #: INV-2024-8841
Date: 2024-10-10
Due Date: 2024-11-10
P.O. #: PO-99120

Description Qty Unit Price Total
Dedicated Cloud Server 2.0 450.00 900.00
Object Storage 1.0 120.00 120.00
Enterprise DDoS Protection 1.0 250.00 250.00

Subtotal: $1,270.00
Tax: $104.77
Total Amount: $1,374.77
"""


def test_parser_extracts_headers():
    res = invoice_parser.parse(SAMPLE_INVOICE_TEXT)
    assert res["invoice_number"] == "INV-2024-8841"
    assert "Acme Cloud Technologies" in res["vendor_name_extracted"]
    assert res["po_number"] == "PO-99120"
    assert res["invoice_date"] == date(2024, 10, 10)
    assert res["due_date"] == date(2024, 11, 10)


def test_parser_extracts_financials():
    res = invoice_parser.parse(SAMPLE_INVOICE_TEXT)
    assert res["subtotal"] == 1270.00
    assert res["tax_amount"] == 104.77
    assert res["total_amount"] == 1374.77
    assert res["currency"] == "USD"


def test_parser_extracts_line_items():
    res = invoice_parser.parse(SAMPLE_INVOICE_TEXT)
    items = res["items"]
    assert len(items) == 3
    assert items[0]["description"] == "Dedicated Cloud Server"
    assert items[0]["quantity"] == 2.0
    assert items[0]["unit_price"] == 450.00
    assert items[0]["total_price"] == 900.00


def test_parser_confidence_score():
    res = invoice_parser.parse(SAMPLE_INVOICE_TEXT)
    assert res["confidence_score"] >= 0.85
    assert res["status"] in ["EXTRACTED", "APPROVED"]
    assert len(res["validation_issues"]) == 0


def test_parser_flags_discrepancy():
    bad_text = """
    Vendor Corp
    Invoice No: INV-001
    Date: 2024-01-01
    Subtotal: $100.00
    Tax: $10.00
    Total Amount: $200.00
    """
    res = invoice_parser.parse(bad_text)
    assert any("Financial mismatch" in issue for issue in res["validation_issues"])
    assert res["status"] == "REVIEW_REQUIRED"
