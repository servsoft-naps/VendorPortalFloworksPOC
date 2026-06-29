import os
import base64
from pathlib import Path
from urllib.parse import urlparse
from typing import Optional, Literal
import pyodbc

from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import AzureOpenAI
import fitz  # PyMuPDF — renders PDF pages to images
import html,os, requests 
import secrets
import hashlib
from datetime import datetime, timedelta,UTC
from urllib.parse import quote

from pydantic import BaseModel

import jwt

from datetime import datetime
from datetime import timedelta
# Load the .env that sits next to this file, regardless of the launch directory.
load_dotenv(Path(__file__).with_name(".env"))
from routers.vendor import router as vendor_router
from routers.auth import router as auth_router


app = FastAPI()

app.include_router(vendor_router)
app.include_router(auth_router)



class MagicLinkRequest(BaseModel):
    email: str

# --- Azure OpenAI config (for Aadhaar document validation) ---
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
# Name of your deployed vision-capable model (e.g. a gpt-4o / gpt-4.1 deployment)
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-21")

# TENANT_ID = os.getenv("AZURE_TENANT_ID")
# CLIENT_ID = os.getenv("AZURE_CLIENT_ID")
# CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")

# SENDER=os.getenv("SEND_EMAIL_ADDRESS")
# PORTAL_URL = os.getenv("PORTAL_URL")
# VERIFICATION_LINK=f"{PORTAL_URL}/verify-email"

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

# GRAPH_TOKEN_URL = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"
# GRAPH_SENDMAIL_URL = "https://graph.microsoft.com/v1.0/users/{sender}/sendMail"

# def get_access_token():
#     data = {
#         "client_id": CLIENT_ID,
#         "scope": "https://graph.microsoft.com/.default",
#         "client_secret": CLIENT_SECRET,
#         "grant_type": "client_credentials",
#     }

#     response = requests.post(GRAPH_TOKEN_URL, data=data, timeout=30)
#     response.raise_for_status()
#     return response.json()["access_token"]

def _base_endpoint(endpoint: str) -> str:
    """The openai SDK appends /openai/deployments/... itself, so it needs the
    resource host only. Accept either the plain host or an AI Foundry project
    URL (https://<res>.services.ai.azure.com/api/projects/<name>) and return
    just https://<host>."""
    parsed = urlparse(endpoint)
    return f"{parsed.scheme}://{parsed.netloc}"


def get_azure_openai_client() -> AzureOpenAI:
    if not (AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY and AZURE_OPENAI_DEPLOYMENT):
        raise HTTPException(
            status_code=500,
            detail=(
                "Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT, "
                "AZURE_OPENAI_API_KEY and AZURE_OPENAI_DEPLOYMENT on the server."
            ),
        )
    return AzureOpenAI(
        azure_endpoint=_base_endpoint(AZURE_OPENAI_ENDPOINT),
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
    )

# SQL Server Connection
conn = pyodbc.connect(
    "Driver={ODBC Driver 18 for SQL Server};"
    "Server=localhost;"
    "Database=EmployeeDB;"
    "Trusted_Connection=yes;"
    "TrustServerCertificate=yes;"
    "MARS_Connection=yes;"

)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Employee(BaseModel):
    name: str
    email: str
    department: str
    status: str


class VerifyRequest(BaseModel):
    email: str
    token: str


# READ BY ID
@app.get("/employees/getbyid{id}")
def get_employee(id: int):
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT Id, Name, Email,
               Department, Status
        FROM Employees
        WHERE Id = ?
        """,
        id
    )

    row = cursor.fetchone()

    if not row:
        return {"message": "Employee not found"}

    return {
        "id": row.Id,
        "name": row.Name,
        "email": row.Email,
        "department": row.Department,
        "status": row.Status
    }


# UPDATE
@app.put("/employees/update")
def update_employee(id: int, employee: Employee):
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE Employees
        SET Name = ?,
            Email = ?,
            Department = ?,
            Status = ?
        WHERE Id = ?
        """,
        employee.name,
        employee.email,
        employee.department,
        employee.status,
        id
    )

    conn.commit()

    return {"message": "Employee updated successfully"}




# ====================================================================
#  Aadhaar card validation (Mistral document understanding)
# ====================================================================

class AadhaarValidation(BaseModel):
    is_valid: bool
    extraction_failure_reason: Optional[str] = None
    full_name: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[Literal["Male", "Female", "Other"]] = None
    mask_last_four_digits: Optional[str] = None


