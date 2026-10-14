import os
import math
from typing import Optional, List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_

from app.core.database import get_db
from app.models.invoice import Invoice, InvoiceItem
from app.models.job import ProcessingJob
from app.models.audit import AuditLog
from app.schemas.invoice import (
    InvoiceUploadResponse,
    InvoiceResponse,
    InvoiceSummaryResponse,
    InvoiceUpdate,
    PaginatedInvoicesResponse
)
from app.services.storage import storage_service
from app.workers.tasks import process_invoice_task

router = APIRouter()


@router.post("/upload", response_model=InvoiceUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_invoice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload an invoice document (PDF or image).
    Creates an invoice entry and dispatches an asynchronous Celery OCR processing task.
    """
    # 1. Provisional invoice record
    invoice = Invoice(
        file_name=file.filename,
        file_path="",
        file_size=0,
        file_type=file.content_type or "application/pdf",
        status="PENDING"
    )
    db.add(invoice)
    db.flush()

    # 2. Save physical file to storage
    file_path, file_size = await storage_service.save_upload_file(file, invoice.id)
    invoice.file_path = file_path
    invoice.file_size = file_size

    # 3. Create tracking job
    job = ProcessingJob(
        invoice_id=invoice.id,
        status="QUEUED",
        stage="QUEUED",
        progress_pct=5
    )
    db.add(job)

    # 4. Audit Log
    audit = AuditLog(
        invoice_id=invoice.id,
        action="UPLOADED",
        actor="user",
        details=f"Uploaded file {file.filename} ({file_size} bytes)"
    )
    db.add(audit)
    db.commit()

    # 5. Dispatch background task via Celery
    try:
        task = process_invoice_task.delay(invoice.id, job.id)
        job.task_id = task.id
        db.commit()
    except Exception as e:
        # If Celery/Redis is unreachable, note error and mark for manual retry
        job.status = "FAILED"
        job.error_message = f"Failed to dispatch to Celery queue: {str(e)}"
        invoice.status = "REVIEW_REQUIRED"
        db.commit()

    return InvoiceUploadResponse(
        message="Invoice uploaded successfully. Processing started.",
        invoice_id=invoice.id,
        job_id=job.id,
        file_name=file.filename,
        status=invoice.status
    )


@router.get("", response_model=PaginatedInvoicesResponse)
def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None),
    vendor: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db)
):
    """List invoices with filtering, full-text search, and pagination."""
    query = db.query(Invoice)

    if status:
        query = query.filter(Invoice.status == status.upper())
    if vendor:
        query = query.filter(Invoice.vendor_name_extracted.ilike(f"%{vendor}%"))
    if search:
        search_filter = or_(
            Invoice.invoice_number.ilike(f"%{search}%"),
            Invoice.vendor_name_extracted.ilike(f"%{search}%"),
            Invoice.file_name.ilike(f"%{search}%"),
            Invoice.po_number.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    if start_date:
        query = query.filter(Invoice.invoice_date >= start_date)
    if end_date:
        query = query.filter(Invoice.invoice_date <= end_date)

    # Sorting
    sort_column = getattr(Invoice, sort_by, Invoice.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedInvoicesResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: str, db: Session = Depends(get_db)):
    """Fetch complete details, line items, jobs, and audit logs for an invoice."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return invoice


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: str,
    update_data: InvoiceUpdate,
    db: Session = Depends(get_db)
):
    """
    Update or review extracted invoice details (vendor, dates, totals, line items, status).
    Used by approvers to correct OCR results and change workflow states (APPROVED, REJECTED, PAID).
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    old_status = invoice.status

    # Update top-level attributes
    for field, val in update_data.model_dump(exclude_unset=True, exclude={"items"}).items():
        setattr(invoice, field, val)

    # Update line items if provided
    if update_data.items is not None:
        db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).delete()
        for idx, item_data in enumerate(update_data.items, start=1):
            item = InvoiceItem(
                invoice_id=invoice_id,
                line_number=idx,
                description=item_data.description,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                total_price=item_data.total_price
            )
            db.add(item)

    # Record Audit Log
    status_changed_msg = f" Status changed from {old_status} to {invoice.status}." if update_data.status and update_data.status != old_status else ""
    audit = AuditLog(
        invoice_id=invoice_id,
        action="EDITED" if not status_changed_msg else "STATUS_CHANGED",
        actor="user",
        details=f"User updated invoice details.{status_changed_msg}"
    )
    db.add(audit)
    db.commit()
    db.refresh(invoice)

    return invoice


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(invoice_id: str, db: Session = Depends(get_db)):
    """Delete an invoice and its associated file on disk."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    # Clean up physical file
    if invoice.file_path:
        storage_service.delete_file(invoice.file_path)

    db.delete(invoice)
    db.commit()
    return None


@router.get("/{invoice_id}/document")
def get_invoice_document(invoice_id: str, db: Session = Depends(get_db)):
    """Stream original document (PDF/Image) for split-screen review."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    file_path = storage_service.get_file_path(invoice.file_path)
    return FileResponse(
        path=str(file_path),
        media_type=invoice.file_type,
        filename=invoice.file_name,
        content_disposition_type="inline"
    )
