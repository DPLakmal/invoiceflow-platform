from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class ProcessingJob(Base, TimestampMixin):
    """Tracks asynchronous Celery document extraction tasks."""
    __tablename__ = "processing_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    task_id = Column(String(100), unique=True, index=True, nullable=True)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)

    status = Column(String(30), default="PENDING", index=True, nullable=False)
    # PENDING, QUEUED, EXTRACTING_TEXT, PARSING_FIELDS, VALIDATING, COMPLETED, FAILED, RETRYING

    stage = Column(String(50), default="QUEUED", nullable=False)
    # QUEUED, OCR_PROCESSING, DATA_EXTRACTION, VALIDATION, COMPLETED, FAILED

    progress_pct = Column(Integer, default=0, nullable=False)
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)

    error_message = Column(String(500), nullable=True)
    error_traceback = Column(Text, nullable=True)

    completed_at = Column(DateTime, nullable=True)

    # Relationship
    invoice = relationship("Invoice", back_populates="jobs")
