import io
from datetime import date
from unittest.mock import patch
from app.models.invoice import Invoice, InvoiceItem


def test_list_invoices_empty(client):
    response = client.get("/api/v1/invoices")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []


def test_upload_invoice(client, db_session):
    # Mock celery task dispatch so it doesn't try connecting to external Redis in unit tests
    with patch("app.workers.tasks.process_invoice_task.delay") as mock_delay:
        mock_delay.return_value.id = "mock-task-12345"

        fake_pdf = io.BytesIO(b"%PDF-1.4 Mock PDF Content")
        files = {"file": ("test_invoice.pdf", fake_pdf, "application/pdf")}
        response = client.post("/api/v1/invoices/upload", files=files)

        assert response.status_code == 202
        data = response.json()
        assert "invoice_id" in data
        assert "job_id" in data
        assert data["file_name"] == "test_invoice.pdf"


def test_get_and_update_invoice(client, db_session):
    # Create invoice
    inv = Invoice(
        file_name="invoice_abc.pdf",
        file_path="/tmp/fake_path.pdf",
        file_size=1024,
        vendor_name_extracted="Test Vendor",
        invoice_number="INV-999",
        total_amount=500.0,
        status="EXTRACTED"
    )
    db_session.add(inv)
    db_session.commit()

    # Get
    res = client.get(f"/api/v1/invoices/{inv.id}")
    assert res.status_code == 200
    assert res.json()["invoice_number"] == "INV-999"

    # Update (e.g. approve)
    update_payload = {
        "status": "APPROVED",
        "notes": "Verified by accounts manager",
        "total_amount": 520.0,
        "items": [
            {
                "line_number": 1,
                "description": "Consulting Services",
                "quantity": 1,
                "unit_price": 520.0,
                "total_price": 520.0
            }
        ]
    }
    update_res = client.put(f"/api/v1/invoices/{inv.id}", json=update_payload)
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "APPROVED"
    assert update_res.json()["total_amount"] == 520.0
    assert len(update_res.json()["items"]) == 1


def test_delete_invoice(client, db_session):
    inv = Invoice(
        file_name="to_delete.pdf",
        file_path="/tmp/fake_del.pdf",
        file_size=500,
        status="PENDING"
    )
    db_session.add(inv)
    db_session.commit()

    res = client.delete(f"/api/v1/invoices/{inv.id}")
    assert res.status_code == 204

    # Confirm 404
    get_res = client.get(f"/api/v1/invoices/{inv.id}")
    assert get_res.status_code == 404


def test_dashboard_summary_reports(client, db_session):
    inv1 = Invoice(
        file_name="inv1.pdf",
        file_path="/tmp/1.pdf",
        total_amount=1000.0,
        tax_amount=100.0,
        confidence_score=0.95,
        status="APPROVED"
    )
    inv2 = Invoice(
        file_name="inv2.pdf",
        file_path="/tmp/2.pdf",
        total_amount=500.0,
        tax_amount=50.0,
        confidence_score=0.88,
        status="REVIEW_REQUIRED"
    )
    db_session.add_all([inv1, inv2])
    db_session.commit()

    res = client.get("/api/v1/reports/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_invoices"] == 2
    assert data["approved"] == 1
    assert data["review_required"] == 1
    assert data["total_spend"] >= 1000.0
