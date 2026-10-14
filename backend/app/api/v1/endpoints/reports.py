from typing import List
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.report import (
    DashboardSummaryResponse,
    SpendByVendorItem,
    MonthlyTrendItem
)
from app.services.report_service import report_service

router = APIRouter()


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """Fetch high-level KPI metrics for the executive dashboard."""
    return report_service.get_dashboard_summary(db)


@router.get("/spend-by-vendor", response_model=List[SpendByVendorItem])
def get_spend_by_vendor(limit: int = 10, db: Session = Depends(get_db)):
    """Fetch spend aggregated by vendor."""
    return report_service.get_spend_by_vendor(db, limit=limit)


@router.get("/monthly-trends", response_model=List[MonthlyTrendItem])
def get_monthly_trends(db: Session = Depends(get_db)):
    """Fetch monthly expenditure trends."""
    return report_service.get_monthly_trends(db)


@router.get("/export")
def export_csv_report(db: Session = Depends(get_db)):
    """Download full invoice records in CSV format."""
    csv_data = report_service.generate_csv_report(db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=invoiceflow_report.csv"}
    )
