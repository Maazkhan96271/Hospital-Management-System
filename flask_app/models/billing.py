"""Billing and Invoicing models: Invoice and InvoiceItem for HIS financials."""

from datetime import datetime
from flask_app.extensions import db


class PaymentStatus:
    """Standard payment statuses."""
    UNPAID = "Unpaid"
    PAID = "Paid"
    PARTIAL = "Partial"


class PaymentMethod:
    """Accepted payment channels."""
    CASH = "Cash"
    CREDIT_CARD = "Credit Card"
    DEBIT_CARD = "Debit Card"
    UPI = "UPI"
    INSURANCE = "Insurance"
    ONLINE = "Online"
    NET_BANKING = "Net Banking"


class Invoice(db.Model):
    """Patient invoice linked to Patient (User) and Appointment."""

    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    patient_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    appointment_id = db.Column(
        db.Integer,
        db.ForeignKey("appointments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    total_amount = db.Column(db.Float, nullable=False, default=0.0)
    payment_status = db.Column(
        db.String(20),
        nullable=False,
        default=PaymentStatus.UNPAID,
        index=True,
    )
    payment_method = db.Column(db.String(50), nullable=True)

    paid_amount = db.Column(db.Float, default=0.0, nullable=False)
    issued_date = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 1-to-many relationship with InvoiceItem
    items = db.relationship(
        "InvoiceItem",
        backref="invoice",
        cascade="all, delete-orphan",
        lazy="joined",
    )

    def recalculate_total(self) -> float:
        """Sum the totals of all line items and update total_amount."""
        total = sum(item.total for item in self.items)
        self.total_amount = round(total, 2)
        paid = self.paid_amount if self.paid_amount is not None else 0.0
        if paid >= self.total_amount and self.total_amount > 0:
            self.payment_status = PaymentStatus.PAID
        elif paid > 0:
            self.payment_status = PaymentStatus.PARTIAL
        return self.total_amount

    def add_item(self, description: str, quantity: int, unit_price: float) -> "InvoiceItem":
        """Convenience helper to add an item and update invoice total."""
        item = InvoiceItem(
            invoice_id=self.id,
            description=description,
            quantity=quantity,
            unit_price=unit_price,
            total=round(quantity * unit_price, 2),
        )
        self.items.append(item)
        self.recalculate_total()
        return item

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "invoice_number": self.invoice_number,
            "patient_id": self.patient_id,
            "patient_name": self.patient.full_name if self.patient else None,
            "appointment_id": self.appointment_id,
            "total_amount": float(self.total_amount),
            "payment_status": self.payment_status,
            "payment_method": self.payment_method,
            "paid_amount": float(self.paid_amount),
            "issued_date": self.issued_date.isoformat() if self.issued_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "items": [item.to_dict() for item in self.items],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return (
            f"<Invoice #{self.id} {self.invoice_number} | "
            f"Patient #{self.patient_id} Total={self.total_amount} Status='{self.payment_status}'>"
        )


class InvoiceItem(db.Model):
    """Line item linked to an Invoice."""

    __tablename__ = "invoice_items"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(
        db.Integer,
        db.ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    description = db.Column(db.String(255), nullable=False)  # e.g., "Consultation Fee", "Paracetamol", "Blood Test"
    quantity = db.Column(db.Integer, nullable=False, default=1)
    unit_price = db.Column(db.Float, nullable=False, default=0.0)
    total = db.Column(db.Float, nullable=False, default=0.0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def calculate_total(self) -> float:
        """Calculate line item total from quantity and unit price."""
        self.total = round(self.quantity * self.unit_price, 2)
        return self.total

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "description": self.description,
            "quantity": self.quantity,
            "unit_price": float(self.unit_price),
            "total": float(self.total),
        }

    def __repr__(self) -> str:
        return f"<InvoiceItem #{self.id} '{self.description}' qty={self.quantity} total={self.total}>"
