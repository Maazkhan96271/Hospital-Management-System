"""Vitals database model for EMR clinical measurements."""

from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.appointment import Appointment


class Vitals(Base):
    """Clinical vital signs recorded during a consultation appointment."""

    __tablename__ = "vitals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # 1-to-1 link to Appointment
    appointment_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("appointments.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # Core EMR Vital Signs
    height: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # in cm
    weight: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # in kg
    bmi: Mapped[Optional[float]] = mapped_column(Float, nullable=True)     # Body Mass Index (kg/m²)
    blood_pressure: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # e.g., "120/80"
    temperature: Mapped[Optional[float]] = mapped_column(Float, nullable=True)        # in °F or °C
    pulse: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)              # bpm

    # Extended EMR parameters
    respiratory_rate: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    oxygen_saturation: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationship to Appointment
    appointment: Mapped["Appointment"] = relationship(
        "Appointment", back_populates="vitals"
    )

    def calculate_bmi(self) -> Optional[float]:
        """Compute and set BMI from height (cm) and weight (kg)."""
        if self.height and self.weight and self.height > 0:
            height_m = self.height / 100.0
            self.bmi = round(self.weight / (height_m * height_m), 2)
            return self.bmi
        return None

    def __repr__(self) -> str:
        return (
            f"<Vitals id={self.id} appointment_id={self.appointment_id} "
            f"bp='{self.blood_pressure}' pulse={self.pulse} bmi={self.bmi}>"
        )
