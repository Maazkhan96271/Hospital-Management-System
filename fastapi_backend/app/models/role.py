"""Role database model."""

from typing import List, TYPE_CHECKING
from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class Role(Base):
    """System roles: Admin, Doctor, Patient."""

    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=True)

    # Relationships
    users: Mapped[List["User"]] = relationship(
        "User", back_populates="role", cascade="all"
    )

    def __repr__(self) -> str:
        return f"<Role id={self.id} name='{self.name}'>"
