from fastapi import FastAPI
from pydantic import BaseModel
import pyodbc
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()

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