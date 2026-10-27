"""Appointment model representing consultation bookings."""

from datetime import datetime, date, time
from flask_app.extensions import db


class AppointmentStatus:
    """Standard appointment statuses."""
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


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

    def __repr__(self) -> str:
        return f"<Appointment #{self.id} | Patient #{self.patient_id} -> Doctor #{self.doctor_id} | {self.status}>"
