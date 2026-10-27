"""PharmacyItem inventory database model for medication stock management."""

from datetime import datetime, date
from typing import Optional
from sqlalchemy import (
    Date,
    DateTime,
    Float,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PharmacyItem(Base):
    """Pharmacy inventory medication tracking stocks, prices, and expiry dates."""

    __tablename__ = "pharmacy_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)  # Item ID
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    price_per_unit: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Optional HIS attributes
    sku: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True, index=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String(50), default="unit", nullable=True)
    reorder_level: Mapped[int] = mapped_column(Integer, default=10, nullable=False)

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

    @property
    def is_expired(self) -> bool:
        """Check if item has expired."""
        if not self.expiry_date:
            return False
        return self.expiry_date < date.today()

    @property
    def is_low_stock(self) -> bool:
        """Check if stock has reached reorder threshold."""
        return self.stock_quantity <= self.reorder_level

    def __repr__(self) -> str:
        return (
            f"<PharmacyItem id={self.id} name='{self.name}' "
            f"stock={self.stock_quantity} price={self.price_per_unit} exp={self.expiry_date}>"
        )
