"""Database models for the Flask Hospital Management System."""

from flask_app.extensions import db
from flask_app.models.user import User, UserRole
from flask_app.models.department import Department
from flask_app.models.doctor import DoctorProfile, DEFAULT_7DAY_SCHEDULE
from flask_app.models.appointment import Appointment, AppointmentStatus
from flask_app.models.treatment import Treatment

__all__ = [
    "db",
    "User",
    "UserRole",
    "Department",
    "DoctorProfile",
    "DEFAULT_7DAY_SCHEDULE",
    "Appointment",
    "AppointmentStatus",
    "Treatment",
]
