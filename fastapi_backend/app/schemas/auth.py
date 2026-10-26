"""Authentication Pydantic schemas."""

from typing import Optional
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    """JWT response model."""
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    user_id: int


class TokenPayload(BaseModel):
    """Decoded JWT payload."""
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None


class LoginRequest(BaseModel):
    """JSON login request payload."""
    username: str
    password: str
