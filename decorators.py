"""Role-based access decorators for the Hospital Management System."""

from flask_app.decorators import (
    role_required,
    admin_required,
    doctor_required,
    patient_required,
)

__all__ = [
    "role_required",
    "admin_required",
    "doctor_required",
    "patient_required",
]
