"""Treatment record endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.api.dependencies import get_current_doctor, get_current_active_user
from app.models.user import User
from app.models.appointment import Appointment, AppointmentStatus
from app.models.treatment_record import TreatmentRecord
from app.schemas.treatment import TreatmentRecordCreate, TreatmentRecordOut

router = APIRouter(prefix="/treatments", tags=["Treatments"])


@router.post(
    "/",
    response_model=TreatmentRecordOut,
    status_code=status.HTTP_201_CREATED,
    summary="Record consultation treatment & prescription (Doctor only)",
    description="Saves diagnosis, prescription array, and detailed notes. Automatically marks the appointment as Completed.",
)
async def create_treatment_record(
    treatment_in: TreatmentRecordCreate,
    current_doctor: User = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db),
) -> TreatmentRecordOut:
    """Create or update treatment record for a consultation."""
    # Ensure appointment exists
    appt_result = await db.execute(
        select(Appointment).filter(Appointment.id == treatment_in.appointment_id)
    )
    appointment = appt_result.scalar_one_or_none()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment #{treatment_in.appointment_id} not found.",
        )

    # Verify that the logged-in doctor is the assigned attending physician
    if (
        not current_doctor.doctor_profile
        or appointment.doctor_id != current_doctor.doctor_profile.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to record treatment for another doctor's appointment.",
        )

    # Check if a treatment record already exists
    record_result = await db.execute(
        select(TreatmentRecord).filter(
            TreatmentRecord.appointment_id == treatment_in.appointment_id
        )
    )
    record = record_result.scalar_one_or_none()

    if record:
        # Update existing record
        record.diagnosis = treatment_in.diagnosis
        record.prescription = treatment_in.prescription
        record.detailed_notes = treatment_in.detailed_notes
    else:
        # Create new record
        record = TreatmentRecord(
            appointment_id=treatment_in.appointment_id,
            diagnosis=treatment_in.diagnosis,
            prescription=treatment_in.prescription,
            detailed_notes=treatment_in.detailed_notes,
        )
        db.add(record)

    # Mark the appointment as Completed
    appointment.status = AppointmentStatus.COMPLETED.value

    await db.commit()
    await db.refresh(record)
    return record


@router.get(
    "/appointment/{appointment_id}",
    response_model=TreatmentRecordOut,
    summary="Get treatment record for an appointment",
)
async def get_treatment_by_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> TreatmentRecordOut:
    """Retrieve treatment record for a specific appointment."""
    # Verify appointment exists and permissions
    appt_result = await db.execute(
        select(Appointment).filter(Appointment.id == appointment_id)
    )
    appointment = appt_result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found.",
        )

    role_name = current_user.role.name if current_user.role else ""
    if role_name == "Patient" and appointment.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own treatment records.",
        )

    record_result = await db.execute(
        select(TreatmentRecord).filter(TreatmentRecord.appointment_id == appointment_id)
    )
    record = record_result.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No treatment record found for this appointment.",
        )
    return record
