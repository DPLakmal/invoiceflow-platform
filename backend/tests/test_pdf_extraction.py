from pathlib import Path
from app.services.ocr import ocr_service
from app.services.parser import invoice_parser

SAMPLE_DIR = Path(__file__).resolve().parent.parent / "sample_invoices"


def test_real_pdf_extraction_acme():
    pdf_path = SAMPLE_DIR / "sample_invoice_acme.pdf"
    assert pdf_path.exists(), "Sample PDF must exist"

    text = ocr_service.extract_text(str(pdf_path))
    assert len(text) > 100
    assert "Acme Cloud Technologies" in text

    parsed = invoice_parser.parse(text)
    assert parsed["invoice_number"] == "INV-2024-8841"
    assert "Acme Cloud" in parsed["vendor_name_extracted"]
    assert parsed["total_amount"] == 1699.53
    assert parsed["subtotal"] == 1570.00
    assert parsed["confidence_score"] >= 0.85


def test_real_pdf_extraction_apex():
    pdf_path = SAMPLE_DIR / "sample_invoice_apex.pdf"
    assert pdf_path.exists(), "Sample PDF must exist"

    text = ocr_service.extract_text(str(pdf_path))
    assert len(text) > 100
    assert "Apex Hardware Solutions" in text

    parsed = invoice_parser.parse(text)
    assert parsed["invoice_number"] == "INV-7729"
    assert "Apex Hardware" in parsed["vendor_name_extracted"]
    assert parsed["total_amount"] == 4892.60
    assert parsed["confidence_score"] >= 0.85
