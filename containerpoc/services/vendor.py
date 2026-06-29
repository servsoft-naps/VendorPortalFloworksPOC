from database import get_connection
from fastapi import HTTPException
from services.mailservice import send_vendor_added_email

def fetch_all_as_dict(cursor):
    columns = [column[0] for column in cursor.description]

    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]
def get_all_vendors():

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute("""
            SELECT
                VendorId AS vendor_id,
                VendorName AS vendor_name,
                Email AS email,
                PhoneNumber AS phone_number,
                CompanyName AS company_name,
                CAST(IsActive As INT) AS status,
                CreatedAt AS created_at
            FROM Vendors
            where  IsActive=?        
        """,1)

        return fetch_all_as_dict(cursor)

    finally:
        cursor.close()
        conn.close()

def add_vendor_details(vendor):
    conn=get_connection()
    cursor=conn.cursor()

    try:
        cursor.execute("""
        SELECT 1
        FROM Vendors
        WHERE Email = ?
        """, vendor.email)

        if cursor.fetchone():
            raise HTTPException(
                status_code=409,
                detail="Email already exists."
            )
        cursor.execute("""
            INSERT INTO Vendors
            (
                VendorName,
                Email,
                PhoneNumber,
                CompanyName,
                isActive
            )
            VALUES (?, ?, ?, ?,?)
        """,
        vendor.vendor_name,
        vendor.email,
        vendor.phone_number,
        vendor.company_name,
        vendor.status
        )

        conn.commit()
        send_vendor_added_email(
        vendor.email,
        vendor.vendor_name
        )

        return {
            "message": "Vendor created successfully"
        }

    finally:
        cursor.close()
        conn.close()


def delete_vendor_details(vendor_id:int):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
        SELECT VendorId
        FROM Vendors
        WHERE VendorId = ?
        """, vendor_id)

        vendor = cursor.fetchone()

        if not vendor:
            raise HTTPException(
                status_code=404,
                detail="Vendor not found"
            )

        cursor.execute("""
            UPDATE Vendors
            SET IsActive = 0
            WHERE VendorId = ?
        """, vendor_id)

       
        conn.commit()

        return {
            "message": "Vendor deactivated successfully"
        }

  

    finally:
        cursor.close()
        conn.close()