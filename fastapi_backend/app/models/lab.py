"""Laboratory database models: LabTest and LabOrder for diagnostic investigations."""

from datetime import datetime
from enum import Enum
from typing import List, Optional, TYPE_CHECKING
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


class LabOrderStatus(str, Enum):
    """Laboratory test order statuses."""
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class LabTest(Base):
    """Diagnostic laboratory test catalog entity."""

    __tablename__ = "lab_tests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)  # Test ID
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    normal_range: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Optional HIS catalog fields
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    orders: Mapped[List["LabOrder"]] = relationship(
        "LabOrder", back_populates="lab_test", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<LabTest id={self.id} name='{self.name}' cost={self.cost}>"


class LabOrder(Base):
    """Laboratory test investigation order linked to an Appointment and a LabTest."""

    __tablename__ = "lab_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Appointment Foreign Key constraint
    appointment_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("appointments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # LabTest Foreign Key constraint
    lab_test_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("lab_tests.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default=LabOrderStatus.PENDING.value,
        nullable=False,
        index=True,
    )
    # Results can store unstructured findings or JSON representation
    results: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    ordered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    appointment: Mapped["Appointment"] = relationship(
        "Appointment", back_populates="lab_orders"
    )
    lab_test: Mapped["LabTest"] = relationship(
        "LabTest", back_populates="orders"
    )

    def __repr__(self) -> str:
        return (
            f"<LabOrder id={self.id} appointment_id={self.appointment_id} "
            f"lab_test_id={self.lab_test_id} status='{self.status}'>"
        )
