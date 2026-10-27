"""Department Pydantic schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    description: Optional[str] = None


class DepartmentOut(DepartmentBase):
    id: int
    created_at: datetime
    doctor_count: Optional[int] = 0
    model_config = ConfigDict(from_attributes=True)
