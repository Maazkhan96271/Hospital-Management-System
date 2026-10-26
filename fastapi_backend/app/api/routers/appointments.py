"""Appointment booking and management endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.dependencies import get_current_active_user
from app.models.user import User
from app.models.doctor_profile import DoctorProfile
from app.models.appointment import Appointment, AppointmentStatus
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentStatusUpdate,
)

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.post(
    "/",
    response_model=AppointmentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Book a medical appointment",
    description="Validates doctor availability and strictly prevents double-booking using indexed lookups.",
)
async def book_appointment(
    appt_in: AppointmentCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AppointmentOut:
    """Book a new consultation appointment."""
    # Ensure doctor profile exists and is active
    doc_res = await db.execute(
        select(DoctorProfile)
        .join(User, DoctorProfile.user_id == User.id)
        .filter(DoctorProfile.id == appt_in.doctor_id, User.is_active == True)
    )
    doctor = doc_res.scalar_one_or_none()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active Doctor #{appt_in.doctor_id} not found.",
        )

    # 1. STRICT DOUBLE-BOOKING QUERY ON DATABASE (Using compound index)
    conflict_res = await db.execute(
        select(Appointment).filter(
            Appointment.doctor_id == appt_in.doctor_id,
            Appointment.appointment_datetime == appt_in.appointment_datetime,
            Appointment.status.in_([
                AppointmentStatus.BOOKED.value,
                AppointmentStatus.COMPLETED.value,
            ]),
        )
    )
    if conflict_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Double-Booking Conflict: Doctor #{appt_in.doctor_id} already has a consultation "
                f"scheduled at {appt_in.appointment_datetime}. Please choose another time slot."
            ),
        )

    # 2. Prevent overlapping appointments for the same patient
    patient_conflict = await db.execute(
        select(Appointment).filter(
            Appointment.patient_id == current_user.id,
            Appointment.appointment_datetime == appt_in.appointment_datetime,
            Appointment.status == AppointmentStatus.BOOKED.value,
        )
    )
    if patient_conflict.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an appointment scheduled at this exact time.",
        )

    appointment = Appointment(
        patient_id=current_user.id,
        doctor_id=appt_in.doctor_id,
        appointment_datetime=appt_in.appointment_datetime,
        duration_minutes=appt_in.duration_minutes,
        status=AppointmentStatus.BOOKED.value,
        notes=appt_in.notes,
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)

    # Eager load patient details for schema serialization
    res = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.patient).selectinload(User.role))
        .filter(Appointment.id == appointment.id)
    )
    return res.scalar_one()


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
        selectinload(Appointment.patient).selectinload(User.role)
    )

    if role_name == "Admin":
        # Admin can view all appointments
        pass
    elif role_name == "Doctor":
        # Doctor views only their appointments
        if not current_user.doctor_profile:
            return []
        query = query.filter(Appointment.doctor_id == current_user.doctor_profile.id)
    else:
        # Patient views their own appointments
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
        .options(selectinload(Appointment.patient).selectinload(User.role))
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
        .options(selectinload(Appointment.patient).selectinload(User.role))
        .filter(Appointment.id == appointment.id)
    )
    return refetched.scalar_one()
