"""Vitals model linked to an Appointment for EMR/HIS clinical tracking."""

from datetime import datetime
from flask_app.extensions import db


class Vitals(db.Model):
    """Vital signs recorded for a clinical appointment / patient consultation."""

    __tablename__ = "vitals"

    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(
        db.Integer,
        db.ForeignKey("appointments.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # Core EMR Vital Signs
    height = db.Column(db.Float, nullable=True)  # in cm (e.g., 175.0)
    weight = db.Column(db.Float, nullable=True)  # in kg (e.g., 72.5)
    bmi = db.Column(db.Float, nullable=True)     # Body Mass Index (kg/m²)
    blood_pressure = db.Column(db.String(20), nullable=True)  # e.g., "120/80 mmHg"
    temperature = db.Column(db.Float, nullable=True)  # in °F or °C (e.g., 98.6)
    pulse = db.Column(db.Integer, nullable=True)      # beats per minute (e.g., 72 bpm)

    # Extended Clinical Parameters
    respiratory_rate = db.Column(db.Integer, nullable=True)  # breaths per minute (e.g., 16)
    oxygen_saturation = db.Column(db.Float, nullable=True)   # SpO2 percentage (e.g., 98.5)
    notes = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def calculate_bmi(self) -> float | None:
        """Compute and update BMI from height (cm) and weight (kg)."""
        if self.height and self.weight and self.height > 0:
            height_m = self.height / 100.0
            self.bmi = round(self.weight / (height_m * height_m), 2)
            return self.bmi
        return None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "appointment_id": self.appointment_id,
            "height": self.height,
            "weight": self.weight,
            "bmi": self.bmi or self.calculate_bmi(),
            "blood_pressure": self.blood_pressure,
            "temperature": self.temperature,
            "pulse": self.pulse,
            "respiratory_rate": self.respiratory_rate,
            "oxygen_saturation": self.oxygen_saturation,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return (
            f"<Vitals #{self.id} for Appointment #{self.appointment_id} | "
            f"BP={self.blood_pressure} Pulse={self.pulse} BMI={self.bmi}>"
        )
