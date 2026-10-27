"""Billing and Invoicing API endpoints for hospital administration and patient accounts."""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.billing import Invoice, InvoiceItem, PaymentStatus, PaymentMethod
from app.models.user import User
from app.models.appointment import Appointment
from app.models.doctor_profile import DoctorProfile
from app.schemas.billing import InvoiceOut, RecordPaymentRequest
from app.services.pdf_service import generate_invoice_pdf

router = APIRouter(prefix="/invoices", tags=["Billing & Invoicing"])


def _hydrate_invoice_out(inv: Invoice) -> InvoiceOut:
    """Populate patient and attending doctor details onto InvoiceOut schema."""
    out = InvoiceOut.model_validate(inv)
    if inv.patient:
        out.patient_name = f"{inv.patient.first_name} {inv.patient.last_name}".strip() or inv.patient.username
        out.patient_email = inv.patient.email

    if inv.appointment and inv.appointment.doctor and hasattr(inv.appointment.doctor, "user") and inv.appointment.doctor.user:
        u = inv.appointment.doctor.user
        out.doctor_name = f"Dr. {u.first_name} {u.last_name}".strip() or u.username
    elif inv.notes and "Dr." in inv.notes:
        out.doctor_name = "Attending Physician"
    else:
        out.doctor_name = "Hospital Medical Staff"

    return out


@router.get(
    "",
    response_model=List[InvoiceOut],
    summary="List all patient invoices (Admin / Billing Desk)",
)
@router.get(
    "/",
    response_model=List[InvoiceOut],
    include_in_schema=False,
)
async def list_invoices(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by payment status (Unpaid, Paid, Partial)"),
    search: Optional[str] = Query(None, description="Search by invoice number or patient name"),
    patient_id: Optional[int] = Query(None, description="Filter by patient ID"),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> List[InvoiceOut]:
    """Retrieve all patient invoices with itemized line items and payment statuses."""
    stmt = (
        select(Invoice)
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.patient),
            selectinload(Invoice.appointment).selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
        )
        .order_by(Invoice.issued_date.desc())
        .limit(limit)
    )

    if status_filter and status_filter.strip():
        stmt = stmt.filter(Invoice.payment_status.ilike(status_filter.strip()))

    if patient_id is not None:
        stmt = stmt.filter(Invoice.patient_id == patient_id)

    result = await db.execute(stmt)
    invoices = list(result.scalars().all())

    # In-memory search filtering for patient name or invoice number
    if search and search.strip():
        q = search.strip().lower()
        filtered = []
        for inv in invoices:
            p_name = f"{inv.patient.first_name} {inv.patient.last_name}".lower() if inv.patient else ""
            if q in inv.invoice_number.lower() or q in p_name:
                filtered.append(inv)
        invoices = filtered

    return [_hydrate_invoice_out(inv) for inv in invoices]


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
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.patient),
            selectinload(Invoice.appointment).selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
        )
        .filter(Invoice.appointment_id == appointment_id)
        .order_by(Invoice.issued_date.desc())
    )
    result = await db.execute(stmt)
    invoices = list(result.scalars().all())
    return [_hydrate_invoice_out(inv) for inv in invoices]


@router.get(
    "/{invoice_id}",
    response_model=InvoiceOut,
    summary="Get single invoice by ID with line items",
)
async def get_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
) -> InvoiceOut:
    """Retrieve full invoice details with line items."""
    stmt = (
        select(Invoice)
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.patient),
            selectinload(Invoice.appointment).selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
        )
        .filter(Invoice.id == invoice_id)
    )
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice #{invoice_id} not found.",
        )
    return _hydrate_invoice_out(invoice)


@router.post(
    "/{invoice_id}/pay",
    response_model=InvoiceOut,
    summary="Record payment for an invoice (Marks Paid & updates accounts)",
)
async def record_payment(
    invoice_id: int,
    payment_in: RecordPaymentRequest,
    db: AsyncSession = Depends(get_db),
) -> InvoiceOut:
    """
    Record payment for an invoice:
    1. Sets payment_status to 'Paid' (or 'Partial').
    2. Updates paid_amount and payment_method.
    3. Adds cashier transaction timestamp.
    """
    stmt = (
        select(Invoice)
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.patient),
            selectinload(Invoice.appointment).selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
        )
        .filter(Invoice.id == invoice_id)
    )
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice #{invoice_id} not found.",
        )

    # Calculate paid amount
    amount = payment_in.amount_paid if payment_in.amount_paid is not None else invoice.total_amount
    invoice.paid_amount = amount
    invoice.payment_method = payment_in.payment_method

    if invoice.paid_amount >= invoice.total_amount:
        invoice.payment_status = PaymentStatus.PAID.value
    else:
        invoice.payment_status = PaymentStatus.PARTIAL.value

    # Append payment settlement notes
    timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    remark = f"[Paid ${amount:.2f} via {payment_in.payment_method} at {timestamp_str}]"
    if payment_in.notes:
        remark += f" Ref: {payment_in.notes}"
    invoice.notes = (invoice.notes or "") + " " + remark

    await db.commit()
    await db.refresh(invoice)

    return _hydrate_invoice_out(invoice)


@router.get(
    "/{invoice_id}/receipt.pdf",
    summary="Generate and download official branded PDF receipt (ReportLab)",
)
async def download_receipt_pdf(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate an official, branded medical receipt & tax invoice PDF using ReportLab.
    """
    stmt = (
        select(Invoice)
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.patient),
            selectinload(Invoice.appointment).selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
        )
        .filter(Invoice.id == invoice_id)
    )
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice #{invoice_id} not found.",
        )

    patient_name = (
        f"{invoice.patient.first_name} {invoice.patient.last_name}".strip()
        if invoice.patient
        else f"Patient #{invoice.patient_id}"
    )
    doctor_name = "Attending Medical Specialist"
    if invoice.appointment and invoice.appointment.doctor and hasattr(invoice.appointment.doctor, "user") and invoice.appointment.doctor.user:
        u = invoice.appointment.doctor.user
        doctor_name = f"Dr. {u.first_name} {u.last_name}"

    items_data = [
        {
            "description": item.description,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total": item.total,
        }
        for item in invoice.items
    ]

    # If no line items exist yet, provide default consultation charge
    if not items_data:
        items_data = [
            {
                "description": "General Physician Consultation & Evaluation",
                "quantity": 1,
                "unit_price": invoice.total_amount or 500.0,
                "total": invoice.total_amount or 500.0,
            }
        ]

    pdf_bytes = generate_invoice_pdf(
        invoice_number=invoice.invoice_number,
        patient_name=patient_name,
        patient_id=invoice.patient_id,
        doctor_name=doctor_name,
        issued_date=invoice.issued_date.strftime("%B %d, %Y") if invoice.issued_date else datetime.now().strftime("%B %d, %Y"),
        payment_status=invoice.payment_status,
        payment_method=invoice.payment_method or "Cash",
        items=items_data,
        total_amount=invoice.total_amount,
        paid_amount=invoice.paid_amount,
        notes=invoice.notes,
        patient_email=invoice.patient.email if invoice.patient else None,
    )

    filename = f"receipt_{invoice.invoice_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={filename}",
        },
    )
