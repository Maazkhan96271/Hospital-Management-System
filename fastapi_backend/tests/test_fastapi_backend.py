"""Automated test suite verifying the complete FastAPI Hospital Management System backend."""

import asyncio
from datetime import datetime, timezone, timedelta
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
        # A Patient trying to access Admin-only /api/v1/users/ -> Must be 403 Forbidden
        patient_admin_attempt = await client.get(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {patient_token}"},
        )
        assert patient_admin_attempt.status_code == 403
        print("✅ Role dependency blocked unauthorized Patient from Admin route (403 Forbidden).")

        # Admin accessing /api/v1/users/ -> Allowed
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
            "monday": {"available": True, "start": "08:00", "end": "16:00"},
            "tuesday": {"available": True, "start": "08:00", "end": "16:00"},
            "wednesday": {"available": True, "start": "08:00", "end": "16:00"},
            "thursday": {"available": True, "start": "08:00", "end": "16:00"},
            "friday": {"available": True, "start": "08:00", "end": "14:00"},
            "saturday": {"available": False, "start": "00:00", "end": "00:00"},
            "sunday": {"available": False, "start": "00:00", "end": "00:00"},
        }
        avail_res = await client.put(
            "/api/v1/doctors/me/availability",
            json=updated_schedule,
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert avail_res.status_code == 200
        assert avail_res.json()["weekly_availability"]["monday"]["start"] == "08:00"
        print("✅ Doctor updated JSONB 7-day availability schedule successfully.")

        # 9. Test Appointment Booking & Strict Double-Booking Prevention
        target_time = (datetime.now(timezone.utc) + timedelta(days=2)).replace(
            hour=10, minute=0, second=0, microsecond=0
        )
        book_res = await client.post(
            "/api/v1/appointments/",
            json={
                "doctor_id": doc_profile.id,
                "appointment_datetime": target_time.isoformat(),
                "duration_minutes": 30,
                "notes": "Initial cardiac consultation",
            },
            headers={"Authorization": f"Bearer {patient_token}"},
        )
        assert book_res.status_code == 201
        appointment_id = book_res.json()["id"]
        assert book_res.json()["status"] == "Booked"
        print("✅ Appointment successfully booked.")

        # Attempt DOUBLE-BOOKING with same doctor at exact same time -> Must return 409 Conflict
        double_book_res = await client.post(
            "/api/v1/appointments/",
            json={
                "doctor_id": doc_profile.id,
                "appointment_datetime": target_time.isoformat(),
                "duration_minutes": 30,
                "notes": "Conflicting slot request",
            },
            headers={"Authorization": f"Bearer {patient_token}"},
        )
        assert double_book_res.status_code == 409
        assert "Double-Booking Conflict" in double_book_res.json()["detail"]
        print("✅ Strict double-booking prevention verified (409 Conflict returned).")

        # 10. Test Doctor Consultation & TreatmentRecord (with prescription array)
        prescription_items = [
            "Atorvastatin 20mg once daily at bedtime",
            "Aspirin 81mg once daily with breakfast",
            "Metoprolol Tartrate 25mg twice daily",
        ]
        treatment_res = await client.post(
            "/api/v1/treatments/",
            json={
                "appointment_id": appointment_id,
                "diagnosis": "Coronary artery disease - mild stable angina",
                "prescription": prescription_items,
                "detailed_notes": "Patient advised lifestyle modifications, low sodium diet.",
            },
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert treatment_res.status_code == 201
        saved_treatment = treatment_res.json()
        assert saved_treatment["diagnosis"] == "Coronary artery disease - mild stable angina"
        assert len(saved_treatment["prescription"]) == 3
        assert saved_treatment["prescription"][0] == "Atorvastatin 20mg once daily at bedtime"
        print("✅ Treatment record with prescription array saved successfully.")

        # Verify that the appointment status transitioned to Completed
        appts_list = await client.get(
            "/api/v1/appointments/",
            headers={"Authorization": f"Bearer {patient_token}"},
        )
        assert appts_list.status_code == 200
        completed_appt = next(a for a in appts_list.json() if a["id"] == appointment_id)
        assert completed_appt["status"] == "Completed"
        print("✅ Appointment status automatically updated to 'Completed' upon treatment creation.")

    print("\n🎉 ALL FASTAPI BACKEND TESTS PASSED CLEANLY!")


def test_fastapi_hospital_backend():
    """Pytest entrypoint executing end-to-end verification."""
    asyncio.run(run_all_tests())


if __name__ == "__main__":
    asyncio.run(run_all_tests())
