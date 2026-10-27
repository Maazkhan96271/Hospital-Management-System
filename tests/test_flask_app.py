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
                status=AppointmentStatus.COMPLETED,
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

        # 6. Verify Anonymous Navbar in base.html
        res = client.get("/")
        assert res.status_code == 200
        html = res.data.decode("utf-8")
        assert "MediCare HMS" in html
        assert "Patient Login" in html
        assert "Doctor & Admin Portal" in html
        assert "Register as Patient" in html
        print("✅ Anonymous responsive navbar renders correctly in base.html.")

        # 7. Test Public Patient Registration (strictly assigns Patient role)
        reg_res = client.post(
            "/register",
            data={
                "username": "new_patient_alice",
                "email": "alice@patient.com",
                "first_name": "Alice",
                "last_name": "Patient",
                "phone": "+15551234567",
                "password": "Password123!",
                "confirm_password": "Password123!",
            },
            follow_redirects=True,
        )
        assert reg_res.status_code == 200
        with app.app_context():
            registered_patient = User.query.filter_by(username="new_patient_alice").first()
            assert registered_patient is not None
            assert registered_patient.role == UserRole.PATIENT
            assert registered_patient.check_password("Password123!") is True
        print("✅ Public self-registration successfully creates Patient with hashed password.")

        # 8. Test Patient Login & Session Management
        patient_client = app.test_client()
        login_res = patient_client.post(
            "/login",
            data={
                "username": "new_patient_alice",
                "password": "Password123!",
            },
            follow_redirects=True,
        )
        assert login_res.status_code == 200
        patient_html = login_res.data.decode("utf-8")
        assert "Alice Patient" in patient_html
        assert "Book Appointment" in patient_html
        assert "My Appointments" in patient_html
        print("✅ Patient login establishes session and renders patient-specific navbar.")

        # 9. Test Role Protection Decorator (@admin_required blocks Patient)
        admin_portal_attempt = patient_client.get("/admin/dashboard", follow_redirects=True)
        assert admin_portal_attempt.status_code == 200
        attempt_html = admin_portal_attempt.data.decode("utf-8")
        assert "Access denied. Administrator privileges required." in attempt_html
        print("✅ @admin_required decorator blocks Patient and flashes access denied message.")

        # 10. Test Staff Login Portal (/staff/login) - Restricts Patients
        unauth_client = app.test_client()
        staff_patient_attempt = unauth_client.post(
            "/staff/login",
            data={
                "username": "new_patient_alice",
                "password": "Password123!",
            },
            follow_redirects=True,
        )
        staff_html = staff_patient_attempt.data.decode("utf-8")
        assert "strictly for Doctors and Administrators" in staff_html
        print("✅ Staff login portal (/staff/login) rejects Patient login attempts.")

        # 11. Test Staff Login for Admin and Doctor
        admin_client = app.test_client()
        admin_login_res = admin_client.post(
            "/staff/login",
            data={
                "username": "superadmin_test",
                "password": "SuperSecret@123",
            },
            follow_redirects=True,
        )
        assert admin_login_res.status_code == 200
        admin_html = admin_login_res.data.decode("utf-8")
        assert "Admin Overview" in admin_html
        assert "Search Directory" in admin_html
        print("✅ Staff login allows Admin and renders Admin navbar.")

        # 12. Test Doctor Login and Dashboard
        doc_client = app.test_client()
        doc_login_res = doc_client.post(
            "/staff/login",
            data={
                "username": "dr_smith",
                "password": "Doc@123",
            },
            follow_redirects=True,
        )
        assert doc_login_res.status_code == 200
        doc_html = doc_login_res.data.decode("utf-8")
        assert "Today's Agenda" in doc_html
        assert "7-Day Availability" in doc_html
        print("✅ Staff login allows Doctor and renders Doctor navbar.")

        # 13. Test RESTful API for Available 7-Day Time Slots
        with app.app_context():
            doc_rec = DoctorProfile.query.first()
            doc_id = doc_rec.id

        # 7-day slot availability overview
        api_7days_res = client.get(f"/api/doctors/{doc_id}/slots")
        assert api_7days_res.status_code == 200
        api_data = api_7days_res.get_json()
        assert api_data["status"] == "success"
        assert len(api_data["days"]) == 7
        assert "available_slots_by_date" in api_data
        print("✅ RESTful API returns available 7-day time slots for doctor.")

        # Single-day slot query
        monday_str = "2026-11-02"
        api_single_res = client.get(f"/api/doctors/{doc_id}/slots?date={monday_str}")
        assert api_single_res.status_code == 200
        single_data = api_single_res.get_json()
        assert single_data["status"] == "success"
        assert single_data["is_available"] is True
        assert "10:00" in single_data["booked_slots"]
        assert "10:00" not in single_data["available_slots"]
        assert "09:00" in single_data["available_slots"]
        assert "09:30" in single_data["available_slots"]
        print("✅ RESTful API excludes already booked appointments from available 30-min slots.")

        # 14. Test Backend Validation against Double-Booking
        # Attempt to book exact same slot (2026-11-02 at 10:00) with Dr. Smith -> Must be rejected!
        conflict_booking = patient_client.post(
            "/patient/appointments/book",
            data={
                "doctor_id": doc_id,
                "appointment_date": "2026-11-02",
                "appointment_time": "10:00",
                "reason": "Duplicate collision attempt",
            },
            follow_redirects=True,
        )
        conflict_html = conflict_booking.data.decode("utf-8")
        assert "Double-Booking Conflict" in conflict_html
        print("✅ Backend validation strictly blocks double-booking on same doctor, date & time.")

        # 15. Test Patient Dashboard (Displays departments, doctor search, and history)
        p_dash_res = patient_client.get("/patient/dashboard")
        assert p_dash_res.status_code == 200
        p_dash_html = p_dash_res.data.decode("utf-8")
        assert "Cardiology" in p_dash_html
        assert "Medical Departments & Specialists" in p_dash_html

        # Check patient with existing treatment history (john_doe)
        john_client = app.test_client()
        john_client.post(
            "/login",
            data={"username": "john_doe", "password": "Patient@123"},
            follow_redirects=True,
        )
        j_dash = john_client.get("/patient/dashboard")
        assert "Hypertension Stage 1" in j_dash.data.decode("utf-8")
        assert "Amlodipine 5mg daily" in j_dash.data.decode("utf-8")

        # Doctor Search
        search_res = patient_client.get("/patient/doctors?q=Smith")
        assert search_res.status_code == 200
        assert "Dr. Alice Smith" in search_res.data.decode("utf-8")
        print("✅ Patient Dashboard displays departments, doctor search, and past treatment history.")

        # 16. Test Doctor Consultation: Complete Appointment & Record Treatment
        with app.app_context():
            # Create a pending appointment for today
            today_date = date.today()
            today_appt = Appointment(
                patient_id=registered_patient.id,
                doctor_id=doc_id,
                appointment_date=today_date,
                appointment_time=time(14, 0),
                status=AppointmentStatus.SCHEDULED,
                reason="Chest discomfort",
            )
            db.session.add(today_appt)
            db.session.commit()
            today_appt_id = today_appt.id

        # Verify today's patient appears on doctor's dashboard
        d_dash_res = doc_client.get("/doctor/dashboard")
        assert d_dash_res.status_code == 200
        assert "Alice Patient" in d_dash_res.data.decode("utf-8")
        assert "Today's Assigned Patients" in d_dash_res.data.decode("utf-8")

        # Doctor completes consultation and submits diagnosis + prescription
        complete_res = doc_client.post(
            f"/doctor/consultation/{today_appt_id}",
            data={
                "diagnosis": "Mild Angina Pectoris",
                "prescription": "Nitroglycerin 0.4mg sublingual PRN",
                "notes": "ECG normal, monitor exertion levels",
            },
            follow_redirects=True,
        )
        assert complete_res.status_code == 200
        assert "Consultation completed and treatment recorded" in complete_res.data.decode("utf-8")

        # Verify in database that appointment is Completed and Treatment attached
        with app.app_context():
            verified_appt = db.session.get(Appointment, today_appt_id)
            assert verified_appt.status == AppointmentStatus.COMPLETED
            assert verified_appt.treatment is not None
            assert verified_appt.treatment.diagnosis == "Mild Angina Pectoris"
            assert "Nitroglycerin" in verified_appt.treatment.prescription

        # Verify patient sees the newly completed treatment on their dashboard
        p_updated = patient_client.get("/patient/dashboard")
        assert "Mild Angina Pectoris" in p_updated.data.decode("utf-8")
        assert "Nitroglycerin" in p_updated.data.decode("utf-8")
        print("✅ Doctor Dashboard updates appointment to Completed and attaches Treatment record.")

    finally:
        if os.path.exists(db_path):
            os.remove(db_path)


if __name__ == "__main__":
    test_flask_modular_app_startup_and_admin_seeding()
    print("\n🎉 All Flask modular architecture tests passed!")
