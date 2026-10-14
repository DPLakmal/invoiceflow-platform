from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from app.models.base import generate_uuid


class AuditLog(Base):
    """Audit trail for all invoice status changes and user modifications."""
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)

    action = Column(String(50), nullable=False)
    # UPLOADED, OCR_PROCESSED, DATA_PARSED, EDITED, APPROVED, REJECTED, STATUS_CHANGED, RETRIED

    actor = Column(String(100), default="system", nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    invoice = relationship("Invoice", back_populates="audit_logs")
