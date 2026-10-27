"""Appointment booking and management endpoints."""

from datetime import datetime, date as dt_date, time as dt_time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.dependencies import get_current_active_user, get_current_doctor
from app.models.user import User
from app.models.doctor_profile import DoctorProfile
from app.models.appointment import Appointment, AppointmentStatus
from app.models.treatment_record import TreatmentRecord
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentStatusUpdate,
    CompleteAppointmentRequest,
    DoctorAgendaOut,
)

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.post(
    "/",
    response_model=AppointmentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Book a medical appointment (Patients)",
    description=(
        "Books an appointment with database transaction locks (Select FOR UPDATE) "
        "to prevent race conditions where two patients try to book the exact same slot at the exact same millisecond."
    ),
)
@router.post(
    "",
    response_model=AppointmentOut,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def book_appointment(
    appt_in: AppointmentCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AppointmentOut:
    """Book a new consultation appointment with transaction-level locking."""
    role_name = current_user.role.name if current_user.role else "Patient"

    # Restrict booking endpoint to registered Patients and Administrators
    if role_name not in ["Patient", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only registered patients (or administrators) may book appointments.",
        )

    # Determine booking patient ID (Admins may book on behalf of a patient)
    patient_id = appt_in.patient_id if (role_name == "Admin" and appt_in.patient_id) else current_user.id

    # 1. TRANSACTION LOCK ON DOCTOR PROFILE (Select FOR UPDATE)
    # Serializes concurrent booking attempts for this specific doctor
    doc_lock_stmt = (
        select(DoctorProfile)
        .join(User, DoctorProfile.user_id == User.id)
        .options(selectinload(DoctorProfile.user))
        .filter(DoctorProfile.id == appt_in.doctor_id, User.is_active == True)
        .with_for_update()
    )
    doc_res = await db.execute(doc_lock_stmt)
    doctor = doc_res.scalar_one_or_none()

    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active Doctor #{appt_in.doctor_id} not found.",
        )

    # 2. TRANSACTION LOCK ON CONFLICTING APPOINTMENT (Select FOR UPDATE)
    # Queries the exact datetime and doctor under row-level lock
    conflict_stmt = (
        select(Appointment)
        .filter(
            Appointment.doctor_id == appt_in.doctor_id,
            Appointment.appointment_datetime == appt_in.appointment_datetime,
            Appointment.status.in_([
                AppointmentStatus.BOOKED.value,
                AppointmentStatus.COMPLETED.value,
            ]),
        )
        .with_for_update()
    )
    conflict_res = await db.execute(conflict_stmt)
    if conflict_res.scalar_one_or_none():
        doctor_name = f"Dr. {doctor.user.last_name}" if doctor.user else f"Doctor #{appt_in.doctor_id}"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Double-Booking Conflict: {doctor_name} already has a consultation "
                f"scheduled at {appt_in.appointment_datetime}. Please choose another time slot."
            ),
        )

    # 3. TRANSACTION LOCK ON PATIENT CONFLICT (Select FOR UPDATE)
    # Prevent patient from double-booking themselves in multiple overlapping consultations
    patient_conflict_stmt = (
        select(Appointment)
        .filter(
            Appointment.patient_id == patient_id,
            Appointment.appointment_datetime == appt_in.appointment_datetime,
            Appointment.status == AppointmentStatus.BOOKED.value,
        )
        .with_for_update()
    )
    patient_conflict = await db.execute(patient_conflict_stmt)
    if patient_conflict.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an appointment scheduled at this exact date and time.",
        )

    # 4. Insert and commit new Appointment within the locked transaction
    appointment = Appointment(
        patient_id=patient_id,
        doctor_id=doctor.id,
        appointment_datetime=appt_in.appointment_datetime,
        duration_minutes=appt_in.duration_minutes,
        status=AppointmentStatus.BOOKED.value,
        notes=appt_in.notes,
    )
    db.add(appointment)
    await db.commit()

    # Re-fetch with eager loaded relationships for response serialization
    res = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.patient).selectinload(User.role),
            selectinload(Appointment.treatment_record),
        )
        .filter(Appointment.id == appointment.id)
    )
    return res.scalar_one()


