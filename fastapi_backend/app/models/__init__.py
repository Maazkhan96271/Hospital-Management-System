"""Model exports for Alembic and application modules."""

from app.core.database import Base
from app.models.role import Role
from app.models.user import User
from app.models.department import Department
from app.models.doctor_profile import DoctorProfile
from app.models.appointment import Appointment, AppointmentStatus
from app.models.treatment_record import TreatmentRecord

__all__ = [
    "Base",
    "Role",
    "User",
    "Department",
    "DoctorProfile",
    "Appointment",
    "AppointmentStatus",
    "TreatmentRecord",
]
