"""User management endpoints (Admin protected)."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import hash_password
from app.api.dependencies import get_current_admin, get_current_active_user
from app.models.role import Role
from app.models.user import User
from app.models.doctor_profile import DoctorProfile, DEFAULT_WEEKLY_AVAILABILITY
from app.models.department import Department
from app.schemas.user import UserOut, DoctorUserCreate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/",
    response_model=List[UserOut],
    summary="List all users (Admin only)",
    dependencies=[Depends(get_current_admin)],
)
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
) -> List[UserOut]:
    """Retrieve all users in the system."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.role))
        .offset(skip)
        .limit(limit)
        .order_by(User.id.asc())
    )
    return list(result.scalars().all())


@router.post(
    "/doctors",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Doctor user and profile (Admin only)",
    dependencies=[Depends(get_current_admin)],
)
async def create_doctor(
    doctor_in: DoctorUserCreate,
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """Admin-only endpoint to provision a Doctor account and DoctorProfile."""
    # Check if username or email already exists
    existing = await db.execute(
        select(User).filter(
            (User.username == doctor_in.username) | (User.email == doctor_in.email)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is already registered.",
        )

    # Validate department if provided
    if doctor_in.department_id:
        dept_result = await db.execute(
            select(Department).filter(Department.id == doctor_in.department_id)
        )
        if not dept_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department #{doctor_in.department_id} not found.",
            )

    # Fetch Doctor role
    role_res = await db.execute(select(Role).filter(Role.name == "Doctor"))
    doctor_role = role_res.scalar_one_or_none()
    if not doctor_role:
        doctor_role = Role(name="Doctor", description="Hospital attending physician")
        db.add(doctor_role)
        await db.flush()

    new_user = User(
        email=doctor_in.email,
        username=doctor_in.username,
        hashed_password=hash_password(doctor_in.password),
        first_name=doctor_in.first_name,
        last_name=doctor_in.last_name,
        phone=doctor_in.phone,
        role_id=doctor_role.id,
        is_active=True,
    )
    db.add(new_user)
    await db.flush()  # obtain user ID

    # Create associated doctor profile with JSONB weekly schedule
    profile = DoctorProfile(
        user_id=new_user.id,
        department_id=doctor_in.department_id,
        specialization=doctor_in.specialization,
        qualification=doctor_in.qualification,
        experience_years=doctor_in.experience_years,
        weekly_availability=DEFAULT_WEEKLY_AVAILABILITY,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(new_user)

    res = await db.execute(
        select(User).options(selectinload(User.role)).filter(User.id == new_user.id)
    )
    return res.scalar_one()


@router.patch(
    "/{user_id}/toggle-active",
    response_model=UserOut,
    summary="Toggle user active status / blacklist (Admin only)",
    dependencies=[Depends(get_current_admin)],
)
async def toggle_user_active(
    user_id: int,
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """Activate or deactivate a user account."""
    result = await db.execute(
        select(User).options(selectinload(User.role)).filter(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    user.is_active = not user.is_active
    await db.commit()

    res = await db.execute(
        select(User).options(selectinload(User.role)).filter(User.id == user.id)
    )
    return res.scalar_one()


@router.get(
    "/patients/search",
    response_model=List[UserOut],
    summary="Search patients by name, email, or ID (Admins & Doctors only)",
)
async def search_patients(
    q: str = Query("", description="Query string for patient name, email, or ID"),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> List[UserOut]:
    """Instant patient search endpoint for global Cmd+K interface."""
    role_name = current_user.role.name if current_user.role else ""
    if role_name not in ["Admin", "Doctor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators and medical doctors can search patient records.",
        )

    query = (
        select(User)
        .join(Role, User.role_id == Role.id)
        .options(selectinload(User.role))
        .filter(Role.name == "Patient")
    )

    clean_q = q.strip()
    if clean_q:
        clean_id_str = clean_q.lstrip("#")
        conditions = [
            User.email.ilike(f"%{clean_q}%"),
            User.username.ilike(f"%{clean_q}%"),
            User.first_name.ilike(f"%{clean_q}%"),
            User.last_name.ilike(f"%{clean_q}%"),
        ]
        if clean_id_str.isdigit():
            conditions.append(User.id == int(clean_id_str))

        query = query.filter(or_(*conditions))

    query = query.order_by(User.first_name.asc(), User.last_name.asc()).limit(limit)
    res = await db.execute(query)
    return list(res.scalars().all())

