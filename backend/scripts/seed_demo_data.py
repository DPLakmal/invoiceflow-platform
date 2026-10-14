import os
import shutil
from pathlib import Path
from datetime import datetime
from app.core.database import SessionLocal, init_db
from app.models.invoice import Invoice, InvoiceItem
from app.models.job import ProcessingJob
from app.models.vendor import Vendor
from app.models.audit import AuditLog
from app.services.ocr import ocr_service
from app.services.parser import invoice_parser
from app.core.config import settings
from scripts.generate_sample_invoices import create_sample_pdf_1, create_sample_pdf_2

UPLOAD_DIR = Path(settings.UPLOAD_DIR).resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def seed_database():
    """Seed the database with sample processed invoices, jobs, and audit logs."""
    init_db()
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Invoice).count() > 0:
            print("Database already contains invoice records. Skipping seed.")
            return

        print("Generating and seeding sample invoice data...")
        pdf1 = create_sample_pdf_1()
        pdf2 = create_sample_pdf_2()

        for pdf_path_str in [pdf1, pdf2]:
            source_path = Path(pdf_path_str)
            target_path = UPLOAD_DIR / source_path.name
            shutil.copy2(source_path, target_path)

            file_size = target_path.stat().st_size
            raw_text = ocr_service.extract_text(str(target_path))
            parsed = invoice_parser.parse(raw_text)

            # Create Vendor
            vendor_name = parsed.get("vendor_name_extracted") or "Vendor Inc"
            vendor = db.query(Vendor).filter(Vendor.name == vendor_name).first()
            if not vendor:
                vendor = Vendor(name=vendor_name)
                db.add(vendor)
                db.flush()

            # Create Invoice
            invoice = Invoice(
                file_name=source_path.name,
                file_path=str(target_path),
                file_size=file_size,
                file_type="application/pdf",
                vendor_id=vendor.id,
                vendor_name_extracted=vendor_name,
                invoice_number=parsed.get("invoice_number"),
                po_number=parsed.get("po_number"),
                invoice_date=parsed.get("invoice_date"),
                due_date=parsed.get("due_date"),
                currency=parsed.get("currency", "USD"),
                subtotal=parsed.get("subtotal", 0.0),
                tax_amount=parsed.get("tax_amount", 0.0),
                discount_amount=parsed.get("discount_amount", 0.0),
                total_amount=parsed.get("total_amount", 0.0),
                confidence_score=parsed.get("confidence_score", 0.95),
                status=parsed.get("status", "EXTRACTED"),
                raw_text=raw_text
            )
            db.add(invoice)
            db.flush()

            # Create Line Items
            for item_data in parsed.get("items", []):
                item = InvoiceItem(
                    invoice_id=invoice.id,
                    line_number=item_data["line_number"],
                    description=item_data["description"],
                    quantity=item_data["quantity"],
                    unit_price=item_data["unit_price"],
                    total_price=item_data["total_price"]
                )
                db.add(item)

            # Create Completed Processing Job
            job = ProcessingJob(
                invoice_id=invoice.id,
                task_id=f"seed-task-{invoice.id[:8]}",
                status="COMPLETED",
                stage="COMPLETED",
                progress_pct=100,
                completed_at=datetime.utcnow()
            )
            db.add(job)

            # Create Audit Log
            audit = AuditLog(
                invoice_id=invoice.id,
                action="OCR_PROCESSED",
                actor="system",
                details=f"Demo seed invoice parsed with confidence {invoice.confidence_score}."
            )
            db.add(audit)

        db.commit()
        print("Database seeding completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
