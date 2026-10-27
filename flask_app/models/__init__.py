"""Database models for the Flask Hospital Management System and EMR / HIS Platform."""

from flask_app.extensions import db
from flask_app.models.user import User, UserRole
from flask_app.models.department import Department
from flask_app.models.doctor import DoctorProfile, DEFAULT_7DAY_SCHEDULE
from flask_app.models.appointment import Appointment, AppointmentStatus
from flask_app.models.treatment import Treatment
from flask_app.models.vitals import Vitals
from flask_app.models.pharmacy import PharmacyItem
from flask_app.models.lab import LabTest, LabOrder, LabOrderStatus
from flask_app.models.billing import Invoice, InvoiceItem, PaymentStatus, PaymentMethod

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
    "Vitals",
    "PharmacyItem",
    "LabTest",
    "LabOrder",
    "LabOrderStatus",
    "Invoice",
    "InvoiceItem",
    "PaymentStatus",
    "PaymentMethod",
]
