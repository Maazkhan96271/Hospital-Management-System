"""Database models for the Hospital Management System."""

from datetime import datetime, date, time

from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


# ---------------------------------------------------------------------------
# Enumerations (stored as strings for SQLite compatibility)
# ---------------------------------------------------------------------------

class UserRole:
    ADMIN = "admin"
    DOCTOR = "doctor"
    PATIENT = "patient"


class AppointmentStatus:
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class User(UserMixin, db.Model):
    """Represents any user of the system – Admin, Doctor, or Patient."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    role = db.Column(db.String(10), nullable=False, default=UserRole.PATIENT)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    doctor_profile = db.relationship(
        "DoctorProfile", backref="user", uselist=False, cascade="all, delete-orphan"
    )
    # Appointments where this user is the *patient*
    patient_appointments = db.relationship(
        "Appointment",
        foreign_keys="Appointment.patient_id",
        backref="patient",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    # ------------------------------------------------------------------
    # Password helpers
    # ------------------------------------------------------------------

    def set_password(self, password: str) -> None:
        """Hash and store the password using Werkzeug's PBKDF2 hasher."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify a plaintext password against the stored hash."""
        return check_password_hash(self.password_hash, password)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def __repr__(self) -> str:
        return f"<User {self.username} ({self.role})>"


# ---------------------------------------------------------------------------
# Department
# ---------------------------------------------------------------------------

class Department(db.Model):
    """Hospital department / specialisation."""

    __tablename__ = "departments"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    doctors = db.relationship("DoctorProfile", backref="department", lazy="dynamic")

    def __repr__(self) -> str:
        return f"<Department {self.name}>"


# ---------------------------------------------------------------------------
# DoctorProfile
# ---------------------------------------------------------------------------

class DoctorProfile(db.Model):
    """Extended profile for users with the Doctor role.

    ``availability`` stores a JSON-compatible string representing a 7-day
    schedule.  Example format::

        {
            "monday":    {"start": "09:00", "end": "17:00", "available": true},
            "tuesday":   {"start": "09:00", "end": "17:00", "available": true},
            "wednesday": {"start": "09:00", "end": "17:00", "available": true},
            "thursday":  {"start": "09:00", "end": "17:00", "available": true},
            "friday":    {"start": "09:00", "end": "17:00", "available": true},
            "saturday":  {"start": "10:00", "end": "14:00", "available": false},
            "sunday":    {"start": "00:00", "end": "00:00", "available": false}
        }
    """

    __tablename__ = "doctor_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    department_id = db.Column(
        db.Integer, db.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    specialisation = db.Column(db.String(150), nullable=True)
    qualification = db.Column(db.String(200), nullable=True)
    experience_years = db.Column(db.Integer, default=0)
    availability = db.Column(db.Text, nullable=True)  # JSON string for 7-day schedule
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Appointments where this doctor is assigned
    doctor_appointments = db.relationship(
        "Appointment",
        foreign_keys="Appointment.doctor_id",
        backref="doctor_profile",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<DoctorProfile user_id={self.user_id}>"


# ---------------------------------------------------------------------------
# Appointment
# ---------------------------------------------------------------------------

class Appointment(db.Model):
    """A scheduled meeting between a Patient and a Doctor."""

    __tablename__ = "appointments"

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    doctor_id = db.Column(
        db.Integer, db.ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False
    )
    appointment_date = db.Column(db.Date, nullable=False, default=date.today)
    appointment_time = db.Column(db.Time, nullable=False, default=time(9, 0))
    status = db.Column(db.String(20), nullable=False, default=AppointmentStatus.SCHEDULED)
    reason = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to Treatment
    treatment = db.relationship(
        "Treatment", backref="appointment", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Appointment {self.id} | patient={self.patient_id} doctor={self.doctor_id} | {self.status}>"


# ---------------------------------------------------------------------------
# Treatment
# ---------------------------------------------------------------------------

class Treatment(db.Model):
    """Medical treatment record tied to a specific Appointment."""

    __tablename__ = "treatments"

    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(
        db.Integer, db.ForeignKey("appointments.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    diagnosis = db.Column(db.Text, nullable=True)
    prescription = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Treatment appointment_id={self.appointment_id}>"
