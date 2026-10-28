"""Comprehensive test suite for EMR and HIS database models and relationships."""

import os
import sys
import tempfile
from datetime import date, datetime, time, timedelta
import pytest

# Ensure repository root is on sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from flask_app import create_app, db
from flask_app.config import TestingConfig
from flask_app.models import (
    User,
    UserRole,
    Department,
    DoctorProfile,
    Appointment,
    AppointmentStatus,
    ConsultationType,
    AppointmentPaymentStatus,
    Vitals,
    PharmacyItem,
    LabTest,
    LabOrder,
    LabOrderStatus,
    Invoice,
    InvoiceItem,
    PaymentStatus,
    PaymentMethod,
)


@pytest.fixture
def app_and_db():
    """Create isolated test application and database context."""
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)

    class CustomTestConfig(TestingConfig):
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"

    app = create_app(CustomTestConfig)
    with app.app_context():
        db.create_all()
        yield app, db

    if os.path.exists(db_path):
        os.remove(db_path)


def test_emr_vitals_model_and_relationships(app_and_db):
    """Verify Vitals model, BMI computation, and 1-to-1 relationship with Appointment."""
    app, db = app_and_db

    # Create doctor and patient
    dept = Department(name="General Medicine", description="Primary Care")
    db.session.add(dept)
    db.session.commit()

    doc_user = User(
        username="dr_jones",
        email="jones@hospital.test",
        first_name="David",
        last_name="Jones",
        role=UserRole.DOCTOR,
    )
    doc_user.set_password("Doc@123")
    patient = User(
        username="jane_smith",
        email="jane@patient.test",
        first_name="Jane",
        last_name="Smith",
        role=UserRole.PATIENT,
    )
    patient.set_password("Pass@123")
    db.session.add_all([doc_user, patient])
    db.session.commit()

    doc_profile = DoctorProfile(user_id=doc_user.id, department_id=dept.id)
    db.session.add(doc_profile)
    db.session.commit()

    appt = Appointment(
        patient_id=patient.id,
        doctor_id=doc_profile.id,
        appointment_date=date.today(),
        appointment_time=time(10, 0),
        status=AppointmentStatus.SCHEDULED,
    )
    db.session.add(appt)
    db.session.commit()

    # Create Vitals record
    vitals = Vitals(
        appointment_id=appt.id,
        height=175.0,  # 175 cm
        weight=70.0,   # 70 kg
        blood_pressure="120/80 mmHg",
        temperature=98.6,
        pulse=72,
        respiratory_rate=16,
        oxygen_saturation=98.5,
        notes="Patient appears healthy, resting comfortably.",
    )
    calculated_bmi = vitals.calculate_bmi()
    assert calculated_bmi == 22.86  # 70 / (1.75^2) = 22.857...
    assert vitals.bmi == 22.86

    db.session.add(vitals)
    db.session.commit()

    # Test bidirectional 1-to-1 relationship
    refreshed_appt = db.session.get(Appointment, appt.id)
    assert refreshed_appt.vitals is not None
    assert refreshed_appt.vitals.blood_pressure == "120/80 mmHg"
    assert refreshed_appt.vitals.pulse == 72
    assert refreshed_appt.vitals.appointment.id == appt.id

    # Test serialization to dict
    vitals_dict = refreshed_appt.vitals.to_dict()
    assert vitals_dict["bmi"] == 22.86
    assert vitals_dict["blood_pressure"] == "120/80 mmHg"
    assert vitals_dict["appointment_id"] == appt.id

    # Test Cascade Delete: deleting appointment must delete vitals
    vitals_id = vitals.id
    db.session.delete(refreshed_appt)
    db.session.commit()
    assert db.session.get(Vitals, vitals_id) is None


