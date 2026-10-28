"""Appointment booking and management endpoints."""

from datetime import datetime, date as dt_date, time as dt_time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.dependencies import get_current_active_user, get_current_doctor
from app.models.user import User
from app.models.doctor_profile import DoctorProfile
from app.models.appointment import (
    Appointment,
    AppointmentStatus,
    ConsultationType,
    AppointmentPaymentStatus,
)
from app.models.treatment_record import TreatmentRecord
from app.models.vitals import Vitals
from app.models.pharmacy import PharmacyItem
from app.models.lab import LabTest, LabOrder, LabOrderStatus
from app.models.billing import Invoice, InvoiceItem, PaymentStatus, PaymentMethod
from app.services.email_service import send_appointment_confirmation_email
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentStatusUpdate,
    AppointmentPaymentUpdate,
    CompleteAppointmentRequest,
    DoctorAgendaOut,
)

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.post(
    "/",
    response_model=AppointmentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Book a medical appointment (Patients)",
    description=(
        "Books an appointment with database transaction locks (Select FOR UPDATE) "
        "to prevent race conditions where two patients try to book the exact same slot at the exact same millisecond."
    ),
)
@router.post(
    "",
    response_model=AppointmentOut,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def book_appointment(
    appt_in: AppointmentCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AppointmentOut:
    """Book a new consultation appointment with transaction-level locking."""
    role_name = current_user.role.name if current_user.role else "Patient"

    # Restrict booking endpoint to registered Patients and Administrators
    if role_name not in ["Patient", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only registered patients (or administrators) may book appointments.",
        )

    # Determine booking patient ID (Admins may book on behalf of a patient)
    patient_id = appt_in.patient_id if (role_name == "Admin" and appt_in.patient_id) else current_user.id

    # 1. TRANSACTION LOCK ON DOCTOR PROFILE (Select FOR UPDATE)
    # Serializes concurrent booking attempts for this specific doctor
    doc_lock_stmt = (
        select(DoctorProfile)
        .join(User, DoctorProfile.user_id == User.id)
        .options(selectinload(DoctorProfile.user), selectinload(DoctorProfile.department))
        .filter(DoctorProfile.id == appt_in.doctor_id, User.is_active == True)
        .with_for_update()
    )
    doc_res = await db.execute(doc_lock_stmt)
    doctor = doc_res.scalar_one_or_none()

    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active Doctor #{appt_in.doctor_id} not found.",
        )

    # 2. TRANSACTION LOCK ON CONFLICTING APPOINTMENT (Select FOR UPDATE)
    # Queries the exact datetime and doctor under row-level lock
    conflict_stmt = (
        select(Appointment)
        .filter(
            Appointment.doctor_id == appt_in.doctor_id,
            Appointment.appointment_datetime == appt_in.appointment_datetime,
            Appointment.status.in_([
                AppointmentStatus.BOOKED.value,
                AppointmentStatus.COMPLETED.value,
            ]),
        )
        .with_for_update()
    )
    conflict_res = await db.execute(conflict_stmt)
    if conflict_res.scalar_one_or_none():
        doctor_name = f"Dr. {doctor.user.last_name}" if doctor.user else f"Doctor #{appt_in.doctor_id}"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Double-Booking Conflict: {doctor_name} already has a consultation "
                f"scheduled at {appt_in.appointment_datetime}. Please choose another time slot."
            ),
        )

    # 3. TRANSACTION LOCK ON PATIENT CONFLICT (Select FOR UPDATE)
    # Prevent patient from double-booking themselves in multiple overlapping consultations
    patient_conflict_stmt = (
        select(Appointment)
        .filter(
            Appointment.patient_id == patient_id,
            Appointment.appointment_datetime == appt_in.appointment_datetime,
            Appointment.status == AppointmentStatus.BOOKED.value,
        )
        .with_for_update()
    )
    patient_conflict = await db.execute(patient_conflict_stmt)
    if patient_conflict.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an appointment scheduled at this exact date and time.",
        )

    # 4. Insert and commit new Appointment within the locked transaction
    appointment = Appointment(
        patient_id=patient_id,
        doctor_id=doctor.id,
        appointment_datetime=appt_in.appointment_datetime,
        duration_minutes=appt_in.duration_minutes,
        status=AppointmentStatus.BOOKED.value,
        consultation_type=appt_in.consultation_type or ConsultationType.IN_PERSON.value,
        payment_status=appt_in.payment_status or AppointmentPaymentStatus.UNPAID.value,
        notes=appt_in.notes,
    )
    db.add(appointment)
    await db.commit()

    # Re-fetch with eager loaded relationships for response serialization
    res = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.patient).selectinload(User.role),
            selectinload(Appointment.treatment_record),
        )
        .filter(Appointment.id == appointment.id)
    )
    booked_appointment = res.scalar_one()

    # 5. Enqueue background task to simulate confirmation email delivery to the patient
    patient_email = current_user.email
    patient_name = f"{current_user.first_name} {current_user.last_name}".strip() or current_user.username
    if current_user.id != patient_id:
        p_res = await db.execute(select(User).filter(User.id == patient_id))
        p_user = p_res.scalar_one_or_none()
        if p_user:
            patient_email = p_user.email
            patient_name = f"{p_user.first_name} {p_user.last_name}".strip() or p_user.username

    doc_full_name = (
        f"Dr. {doctor.user.first_name} {doctor.user.last_name}".strip()
        if doctor.user and (doctor.user.first_name or doctor.user.last_name)
        else (f"Dr. {doctor.user.username}" if doctor.user else f"Doctor #{doctor.id}")
    )
    dept_title = doctor.department.name if doctor.department else None

    background_tasks.add_task(
        send_appointment_confirmation_email,
        patient_email=patient_email,
        patient_name=patient_name,
        doctor_name=doc_full_name,
        department_name=dept_title,
        appointment_id=booked_appointment.id,
        appointment_datetime=booked_appointment.appointment_datetime,
        duration_minutes=booked_appointment.duration_minutes,
        notes=booked_appointment.notes,
    )

    return booked_appointment


