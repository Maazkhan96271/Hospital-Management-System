"""DoctorProfile model linked to User and Department with a 7-day availability field."""

import json
from datetime import datetime
from flask_app.extensions import db

DEFAULT_7DAY_SCHEDULE = json.dumps({
    "monday":    {"start": "09:00", "end": "17:00", "available": True},
    "tuesday":   {"start": "09:00", "end": "17:00", "available": True},
    "wednesday": {"start": "09:00", "end": "17:00", "available": True},
    "thursday":  {"start": "09:00", "end": "17:00", "available": True},
    "friday":    {"start": "09:00", "end": "17:00", "available": True},
    "saturday":  {"start": "10:00", "end": "14:00", "available": False},
    "sunday":    {"start": "00:00", "end": "00:00", "available": False},
})


class DoctorProfile(db.Model):
    """Doctor profile linked to User and Department with a 7-day availability schedule."""

    __tablename__ = "doctor_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    department_id = db.Column(
        db.Integer,
        db.ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )
    specialisation = db.Column(db.String(150), nullable=True)
    qualification = db.Column(db.String(200), nullable=True)
    experience_years = db.Column(db.Integer, default=0)

    # 7-day availability field (stored as JSON string)
    availability = db.Column(db.Text, nullable=True, default=DEFAULT_7DAY_SCHEDULE)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    doctor_appointments = db.relationship(
        "Appointment",
        foreign_keys="Appointment.doctor_id",
        backref="doctor_profile",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    @property
    def parsed_availability(self):
        """Return parsed 7-day schedule dictionary."""
        if not self.availability:
            return json.loads(DEFAULT_7DAY_SCHEDULE)
        try:
            return json.loads(self.availability)
        except (json.JSONDecodeError, TypeError):
            return json.loads(DEFAULT_7DAY_SCHEDULE)

    def set_availability(self, schedule_dict: dict) -> None:
        """Serialize and store 7-day availability schedule."""
        self.availability = json.dumps(schedule_dict)

    def __repr__(self) -> str:
        return f"<DoctorProfile user_id={self.user_id} spec={self.specialisation}>"