AADHAAR_SYSTEM_PROMPT = """You are an expert document validation assistant. \
Your task is to analyze the provided Aadhaar card document, extract specific \
user information, and evaluate its validity.

Perform these validation checks:
1. Document Type Check: Confirm the document is explicitly an Aadhaar card.
2. Aadhaar Number Check: Confirm the number consists of exactly 12 digits \
(grouped as 4-4-4).
3. Vital Fields Check: Ensure Full Name, Date of Birth (DOB) or Year of Birth \
(YOB), and Gender are clearly readable.

Field rules:
- is_valid: true ONLY if it is a readable Aadhaar card with a valid 12-digit \
structure and the vital fields are present.
- extraction_failure_reason: a detailed reason when is_valid is false; null \
otherwise.
- full_name: the full name on the card.
- dob: Date of Birth as YYYY-MM-DD, or just YYYY if only the year is available.
- gender: exactly one of "Male", "Female", or "Other".
- mask_last_four_digits: for security compliance, mask everything EXCEPT the \
last 4 digits, formatted as "XXXX-XXXX-1234".

Base every field strictly on what is visible in the document. Do not guess or \
fabricate values; use null when something cannot be read."""

ALLOWED_AADHAAR_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
}

# Cap how many PDF pages we send to the model (an Aadhaar card is 1-2 pages).
MAX_PDF_PAGES = 4


def _file_to_image_data_urls(contents: bytes, content_type: str) -> list[str]:
    """Turn an uploaded PDF or image into a list of base64 data URLs that the
    Azure OpenAI vision model can read."""
    if content_type == "application/pdf":
        data_urls: list[str] = []
        with fitz.open(stream=contents, filetype="pdf") as doc:
            for page in doc[:MAX_PDF_PAGES]:
                pix = page.get_pixmap(dpi=200)
                b64 = base64.b64encode(pix.tobytes("png")).decode()
                data_urls.append(f"data:image/png;base64,{b64}")
        if not data_urls:
            raise ValueError("The PDF has no readable pages.")
        return data_urls

    # Already an image (png/jpeg/jpg)
    mime = "image/jpeg" if content_type in ("image/jpg", "image/jpeg") else content_type
    b64 = base64.b64encode(contents).decode()
    return [f"data:{mime};base64,{b64}"]

# def send_magic_link_email(to:str,token:str):
#     graph_access_token=get_access_token()
#     url = GRAPH_SENDMAIL_URL.format(sender=SENDER)
#     headers = {
#         "Authorization": f"Bearer {graph_access_token}",
#         "Content-Type": "application/json",
#     }
#     verification_url = (
#         f"{VERIFICATION_LINK}"
#         f"?email={quote(to)}"
#         f"&token={quote(token)}"
#     )
#     subject = f"Verify Your Email Address"
   
#     body = f"""<html>
# <body>
# <tr>
# <td colspan="2" style="padding:8px;">
# <p>Hi,</p>    
#         <p>Please verify your email address by clicking the button below:</p>
#         <p style="text-align: center;margin: 25px 0;">
#          <a href="{verification_url}" target="_blank"
#             style="background-color: #007BFF;
#                     color: white;
#                     padding: 12px 24px;
#                     text-decoration: none;
#                     border-radius: 6px;
#                     font-size: 16px;">
#             Verify Email
#         </a>
#         </p>
# </td>
# </tr>
# </body>
# </html>"""
#     email_msg = {
#         "message": {
#             "subject": subject,
#             "body": {
#                 "contentType": "HTML",
#                 "content": body,
#             },
#             "toRecipients": [
#                 {"emailAddress": {"address": to}}
#             ],
#         }
#     }
#     try:
#         response = requests.post(url, json=email_msg, headers=headers)
#         response.raise_for_status()
#     except requests.exceptions.RequestException as e:
#         return {"status": "error", "message": str(e)}
#     return response.json() if response.content else {"status": "sent"}


