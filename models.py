"""Database models for the Hospital Management System.

Modular models reside in `flask_app.models`. Re-exported here for compatibility.
"""

from flask_app.extensions import db
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

__all__ = [
    "db",
    "User",
    "UserRole",
    "Department",
    "DoctorProfile",
    "Appointment",
    "AppointmentStatus",
    "Treatment",
    "DEFAULT_7DAY_SCHEDULE",
]
