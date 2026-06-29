from pydantic import BaseModel
from datetime import datetime

class VendorBase(BaseModel):
    vendor_name: str
    email: str
    phone_number: str
    company_name: str
    status:bool


class VendorCreate(VendorBase):
    pass

class VendorResponse(VendorBase):
    vendor_id: int
    created_at: datetime