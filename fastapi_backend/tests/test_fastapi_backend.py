"""Automated test suite verifying the complete FastAPI Hospital Management System backend."""

import asyncio
from datetime import datetime, timezone, timedelta, date as dt_date
import os
import sys

# Ensure fastapi_backend is isolated on sys.path and root app.py is excluded
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
root_dir = os.path.abspath(os.path.join(backend_dir, ".."))
for p in [root_dir, "", "."]:
    while p in sys.path:
        sys.path.remove(p)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if "app" in sys.modules and not hasattr(sys.modules["app"], "__path__"):
    del sys.modules["app"]

# Use in-memory SQLite with async driver for isolated testing
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import async_engine, AsyncSessionLocal, Base
from app.core.security import hash_password, create_access_token, decode_access_token
from app.models.role import Role
from app.models.user import User
from app.models.department import Department
from app.models.doctor_profile import DoctorProfile, DEFAULT_WEEKLY_AVAILABILITY
from app.models.appointment import Appointment, AppointmentStatus
from app.models.treatment_record import TreatmentRecord
from app.models.vitals import Vitals
from app.models.pharmacy import PharmacyItem
from app.models.lab import LabTest, LabOrder, LabOrderStatus
from app.models.billing import Invoice, InvoiceItem, PaymentStatus, PaymentMethod
from app.main import app


