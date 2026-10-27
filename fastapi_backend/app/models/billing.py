"""Billing and Invoicing database models for HIS financial workflows."""

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
    from app.models.user import User
    from app.models.appointment import Appointment


class PaymentStatus(str, Enum):
    """Invoice payment lifecycle status."""
    UNPAID = "Unpaid"
    PAID = "Paid"
    PARTIAL = "Partial"


class PaymentMethod(str, Enum):
    """Accepted payment channels."""
    CASH = "Cash"
    CREDIT_CARD = "Credit Card"
    DEBIT_CARD = "Debit Card"
    UPI = "UPI"
    INSURANCE = "Insurance"
    ONLINE = "Online"
    NET_BANKING = "Net Banking"


class Invoice(Base):
    """Patient invoice linked to Patient (User) and optionally an Appointment."""

    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    invoice_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )

    # Patient Foreign Key constraint
    patient_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Appointment Foreign Key constraint (nullable if invoice is general/walk-in)
    appointment_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("appointments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    total_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    payment_status: Mapped[str] = mapped_column(
        String(20),
        default=PaymentStatus.UNPAID.value,
        nullable=False,
        index=True,
    )
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    paid_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    issued_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    due_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
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

    # Relationships
    patient: Mapped["User"] = relationship("User", back_populates="invoices")
    appointment: Mapped[Optional["Appointment"]] = relationship(
        "Appointment", back_populates="invoices"
    )
    items: Mapped[List["InvoiceItem"]] = relationship(
        "InvoiceItem",
        back_populates="invoice",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def recalculate_total(self) -> float:
        """Sum item totals and update total_amount."""
        try:
            items_list = self.items
            total = sum(item.total for item in items_list)
        except Exception:
            total = self.total_amount
        self.total_amount = round(total, 2)
        paid = self.paid_amount if self.paid_amount is not None else 0.0
        if paid >= self.total_amount and self.total_amount > 0:
            self.payment_status = PaymentStatus.PAID.value
        elif paid > 0:
            self.payment_status = PaymentStatus.PARTIAL.value
        return self.total_amount

    def add_item(self, description: str, quantity: int, unit_price: float) -> "InvoiceItem":
        """Convenience helper to append item and update total."""
        item = InvoiceItem(
            description=description,
            quantity=quantity,
            unit_price=unit_price,
            total=round(quantity * unit_price, 2),
        )
        self.items.append(item)
        self.recalculate_total()
        return item

    def __repr__(self) -> str:
        return (
            f"<Invoice id={self.id} number='{self.invoice_number}' "
            f"patient_id={self.patient_id} total={self.total_amount} status='{self.payment_status}'>"
        )


class InvoiceItem(Base):
    """Itemized bill entry linked to an Invoice."""

    __tablename__ = "invoice_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    invoice_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    description: Mapped[str] = mapped_column(
        String(255), nullable=False
    )  # e.g., "Consultation Fee", "Paracetamol", "Blood Test"
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationship to Invoice
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="items")

    def calculate_total(self) -> float:
        """Compute line item total."""
        self.total = round(self.quantity * self.unit_price, 2)
        return self.total

    def __repr__(self) -> str:
        return (
            f"<InvoiceItem id={self.id} invoice_id={self.invoice_id} "
            f"desc='{self.description}' qty={self.quantity} total={self.total}>"
        )
