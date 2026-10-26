"""Department database model."""

from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.doctor_profile import DoctorProfile


class Department(Base):
    """Medical department / specialisation unit."""

    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False, index=True
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    doctors: Mapped[List["DoctorProfile"]] = relationship(
        "DoctorProfile", back_populates="department"
    )

    def __repr__(self) -> str:
        return f"<Department id={self.id} name='{self.name}'>"
