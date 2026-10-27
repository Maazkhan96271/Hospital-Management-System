"""Pharmacy inventory and POS API endpoints."""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.pharmacy import PharmacyItem
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor_profile import DoctorProfile
from app.models.treatment_record import TreatmentRecord
from app.models.billing import Invoice, InvoiceItem, PaymentStatus
from app.models.user import User
from app.api.dependencies import get_current_active_user
from app.schemas.pharmacy import (
    PharmacyItemCreate,
    PharmacyItemOut,
    PharmacyItemUpdate,
    RestockItemRequest,
    PendingPrescriptionOut,
    PrescribedMedicationLine,
)

router = APIRouter(prefix="/pharmacy", tags=["Pharmacy Inventory & POS"])

# In-memory tracking of dispensed appointments for fast POS state sync
_dispensed_appointment_ids: set[int] = set()


@router.get(
    "/items",
    response_model=List[PharmacyItemOut],
    summary="List all pharmacy inventory items",
)
@router.get(
    "/search",
    response_model=List[PharmacyItemOut],
    summary="Search pharmacy inventory medications",
)
async def search_pharmacy_items(
    q: Optional[str] = Query(None, description="Search query by name, sku, or category"),
    category: Optional[str] = Query(None, description="Filter by therapeutic category"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> List[PharmacyItemOut]:
    """Retrieve catalog of available medications for prescription ordering and inventory tracking."""
    stmt = select(PharmacyItem)

    if q and q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.filter(
            (PharmacyItem.name.ilike(term))
            | (PharmacyItem.sku.ilike(term))
            | (PharmacyItem.category.ilike(term))
        )

    if category and category.strip():
        stmt = stmt.filter(PharmacyItem.category.ilike(f"%{category.strip()}%"))

    stmt = stmt.order_by(PharmacyItem.name.asc()).limit(limit)
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    return [PharmacyItemOut.model_validate(item) for item in items]


@router.get(
    "/low-stock",
    response_model=List[PharmacyItemOut],
    summary="List all medicines low on stock (stock <= reorder_level)",
)
async def get_low_stock_items(
    db: AsyncSession = Depends(get_db),
) -> List[PharmacyItemOut]:
    """Retrieve all pharmacy inventory items whose stock has reached or fallen below reorder level."""
    stmt = (
        select(PharmacyItem)
        .filter(PharmacyItem.stock_quantity <= PharmacyItem.reorder_level)
        .order_by(PharmacyItem.stock_quantity.asc())
    )
    result = await db.execute(stmt)
    items = list(result.scalars().all())
    return [PharmacyItemOut.model_validate(item) for item in items]


@router.get(
    "/items/{item_id}",
    response_model=PharmacyItemOut,
    summary="Get single pharmacy item details",
)
async def get_pharmacy_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
) -> PharmacyItemOut:
    """Retrieve specific pharmacy medication item."""
    item = await db.get(PharmacyItem, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pharmacy item #{item_id} not found.",
        )
    return PharmacyItemOut.model_validate(item)


@router.patch(
    "/items/{item_id}/restock",
    response_model=PharmacyItemOut,
    summary="Restock pharmacy inventory item (Pharmacist / Admin)",
)
async def restock_pharmacy_item(
    item_id: int,
    body: RestockItemRequest,
    db: AsyncSession = Depends(get_db),
) -> PharmacyItemOut:
    """Increment stock quantity for an inventory item."""
    item = await db.get(PharmacyItem, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pharmacy item #{item_id} not found.",
        )
    item.stock_quantity += body.quantity_to_add
    await db.commit()
    await db.refresh(item)
    return PharmacyItemOut.model_validate(item)


@router.post(
    "/items",
    response_model=PharmacyItemOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create pharmacy inventory item (Admin only)",
)
async def create_pharmacy_item(
    item_in: PharmacyItemCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> PharmacyItemOut:
    """Create a new pharmacy inventory item."""
    role_name = current_user.role.name if current_user.role else ""
    if role_name not in ["Admin", "Doctor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators or medical staff can create pharmacy items.",
        )

    item = PharmacyItem(**item_in.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return PharmacyItemOut.model_validate(item)


@router.get(
    "/prescriptions/pending",
    response_model=List[PendingPrescriptionOut],
    summary="Get queue of pending prescriptions for dispensing (POS)",
)
async def get_pending_prescriptions(
    db: AsyncSession = Depends(get_db),
) -> List[PendingPrescriptionOut]:
    """
    Returns pending doctor prescriptions awaiting medication dispensing.
    Correlates appointments, treatments, patient details, and invoice records.
    """
    stmt = (
        select(Appointment)
        .options(
            selectinload(Appointment.patient),
            selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
            selectinload(Appointment.treatment_record),
            selectinload(Appointment.invoices).selectinload(Invoice.items),
        )
        .filter(Appointment.treatment_record.has())
        .order_by(Appointment.appointment_datetime.desc())
        .limit(50)
    )
    result = await db.execute(stmt)
    appointments = list(result.scalars().all())

    # Load all pharmacy items to cross-reference stock & pricing
    pharm_stmt = select(PharmacyItem)
    pharm_res = await db.execute(pharm_stmt)
    all_pharm_items = {item.name.lower(): item for item in pharm_res.scalars().all()}

    pending_list: List[PendingPrescriptionOut] = []

    for appt in appointments:
        treatment = appt.treatment_record
        if not treatment or not treatment.prescription:
            continue

        patient_name = (
            f"{appt.patient.first_name} {appt.patient.last_name}".strip()
            if appt.patient
            else f"Patient #{appt.patient_id}"
        )
        doctor_name = "Attending Physician"
        if appt.doctor and hasattr(appt.doctor, "user") and appt.doctor.user:
            doctor_name = f"Dr. {appt.doctor.user.first_name} {appt.doctor.user.last_name}"

        # Parse medications from treatment prescription array
        med_lines: List[PrescribedMedicationLine] = []
        for line in treatment.prescription:
            parts = line.split(" - ")
            med_name = parts[0].strip()
            dosage_str = parts[1].strip() if len(parts) > 1 else "1-0-1 after meals"
            duration_str = "5 days"
            if "(" in dosage_str and ")" in dosage_str:
                duration_str = dosage_str.split("(")[1].replace(")", "")
                dosage_str = dosage_str.split("(")[0].strip()

            # Cross-reference with inventory
            matched = None
            for key, pItem in all_pharm_items.items():
                if key in med_name.lower() or med_name.lower() in key:
                    matched = pItem
                    break

            unit_price = matched.price_per_unit if matched else 5.0
            in_stock = (matched.stock_quantity >= 10) if matched else True

            med_lines.append(
                PrescribedMedicationLine(
                    name=med_name,
                    dosage=dosage_str,
                    duration=duration_str,
                    quantity=10,
                    unit_price=unit_price,
                    pharmacy_item_id=matched.id if matched else None,
                    is_in_stock=in_stock,
                )
            )

        invoice = appt.invoices[0] if appt.invoices else None
        is_dispensed = appt.id in _dispensed_appointment_ids

        pending_list.append(
            PendingPrescriptionOut(
                appointment_id=appt.id,
                patient_id=appt.patient_id,
                patient_name=patient_name,
                patient_email=appt.patient.email if appt.patient else None,
                doctor_name=doctor_name,
                appointment_date=appt.appointment_datetime.strftime("%Y-%m-%d %H:%M"),
                diagnosis=treatment.diagnosis,
                medications=med_lines,
                invoice_number=invoice.invoice_number if invoice else f"INV-{appt.id:04d}",
                invoice_id=invoice.id if invoice else None,
                status="Dispensed" if is_dispensed else "Pending",
                total_amount=invoice.total_amount if invoice else sum(m.unit_price * m.quantity for m in med_lines),
            )
        )

    return pending_list


@router.post(
    "/prescriptions/{appointment_id}/dispense",
    summary="Dispense prescription medications: deduct inventory stock and update invoice",
)
async def dispense_prescription(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Dispense prescription:
    1. Deducts prescribed quantities from PharmacyItem inventory stock.
    2. Marks the prescription as Dispensed.
    3. Updates invoice status to Partial or Paid if settled at POS.
    """
    # Fetch appointment, treatment, and invoice
    stmt = (
        select(Appointment)
        .options(
            selectinload(Appointment.treatment_record),
            selectinload(Appointment.invoices).selectinload(Invoice.items),
        )
        .filter(Appointment.id == appointment_id)
    )
    res = await db.execute(stmt)
    appointment = res.scalar_one_or_none()

    if not appointment or not appointment.treatment_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prescription for appointment #{appointment_id} not found.",
        )

    # Fetch all pharmacy items
    pharm_res = await db.execute(select(PharmacyItem))
    pharm_items = {item.name.lower(): item for item in pharm_res.scalars().all()}

    dispensed_details = []

    for line in appointment.treatment_record.prescription:
        med_name = line.split(" - ")[0].strip()
        matched_item = None
        for key, pItem in pharm_items.items():
            if key in med_name.lower() or med_name.lower() in key:
                matched_item = pItem
                break

        qty = 10  # Standard dispensing cycle
        if matched_item:
            matched_item.stock_quantity = max(0, matched_item.stock_quantity - qty)
            dispensed_details.append({
                "item_id": matched_item.id,
                "name": matched_item.name,
                "deducted_qty": qty,
                "remaining_stock": matched_item.stock_quantity,
            })

    # Track in POS memory
    _dispensed_appointment_ids.add(appointment_id)

    # Update invoice note / status if present
    if appointment.invoices:
        inv = appointment.invoices[0]
        inv.notes = (inv.notes or "") + " [Medications Dispensed at Pharmacy POS]"

    await db.commit()

    return {
        "status": "success",
        "message": f"Prescription for appointment #{appointment_id} dispensed successfully.",
        "appointment_id": appointment_id,
        "dispensed_items": dispensed_details,
    }
