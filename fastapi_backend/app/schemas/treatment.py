"""Treatment record Pydantic schemas."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class TreatmentRecordBase(BaseModel):
    appointment_id: int
    diagnosis: str = Field(..., min_length=2)
    prescription: List[str] = Field(default_factory=list)
    detailed_notes: Optional[str] = None


class TreatmentRecordCreate(TreatmentRecordBase):
    pass


class TreatmentRecordUpdate(BaseModel):
    diagnosis: Optional[str] = None
    prescription: Optional[List[str]] = None
    detailed_notes: Optional[str] = None


class TreatmentRecordOut(TreatmentRecordBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
