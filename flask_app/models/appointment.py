"""Appointment model representing consultation bookings."""

from datetime import datetime, date, time
from flask_app.extensions import db


class AppointmentStatus:
    """Standard appointment statuses."""
    SCHEDULED = "scheduled"
    WAITING = "waiting"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class ConsultationType:
    """Consultation delivery modes."""
    IN_PERSON = "In-Person"
    VIDEO = "Video"


class AppointmentPaymentStatus:
    """Payment settlement status for an appointment."""
    UNPAID = "Unpaid"
    PAID = "Paid"
    PARTIAL = "Partial"
    REFUNDED = "Refunded"


class Appointment(db.Model):
    """Consultation booking between a patient and a doctor."""

    __tablename__ = "appointments"

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    doctor_id = db.Column(
        db.Integer,
        db.ForeignKey("doctor_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    appointment_date = db.Column(db.Date, nullable=False, default=date.today)
    appointment_time = db.Column(db.Time, nullable=False, default=time(9, 0))
    status = db.Column(db.String(20), nullable=False, default=AppointmentStatus.SCHEDULED)
    consultation_type = db.Column(
        db.String(20),
        nullable=False,
        default=ConsultationType.IN_PERSON,
    )
    payment_status = db.Column(
        db.String(20),
        nullable=False,
        default=AppointmentPaymentStatus.UNPAID,
    )
    reason = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 1-to-1 relationship to Treatment
    treatment = db.relationship(
        "Treatment",
        backref="appointment",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # 1-to-1 relationship to Vitals (EMR)
    vitals = db.relationship(
        "Vitals",
        backref="appointment",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # 1-to-many relationship to LabOrder
    lab_orders = db.relationship(
        "LabOrder",
        backref="appointment",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    # 1-to-many relationship to Invoice
    invoices = db.relationship(
        "Invoice",
        backref="appointment",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    def __repr__(self) -> str:
        return f"<Appointment #{self.id} | Patient #{self.patient_id} -> Doctor #{self.doctor_id} | {self.status}>"
