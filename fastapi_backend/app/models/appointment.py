"""Appointment database model."""

from datetime import datetime
from enum import Enum
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.doctor_profile import DoctorProfile
    from app.models.treatment_record import TreatmentRecord
    from app.models.vitals import Vitals
    from app.models.lab import LabOrder
    from app.models.billing import Invoice


class AppointmentStatus(str, Enum):
    """Appointment lifecycle statuses."""
    BOOKED = "Booked"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class Appointment(Base):
    """Patient and Doctor consultation appointment record."""

    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Patient Foreign Key constraint
    patient_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Doctor Foreign Key constraint
    doctor_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("doctor_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Appointment Schedule details
    appointment_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    duration_minutes: Mapped[int] = mapped_column(
        Integer,
        default=30,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default=AppointmentStatus.BOOKED.value,
        nullable=False,
        index=True,
    )
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

    # High-performance compound indexes for conflict prevention & querying
    __table_args__ = (
        Index(
            "ix_appointments_doctor_datetime_status",
            "doctor_id",
            "appointment_datetime",
            "status",
        ),
        Index(
            "ix_appointments_patient_datetime",
            "patient_id",
            "appointment_datetime",
        ),
        Index(
            "ix_appointments_datetime_status",
            "appointment_datetime",
            "status",
        ),
    )

    # Relationships
    patient: Mapped["User"] = relationship(
        "User", back_populates="patient_appointments", foreign_keys=[patient_id]
    )
    doctor: Mapped["DoctorProfile"] = relationship(
        "DoctorProfile", back_populates="doctor_appointments", foreign_keys=[doctor_id]
    )
    treatment_record: Mapped[Optional["TreatmentRecord"]] = relationship(
        "TreatmentRecord",
        back_populates="appointment",
        uselist=False,
        cascade="all, delete-orphan",
    )
    vitals: Mapped[Optional["Vitals"]] = relationship(
        "Vitals",
        back_populates="appointment",
        uselist=False,
        cascade="all, delete-orphan",
    )
    lab_orders: Mapped[List["LabOrder"]] = relationship(
        "LabOrder",
        back_populates="appointment",
        cascade="all, delete-orphan",
    )
    invoices: Mapped[List["Invoice"]] = relationship(
        "Invoice",
        back_populates="appointment",
    )

    def __repr__(self) -> str:
        return (
            f"<Appointment id={self.id} patient_id={self.patient_id} "
            f"doctor_id={self.doctor_id} status='{self.status}'>"
        )
