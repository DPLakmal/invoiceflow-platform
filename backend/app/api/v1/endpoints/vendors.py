from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.vendor import Vendor
from app.schemas.vendor import VendorResponse, VendorCreate

router = APIRouter()


@router.get("", response_model=List[VendorResponse])
def list_vendors(db: Session = Depends(get_db)):
    """List all recognized vendors."""
    return db.query(Vendor).order_by(desc(Vendor.created_at)).all()


@router.post("", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
def create_vendor(vendor_in: VendorCreate, db: Session = Depends(get_db)):
    """Add a new recognized vendor."""
    existing = db.query(Vendor).filter(Vendor.name == vendor_in.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vendor with name '{vendor_in.name}' already exists"
        )

    vendor = Vendor(**vendor_in.model_dump())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor
