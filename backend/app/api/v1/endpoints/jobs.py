from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.job import ProcessingJob
from app.models.invoice import Invoice
from app.models.audit import AuditLog
from app.schemas.job import JobResponse, JobRetryResponse
from app.workers.tasks import process_invoice_task

router = APIRouter()


@router.get("/{job_id}", response_model=JobResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Fetch status, current stage, and progress of an asynchronous processing job."""
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


@router.post("/{job_id}/retry", response_model=JobRetryResponse)
def retry_job(job_id: str, db: Session = Depends(get_db)):
    """Manually re-dispatch a failed or stalled processing job."""
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    invoice = db.query(Invoice).filter(Invoice.id == job.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated invoice not found")

    # Reset job
    job.status = "QUEUED"
    job.stage = "RETRY_QUEUED"
    job.progress_pct = 10
    job.error_message = None
    job.error_traceback = None
    db.commit()

    # Dispatch to Celery
    try:
        task = process_invoice_task.delay(invoice.id, job.id)
        job.task_id = task.id
        db.commit()
    except Exception as e:
        job.status = "FAILED"
        job.error_message = f"Failed to enqueue task: {str(e)}"
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    # Audit log
    audit = AuditLog(
        invoice_id=invoice.id,
        action="RETRIED",
        actor="user",
        details=f"Job {job.id} manually retried. New Celery task ID: {job.task_id}"
    )
    db.add(audit)
    db.commit()

    return JobRetryResponse(
        message="Job successfully queued for retry.",
        job_id=job.id,
        new_task_id=job.task_id,
        status=job.status
    )


@router.get("", response_model=List[JobResponse])
def list_jobs(limit: int = 20, db: Session = Depends(get_db)):
    """List recent background processing jobs."""
    return (
        db.query(ProcessingJob)
        .order_by(desc(ProcessingJob.created_at))
        .limit(limit)
        .all()
    )
