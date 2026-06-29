import os,requests
from urllib.parse import quote




TENANT_ID = os.getenv("AZURE_TENANT_ID")
CLIENT_ID = os.getenv("AZURE_CLIENT_ID")
CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")

SENDER=os.getenv("SEND_EMAIL_ADDRESS")
PORTAL_URL = os.getenv("PORTAL_URL")
LOGIN_LINK=f"{PORTAL_URL}/login"
VERIFICATION_LINK=f"{PORTAL_URL}/verify-email"

GRAPH_TOKEN_URL = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"
GRAPH_SENDMAIL_URL = "https://graph.microsoft.com/v1.0/users/{sender}/sendMail"

def get_access_token():
    data = {
        "client_id": CLIENT_ID,
        "scope": "https://graph.microsoft.com/.default",
        "client_secret": CLIENT_SECRET,
        "grant_type": "client_credentials",
    }

    response = requests.post(GRAPH_TOKEN_URL, data=data, timeout=30)
    response.raise_for_status()
    return response.json()["access_token"]

def send_vendor_added_email(to: str, vendor_name: str):
    graph_token = get_access_token()

    url = GRAPH_SENDMAIL_URL.format(sender=SENDER)

    headers = {
        "Authorization": f"Bearer {graph_token}",
        "Content-Type": "application/json",
    }

    subject = "Welcome to Vendor Portal"

    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif;">

        <h2>Welcome, {vendor_name}!</h2>

        <p>Your vendor account has been successfully created.</p>

        <p>You can now access the Vendor Portal using your registered email address.</p>

        <p style="margin:30px 0;">
            <a href="{LOGIN_LINK}"
               style="
                    background:#2563eb;
                    color:#ffffff;
                    text-decoration:none;
                    padding:12px 24px;
                    border-radius:6px;
                    display:inline-block;">
                Login to Vendor Portal
            </a>
        </p>

        <p>
            After entering your email address, we'll send you a secure magic link to sign in.
        </p>

        <br>

        <p>Thank you.</p>
        <p><strong>Vendor Portal Team</strong></p>

    </body>
    </html>
    """

    email_msg = {
        "message": {
            "subject": subject,
            "body": {
                "contentType": "HTML",
                "content": body
            },
            "toRecipients": [
                {
                    "emailAddress": {
                        "address": to
                    }
                }
            ]
        }
    }

    response = requests.post(
        url,
        json=email_msg,
        headers=headers
    )

    response.raise_for_status()

def send_magic_link_email(to:str,token:str):
    print("Inside send_magic_link_email")
    graph_access_token=get_access_token()
    url = GRAPH_SENDMAIL_URL.format(sender=SENDER)
    headers = {
        "Authorization": f"Bearer {graph_access_token}",
        "Content-Type": "application/json",
    }
    verification_url = (
        f"{VERIFICATION_LINK}"
        f"?email={quote(to)}"
        f"&token={quote(token)}"
    )
    subject = f"Verify Your Email Address"
   
    body = f"""<html>
<body>
<tr>
<td colspan="2" style="padding:8px;">
<p>Hi,</p>    
        <p>Please verify your email address by clicking the button below:</p>
        <p style="text-align: center;margin: 25px 0;">
         <a href="{verification_url}" target="_blank"
            style="background-color: #007BFF;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-size: 16px;">
            Verify Email
        </a>
        </p>
</td>
</tr>
</body>
</html>"""
    email_msg = {
        "message": {
            "subject": subject,
            "body": {
                "contentType": "HTML",
                "content": body,
            },
            "toRecipients": [
                {"emailAddress": {"address": to}}
            ],
        }
    }
    try:
        response = requests.post(url, json=email_msg, headers=headers)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        return {"status": "error", "message": str(e)}
    return response.json() if response.content else {"status": "sent"}

