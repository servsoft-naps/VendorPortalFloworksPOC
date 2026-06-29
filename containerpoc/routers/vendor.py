from fastapi import APIRouter
from services.vendor import get_all_vendors,add_vendor_details,delete_vendor_details
from models.vendor import VendorCreate
router = APIRouter(
    prefix="/vendors",
    tags=["Vendors"]
)
@router.get("/get-vendors")
async def get_vendors():
    return get_all_vendors()
   

@router.post("/add-vendor")
async def add_vendor(vendor:VendorCreate):
    return add_vendor_details(vendor)

@router.delete("/delete-vendor")
async def delete_vendor(vendor_id:int):
    return delete_vendor_details(vendor_id)
