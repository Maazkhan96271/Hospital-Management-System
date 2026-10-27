"""Laboratory diagnostics and technician portal API endpoints."""

from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.lab import LabTest, LabOrder, LabOrderStatus
from app.models.appointment import Appointment
from app.models.doctor_profile import DoctorProfile
from app.models.user import User
from app.api.dependencies import get_current_active_user
from app.schemas.lab import (
    LabTestCreate,
    LabTestOut,
    LabOrderCreate,
    LabOrderOut,
    LabOrderUpdate,
    LabOrderCompleteRequest,
)

router = APIRouter(prefix="/lab", tags=["Laboratory Diagnostics & Portal"])


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
    "/orders",
    response_model=List[LabOrderOut],
    summary="List laboratory investigation orders (for Lab Technician Portal)",
)
async def list_lab_orders(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Pending, Completed)"),
    db: AsyncSession = Depends(get_db),
) -> List[LabOrderOut]:
    """
    Retrieve lab orders for the technician portal with patient, doctor, and test details.
    """
    stmt = (
        select(LabOrder)
        .options(
            selectinload(LabOrder.lab_test),
            selectinload(LabOrder.appointment).selectinload(Appointment.patient),
            selectinload(LabOrder.appointment).selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
        )
        .order_by(LabOrder.ordered_at.desc())
    )

    if status_filter and status_filter.strip():
        stmt = stmt.filter(LabOrder.status.ilike(status_filter.strip()))

    result = await db.execute(stmt)
    orders = list(result.scalars().all())

    order_outs: List[LabOrderOut] = []
    for o in orders:
        patient_name = "Patient"
        patient_id = None
        doctor_name = "Doctor"

        if o.appointment and o.appointment.patient:
            p = o.appointment.patient
            patient_name = f"{p.first_name} {p.last_name}".strip() or p.username
            patient_id = p.id

        if o.appointment and o.appointment.doctor and hasattr(o.appointment.doctor, "user") and o.appointment.doctor.user:
            u = o.appointment.doctor.user
            doctor_name = f"Dr. {u.first_name} {u.last_name}".strip() or u.username

        item_out = LabOrderOut.model_validate(o)
        item_out.patient_name = patient_name
        item_out.patient_id = patient_id
        item_out.doctor_name = doctor_name
        order_outs.append(item_out)

    return order_outs


@router.get(
    "/orders/patient/{patient_id}",
    response_model=List[LabOrderOut],
    summary="Get all lab investigation orders and completed results for a specific patient",
)
async def get_patient_lab_orders(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
) -> List[LabOrderOut]:
    """
    Retrieve all lab orders for a patient.
    Enables automatic visibility of completed lab results on the Patient Dashboard and Doctor's historical EMR chart.
    """
    stmt = (
        select(LabOrder)
        .join(Appointment, LabOrder.appointment_id == Appointment.id)
        .options(
            selectinload(LabOrder.lab_test),
            selectinload(LabOrder.appointment).selectinload(Appointment.patient),
            selectinload(LabOrder.appointment).selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
        )
        .filter(Appointment.patient_id == patient_id)
        .order_by(LabOrder.ordered_at.desc())
    )
    result = await db.execute(stmt)
    orders = list(result.scalars().all())

    order_outs: List[LabOrderOut] = []
    for o in orders:
        item_out = LabOrderOut.model_validate(o)
        if o.appointment and o.appointment.patient:
            p = o.appointment.patient
            item_out.patient_name = f"{p.first_name} {p.last_name}".strip() or p.username
            item_out.patient_id = p.id
        if o.appointment and o.appointment.doctor and hasattr(o.appointment.doctor, "user") and o.appointment.doctor.user:
            u = o.appointment.doctor.user
            item_out.doctor_name = f"Dr. {u.first_name} {u.last_name}".strip() or u.username
        order_outs.append(item_out)

    return order_outs


@router.post(
    "/orders/{order_id}/complete",
    response_model=LabOrderOut,
    summary="Submit lab results and mark order Completed (Lab Technician)",
)
@router.patch(
    "/orders/{order_id}/complete",
    response_model=LabOrderOut,
    include_in_schema=False,
)
async def complete_lab_order(
    order_id: int,
    body: LabOrderCompleteRequest,
    db: AsyncSession = Depends(get_db),
) -> LabOrderOut:
    """
    Lab technician submits test findings (e.g. Hemoglobin: 14.2 g/dL), marks order as Completed.
    Results immediately become visible to patient and doctor.
    """
    stmt = (
        select(LabOrder)
        .options(
            selectinload(LabOrder.lab_test),
            selectinload(LabOrder.appointment).selectinload(Appointment.patient),
        )
        .filter(LabOrder.id == order_id)
    )
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lab order #{order_id} not found.",
        )

    order.status = LabOrderStatus.COMPLETED.value
    order.results = body.results
    order.completed_at = datetime.utcnow()
    if body.notes:
        order.notes = body.notes

    await db.commit()
    await db.refresh(order)

    item_out = LabOrderOut.model_validate(order)
    if order.appointment and order.appointment.patient:
        p = order.appointment.patient
        item_out.patient_name = f"{p.first_name} {p.last_name}".strip() or p.username
        item_out.patient_id = p.id
    return item_out


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