@router.post(
    "/{appointment_id}/complete",
    response_model=AppointmentOut,
    summary="Complete an appointment and attach a TreatmentRecord (Doctor only)",
    description=(
        "Updates the appointment status to 'Completed' and saves clinical diagnosis, "
        "prescription array, and detailed consultation notes."
    ),
)
@router.put(
    "/{appointment_id}/complete",
    response_model=AppointmentOut,
    include_in_schema=False,
)
async def complete_appointment_with_treatment(
    appointment_id: int,
    treatment_data: CompleteAppointmentRequest,
    current_doctor: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AppointmentOut:
    """Doctor endpoint to finalize consultation, mark Completed, and record treatment."""
    role_name = current_doctor.role.name if current_doctor.role else ""

    # Access check: Doctor or Admin
    if role_name not in ["Doctor", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only attending doctors (or administrators) can complete appointments.",
        )

    # Fetch appointment with related EMR entities
    result = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.patient).selectinload(User.role),
            selectinload(Appointment.treatment_record),
            selectinload(Appointment.vitals),
            selectinload(Appointment.lab_orders),
            selectinload(Appointment.invoices).selectinload(Invoice.items),
        )
        .filter(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment #{appointment_id} not found.",
        )

    # If Doctor, ensure this appointment is assigned to them
    if role_name == "Doctor":
        if (
            not current_doctor.doctor_profile
            or appointment.doctor_id != current_doctor.doctor_profile.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to complete another physician's appointment.",
            )

    # 1. Update appointment status to Completed
    appointment.status = AppointmentStatus.COMPLETED.value

    # 2. Consolidate and attach TreatmentRecord
    final_prescriptions = list(treatment_data.prescription or [])
    if treatment_data.medicines:
        for med in treatment_data.medicines:
            line = f"{med.name} - {med.dosage} ({med.duration or '5 days'})"
            if line not in final_prescriptions:
                final_prescriptions.append(line)

    if appointment.treatment_record:
        treatment = appointment.treatment_record
        treatment.diagnosis = treatment_data.diagnosis
        treatment.prescription = final_prescriptions
        treatment.detailed_notes = treatment_data.detailed_notes
    else:
        treatment = TreatmentRecord(
            appointment_id=appointment.id,
            diagnosis=treatment_data.diagnosis,
            prescription=final_prescriptions,
            detailed_notes=treatment_data.detailed_notes,
        )
        appointment.treatment_record = treatment
        db.add(treatment)

    # 3. Save or update Vitals if provided
    if treatment_data.vitals:
        v_data = treatment_data.vitals
        if appointment.vitals:
            vitals = appointment.vitals
            vitals.height = v_data.height
            vitals.weight = v_data.weight
            vitals.blood_pressure = v_data.blood_pressure
            vitals.temperature = v_data.temperature
            vitals.pulse = v_data.pulse
            vitals.respiratory_rate = v_data.respiratory_rate
            vitals.oxygen_saturation = v_data.oxygen_saturation
            vitals.notes = v_data.notes
            vitals.calculate_bmi()
        else:
            vitals = Vitals(
                appointment_id=appointment.id,
                height=v_data.height,
                weight=v_data.weight,
                blood_pressure=v_data.blood_pressure,
                temperature=v_data.temperature,
                pulse=v_data.pulse,
                respiratory_rate=v_data.respiratory_rate,
                oxygen_saturation=v_data.oxygen_saturation,
                notes=v_data.notes,
            )
            vitals.calculate_bmi()
            appointment.vitals = vitals
            db.add(vitals)

    # 4. Create pending LabOrders for selected lab tests
    if treatment_data.lab_test_ids:
        for test_id in treatment_data.lab_test_ids:
            lab_order = LabOrder(
                appointment_id=appointment.id,
                lab_test_id=test_id,
                status=LabOrderStatus.PENDING.value,
            )
            db.add(lab_order)

    # 5. Automatically generate an itemized Invoice
    inv_number = f"INV-{datetime.utcnow().strftime('%Y%m%d')}-{appointment.id:04d}"
    invoice = Invoice(
        invoice_number=inv_number,
        patient_id=appointment.patient_id,
        appointment_id=appointment.id,
        payment_status=PaymentStatus.UNPAID.value,
        payment_method="Pending Payment",
        paid_amount=0.0,
        total_amount=0.0,
    )

    # 5.1 Consultation Fee line item
    fee = treatment_data.consultation_fee if treatment_data.consultation_fee is not None else 500.0
    invoice.add_item(description="Physician Consultation Fee", quantity=1, unit_price=fee)

    # 5.2 Prescribed Medicines line items & inventory deduction
    if treatment_data.medicines:
        for med in treatment_data.medicines:
            unit_price = med.unit_price or 0.0
            if med.pharmacy_item_id:
                pharm_item = await db.get(PharmacyItem, med.pharmacy_item_id)
                if pharm_item:
                    unit_price = pharm_item.price_per_unit
                    # Deduct inventory stock safely
                    if pharm_item.stock_quantity >= med.quantity:
                        pharm_item.stock_quantity -= med.quantity
            invoice.add_item(
                description=f"Medication: {med.name} ({med.dosage})",
                quantity=med.quantity,
                unit_price=unit_price,
            )

    # 5.3 Ordered Lab Tests line items
    if treatment_data.lab_test_ids:
        for test_id in treatment_data.lab_test_ids:
            lab_test = await db.get(LabTest, test_id)
            if lab_test:
                invoice.add_item(
                    description=f"Lab Diagnostic: {lab_test.name}",
                    quantity=1,
                    unit_price=lab_test.cost,
                )

    db.add(invoice)

    await db.flush()
    await db.commit()
    await db.refresh(treatment)
    await db.refresh(appointment)
    return AppointmentOut.model_validate(appointment)