def test_pharmacy_item_inventory_model(app_and_db):
    """Verify PharmacyItem inventory tracking, stock levels, and expiry detection."""
    app, db = app_and_db

    today = date.today()

    # Active item with sufficient stock
    paracetamol = PharmacyItem(
        name="Paracetamol 500mg",
        stock_quantity=150,
        price_per_unit=4.50,
        expiry_date=today + timedelta(days=365),
        sku="MED-PCM-500",
        category="Analgesic",
        unit="tablet",
        reorder_level=20,
    )
    # Low stock item
    ibuprofen = PharmacyItem(
        name="Ibuprofen 400mg",
        stock_quantity=15,
        price_per_unit=8.00,
        expiry_date=today + timedelta(days=180),
        sku="MED-IBU-400",
        reorder_level=20,
    )
    # Expired item
    amoxicillin = PharmacyItem(
        name="Amoxicillin 250mg",
        stock_quantity=50,
        price_per_unit=12.00,
        expiry_date=today - timedelta(days=10),
        sku="MED-AMX-250",
    )

    db.session.add_all([paracetamol, ibuprofen, amoxicillin])
    db.session.commit()

    assert paracetamol.id is not None
    assert paracetamol.is_expired is False
    assert paracetamol.is_low_stock is False

    assert ibuprofen.is_low_stock is True
    assert ibuprofen.is_expired is False

    assert amoxicillin.is_expired is True


def test_lab_test_and_lab_order_relationships(app_and_db):
    """Verify LabTest catalog and LabOrder workflow linked to Appointment."""
    app, db = app_and_db

    # Setup patient, doctor, and appointment
    patient = User(
        username="mark_w",
        email="mark@patient.test",
        first_name="Mark",
        last_name="Wilson",
        role=UserRole.PATIENT,
    )
    patient.set_password("Pass@123")
    doc_user = User(
        username="dr_taylor",
        email="taylor@hospital.test",
        first_name="Sarah",
        last_name="Taylor",
        role=UserRole.DOCTOR,
    )
    doc_user.set_password("Doc@123")
    db.session.add_all([patient, doc_user])
    db.session.commit()

    doc_profile = DoctorProfile(user_id=doc_user.id)
    db.session.add(doc_profile)
    db.session.commit()

    appt = Appointment(
        patient_id=patient.id,
        doctor_id=doc_profile.id,
        appointment_date=date.today(),
        appointment_time=time(11, 0),
        status=AppointmentStatus.SCHEDULED,
    )
    db.session.add(appt)
    db.session.commit()

    # Create Lab Tests
    cbc_test = LabTest(
        name="Complete Blood Count",
        cost=300.0,
        normal_range="Hb: 13-17 g/dL, WBC: 4-11k",
        category="Hematology",
    )
    lft_test = LabTest(
        name="Liver Function Test",
        cost=700.0,
        normal_range="Bilirubin: 0.1-1.2 mg/dL",
        category="Biochemistry",
    )
    db.session.add_all([cbc_test, lft_test])
    db.session.commit()

    # Create Lab Orders for Appointment
    order1 = LabOrder(
        appointment_id=appt.id,
        lab_test_id=cbc_test.id,
        status=LabOrderStatus.PENDING,
    )
    order2 = LabOrder(
        appointment_id=appt.id,
        lab_test_id=lft_test.id,
        status=LabOrderStatus.PENDING,
    )
    db.session.add_all([order1, order2])
    db.session.commit()

    # Verify relationships
    assert appt.lab_orders.count() == 2
    assert order1.appointment.patient.full_name == "Mark Wilson"
    assert order1.lab_test.name == "Complete Blood Count"

    # Complete an order with structured results
    results_data = {
        "hemoglobin": "14.2 g/dL",
        "wbc_count": "6,800 /mcL",
        "platelet_count": "240,000 /mcL",
        "summary": "Normal hematology profile",
    }
    order1.mark_completed(results_data=results_data, notes="Reviewed by Lab Director")
    db.session.commit()

    refreshed_order = db.session.get(LabOrder, order1.id)
    assert refreshed_order.status == LabOrderStatus.COMPLETED
    assert refreshed_order.completed_at is not None
    assert refreshed_order.parsed_results["hemoglobin"] == "14.2 g/dL"


