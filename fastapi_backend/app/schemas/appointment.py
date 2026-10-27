"""Appointment Pydantic schemas."""

from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.appointment import AppointmentStatus
from app.schemas.user import UserOut
from app.schemas.treatment import TreatmentRecordOut
from app.schemas.vitals import VitalsOut
from app.schemas.lab import LabOrderOut
from app.schemas.billing import InvoiceOut


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


class VitalsInput(BaseModel):
    height: Optional[float] = None
    weight: Optional[float] = None
    bmi: Optional[float] = None
    blood_pressure: Optional[str] = None
    temperature: Optional[float] = None
    pulse: Optional[int] = None
    respiratory_rate: Optional[int] = None
    oxygen_saturation: Optional[float] = None
    notes: Optional[str] = None


class PrescribedMedicineInput(BaseModel):
    pharmacy_item_id: Optional[int] = None
    name: str
    dosage: str = "1-0-1 after meals"
    duration: Optional[str] = "5 days"
    quantity: int = 1
    unit_price: Optional[float] = 0.0


class CompleteAppointmentRequest(BaseModel):
    """Payload for completing an appointment with EMR Vitals, Prescriptions, Lab Orders, and Invoicing."""
    diagnosis: str = Field(..., min_length=2, description="Clinical diagnosis for the consultation")
    prescription: List[str] = Field(default_factory=list, description="Prescription medications array")
    detailed_notes: Optional[str] = Field(None, description="Detailed physician consultation notes")
    vitals: Optional[VitalsInput] = None
    medicines: Optional[List[PrescribedMedicineInput]] = Field(default_factory=list)
    lab_test_ids: Optional[List[int]] = Field(default_factory=list)
    consultation_fee: Optional[float] = 500.0


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


class AppointmentDetailOut(AppointmentOut):
    vitals: Optional[VitalsOut] = None
    lab_orders: Optional[List[LabOrderOut]] = None
    invoices: Optional[List[InvoiceOut]] = None
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