@router.get(
    "/agenda",
    response_model=DoctorAgendaOut,
    summary="Get Doctor's daily agenda (Doctor only)",
)
async def get_my_appointments_agenda(
    date: Optional[str] = Query(
        None,
        description="Agenda date in YYYY-MM-DD format (defaults to today)",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    ),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> DoctorAgendaOut:
    """Fetch daily agenda of appointments for the current doctor."""
    role_name = current_user.role.name if current_user.role else ""
    if role_name != "Doctor" or not current_user.doctor_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Daily agenda is only accessible to doctors with active profiles.",
        )

    doctor_id = current_user.doctor_profile.id

    if not date:
        target_date = dt_date.today()
        date = target_date.strftime("%Y-%m-%d")
    else:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Expected YYYY-MM-DD.",
            )

    day_start = datetime.combine(target_date, dt_time.min)
    day_end = datetime.combine(target_date, dt_time.max)

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

    return DoctorAgendaOut(
        doctor_id=doctor_id,
        doctor_name=f"Dr. {current_user.first_name} {current_user.last_name}",
        date=date,
        total_appointments=len(appts),
        booked_count=sum(1 for a in appts if a.status == AppointmentStatus.BOOKED.value),
        completed_count=sum(1 for a in appts if a.status == AppointmentStatus.COMPLETED.value),
        cancelled_count=sum(1 for a in appts if a.status == AppointmentStatus.CANCELLED.value),
        appointments=appts,
    )


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
        selectinload(Appointment.patient).selectinload(User.role),
        selectinload(Appointment.treatment_record),
    )

    if role_name == "Admin":
        pass
    elif role_name == "Doctor":
        if not current_user.doctor_profile:
            return []
        query = query.filter(Appointment.doctor_id == current_user.doctor_profile.id)
    else:
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
        .options(
            selectinload(Appointment.patient).selectinload(User.role),
            selectinload(Appointment.treatment_record),
        )
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
        .options(
            selectinload(Appointment.patient).selectinload(User.role),
            selectinload(Appointment.treatment_record),
        )
        .filter(Appointment.id == appointment.id)
    )
    return refetched.scalar_one()


