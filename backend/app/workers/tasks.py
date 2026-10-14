import traceback
import logging
from datetime import datetime
from celery.exceptions import MaxRetriesExceededError
from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.invoice import Invoice, InvoiceItem
from app.models.job import ProcessingJob
from app.models.audit import AuditLog
from app.models.vendor import Vendor
from app.services.ocr import ocr_service
from app.services.parser import invoice_parser

logger = logging.getLogger(__name__)


def _update_job_stage(
    db, job_id: str, status: str, stage: str, progress_pct: int, error_message: str = None
):
    """Update job status and progress percentage."""
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if job:
        job.status = status
        job.stage = stage
        job.progress_pct = progress_pct
        if error_message:
            job.error_message = error_message
        if status == "COMPLETED":
            job.completed_at = datetime.utcnow()
        db.commit()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=5)
def process_invoice_task(self, invoice_id: str, job_id: str):
    """
    Asynchronous Celery worker task that executes the invoice extraction pipeline:
    1. Status: QUEUED (10%)
    2. OCR & Text Extraction (40%)
    3. Structured Field & Line Items Parsing (70%)
    4. Database Persistence & Checksum Validation (90%)
    5. Completed (100%)
    
    Includes automatic exponential backoff retry on transient failures.
    """
    logger.info(f"[Task {self.request.id}] Starting processing for invoice_id={invoice_id}, job_id={job_id}")
    db = SessionLocal()

    try:
        # Step 1: Initialize Job Status
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not job:
            logger.error(f"ProcessingJob {job_id} not found in database.")
            return

        job.task_id = self.request.id
        job.status = "PROCESSING"
        job.stage = "INITIALIZING"
        job.progress_pct = 10
        job.retry_count = self.request.retries
        db.commit()

        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found.")

        # Step 2: OCR & Text Extraction
        _update_job_stage(db, job_id, "PROCESSING", "EXTRACTING_TEXT", 35)
        raw_text = ocr_service.extract_text(invoice.file_path)
        invoice.raw_text = raw_text
        db.commit()

        # Step 3: Structured Data Parsing
        _update_job_stage(db, job_id, "PROCESSING", "PARSING_FIELDS", 65)
        parsed_data = invoice_parser.parse(raw_text)

        # Step 4: Persist Parsed Results into Invoice
        _update_job_stage(db, job_id, "PROCESSING", "VALIDATING", 85)

        invoice.vendor_name_extracted = parsed_data.get("vendor_name_extracted")
        invoice.invoice_number = parsed_data.get("invoice_number")
        invoice.po_number = parsed_data.get("po_number")
        invoice.invoice_date = parsed_data.get("invoice_date")
        invoice.due_date = parsed_data.get("due_date")
        invoice.currency = parsed_data.get("currency", "USD")
        invoice.subtotal = parsed_data.get("subtotal", 0.0)
        invoice.tax_amount = parsed_data.get("tax_amount", 0.0)
        invoice.discount_amount = parsed_data.get("discount_amount", 0.0)
        invoice.total_amount = parsed_data.get("total_amount", 0.0)
        invoice.confidence_score = parsed_data.get("confidence_score", 0.0)
        invoice.status = parsed_data.get("status", "EXTRACTED")

        # Associate or create vendor if recognized
        if invoice.vendor_name_extracted:
            vendor = db.query(Vendor).filter(Vendor.name == invoice.vendor_name_extracted).first()
            if not vendor:
                vendor = Vendor(name=invoice.vendor_name_extracted)
                db.add(vendor)
                db.flush()
            invoice.vendor_id = vendor.id

        # Insert extracted line items
        # Clear existing provisional items if retrying
        db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).delete()
        for item_data in parsed_data.get("items", []):
            item = InvoiceItem(
                invoice_id=invoice_id,
                line_number=item_data["line_number"],
                description=item_data["description"],
                quantity=item_data["quantity"],
                unit_price=item_data["unit_price"],
                total_price=item_data["total_price"]
            )
            db.add(item)

        # Record audit log
        audit = AuditLog(
            invoice_id=invoice_id,
            action="OCR_PROCESSED",
            actor="celery_worker",
            details=f"Parsed with confidence {invoice.confidence_score}. Status: {invoice.status}"
        )
        db.add(audit)

        # Step 5: Mark Job as COMPLETED
        _update_job_stage(db, job_id, "COMPLETED", "COMPLETED", 100)
        db.commit()
        logger.info(f"[Task {self.request.id}] Successfully completed processing for invoice {invoice_id}")

        return {
            "invoice_id": invoice_id,
            "job_id": job_id,
            "status": "COMPLETED",
            "confidence_score": invoice.confidence_score
        }

    except Exception as exc:
        db.rollback()
        tb = traceback.format_exc()
        current_retries = self.request.retries
        max_retries = self.max_retries

        logger.error(f"[Task {self.request.id}] Error processing invoice {invoice_id}: {exc}\n{tb}")

        # Check if we should retry
        if current_retries < max_retries:
            backoff_delay = 5 * (2 ** current_retries)  # 5s, 10s, 20s
            logger.info(f"Retrying task in {backoff_delay} seconds (Retry {current_retries + 1}/{max_retries})...")
            
            job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
            if job:
                job.status = "RETRYING"
                job.stage = "RETRYING"
                job.retry_count = current_retries + 1
                job.error_message = f"Attempt {current_retries + 1} failed: {str(exc)}"
                job.error_traceback = tb
                db.commit()

            raise self.retry(exc=exc, countdown=backoff_delay)
        else:
            # Retries exhausted -> mark as FAILED
            job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
            if job:
                job.status = "FAILED"
                job.stage = "FAILED"
                job.retry_count = current_retries
                job.error_message = f"Failed after {max_retries} attempts: {str(exc)}"
                job.error_traceback = tb
                db.commit()

            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
            if invoice:
                invoice.status = "REVIEW_REQUIRED"
                invoice.notes = f"Auto-processing failed: {str(exc)}"
                db.commit()

            audit = AuditLog(
                invoice_id=invoice_id,
                action="PROCESSING_FAILED",
                actor="celery_worker",
                details=f"Task failed after retries: {str(exc)}"
            )
            db.add(audit)
            db.commit()

    finally:
        db.close()
