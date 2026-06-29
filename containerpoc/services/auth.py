from database import get_connection
from fastapi import HTTPException
from services.mailservice import send_magic_link_email
import secrets
import hashlib
from datetime import datetime, timedelta,UTC
from fastapi import HTTPException
import jwt
import os


SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
def send_magic_link(request):
    email=request.email
    conn=get_connection()
    cursor=conn.cursor()

    cursor.execute("""
        SELECT VendorId, Email
        FROM Vendors
        WHERE Email = ?
        AND IsActive = 1
    """, email)

    vendor = cursor.fetchone()

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    token = secrets.token_urlsafe(32)

    token_hash = hashlib.sha256(
        token.encode()
    ).hexdigest()

    expiry = datetime.now(UTC) + timedelta(minutes=15)

    cursor.execute("""
        INSERT INTO MagicLinks
        (
            VendorId,
            TokenHash,
            ExpiresAt,
            IsUsed
        )
        VALUES (?, ?, ?, ?)
    """,
    vendor.VendorId,
    token_hash,
    expiry,
    0)

    conn.commit()
    send_magic_link_email(
        vendor.Email,
        token
    )


    return {
        "message": "Magic link sent"
    }
def create_access_token(data: dict):

    payload = data.copy()

    payload["exp"] = (
        datetime.now(UTC)
        + timedelta(minutes=30)
    )

    payload["type"] = "access"

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )
def create_refresh_token(data: dict):

    payload = data.copy()

    payload["exp"] = (
        datetime.now(UTC)
        + timedelta(days=7)
    )

    payload["type"] = "refresh"

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )
def verify_magic_link(request):
    token_hash = hashlib.sha256(
        request.token.encode()
    ).hexdigest()
     
    conn=get_connection()
    cursor=conn.cursor()

    cursor.execute("""
        SELECT
            M.MagicLinkId,
            M.VendorId,
            V.Email
        FROM MagicLinks M
        INNER JOIN Vendors V
            ON M.VendorId = V.VendorId
        WHERE
            V.Email = ?
            AND M.TokenHash = ?
            AND M.IsUsed = 0
            AND M.ExpiresAt > GETUTCDATE()
    """,
    request.email,
    token_hash)

    row = cursor.fetchone()

    if not row:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired link"
        )
    cursor.execute("""
        UPDATE MagicLinks
        SET IsUsed = 1
        WHERE MagicLinkId = ?
    """, row.MagicLinkId)

    conn.commit()

    access_token = create_access_token(
        {
            "vendor_id": row.VendorId,
            "email": row.Email
        }
    )

    refresh_token = create_refresh_token(
        {
            "vendor_id": row.VendorId,
            "email": row.Email
        }
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer",
        "message":"success"
    }