"""Doctor profile, slot availability, and schedule endpoints."""

from datetime import datetime, date as dt_date, time as dt_time, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.dependencies import get_current_doctor, get_current_active_user
from app.models.user import User
from app.models.doctor_profile import DoctorProfile, DEFAULT_WEEKLY_AVAILABILITY
from app.models.appointment import Appointment, AppointmentStatus
from app.schemas.doctor import DoctorProfileOut, WeeklySchedule
from app.schemas.appointment import DoctorAgendaOut, AppointmentOut

router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.get(
    "/",
    response_model=List[DoctorProfileOut],
    summary="List all active doctors with 7-day schedules",
)
async def list_doctors(
    db: AsyncSession = Depends(get_db),
) -> List[DoctorProfileOut]:
    """Retrieve all doctor profiles with user and department info."""
    result = await db.execute(
        select(DoctorProfile)
        .join(User, DoctorProfile.user_id == User.id)
        .options(
            selectinload(DoctorProfile.user).selectinload(User.role),
            selectinload(DoctorProfile.department),
        )
        .filter(User.is_active == True)
        .order_by(DoctorProfile.id.asc())
    )
    return list(result.scalars().all())


@router.get(
    "/me/agenda",
    response_model=DoctorAgendaOut,
    summary="Fetch daily agenda for the logged-in doctor",
)
async def get_my_daily_agenda(
    date: Optional[str] = Query(
        None,
        description="Agenda date in YYYY-MM-DD format (defaults to today)",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    ),
    current_doctor: User = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db),
) -> DoctorAgendaOut:
    """Doctor endpoint to fetch all scheduled appointments for a given date."""
    if not current_doctor.doctor_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found for authenticated user.",
        )

    return await _fetch_doctor_agenda(
        doctor_id=current_doctor.doctor_profile.id,
        date_str=date,
        doctor_user=current_doctor,
        db=db,
    )


@router.put(
    "/me/availability",
    response_model=DoctorProfileOut,
    summary="Update 7-day availability schedule (Doctor only)",
)
async def update_doctor_availability(
    schedule: WeeklySchedule,
    current_doctor: User = Depends(get_current_doctor),
    db: AsyncSession = Depends(get_db),
) -> DoctorProfileOut:
    """Doctor endpoint to update their weekly availability schedule in the JSONB column."""
    result = await db.execute(
        select(DoctorProfile)
        .options(
            selectinload(DoctorProfile.user).selectinload(User.role),
            selectinload(DoctorProfile.department),
        )
        .filter(DoctorProfile.user_id == current_doctor.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found for the logged-in doctor.",
        )

    # Convert Pydantic schedule to dictionary for JSONB column
    profile.weekly_availability = schedule.model_dump()
    await db.commit()

    refetched = await db.execute(
        select(DoctorProfile)
        .options(
            selectinload(DoctorProfile.user).selectinload(User.role),
            selectinload(DoctorProfile.department),
        )
        .filter(DoctorProfile.id == profile.id)
    )
    return refetched.scalar_one()


@router.get(
    "/{doctor_id}/slots",
    response_model=List[str],
    summary="Get available 30-minute time slots for a doctor on a specific date",
    description=(
        "Reads the doctor's JSONB availability schedule, divides working hours into 30-minute slots, "
        "and cross-references the Appointment table to REMOVE slots that are already booked or cancelled."
    ),
)
async def get_doctor_available_slots(
    doctor_id: int,
    date: str = Query(
        ...,
        description="Date to check availability in YYYY-MM-DD format",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    ),
    db: AsyncSession = Depends(get_db),
) -> List[str]:
    """Calculate and return only available 30-minute consultation slots for a doctor."""
    # 1. Resolve DoctorProfile by id or user_id
    result = await db.execute(
        select(DoctorProfile)
        .join(User, DoctorProfile.user_id == User.id)
        .options(selectinload(DoctorProfile.user))
        .filter(
            (DoctorProfile.id == doctor_id) | (DoctorProfile.user_id == doctor_id),
            User.is_active == True,
        )
    )
    doctor = result.scalars().first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active Doctor #{doctor_id} not found.",
        )

    # 2. Parse date and identify day of the week
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Expected YYYY-MM-DD.",
        )

    day_name = target_date.strftime("%A").lower()  # e.g., 'monday', 'wednesday'

    # 3. Read doctor's JSONB availability schedule
    availability = doctor.weekly_availability or DEFAULT_WEEKLY_AVAILABILITY
    day_config = availability.get(day_name, {})

    # If the doctor does not work on this day, return no slots
    if not day_config.get("available", False):
        return []

    start_str = day_config.get("start", "09:00")
    end_str = day_config.get("end", "17:00")

    try:
        start_t = datetime.strptime(start_str, "%H:%M").time()
        end_t = datetime.strptime(end_str, "%H:%M").time()
    except ValueError:
        return []

    # 4. Divide working hours into 30-minute slots
    current_dt = datetime.combine(target_date, start_t)
    shift_end_dt = datetime.combine(target_date, end_t)
    slot_interval = timedelta(minutes=30)

    all_slots: List[str] = []
    while current_dt + slot_interval <= shift_end_dt:
        all_slots.append(current_dt.strftime("%H:%M"))
        current_dt += slot_interval

    # 5. Cross-reference Appointment table:
    # REMOVE slots that are already booked, completed, or cancelled
    day_start = datetime.combine(target_date, dt_time.min)
    day_end = datetime.combine(target_date, dt_time.max)

    appt_stmt = select(Appointment).filter(
        Appointment.doctor_id == doctor.id,
        Appointment.appointment_datetime >= day_start,
        Appointment.appointment_datetime <= day_end,
        Appointment.status.in_([
            AppointmentStatus.BOOKED.value,
            AppointmentStatus.COMPLETED.value,
            AppointmentStatus.CANCELLED.value,
        ]),
    )
    appt_result = await db.execute(appt_stmt)
    existing_appointments = appt_result.scalars().all()

    occupied_times = {
        appt.appointment_datetime.strftime("%H:%M")
        for appt in existing_appointments
    }

    # Only return available time slots
    available_slots = [s for s in all_slots if s not in occupied_times]
    return available_slots


