from pydantic import BaseModel, EmailStr


class AuthBase(BaseModel):
    email: EmailStr

class MagicLink(AuthBase):
    pass

class VerifyLink(AuthBase):
    token:str
