"""Billing and Invoicing API endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.billing import Invoice
from app.schemas.billing import InvoiceOut

router = APIRouter(prefix="/invoices", tags=["Billing & Invoicing"])


@router.get(
    "/appointment/{appointment_id}",
    response_model=List[InvoiceOut],
    summary="Get invoices associated with an appointment",
)
async def get_appointment_invoices(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
) -> List[InvoiceOut]:
    """Retrieve itemized invoices generated for an appointment consultation."""
    stmt = (
        select(Invoice)
        .options(selectinload(Invoice.items))
        .filter(Invoice.appointment_id == appointment_id)
        .order_by(Invoice.issued_date.desc())
    )
    result = await db.execute(stmt)
    invoices = list(result.scalars().all())
    return [InvoiceOut.model_validate(inv) for inv in invoices]


@router.get(
    "/{invoice_id}",
    response_model=InvoiceOut,
    summary="Get invoice by ID with line items",
)
async def get_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
) -> InvoiceOut:
    """Retrieve full invoice details with line items."""
    stmt = (
        select(Invoice)
        .options(selectinload(Invoice.items))
        .filter(Invoice.id == invoice_id)
    )
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice #{invoice_id} not found.",
        )
    return InvoiceOut.model_validate(invoice)
