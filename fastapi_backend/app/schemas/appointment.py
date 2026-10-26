"""Appointment Pydantic schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.appointment import AppointmentStatus
from app.schemas.user import UserOut


class AppointmentBase(BaseModel):
    doctor_id: int
    appointment_datetime: datetime
    duration_minutes: int = Field(30, ge=10, le=240)
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus


class AppointmentOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_datetime: datetime
    duration_minutes: int
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    patient: Optional[UserOut] = None
    model_config = ConfigDict(from_attributes=True)