@router.get(
    "/{doctor_id}/agenda",
    response_model=DoctorAgendaOut,
    summary="Fetch daily agenda for a specific doctor",
)
async def get_doctor_agenda(
    doctor_id: int,
    date: Optional[str] = Query(
        None,
        description="Agenda date in YYYY-MM-DD format (defaults to today)",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    ),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> DoctorAgendaOut:
    """Fetch agenda for a specific doctor. Accessible by the doctor or an admin."""
    role_name = current_user.role.name if current_user.role else ""

    # Permission check: Doctor can only access their own agenda; Admin can access any
    if role_name == "Doctor":
        if not current_user.doctor_profile or current_user.doctor_profile.id != doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You may only view your own daily agenda.",
            )
    elif role_name != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to doctors and administrators.",
        )

    return await _fetch_doctor_agenda(
        doctor_id=doctor_id,
        date_str=date,
        doctor_user=None,
        db=db,
    )


@router.get(
    "/{doctor_id}",
    response_model=DoctorProfileOut,
    summary="Get doctor profile by ID",
)
async def get_doctor(
    doctor_id: int,
    db: AsyncSession = Depends(get_db),
) -> DoctorProfileOut:
    """Retrieve a specific doctor profile."""
    result = await db.execute(
        select(DoctorProfile)
        .options(
            selectinload(DoctorProfile.user).selectinload(User.role),
            selectinload(DoctorProfile.department),
        )
        .filter(
            (DoctorProfile.id == doctor_id) | (DoctorProfile.user_id == doctor_id)
        )
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found.",
        )
    return profile


async def _fetch_doctor_agenda(
    doctor_id: int,
    date_str: Optional[str],
    doctor_user: Optional[User],
    db: AsyncSession,
) -> DoctorAgendaOut:
    """Helper to query appointments and build daily agenda summary for a doctor."""
    if not date_str:
        target_date = dt_date.today()
        date_str = target_date.strftime("%Y-%m-%d")
    else:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Expected YYYY-MM-DD.",
            )

    day_start = datetime.combine(target_date, dt_time.min)
    day_end = datetime.combine(target_date, dt_time.max)

    # Fetch doctor details if not passed
    doc_name = None
    if doctor_user:
        doc_name = f"Dr. {doctor_user.first_name} {doctor_user.last_name}"
    else:
        doc_res = await db.execute(
            select(DoctorProfile)
            .options(selectinload(DoctorProfile.user))
            .filter(DoctorProfile.id == doctor_id)
        )
        doc = doc_res.scalar_one_or_none()
        if doc and doc.user:
            doc_name = f"Dr. {doc.user.first_name} {doc.user.last_name}"

    # Query appointments for the day
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

    total = len(appts)
    booked = sum(1 for a in appts if a.status == AppointmentStatus.BOOKED.value)
    completed = sum(1 for a in appts if a.status == AppointmentStatus.COMPLETED.value)
    cancelled = sum(1 for a in appts if a.status == AppointmentStatus.CANCELLED.value)

    return DoctorAgendaOut(
        doctor_id=doctor_id,
        doctor_name=doc_name,
        date=date_str,
        total_appointments=total,
        booked_count=booked,
        completed_count=completed,
        cancelled_count=cancelled,
        appointments=appts,
    )
