import csv
import io
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from app.models.invoice import Invoice, InvoiceItem
from app.models.job import ProcessingJob
from app.models.vendor import Vendor
from app.schemas.report import (
    DashboardSummaryResponse,
    SpendByVendorItem,
    MonthlyTrendItem,
    StatusDistributionItem
)


class ReportService:
    def get_dashboard_summary(self, db: Session) -> DashboardSummaryResponse:
        """Calculate KPI summary metrics for the executive dashboard."""
        total_invoices = db.query(func.count(Invoice.id)).scalar() or 0

        # Status breakdowns
        pending_processing = db.query(func.count(Invoice.id)).filter(Invoice.status == "PENDING").scalar() or 0
        review_required = db.query(func.count(Invoice.id)).filter(Invoice.status == "REVIEW_REQUIRED").scalar() or 0
        approved = db.query(func.count(Invoice.id)).filter(Invoice.status == "APPROVED").scalar() or 0
        rejected = db.query(func.count(Invoice.id)).filter(Invoice.status == "REJECTED").scalar() or 0
        paid = db.query(func.count(Invoice.id)).filter(Invoice.status == "PAID").scalar() or 0

        # Spend totals
        total_spend = db.query(func.sum(Invoice.total_amount)).filter(
            Invoice.status.in_(["APPROVED", "PAID", "EXTRACTED"])
        ).scalar() or 0.0

        total_tax = db.query(func.sum(Invoice.tax_amount)).filter(
            Invoice.status.in_(["APPROVED", "PAID", "EXTRACTED"])
        ).scalar() or 0.0

        avg_confidence = db.query(func.avg(Invoice.confidence_score)).filter(
            Invoice.confidence_score > 0
        ).scalar() or 0.0

        # Processing success rate
        total_jobs = db.query(func.count(ProcessingJob.id)).scalar() or 0
        completed_jobs = db.query(func.count(ProcessingJob.id)).filter(ProcessingJob.status == "COMPLETED").scalar() or 0
        success_rate = (completed_jobs / total_jobs * 100.0) if total_jobs > 0 else 100.0

        return DashboardSummaryResponse(
            total_invoices=total_invoices,
            pending_processing=pending_processing,
            review_required=review_required,
            approved=approved,
            rejected=rejected,
            paid=paid,
            total_spend=round(float(total_spend), 2),
            total_tax=round(float(total_tax), 2),
            avg_confidence_score=round(float(avg_confidence), 2),
            success_rate_pct=round(float(success_rate), 1)
        )

    def get_spend_by_vendor(self, db: Session, limit: int = 10) -> List[SpendByVendorItem]:
        """Aggregate total spend grouped by vendor."""
        results = (
            db.query(
                func.coalesce(Invoice.vendor_name_extracted, "Unspecified Vendor").label("vendor_name"),
                func.sum(Invoice.total_amount).label("total_amount"),
                func.count(Invoice.id).label("invoice_count")
            )
            .filter(Invoice.status.in_(["APPROVED", "PAID", "EXTRACTED", "REVIEW_REQUIRED"]))
            .group_by(func.coalesce(Invoice.vendor_name_extracted, "Unspecified Vendor"))
            .order_by(desc("total_amount"))
            .limit(limit)
            .all()
        )

        return [
            SpendByVendorItem(
                vendor_name=row.vendor_name,
                total_amount=round(float(row.total_amount), 2),
                invoice_count=row.invoice_count
            )
            for row in results
        ]

    def get_monthly_trends(self, db: Session) -> List[MonthlyTrendItem]:
        """Calculate month-by-month spend and volume."""
        # Using string format or date manipulation depending on DB
        invoices = (
            db.query(Invoice.invoice_date, Invoice.created_at, Invoice.total_amount)
            .filter(Invoice.status.in_(["APPROVED", "PAID", "EXTRACTED"]))
            .all()
        )

        monthly_map: Dict[str, Dict[str, Any]] = {}
        for inv in invoices:
            dt = inv.invoice_date or inv.created_at
            month_key = dt.strftime("%Y-%m") if dt else "Unknown"
            if month_key not in monthly_map:
                monthly_map[month_key] = {"total": 0.0, "count": 0}
            monthly_map[month_key]["total"] += inv.total_amount
            monthly_map[month_key]["count"] += 1

        sorted_months = sorted(monthly_map.keys())[-12:]  # Last 12 months
        return [
            MonthlyTrendItem(
                month=m,
                total_amount=round(monthly_map[m]["total"], 2),
                invoice_count=monthly_map[m]["count"]
            )
            for m in sorted_months
        ]

    def generate_csv_report(self, db: Session) -> str:
        """Export invoice list into CSV format."""
        invoices = (
            db.query(Invoice)
            .order_by(desc(Invoice.created_at))
            .all()
        )

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Invoice ID",
            "File Name",
            "Vendor",
            "Invoice Number",
            "PO Number",
            "Invoice Date",
            "Due Date",
            "Currency",
            "Subtotal",
            "Tax",
            "Discount",
            "Total",
            "Confidence Score",
            "Status",
            "Created At"
        ])

        for inv in invoices:
            writer.writerow([
                inv.id,
                inv.file_name,
                inv.vendor_name_extracted or "",
                inv.invoice_number or "",
                inv.po_number or "",
                inv.invoice_date.isoformat() if inv.invoice_date else "",
                inv.due_date.isoformat() if inv.due_date else "",
                inv.currency,
                inv.subtotal,
                inv.tax_amount,
                inv.discount_amount,
                inv.total_amount,
                inv.confidence_score,
                inv.status,
                inv.created_at.isoformat() if inv.created_at else ""
            ])

        return output.getvalue()


report_service = ReportService()
