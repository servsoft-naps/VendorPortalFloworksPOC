import os
import base64
from pathlib import Path
from urllib.parse import urlparse
from typing import Optional, Literal

from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import pyodbc
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import AzureOpenAI
import fitz  # PyMuPDF — renders PDF pages to images

# Load the .env that sits next to this file, regardless of the launch directory.
load_dotenv(Path(__file__).with_name(".env"))

app = FastAPI()

# --- Azure OpenAI config (for Aadhaar document validation) ---
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
# Name of your deployed vision-capable model (e.g. a gpt-4o / gpt-4.1 deployment)
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-21")


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


# CREATE
@app.post("/employees/add")
def create_employee(employee: Employee):
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO Employees
        (Name, Email, Department, Status)
        VALUES (?, ?, ?, ?)
        """,
        employee.name,
        employee.email,
        employee.department,
        employee.status
    )

    conn.commit()

    return {"message": "Employee created successfully"}


# READ ALL
@app.get("/employees/get")
def get_employees():
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT Id, Name, Email,
               Department, Status
        FROM Employees
        """
    )

    rows = cursor.fetchall()

    result = []

    for row in rows:
        result.append({
            "id": row.Id,
            "name": row.Name,
            "email": row.Email,
            "department": row.Department,
            "status": row.Status
        })

    return result


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


# DELETE
@app.delete("/employees/delete")
def delete_employee(id: int):
    cursor = conn.cursor()

    cursor.execute(
        "DELETE FROM Employees WHERE Id = ?",
        id
    )

    conn.commit()

    return {"message": "Employee deleted successfully"}


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