def test_invoice_and_invoice_items_relationships(app_and_db):
    """Verify Invoice and InvoiceItem billing workflows, total calculations, and patient links."""
    app, db = app_and_db

    patient = User(
        username="emily_clark",
        email="emily@patient.test",
        first_name="Emily",
        last_name="Clark",
        role=UserRole.PATIENT,
    )
    patient.set_password("Pass@123")
    doc_user = User(
        username="dr_brown",
        email="brown@hospital.test",
        first_name="Robert",
        last_name="Brown",
        role=UserRole.DOCTOR,
    )
    doc_user.set_password("Doc@123")
    db.session.add_all([patient, doc_user])
    db.session.commit()

    doc_profile = DoctorProfile(user_id=doc_user.id)
    db.session.add(doc_profile)
    db.session.commit()

    appt = Appointment(
        patient_id=patient.id,
        doctor_id=doc_profile.id,
        appointment_date=date.today(),
        appointment_time=time(14, 0),
        status=AppointmentStatus.COMPLETED,
    )
    db.session.add(appt)
    db.session.commit()

    # Create Invoice
    invoice = Invoice(
        invoice_number="INV-2026-0001",
        patient_id=patient.id,
        appointment_id=appt.id,
        payment_status=PaymentStatus.UNPAID,
        payment_method=PaymentMethod.UPI,
    )
    db.session.add(invoice)
    db.session.commit()

    # Add items to invoice
    item1 = invoice.add_item(description="Consultation Fee", quantity=1, unit_price=500.0)
    item2 = invoice.add_item(description="Paracetamol 500mg (10 tabs)", quantity=2, unit_price=45.0)
    item3 = invoice.add_item(description="Blood Test (CBC)", quantity=1, unit_price=350.0)
    db.session.commit()

    # Verify calculation: 500 + 90 + 350 = 940.0
    refreshed_inv = db.session.get(Invoice, invoice.id)
    assert len(refreshed_inv.items) == 3
    assert refreshed_inv.total_amount == 940.0
    assert refreshed_inv.payment_status == PaymentStatus.UNPAID

    # Verify relationship from patient and appointment
    assert patient.patient_invoices.count() == 1
    assert appt.invoices.count() == 1
    assert appt.invoices.first().invoice_number == "INV-2026-0001"

    # Simulate Partial Payment
    refreshed_inv.paid_amount = 500.0
    refreshed_inv.recalculate_total()
    assert refreshed_inv.payment_status == PaymentStatus.PARTIAL

    # Simulate Full Payment
    refreshed_inv.paid_amount = 940.0
    refreshed_inv.recalculate_total()
    assert refreshed_inv.payment_status == PaymentStatus.PAID

    # Test Cascade Delete of line items when invoice is deleted
    item_ids = [item.id for item in refreshed_inv.items]
    db.session.delete(refreshed_inv)
    db.session.commit()

    for item_id in item_ids:
        assert db.session.get(InvoiceItem, item_id) is None


def test_appointment_telemedicine_and_payment_status(app_and_db):
    """Verify Appointment consultation_type (In-Person, Video) and payment_status fields."""
    app, db = app_and_db

    patient = User(
        email="telemed.patient@example.com",
        username="telepatient",
        first_name="Sara",
        last_name="Connor",
        role=UserRole.PATIENT,
    )
    patient.set_password("Pass@123")
    doctor_user = User(
        email="telemed.doctor@example.com",
        username="teledoctor",
        first_name="Gregory",
        last_name="House",
        role=UserRole.DOCTOR,
    )
    doctor_user.set_password("Doc@123")
    db.session.add_all([patient, doctor_user])
    db.session.commit()

    dept = Department(name="Telemedicine & Remote Care", description="Virtual Care")
    db.session.add(dept)
    db.session.commit()

    doctor_profile = DoctorProfile(
        user_id=doctor_user.id,
        department_id=dept.id,
    )
    db.session.add(doctor_profile)
    db.session.commit()

    # 1. Test In-Person Default Appointment
    appt1 = Appointment(
        patient_id=patient.id,
        doctor_id=doctor_profile.id,
        appointment_date=date.today(),
        appointment_time=time(10, 0),
        status=AppointmentStatus.SCHEDULED,
    )
    db.session.add(appt1)
    db.session.commit()

    assert appt1.consultation_type == ConsultationType.IN_PERSON
    assert appt1.payment_status == AppointmentPaymentStatus.UNPAID

    # 2. Test Video Consult Appointment
    appt2 = Appointment(
        patient_id=patient.id,
        doctor_id=doctor_profile.id,
        appointment_date=date.today(),
        appointment_time=time(11, 30),
        status=AppointmentStatus.SCHEDULED,
        consultation_type=ConsultationType.VIDEO,
        payment_status=AppointmentPaymentStatus.PAID,
    )
    db.session.add(appt2)
    db.session.commit()

    assert appt2.consultation_type == ConsultationType.VIDEO
    assert appt2.payment_status == AppointmentPaymentStatus.PAID