@router.post(
    "/{appointment_id}/complete",
    response_model=AppointmentOut,
    summary="Complete an appointment and attach a TreatmentRecord (Doctor only)",
    description=(
        "Updates the appointment status to 'Completed' and saves clinical diagnosis, "
        "prescription array, and detailed consultation notes."
    ),
)
@router.put(
    "/{appointment_id}/complete",
    response_model=AppointmentOut,
    include_in_schema=False,
)
async def complete_appointment_with_treatment(
    appointment_id: int,
    treatment_data: CompleteAppointmentRequest,
    current_doctor: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AppointmentOut:
    """Doctor endpoint to finalize consultation, mark Completed, and record treatment."""
    role_name = current_doctor.role.name if current_doctor.role else ""

    # Access check: Doctor or Admin
    if role_name not in ["Doctor", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only attending doctors (or administrators) can complete appointments.",
        )

    # Fetch appointment
    result = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.patient).selectinload(User.role),
            selectinload(Appointment.treatment_record),
        )
        .filter(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment #{appointment_id} not found.",
        )

    # If Doctor, ensure this appointment is assigned to them
    if role_name == "Doctor":
        if (
            not current_doctor.doctor_profile
            or appointment.doctor_id != current_doctor.doctor_profile.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to complete another physician's appointment.",
            )

    # 1. Update appointment status to Completed
    appointment.status = AppointmentStatus.COMPLETED.value

    # 2. Attach or update TreatmentRecord
    if appointment.treatment_record:
        treatment = appointment.treatment_record
        treatment.diagnosis = treatment_data.diagnosis
        treatment.prescription = treatment_data.prescription
        treatment.detailed_notes = treatment_data.detailed_notes
    else:
        treatment = TreatmentRecord(
            appointment_id=appointment.id,
            diagnosis=treatment_data.diagnosis,
            prescription=treatment_data.prescription,
            detailed_notes=treatment_data.detailed_notes,
        )
        appointment.treatment_record = treatment
        db.add(treatment)

    await db.flush()
    await db.commit()
    await db.refresh(treatment)
    await db.refresh(appointment, ["updated_at", "status"])
    return AppointmentOut.model_validate(appointment)


@router.get(
    "/agenda",
    response_model=DoctorAgendaOut,
    summary="Get Doctor's daily agenda (Doctor only)",
)
async def get_my_appointments_agenda(
    date: Optional[str] = Query(
        None,
        description="Agenda date in YYYY-MM-DD format (defaults to today)",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    ),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> DoctorAgendaOut:
    """Fetch daily agenda of appointments for the current doctor."""
    role_name = current_user.role.name if current_user.role else ""
    if role_name != "Doctor" or not current_user.doctor_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Daily agenda is only accessible to doctors with active profiles.",
        )

    doctor_id = current_user.doctor_profile.id

    if not date:
        target_date = dt_date.today()
        date = target_date.strftime("%Y-%m-%d")
    else:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Expected YYYY-MM-DD.",
            )

    day_start = datetime.combine(target_date, dt_time.min)
    day_end = datetime.combine(target_date, dt_time.max)

    stmt = (
        select(Appointment)
        .options(
            selectinload(Appointment.patient).selectinload(User.role),
            selectinload(Appointment.treatment_record),
        )
        .filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_datetime >= day_start,
            Appointment.appointment_datetime <= day_end,
        )
        .order_by(Appointment.appointment_datetime.asc())
    )
    result = await db.execute(stmt)
    appts = list(result.scalars().all())

    return DoctorAgendaOut(
        doctor_id=doctor_id,
        doctor_name=f"Dr. {current_user.first_name} {current_user.last_name}",
        date=date,
        total_appointments=len(appts),
        booked_count=sum(1 for a in appts if a.status == AppointmentStatus.BOOKED.value),
        completed_count=sum(1 for a in appts if a.status == AppointmentStatus.COMPLETED.value),
        cancelled_count=sum(1 for a in appts if a.status == AppointmentStatus.CANCELLED.value),
        appointments=appts,
    )


@router.get(
    "/",
    response_model=List[AppointmentOut],
    summary="List appointments (Role-filtered)",
)
async def list_appointments(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> List[AppointmentOut]:
    """Retrieve appointments filtered by the caller's role (Admin sees all, Doctor sees assigned, Patient sees personal)."""
    role_name = current_user.role.name if current_user.role else ""

    query = select(Appointment).options(
        selectinload(Appointment.patient).selectinload(User.role),
        selectinload(Appointment.treatment_record),
    )

    if role_name == "Admin":
        pass
    elif role_name == "Doctor":
        if not current_user.doctor_profile:
            return []
        query = query.filter(Appointment.doctor_id == current_user.doctor_profile.id)
    else:
        query = query.filter(Appointment.patient_id == current_user.id)

    query = query.order_by(Appointment.appointment_datetime.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


@router.patch(
    "/{appointment_id}/status",
    response_model=AppointmentOut,
    summary="Update appointment status (Booked / Completed / Cancelled)",
)
async def update_appointment_status(
    appointment_id: int,
    status_in: AppointmentStatusUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AppointmentOut:
    """Update appointment status with permission checks."""
    result = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.patient).selectinload(User.role),
            selectinload(Appointment.treatment_record),
        )
        .filter(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found.",
        )

    role_name = current_user.role.name if current_user.role else ""

    # Permission verification
    if role_name == "Patient":
        if appointment.patient_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only modify your own appointments.",
            )
        # Patients can only cancel their own booked appointments
        if status_in.status != AppointmentStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Patients are only permitted to cancel appointments.",
            )
    elif role_name == "Doctor":
        if not current_user.doctor_profile or appointment.doctor_id != current_user.doctor_profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not the assigned doctor for this appointment.",
            )

    appointment.status = status_in.status.value
    await db.commit()

    refetched = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.patient).selectinload(User.role),
            selectinload(Appointment.treatment_record),
        )
        .filter(Appointment.id == appointment.id)
    )
    return refetched.scalar_one()
