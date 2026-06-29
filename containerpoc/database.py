import pyodbc

CONNECTION_STRING = (
    "Driver={ODBC Driver 18 for SQL Server};"
    "Server=localhost;"
    "Database=EmployeeDB;"
    "Trusted_Connection=yes;"
    "TrustServerCertificate=yes;"
    "MARS_Connection=yes;"
)

def get_connection():
    return pyodbc.connect(CONNECTION_STRING)