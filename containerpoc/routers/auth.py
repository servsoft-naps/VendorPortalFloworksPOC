from fastapi import APIRouter
from fastapi import APIRouter
from services.auth import send_magic_link,verify_magic_link
from models.auth import MagicLink,VerifyLink

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/magic-link")
async def magic_link(request:MagicLink):
    return send_magic_link(request)

@router.post("/verify")
async def verify_link(request:VerifyLink):
    return verify_magic_link(request)