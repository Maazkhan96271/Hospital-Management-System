"""Billing and Invoicing Pydantic schemas for HIS financial workflows."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class InvoiceItemBase(BaseModel):
    description: str = Field(..., min_length=1, max_length=255)
    quantity: int = Field(1, ge=1)
    unit_price: float = Field(0.0, ge=0.0)
    total: float = Field(0.0, ge=0.0)


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemOut(InvoiceItemBase):
    id: int
    invoice_id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class InvoiceBase(BaseModel):
    invoice_number: str
    patient_id: int
    appointment_id: Optional[int] = None
    total_amount: float = Field(0.0, ge=0.0)
    payment_status: str = "Unpaid"
    payment_method: Optional[str] = None
    paid_amount: float = Field(0.0, ge=0.0)
    due_date: Optional[datetime] = None
    notes: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    items: List[InvoiceItemCreate] = Field(default_factory=list)


class InvoiceUpdate(BaseModel):
    total_amount: Optional[float] = None
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None
    paid_amount: Optional[float] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None


class InvoiceOut(InvoiceBase):
    id: int
    issued_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    items: List[InvoiceItemOut] = Field(default_factory=list)
    patient_name: Optional[str] = None
    patient_email: Optional[str] = None
    doctor_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RecordPaymentRequest(BaseModel):
    payment_method: str = Field("Cash", description="Cash, Credit Card, UPI, Debit Card, Insurance, Online")
    amount_paid: Optional[float] = Field(None, ge=0.0, description="Amount received. If omitted, marks full balance paid.")
    notes: Optional[str] = Field(None, description="Optional cashier / transaction reference notes")
