"""Doctor profile database model."""

from datetime import datetime
from typing import Any, Dict, List, Optional, TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.department import Department
    from app.models.appointment import Appointment

# PostgreSQL JSONB with fallback variant for SQLite compatibility in tests
JSONB_TYPE = JSONB().with_variant(JSON(), "sqlite")

DEFAULT_WEEKLY_AVAILABILITY: Dict[str, Any] = {
    "monday": {"start": "09:00", "end": "17:00", "available": True},
    "tuesday": {"start": "09:00", "end": "17:00", "available": True},
    "wednesday": {"start": "09:00", "end": "17:00", "available": True},
    "thursday": {"start": "09:00", "end": "17:00", "available": True},
    "friday": {"start": "09:00", "end": "17:00", "available": True},
    "saturday": {"start": "10:00", "end": "14:00", "available": False},
    "sunday": {"start": "00:00", "end": "00:00", "available": False},
}


class DoctorProfile(Base):
    """Extended doctor profile linked to User and Department with JSONB availability schedule."""

    __tablename__ = "doctor_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # One-to-one link to User
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # Many-to-one link to Department
    department_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    specialization: Mapped[Optional[str]] = mapped_column(
        String(150), nullable=True, index=True
    )
    qualification: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )
    experience_years: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, index=True
    )

    # JSONB column storing weekly availability schedules
    weekly_availability: Mapped[Dict[str, Any]] = mapped_column(
        JSONB_TYPE,
        nullable=False,
        default=DEFAULT_WEEKLY_AVAILABILITY,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Index for fast doctor search by department and specialization
    __table_args__ = (
        Index("ix_doctor_profiles_dept_spec", "department_id", "specialization"),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="doctor_profile")
    department: Mapped[Optional["Department"]] = relationship(
        "Department", back_populates="doctors"
    )
    doctor_appointments: Mapped[List["Appointment"]] = relationship(
        "Appointment",
        back_populates="doctor",
        foreign_keys="Appointment.doctor_id",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<DoctorProfile id={self.id} user_id={self.user_id} spec='{self.specialization}'>"
