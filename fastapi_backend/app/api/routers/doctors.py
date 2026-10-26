"""Doctor profile and schedule endpoints."""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.dependencies import get_current_doctor, get_current_active_user
from app.models.user import User
from app.models.doctor_profile import DoctorProfile
from app.schemas.doctor import DoctorProfileOut, WeeklySchedule

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
        .filter(DoctorProfile.id == doctor_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found.",
        )
    return profile


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
