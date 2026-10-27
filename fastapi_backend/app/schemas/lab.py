"""LabTest and LabOrder Pydantic schemas for clinical diagnostics."""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field


class LabTestBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    cost: float = Field(..., ge=0.0)
    normal_range: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


class LabTestCreate(LabTestBase):
    pass


class LabTestUpdate(BaseModel):
    name: Optional[str] = None
    cost: Optional[float] = Field(None, ge=0.0)
    normal_range: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


class LabTestOut(LabTestBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LabOrderBase(BaseModel):
    appointment_id: int
    lab_test_id: int
    status: str = "Pending"
    results: Optional[str] = None
    notes: Optional[str] = None


class LabOrderCreate(LabOrderBase):
    pass


class LabOrderUpdate(BaseModel):
    status: Optional[str] = None
    results: Optional[str] = None
    notes: Optional[str] = None
    completed_at: Optional[datetime] = None


class LabOrderOut(LabOrderBase):
    id: int
    ordered_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    lab_test: Optional[LabTestOut] = None

    model_config = ConfigDict(from_attributes=True)