@router.post(
    "/{appointment_id}/check-in",
    summary="Check-in patient, set status to 'Waiting' and generate Queue Token Number",
)
async def check_in_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Check-in patient for appointment:
    1. Changes status from 'Booked' to 'Waiting'.
    2. Generates sequential Queue Token Number for the doctor's queue today.
    3. Records token in appointment notes.
    """
    stmt = (
        select(Appointment)
        .options(
            selectinload(Appointment.patient),
            selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
            selectinload(Appointment.doctor).selectinload(DoctorProfile.department),
        )
        .filter(Appointment.id == appointment_id)
    )
    result = await db.execute(stmt)
    appointment = result.scalar_one_or_none()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment #{appointment_id} not found.",
        )

    # Calculate token sequence number for this doctor today
    day_start = appointment.appointment_datetime.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = appointment.appointment_datetime.replace(hour=23, minute=59, second=59, microsecond=999999)

    count_stmt = (
        select(Appointment)
        .filter(
            Appointment.doctor_id == appointment.doctor_id,
            Appointment.appointment_datetime >= day_start,
            Appointment.appointment_datetime <= day_end,
            Appointment.status.in_([
                AppointmentStatus.WAITING.value,
                AppointmentStatus.IN_PROGRESS.value,
                AppointmentStatus.COMPLETED.value,
            ]),
        )
    )
    res_count = await db.execute(count_stmt)
    existing_checked_in = list(res_count.scalars().all())

    # Sequential token
    token_num = len(existing_checked_in) + 1
    dept_prefix = (
        appointment.doctor.department.name[:2].upper()
        if appointment.doctor and appointment.doctor.department
        else "MD"
    )
    token_code = f"{dept_prefix}-{appointment.doctor_id:02d}-{token_num:03d}"

    appointment.status = AppointmentStatus.WAITING.value
    token_note = f"[Queue Token: {token_code}]"
    if not appointment.notes or token_code not in appointment.notes:
        appointment.notes = ((appointment.notes or "") + f" {token_note}").strip()

    await db.commit()

    patient_name = (
        f"{appointment.patient.first_name} {appointment.patient.last_name}".strip()
        if appointment.patient
        else f"Patient #{appointment.patient_id}"
    )
    doctor_name = "Attending Physician"
    if appointment.doctor and hasattr(appointment.doctor, "user") and appointment.doctor.user:
        u = appointment.doctor.user
        doctor_name = f"Dr. {u.first_name} {u.last_name}"

    return {
        "status": "success",
        "appointment_id": appointment.id,
        "token_number": token_code,
        "queue_status": "Waiting",
        "patient_name": patient_name,
        "doctor_name": doctor_name,
        "appointment_time": appointment.appointment_datetime.strftime("%H:%M"),
        "notes": appointment.notes,
    }


@router.post(
    "/{appointment_id}/pay",
    response_model=AppointmentOut,
    summary="Record payment for an appointment (Telemedicine / Clinic Payment Gateway)",
)
@router.patch(
    "/{appointment_id}/pay",
    response_model=AppointmentOut,
    include_in_schema=False,
)
async def pay_appointment(
    appointment_id: int,
    payment_in: Optional[AppointmentPaymentUpdate] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AppointmentOut:
    """
    Simulates payment gateway settlement for an appointment and marks it as Paid.
    Supports Credit Card, UPI, and NetBanking methods.
    """
    result = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.patient).selectinload(User.role),
            selectinload(Appointment.treatment_record),
            selectinload(Appointment.invoices),
        )
        .filter(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment #{appointment_id} not found.",
        )

    # Update appointment payment status
    new_status = payment_in.payment_status if payment_in and payment_in.payment_status else "Paid"
    appointment.payment_status = new_status

    # Record payment transaction reference in notes
    tx_id = payment_in.transaction_id if payment_in and payment_in.transaction_id else f"TXN_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    method = payment_in.payment_method if payment_in and payment_in.payment_method else "Credit Card"
    pay_note = f"[Payment: Paid via {method} Ref #{tx_id}]"
    if not appointment.notes or pay_note not in appointment.notes:
        appointment.notes = ((appointment.notes or "") + f" {pay_note}").strip()

    # Also update any linked invoices if present
    for inv in appointment.invoices:
        inv.payment_status = PaymentStatus.PAID.value
        inv.payment_method = PaymentMethod.CREDIT_CARD.value if "Card" in method else PaymentMethod.CASH.value

    await db.commit()

    refetched = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.patient).selectinload(User.role),
            selectinload(Appointment.treatment_record),
        )
        .filter(Appointment.id == appointment.id)
    )
    return refetched.scalar_one()


@router.get(
    "/queue/live",
    summary="Get today's live reception queue grouped by Doctor",
)
async def get_live_queue(
    date_str: Optional[str] = Query(None, alias="date", description="Date in YYYY-MM-DD format (defaults to today)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve live queue appointments for today, grouped by Doctor.
    Enables receptionists to monitor waiting rooms and check-in patients.
    """
    if date_str:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    else:
        target_date = dt_date.today()

    day_start = datetime.combine(target_date, dt_time.min)
    day_end = datetime.combine(target_date, dt_time.max)

    stmt = (
        select(Appointment)
        .options(
            selectinload(Appointment.patient),
            selectinload(Appointment.doctor).selectinload(DoctorProfile.user),
            selectinload(Appointment.doctor).selectinload(DoctorProfile.department),
        )
        .filter(
            Appointment.appointment_datetime >= day_start,
            Appointment.appointment_datetime <= day_end,
        )
        .order_by(Appointment.appointment_datetime.asc())
    )
    result = await db.execute(stmt)
    appts = list(result.scalars().all())

    # Group by doctor
    doctors_map = {}
    for a in appts:
        d_id = a.doctor_id
        if d_id not in doctors_map:
            d_name = "Attending Physician"
            dept_name = "General Medicine"
            if a.doctor:
                if hasattr(a.doctor, "user") and a.doctor.user:
                    d_name = f"Dr. {a.doctor.user.first_name} {a.doctor.user.last_name}"
                if a.doctor.department:
                    dept_name = a.doctor.department.name

            doctors_map[d_id] = {
                "doctor_id": d_id,
                "doctor_name": d_name,
                "department": dept_name,
                "appointments": [],
                "waiting_count": 0,
                "booked_count": 0,
                "in_progress_count": 0,
                "completed_count": 0,
            }

        token_num = None
        if a.notes and "Queue Token: " in a.notes:
            try:
                token_num = a.notes.split("Queue Token: ")[1].split("]")[0]
            except Exception:
                pass

        p_name = f"{a.patient.first_name} {a.patient.last_name}".strip() if a.patient else f"Patient #{a.patient_id}"

        item = {
            "id": a.id,
            "patient_id": a.patient_id,
            "patient_name": p_name,
            "patient_email": a.patient.email if a.patient else None,
            "time": a.appointment_datetime.strftime("%H:%M"),
            "status": a.status,
            "token_number": token_num,
            "notes": a.notes,
        }
        doctors_map[d_id]["appointments"].append(item)

        if a.status == AppointmentStatus.WAITING.value:
            doctors_map[d_id]["waiting_count"] += 1
        elif a.status == AppointmentStatus.BOOKED.value:
            doctors_map[d_id]["booked_count"] += 1
        elif a.status == AppointmentStatus.IN_PROGRESS.value:
            doctors_map[d_id]["in_progress_count"] += 1
        elif a.status == AppointmentStatus.COMPLETED.value:
            doctors_map[d_id]["completed_count"] += 1

    return list(doctors_map.values())
