from typing import List, Dict
from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    total_invoices: int
    pending_processing: int
    review_required: int
    approved: int
    rejected: int
    paid: int
    total_spend: float
    total_tax: float
    avg_confidence_score: float
    success_rate_pct: float


class SpendByVendorItem(BaseModel):
    vendor_name: str
    total_amount: float
    invoice_count: int


class MonthlyTrendItem(BaseModel):
    month: str  # YYYY-MM
    total_amount: float
    invoice_count: int


class StatusDistributionItem(BaseModel):
    status: str
    count: int
    percentage: float
