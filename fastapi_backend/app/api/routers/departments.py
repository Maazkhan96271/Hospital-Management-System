"""Medical department endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.dependencies import get_current_admin, get_current_active_user
from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentOut, DepartmentUpdate

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get(
    "/",
    response_model=List[DepartmentOut],
    summary="List all medical departments",
)
async def list_departments(
    db: AsyncSession = Depends(get_db),
) -> List[DepartmentOut]:
    """Retrieve all hospital departments with assigned doctor counts."""
    result = await db.execute(
        select(Department)
        .options(selectinload(Department.doctors))
        .order_by(Department.name.asc())
    )
    depts = result.scalars().all()
    output: List[DepartmentOut] = []
    for d in depts:
        dto = DepartmentOut.model_validate(d)
        dto.doctor_count = len(d.doctors) if d.doctors is not None else 0
        output.append(dto)
    return output


@router.post(
    "/",
    response_model=DepartmentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a department (Admin only)",
    dependencies=[Depends(get_current_admin)],
)
async def create_department(
    dept_in: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
) -> DepartmentOut:
    """Create a new medical department."""
    existing = await db.execute(
        select(Department).filter(Department.name.ilike(dept_in.name))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department with name '{dept_in.name}' already exists.",
        )

    dept = Department(name=dept_in.name, description=dept_in.description)
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return dept


@router.get(
    "/{department_id}",
    response_model=DepartmentOut,
    summary="Get department details by ID",
)
async def get_department(
    department_id: int,
    db: AsyncSession = Depends(get_db),
) -> DepartmentOut:
    """Retrieve details for a specific department."""
    dept = await db.get(Department, department_id)
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found.",
        )
    return dept
