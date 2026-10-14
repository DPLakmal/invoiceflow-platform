from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.job import JobResponse


class InvoiceItemBase(BaseModel):
    line_number: int = 1
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    total_price: float = 0.0


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemResponse(InvoiceItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    invoice_id: str


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    action: str
    actor: str
    details: Optional[str] = None
    timestamp: datetime


class InvoiceBase(BaseModel):
    vendor_name_extracted: Optional[str] = None
    invoice_number: Optional[str] = None
    po_number: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    currency: str = "USD"
    subtotal: float = 0.0
    tax_amount: float = 0.0
    discount_amount: float = 0.0
    total_amount: float = 0.0
    status: str = "PENDING"
    notes: Optional[str] = None


class InvoiceUpdate(BaseModel):
    vendor_name_extracted: Optional[str] = None
    invoice_number: Optional[str] = None
    po_number: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    currency: Optional[str] = None
    subtotal: Optional[float] = None
    tax_amount: Optional[float] = None
    discount_amount: Optional[float] = None
    total_amount: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[List[InvoiceItemCreate]] = None


class InvoiceSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    file_name: str
    file_size: int
    file_type: str
    vendor_name_extracted: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    currency: str
    total_amount: float
    confidence_score: float
    status: str
    created_at: datetime
    updated_at: datetime


class InvoiceResponse(InvoiceSummaryResponse):
    subtotal: float
    tax_amount: float
    discount_amount: float
    po_number: Optional[str] = None
    raw_text: Optional[str] = None
    notes: Optional[str] = None
    file_path: str
    items: List[InvoiceItemResponse] = []
    jobs: List[JobResponse] = []
    audit_logs: List[AuditLogResponse] = []


class InvoiceUploadResponse(BaseModel):
    message: str
    invoice_id: str
    job_id: str
    file_name: str
    status: str


class PaginatedInvoicesResponse(BaseModel):
    items: List[InvoiceSummaryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
