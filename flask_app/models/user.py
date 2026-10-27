"""User model supporting Admin, Doctor, and Patient roles."""

from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from flask_app.extensions import db


class UserRole:
    """Supported user roles in the Hospital Management System."""
    ADMIN = "admin"
    DOCTOR = "doctor"
    PATIENT = "patient"


class User(UserMixin, db.Model):
    """Represents an authenticated user: Admin, Doctor, or Patient."""

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
        "DoctorProfile",
        backref="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    patient_appointments = db.relationship(
        "Appointment",
        foreign_keys="Appointment.patient_id",
        backref="patient",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    def set_password(self, password: str) -> None:
        """Hash and store password using Werkzeug PBKDF2."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify plaintext password against stored hash."""
        return check_password_hash(self.password_hash, password)

    @property
    def full_name(self) -> str:
        """Return formatted full name."""
        return f"{self.first_name} {self.last_name}".strip() or self.username

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN

    @property
    def is_doctor(self) -> bool:
        return self.role == UserRole.DOCTOR

    @property
    def is_patient(self) -> bool:
        return self.role == UserRole.PATIENT

    def __repr__(self) -> str:
        return f"<User {self.username} ({self.role})>"
