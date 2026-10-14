from fastapi import APIRouter
from app.api.v1.endpoints import invoices, jobs, vendors, reports, health

api_router = APIRouter()

api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Processing Jobs"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["Vendors"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports & Analytics"])
api_router.include_router(health.router, prefix="/health", tags=["Health"])
