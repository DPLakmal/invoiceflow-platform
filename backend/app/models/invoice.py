from sqlalchemy import Column, String, Integer, Float, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Invoice(Base, TimestampMixin):
    """Stores invoices and extracted structured financial details."""
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=generate_uuid)

    # File metadata
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0, nullable=False)
    file_type = Column(String(50), default="application/pdf", nullable=False)

    # Vendor & Identification
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True)
    vendor_name_extracted = Column(String(255), nullable=True, index=True)
    invoice_number = Column(String(100), nullable=True, index=True)
    po_number = Column(String(100), nullable=True)

    # Dates
    invoice_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)

    # Financials
    currency = Column(String(10), default="USD", nullable=False)
    subtotal = Column(Float, default=0.0, nullable=False)
    tax_amount = Column(Float, default=0.0, nullable=False)
    discount_amount = Column(Float, default=0.0, nullable=False)
    total_amount = Column(Float, default=0.0, nullable=False)

    # Workflow & Quality
    confidence_score = Column(Float, default=0.0, nullable=False)
    status = Column(String(30), default="PENDING", index=True, nullable=False)
    # PENDING, EXTRACTED, REVIEW_REQUIRED, APPROVED, REJECTED, PAID

    # OCR text & notes
    raw_text = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)

    # Relationships
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan", order_by="InvoiceItem.line_number")
    jobs = relationship("ProcessingJob", back_populates="invoice", cascade="all, delete-orphan", order_by="desc(ProcessingJob.created_at)")
    vendor = relationship("Vendor", back_populates="invoices")
    audit_logs = relationship("AuditLog", back_populates="invoice", cascade="all, delete-orphan", order_by="desc(AuditLog.timestamp)")


class InvoiceItem(Base, TimestampMixin):
    """Line items parsed from an invoice."""
    __tablename__ = "invoice_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)

    line_number = Column(Integer, default=1, nullable=False)
    description = Column(String(500), nullable=False)
    quantity = Column(Float, default=1.0, nullable=False)
    unit_price = Column(Float, default=0.0, nullable=False)
    total_price = Column(Float, default=0.0, nullable=False)

    # Relationship
    invoice = relationship("Invoice", back_populates="items")
