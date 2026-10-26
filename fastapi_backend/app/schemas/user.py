"""User Pydantic schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RoleOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=30)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    role_name: Optional[str] = "Patient"


class DoctorUserCreate(UserBase):
    """Schema for Admin creating a Doctor with initial profile."""
    password: str = Field(..., min_length=6)
    department_id: Optional[int] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: int = 0


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class UserOut(UserBase):
    id: int
    role_id: int
    role: Optional[RoleOut] = None
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
