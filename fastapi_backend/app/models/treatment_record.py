"""Treatment record database model."""

from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.appointment import Appointment

# PostgreSQL native ARRAY with fallback variant for SQLite compatibility
ARRAY_STRING_TYPE = ARRAY(String).with_variant(JSON(), "sqlite")


class TreatmentRecord(Base):
    """Medical treatment record tied to an appointment with prescription array."""

    __tablename__ = "treatment_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Unique 1-to-1 link to Appointment
    appointment_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("appointments.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    diagnosis: Mapped[str] = mapped_column(Text, nullable=False)

    # Prescription array column (e.g. ["Amoxicillin 500mg TID", "Ibuprofen 400mg PRN"])
    prescription: Mapped[List[str]] = mapped_column(
        ARRAY_STRING_TYPE,
        nullable=False,
        default=list,
    )

    detailed_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

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

    # Relationships
    appointment: Mapped["Appointment"] = relationship(
        "Appointment", back_populates="treatment_record"
    )

    def __repr__(self) -> str:
        return f"<TreatmentRecord id={self.id} appointment_id={self.appointment_id}>"
