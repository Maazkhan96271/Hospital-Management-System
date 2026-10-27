"""Appointment Pydantic schemas."""

from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.appointment import AppointmentStatus
from app.schemas.user import UserOut
from app.schemas.treatment import TreatmentRecordOut


class AppointmentBase(BaseModel):
    doctor_id: int
    patient_id: Optional[int] = None
    appointment_datetime: Optional[datetime] = None
    date: Optional[str] = None
    time: Optional[str] = None
    duration_minutes: int = Field(30, ge=10, le=240)
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    @model_validator(mode="before")
    @classmethod
    def parse_schedule_inputs(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("appointment_datetime"):
                date_val = data.get("date")
                time_val = data.get("time")
                if date_val and time_val:
                    try:
                        parsed_date = datetime.strptime(str(date_val).strip(), "%Y-%m-%d").date()
                        time_str = str(time_val).strip()
                        if len(time_str) == 5:
                            parsed_time = datetime.strptime(time_str, "%H:%M").time()
                        else:
                            parsed_time = datetime.strptime(time_str, "%H:%M:%S").time()
                        data["appointment_datetime"] = datetime.combine(parsed_date, parsed_time)
                    except ValueError as e:
                        raise ValueError(f"Invalid date/time format: {e}")
                else:
                    raise ValueError(
                        "Must provide either 'appointment_datetime' or both 'date' and 'time'."
                    )
        return data


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus


class CompleteAppointmentRequest(BaseModel):
    """Payload for completing an appointment while attaching a TreatmentRecord."""
    diagnosis: str = Field(..., min_length=2, description="Clinical diagnosis for the consultation")
    prescription: List[str] = Field(default_factory=list, description="Prescription medications array")
    detailed_notes: Optional[str] = Field(None, description="Detailed physician consultation notes")


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
    treatment_record: Optional[TreatmentRecordOut] = None
    model_config = ConfigDict(from_attributes=True)


class DoctorAgendaOut(BaseModel):
    doctor_id: int
    doctor_name: Optional[str] = None
    date: str
    total_appointments: int = 0
    booked_count: int = 0
    completed_count: int = 0
    cancelled_count: int = 0
    appointments: List[AppointmentOut] = []
    model_config = ConfigDict(from_attributes=True)