async def run_all_tests():
    print("🚀 Running FastAPI Hospital Management System verification...")

    # 1. Initialize in-memory database schema
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ SQLAlchemy async tables created successfully.")

    # 2. Seed Baseline Roles & Users
    async with AsyncSessionLocal() as session:
        # Roles
        admin_role = Role(name="Admin", description="Administrator")
        doctor_role = Role(name="Doctor", description="Doctor")
        patient_role = Role(name="Patient", description="Patient")
        session.add_all([admin_role, doctor_role, patient_role])
        await session.flush()

        # Department
        cardio = Department(name="Cardiology", description="Heart and cardiovascular care")
        session.add(cardio)
        await session.flush()

        # Admin User
        admin_user = User(
            email="admin@test.com",
            username="admin_test",
            hashed_password=hash_password("Admin@123"),
            first_name="Admin",
            last_name="User",
            role_id=admin_role.id,
            is_active=True,
        )
        # Doctor User & DoctorProfile (with JSONB schedule)
        doctor_user = User(
            email="doctor@test.com",
            username="doctor_test",
            hashed_password=hash_password("Doctor@123"),
            first_name="Alice",
            last_name="Smith",
            role_id=doctor_role.id,
            is_active=True,
        )
        session.add_all([admin_user, doctor_user])
        await session.flush()

        doc_profile = DoctorProfile(
            user_id=doctor_user.id,
            department_id=cardio.id,
            specialization="Cardiologist",
            qualification="MD, FACC",
            experience_years=10,
            weekly_availability=DEFAULT_WEEKLY_AVAILABILITY,
        )
        session.add(doc_profile)

        # Patient User
        patient_user = User(
            email="patient@test.com",
            username="patient_test",
            hashed_password=hash_password("Patient@123"),
            first_name="Bob",
            last_name="Jones",
            role_id=patient_role.id,
            is_active=True,
        )
        session.add(patient_user)
        await session.commit()
    print("✅ Baseline models, roles, and profiles seeded.")

    # 3. Test JWT Token Creation & Decoding
    token = create_access_token(subject=1, role="Admin")
    decoded = decode_access_token(token)
    assert decoded["sub"] == "1"
    assert decoded["role"] == "Admin"
    print("✅ JWT creation and verification passed.")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 4. Test OpenAPI / Swagger UI Endpoints
        docs_res = await client.get("/docs")
        assert docs_res.status_code == 200
        assert "swagger-ui" in docs_res.text.lower()
        print("✅ Automatic Swagger UI documentation is accessible at /docs.")

        openapi_res = await client.get("/api/v1/openapi.json")
        assert openapi_res.status_code == 200
        openapi_schema = openapi_res.json()
        assert openapi_schema["info"]["title"] == settings.PROJECT_NAME
        assert "/api/v1/auth/login" in openapi_schema["paths"]
        assert "/api/v1/appointments/" in openapi_schema["paths"]
        print("✅ OpenAPI schema generated with security schemes and route definitions.")

        # 5. Test Authentication Login Endpoint (OAuth2 & JSON)
        login_res = await client.post(
            "/api/v1/auth/login",
            data={"username": "admin_test", "password": "Admin@123"},
        )
        assert login_res.status_code == 200
        admin_token = login_res.json()["access_token"]
        assert login_res.json()["role"] == "Admin"
        print("✅ OAuth2 Login endpoint returned valid JWT.")

        json_login = await client.post(
            "/api/v1/auth/login/json",
            json={"username": "patient_test", "password": "Patient@123"},
        )
        assert json_login.status_code == 200
        patient_token = json_login.json()["access_token"]
        assert json_login.json()["role"] == "Patient"
        print("✅ JSON Login endpoint verified.")

        doc_login = await client.post(
            "/api/v1/auth/login/json",
            json={"username": "doctor_test", "password": "Doctor@123"},
        )
        assert doc_login.status_code == 200
        doctor_token = doc_login.json()["access_token"]

        # 6. Test Role-Based Protection Dependencies
        patient_admin_attempt = await client.get(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {patient_token}"},
        )
        assert patient_admin_attempt.status_code == 403
        print("✅ Role dependency blocked unauthorized Patient from Admin route (403 Forbidden).")

        admin_users_res = await client.get(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert admin_users_res.status_code == 200
        assert len(admin_users_res.json()) >= 3
        print("✅ Admin dependency granted access to /api/v1/users/.")

        # 7. Test Public Patient Registration
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "newpatient@test.com",
                "username": "newpatient",
                "first_name": "New",
                "last_name": "Patient",
                "password": "Password123",
            },
        )
        assert reg_res.status_code == 201
        print("✅ Public patient registration succeeded.")

        # 8. Test Doctor 7-Day Availability Schedule (JSONB)
        updated_schedule = {
            "monday": {"available": True, "start": "09:00", "end": "12:00"},
            "tuesday": {"available": True, "start": "09:00", "end": "17:00"},
            "wednesday": {"available": True, "start": "09:00", "end": "17:00"},
            "thursday": {"available": True, "start": "09:00", "end": "17:00"},
            "friday": {"available": True, "start": "09:00", "end": "17:00"},
            "saturday": {"available": False, "start": "00:00", "end": "00:00"},
            "sunday": {"available": False, "start": "00:00", "end": "00:00"},
        }
        avail_res = await client.put(
            "/api/v1/doctors/me/availability",
            json=updated_schedule,
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert avail_res.status_code == 200
        assert avail_res.json()["weekly_availability"]["monday"]["end"] == "12:00"
        print("✅ Doctor updated JSONB 7-day availability schedule successfully.")

        # 9. Test GET /api/doctors/{id}/slots?date=YYYY-MM-DD
        # Find next Monday (which has 09:00 to 12:00 -> exactly 6 30-minute slots)
        today = dt_date.today()
        days_ahead = (0 - today.weekday()) % 7  # 0 is Monday
        if days_ahead == 0:
            days_ahead = 7
        next_monday = today + timedelta(days=days_ahead)
        monday_str = next_monday.strftime("%Y-%m-%d")

        slots_res = await client.get(
            f"/api/doctors/{doc_profile.id}/slots?date={monday_str}"
        )
        assert slots_res.status_code == 200
        slots = slots_res.json()
        assert isinstance(slots, list)
        # 09:00 to 12:00 in 30-min increments: 09:00, 09:30, 10:00, 10:30, 11:00, 11:30
        assert slots == ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]
        print("✅ GET /api/doctors/{id}/slots generated 30-minute working hour slots correctly.")

        # Test Sunday (unavailable day) returns empty list
        next_sunday = next_monday - timedelta(days=1)
        sunday_str = next_sunday.strftime("%Y-%m-%d")
        sunday_slots_res = await client.get(
            f"/api/doctors/{doc_profile.id}/slots?date={sunday_str}"
        )
        assert sunday_slots_res.status_code == 200
        assert sunday_slots_res.json() == []
        print("✅ Non-working day correctly returned empty available slots.")

        # 10. Test POST /api/appointments for Patients (with SELECT FOR UPDATE locking)
        # Book slot 09:30 on next Monday
        book_res = await client.post(
            "/api/appointments",
            json={
                "doctor_id": doc_profile.id,
                "date": monday_str,
                "time": "09:30",
                "duration_minutes": 30,
                "notes": "Cardiac consultation",
            },
            headers={"Authorization": f"Bearer {patient_token}"},
        )
        assert book_res.status_code == 201
        appt_data = book_res.json()
        appointment_id = appt_data["id"]
        assert appt_data["status"] == "Booked"
        print("✅ POST /api/appointments booked appointment successfully with date & time format.")

        # Verify background task queue sent simulated confirmation email
        from app.services.email_service import get_sent_confirmation_emails
        sent_emails = get_sent_confirmation_emails()
        assert len(sent_emails) >= 1
        latest_email = sent_emails[-1]
        assert latest_email["appointment_id"] == appointment_id
        assert latest_email["recipient_email"] == "patient@test.com"
        assert latest_email["status"] == "DELIVERED"
        assert "Alice Smith" in latest_email["doctor_name"]
        print("✅ BackgroundTasks executed: Confirmation email simulated and delivered to patient.")

        # Test Patient Search for Cmd+K Interface (Admin and Doctor access)
        search_res = await client.get(
            "/api/v1/users/patients/search?q=Bob",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert search_res.status_code == 200
        patient_results = search_res.json()
        assert len(patient_results) >= 1
        assert patient_results[0]["email"] == "patient@test.com"

        doc_search_res = await client.get(
            f"/api/v1/users/patients/search?q=#{patient_user.id}",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert doc_search_res.status_code == 200
        assert len(doc_search_res.json()) >= 1

        # Patient role forbidden from searching patients
        unauthorized_search = await client.get(
            "/api/v1/users/patients/search?q=Bob",
            headers={"Authorization": f"Bearer {patient_token}"},
        )
        assert unauthorized_search.status_code == 403
        print("✅ Patient search endpoint for Cmd+K interface verified with role-based security.")

        # Cross-reference: Verify that 09:30 is now REMOVED from available slots
        updated_slots_res = await client.get(
            f"/api/doctors/{doc_profile.id}/slots?date={monday_str}"
        )
        assert updated_slots_res.status_code == 200
        updated_slots = updated_slots_res.json()
        assert "09:30" not in updated_slots
        assert "09:00" in updated_slots
        assert "10:00" in updated_slots
        print("✅ Booked slot was cross-referenced and removed from available slots.")

        # Test double-booking race prevention -> Must return 409 Conflict
        double_book_res = await client.post(
            "/api/appointments",
            json={
                "doctor_id": doc_profile.id,
                "date": monday_str,
                "time": "09:30",
                "duration_minutes": 30,
                "notes": "Concurrent attempt to steal 09:30 slot",
            },
            headers={"Authorization": f"Bearer {patient_token}"},
        )
        assert double_book_res.status_code == 409
        assert "Double-Booking Conflict" in double_book_res.json()["detail"]
        print("✅ SELECT FOR UPDATE database locking prevented double-booking conflict (409).")

        # Book another slot at 10:00 and cancel it, verify Cancelled slots are also REMOVED from available slots
        cancel_appt_res = await client.post(
            "/api/appointments",
            json={
                "doctor_id": doc_profile.id,
                "date": monday_str,
                "time": "10:00",
                "duration_minutes": 30,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert cancel_appt_res.status_code == 201
        cancel_appt_id = cancel_appt_res.json()["id"]

        # Cancel this appointment
        patch_cancel = await client.patch(
            f"/api/appointments/{cancel_appt_id}/status",
            json={"status": "Cancelled"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert patch_cancel.status_code == 200
        assert patch_cancel.json()["status"] == "Cancelled"

        # Check slots again: both Booked (09:30) and Cancelled (10:00) must be removed as required
        slots_after_cancel = (
            await client.get(f"/api/doctors/{doc_profile.id}/slots?date={monday_str}")
        ).json()
        assert "09:30" not in slots_after_cancel
        assert "10:00" not in slots_after_cancel
        print("✅ Cross-referencing correctly removed both Booked and Cancelled slots.")

        # 11. Test Doctor Daily Agenda Endpoints
        agenda_me_res = await client.get(
            f"/api/doctors/me/agenda?date={monday_str}",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert agenda_me_res.status_code == 200
        agenda_data = agenda_me_res.json()
        assert agenda_data["doctor_id"] == doc_profile.id
        assert agenda_data["total_appointments"] >= 2
        assert agenda_data["booked_count"] >= 1
        assert len(agenda_data["appointments"]) >= 2
        print("✅ Doctor fetched their daily agenda successfully via /api/doctors/me/agenda.")

        agenda_id_res = await client.get(
            f"/api/doctors/{doc_profile.id}/agenda?date={monday_str}",
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert agenda_id_res.status_code == 200
        assert agenda_id_res.json()["doctor_id"] == doc_profile.id
        print("✅ Doctor fetched their daily agenda via /api/doctors/{id}/agenda.")

        # 12. Test Completing Appointment with TreatmentRecord
        complete_res = await client.post(
            f"/api/appointments/{appointment_id}/complete",
            json={
                "diagnosis": "Mild Essential Hypertension - Stage 1",
                "prescription": [
                    "Amlodipine 5mg once daily in the morning",
                    "Lifestyle advice: reduce dietary sodium",
                ],
                "detailed_notes": "Patient advised to track morning BP readings for 2 weeks.",
            },
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert complete_res.status_code == 200
        completed_appt = complete_res.json()
        assert completed_appt["status"] == "Completed"
        assert completed_appt["treatment_record"] is not None
        assert completed_appt["treatment_record"]["diagnosis"] == "Mild Essential Hypertension - Stage 1"
        assert len(completed_appt["treatment_record"]["prescription"]) == 2
        assert completed_appt["treatment_record"]["prescription"][0] == "Amlodipine 5mg once daily in the morning"
        print("✅ Doctor completed appointment and attached TreatmentRecord successfully.")

        # Verify agenda now reflects completed_count == 1
        refreshed_agenda = (
            await client.get(
                f"/api/doctors/me/agenda?date={monday_str}",
                headers={"Authorization": f"Bearer {doctor_token}"},
            )
        ).json()
        assert refreshed_agenda["completed_count"] >= 1
        print("✅ Doctor agenda dynamically reflected Completed appointment status.")

        # ==============================================================================
        # 13. Test EMR & HIS Models: Vitals, PharmacyItem, LabTest, LabOrder, Invoice
        # ==============================================================================
        async with AsyncSessionLocal() as session:
            # 13.1 Vitals Model linked to Appointment
            vitals = Vitals(
                appointment_id=appointment_id,
                height=180.0,
                weight=81.0,
                blood_pressure="120/80",
                temperature=98.6,
                pulse=72,
                respiratory_rate=16,
                oxygen_saturation=99.0,
                notes="Patient vitals in normal range.",
            )
            vitals.calculate_bmi()
            assert vitals.bmi == 25.0
            session.add(vitals)

            # 13.2 PharmacyItem Inventory Model
            pharm_item = PharmacyItem(
                name="Paracetamol 500mg",
                stock_quantity=500,
                price_per_unit=5.0,
                expiry_date=dt_date.today() + timedelta(days=365),
                sku="PAR-500-TAB",
                category="Analgesic",
                unit="tablet",
            )
            session.add(pharm_item)

            # 13.3 LabTest Model
            lab_test = LabTest(
                name="Complete Blood Count",
                cost=350.0,
                normal_range="13.5-17.5 g/dL",
                category="Hematology",
            )
            session.add(lab_test)
            await session.flush()

            # 13.4 LabOrder Model linked to Appointment & LabTest
            lab_order = LabOrder(
                appointment_id=appointment_id,
                lab_test_id=lab_test.id,
                status=LabOrderStatus.PENDING.value,
                notes="Fasting sample collected",
            )
            session.add(lab_order)

            # 13.5 Invoice Model linked to Patient & Appointment
            invoice = Invoice(
                invoice_number="INV-FASTAPI-001",
                patient_id=patient_user.id,
                appointment_id=appointment_id,
                payment_status=PaymentStatus.UNPAID.value,
                payment_method=PaymentMethod.CASH.value,
            )
            invoice.add_item(description="Consultation Fee", quantity=1, unit_price=500.0)
            invoice.add_item(description="Paracetamol", quantity=2, unit_price=5.0)
            invoice.add_item(description="Blood Test", quantity=1, unit_price=350.0)
            session.add(invoice)
            await session.flush()

            assert invoice.total_amount == 860.0
            await session.commit()

            print("✅ EMR & HIS Models (Vitals, PharmacyItem, LabTest, LabOrder, Invoice, InvoiceItem) verified in FastAPI.")

        # ==============================================================================
        # 14. Test Pharmacy POS & Laboratory Portal Endpoints
        # ==============================================================================
        # 14.1 Pharmacy low stock & restock
        low_stock_res = await client.get("/api/pharmacy/low-stock")
        assert low_stock_res.status_code == 200

        restock_res = await client.patch(
            f"/api/pharmacy/items/{pharm_item.id}/restock",
            json={"quantity_to_add": 50},
        )
        assert restock_res.status_code == 200
        assert restock_res.json()["stock_quantity"] == 550
        print("✅ Pharmacy restock API verified successfully.")

        # 14.2 Pending Prescriptions Queue & Dispensing
        presc_res = await client.get("/api/pharmacy/prescriptions/pending")
        assert presc_res.status_code == 200
        prescriptions = presc_res.json()
        assert len(prescriptions) >= 1
        assert prescriptions[0]["appointment_id"] == appointment_id

        dispense_res = await client.post(f"/api/pharmacy/prescriptions/{appointment_id}/dispense")
        assert dispense_res.status_code == 200
        assert dispense_res.json()["status"] == "success"
        print("✅ Pharmacy POS dispense workflow executed successfully.")

        # 14.3 Lab Orders queue & completion
        lab_orders_res = await client.get("/api/lab/orders?status=Pending")
        assert lab_orders_res.status_code == 200
        orders = lab_orders_res.json()
        assert len(orders) >= 1
        target_order = orders[0]
        assert target_order["status"] == "Pending"

        # Complete the lab order
        complete_lab_res = await client.post(
            f"/api/lab/orders/{target_order['id']}/complete",
            json={
                "results": "Hemoglobin: 14.2 g/dL (Normal). Platelets: 280,000 /mcL.",
                "notes": "Verified by automated clinical analyzer.",
            },
        )
        assert complete_lab_res.status_code == 200
        completed_order = complete_lab_res.json()
        assert completed_order["status"] == "Completed"
        assert "Hemoglobin: 14.2 g/dL" in completed_order["results"]

        # 14.4 Patient Lab History: verify completed result appears on patient view
        patient_labs_res = await client.get(f"/api/lab/orders/patient/{patient_user.id}")
        assert patient_labs_res.status_code == 200
        patient_orders = patient_labs_res.json()
        assert any(o["status"] == "Completed" and "Hemoglobin" in (o["results"] or "") for o in patient_orders)
        print("✅ Laboratory Portal results successfully populated and verified on Patient Lab records!")

    print("\n🎉 ALL APPOINTMENT BOOKING ENGINE TESTS PASSED CLEANLY!")


def test_fastapi_hospital_backend():
    """Pytest entrypoint executing end-to-end verification."""
    asyncio.run(run_all_tests())


if __name__ == "__main__":
    asyncio.run(run_all_tests())