@app.post("/aadhaar/validate", response_model=AadhaarValidation)
async def validate_aadhaar(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_AADHAAR_TYPES:
        return AadhaarValidation(
            is_valid=False,
            extraction_failure_reason=(
                f"Unsupported file type '{file.content_type}'. "
                "Please upload a PDF or image (PNG/JPEG) of the Aadhaar card."
            ),
        )

    contents = await file.read()
    if not contents:
        return AadhaarValidation(
            is_valid=False,
            extraction_failure_reason="The uploaded file is empty.",
        )

    client = get_azure_openai_client()

    try:
        image_data_urls = _file_to_image_data_urls(contents, file.content_type)

        user_content = [
            {
                "type": "text",
                "text": "Validate this Aadhaar card and extract the requested fields.",
            }
        ]
        for url in image_data_urls:
            user_content.append({"type": "image_url", "image_url": {"url": url}})

        completion = client.chat.completions.parse(
            model=AZURE_OPENAI_DEPLOYMENT,  # Azure deployment name
            temperature=0,
            messages=[
                {"role": "system", "content": AADHAAR_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            response_format=AadhaarValidation,
        )

        result = completion.choices[0].message.parsed
        if result is None:
            raise ValueError("Model returned no parsed result.")
        return result

    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - surface any failure as a graceful result
        return AadhaarValidation(
            is_valid=False,
            extraction_failure_reason=f"Failed to process the document: {exc}",
        )
    
# @app.post("/auth/magic-link")
# async def send_magic_link(request: MagicLinkRequest):
#     email = request.email
#     cursor = conn.cursor()

#     cursor.execute("""
#         SELECT VendorId, Email
#         FROM Vendors
#         WHERE Email = ?
#         AND IsActive = 1
#     """, email)

#     vendor = cursor.fetchone()

#     if not vendor:
#         raise HTTPException(
#             status_code=404,
#             detail="Vendor not found"
#         )

#     token = secrets.token_urlsafe(32)

#     token_hash = hashlib.sha256(
#         token.encode()
#     ).hexdigest()

#     expiry = datetime.utcnow() + timedelta(minutes=15)

#     cursor.execute("""
#         INSERT INTO MagicLinks
#         (
#             VendorId,
#             TokenHash,
#             ExpiresAt,
#             IsUsed
#         )
#         VALUES (?, ?, ?, ?)
#     """,
#     vendor.VendorId,
#     token_hash,
#     expiry,
#     0)

#     conn.commit()

#     # login_link = (
#     #     f"https://your-ui-url.com"
#     #     f"/verify?token={token}"
#     # )

#     # send_magic_link_email(
#     #     vendor.Email,
#     #     token
#     # )

#     return {
#         "message": "Magic link sent"
#     }

# def create_access_token(data: dict):

#     payload = data.copy()

#     payload["exp"] = (
#         datetime.now(UTC)
#         + timedelta(minutes=30)
#     )

#     payload["type"] = "access"

#     return jwt.encode(
#         payload,
#         SECRET_KEY,
#         algorithm=ALGORITHM
#     )
# def create_refresh_token(data: dict):

#     payload = data.copy()

#     payload["exp"] = (
#         datetime.now(UTC)
#         + timedelta(days=7)
#     )

#     payload["type"] = "refresh"

#     return jwt.encode(
#         payload,
#         SECRET_KEY,
#         algorithm=ALGORITHM
#     )
# @app.post("/auth/verify")
# async def verify_link(request: VerifyRequest):

#     token_hash = hashlib.sha256(
#         request.token.encode()
#     ).hexdigest()
#     print("Email:", request.email)
#     print("Token:", request.token)
#     print("Hash:", token_hash)
#     cursor = conn.cursor()

#     cursor.execute("""
#         SELECT
#             M.MagicLinkId,
#             M.VendorId,
#             V.Email
#         FROM MagicLinks M
#         INNER JOIN Vendors V
#             ON M.VendorId = V.VendorId
#         WHERE
#             V.Email = ?
#             AND M.TokenHash = ?
#             AND M.IsUsed = 0
#             AND M.ExpiresAt > GETUTCDATE()
#     """,
#     request.email,
#     token_hash)

#     row = cursor.fetchone()

#     if not row:
#         raise HTTPException(
#             status_code=401,
#             detail="Invalid or expired link"
#         )

#     cursor.execute("""
#         UPDATE MagicLinks
#         SET IsUsed = 1
#         WHERE MagicLinkId = ?
#     """, row.MagicLinkId)

#     conn.commit()

#     access_token = create_access_token(
#         {
#             "vendor_id": row.VendorId,
#             "email": row.Email
#         }
#     )

#     refresh_token = create_refresh_token(
#         {
#             "vendor_id": row.VendorId,
#             "email": row.Email
#         }
#     )

#     return {
#         "access_token": access_token,
#         "refresh_token": refresh_token,
#         "token_type": "Bearer",
#         "message":"success"
#     }