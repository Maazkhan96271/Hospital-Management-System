"""Laboratory diagnostics API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.lab import LabTest, LabOrder, LabOrderStatus
from app.models.user import User
from app.api.dependencies import get_current_active_user
from app.schemas.lab import (
    LabTestCreate,
    LabTestOut,
    LabOrderCreate,
    LabOrderOut,
    LabOrderUpdate,
)

router = APIRouter(prefix="/lab", tags=["Laboratory Diagnostics"])


@router.get(
    "/tests",
    response_model=List[LabTestOut],
    summary="List all diagnostic laboratory tests",
)
async def list_lab_tests(
    category: Optional[str] = Query(None, description="Filter by test category"),
    db: AsyncSession = Depends(get_db),
) -> List[LabTestOut]:
    """Retrieve catalog of available laboratory diagnostic tests for doctor ordering."""
    stmt = select(LabTest)
    if category and category.strip():
        stmt = stmt.filter(LabTest.category.ilike(f"%{category.strip()}%"))
    stmt = stmt.order_by(LabTest.name.asc())
    result = await db.execute(stmt)
    tests = list(result.scalars().all())
    return [LabTestOut.model_validate(t) for t in tests]


@router.post(
    "/tests",
    response_model=LabTestOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create diagnostic lab test (Admin only)",
)
async def create_lab_test(
    test_in: LabTestCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> LabTestOut:
    """Add a new laboratory test to the hospital diagnostic catalog."""
    role_name = current_user.role.name if current_user.role else ""
    if role_name not in ["Admin", "Doctor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators or medical staff can register lab tests.",
        )

    test = LabTest(**test_in.model_dump())
    db.add(test)
    await db.commit()
    await db.refresh(test)
    return LabTestOut.model_validate(test)


@router.get(
    "/orders/appointment/{appointment_id}",
    response_model=List[LabOrderOut],
    summary="Get lab investigation orders for an appointment",
)
async def get_appointment_lab_orders(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
) -> List[LabOrderOut]:
    """Retrieve all diagnostic orders issued for an appointment."""
    stmt = (
        select(LabOrder)
        .options(selectinload(LabOrder.lab_test))
        .filter(LabOrder.appointment_id == appointment_id)
        .order_by(LabOrder.ordered_at.desc())
    )
    result = await db.execute(stmt)
    orders = list(result.scalars().all())
    return [LabOrderOut.model_validate(o) for o in orders]
