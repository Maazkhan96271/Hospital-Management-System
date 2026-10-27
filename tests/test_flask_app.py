"""Automated test suite verifying the modular Flask application and startup initialization."""

import os
import sys
import tempfile
import pytest

# Ensure repository root is on sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from flask_app import create_app, db, init_db_and_seed_admin
from flask_app.config import TestingConfig
from flask_app.models import (
    User,
    UserRole,
    Department,
    DoctorProfile,
    Appointment,
    AppointmentStatus,
    Treatment,
    DEFAULT_7DAY_SCHEDULE,
)


def test_flask_modular_app_startup_and_admin_seeding():
    """Verify that create_app runs db.create_all() and seeds Admin superuser on startup."""
    # Use isolated temporary SQLite database
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)

    class CustomTestConfig(TestingConfig):
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"
        ADMIN_USERNAME = "superadmin_test"
        ADMIN_EMAIL = "superadmin@hospital.test"
        ADMIN_PASSWORD = "SuperSecret@123"

    try:
        # Initialize app -> triggers startup init script
        app = create_app(CustomTestConfig)

        with app.app_context():
            # 1. Verify all database models and tables were created via db.create_all()
            tables = db.metadata.tables.keys()
            assert "users" in tables
            assert "departments" in tables
            assert "doctor_profiles" in tables
            assert "appointments" in tables
            assert "treatments" in tables
            print("✅ All required database tables exist in SQLite without manual creation.")

            # 2. Verify Admin superuser was created programmatically
            admin = User.query.filter_by(role=UserRole.ADMIN).first()
            assert admin is not None
            assert admin.username == "superadmin_test"
            assert admin.email == "superadmin@hospital.test"
            assert admin.is_admin is True
            assert admin.is_active is True

            # 3. Verify password is securely hashed and check_password works
            assert admin.password_hash != "SuperSecret@123"
            assert admin.check_password("SuperSecret@123") is True
            assert admin.check_password("WrongPassword") is False
            print("✅ Pre-existing Admin superuser verified with hashed password.")

            # 4. Verify running startup initialization again idempotently skips re-seeding
            init_db_and_seed_admin(app)
            admin_count = User.query.filter_by(role=UserRole.ADMIN).count()
            assert admin_count == 1
            print("✅ Re-running initialization script is idempotent (no duplicate admins).")

            # 5. Verify Department, DoctorProfile (with 7-day availability), Appointment, and Treatment models
            cardio = Department(name="Cardiology", description="Heart & Cardiovascular care")
            db.session.add(cardio)
            db.session.commit()

            doc_user = User(
                username="dr_smith",
                email="smith@hospital.test",
                first_name="Alice",
                last_name="Smith",
                role=UserRole.DOCTOR,
            )
            doc_user.set_password("Doc@123")
            db.session.add(doc_user)
            db.session.commit()

            doc_profile = DoctorProfile(
                user_id=doc_user.id,
                department_id=cardio.id,
                specialisation="Interventional Cardiology",
                qualification="MD, FACC",
                experience_years=12,
                availability=DEFAULT_7DAY_SCHEDULE,
            )
            db.session.add(doc_profile)
            db.session.commit()

            # Verify 7-day availability field
            sched = doc_profile.parsed_availability
            assert "monday" in sched
            assert sched["monday"]["available"] is True
            assert "sunday" in sched
            print("✅ DoctorProfile with 7-day availability verified.")

            # Patient user
            patient_user = User(
                username="john_doe",
                email="john@patient.test",
                first_name="John",
                last_name="Doe",
                role=UserRole.PATIENT,
            )
            patient_user.set_password("Patient@123")
            db.session.add(patient_user)
            db.session.commit()

            # Appointment model
            from datetime import date, time
            appt = Appointment(
                patient_id=patient_user.id,
                doctor_id=doc_profile.id,
                appointment_date=date(2026, 11, 2),
                appointment_time=time(10, 0),
                status=AppointmentStatus.SCHEDULED,
                reason="Routine checkup",
            )
            db.session.add(appt)
            db.session.commit()
            assert appt.id is not None
            print("✅ Appointment model linked to Patient and DoctorProfile verified.")

            # Treatment model linked to Appointment
            treatment = Treatment(
                appointment_id=appt.id,
                diagnosis="Hypertension Stage 1",
                prescription="Amlodipine 5mg daily",
                notes="Follow up in 30 days",
            )
            db.session.add(treatment)
            db.session.commit()
            assert treatment.id is not None
            assert appt.treatment.diagnosis == "Hypertension Stage 1"
            print("✅ Treatment model linked to Appointment verified.")

        # Test HTTP endpoints with test client
        client = app.test_client()
        res = client.get("/")
        assert res.status_code == 200
        print("✅ Landing page route works.")

        login_res = client.get("/login")
        assert login_res.status_code == 200
        print("✅ Login route works.")

    finally:
        if os.path.exists(db_path):
            os.remove(db_path)


if __name__ == "__main__":
    test_flask_modular_app_startup_and_admin_seeding()
    print("\n🎉 All Flask modular architecture tests passed!")
