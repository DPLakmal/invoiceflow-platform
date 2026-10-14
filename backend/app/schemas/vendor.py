from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class VendorBase(BaseModel):
    name: str
    tax_id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class VendorCreate(VendorBase):
    pass


class VendorResponse(VendorBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
