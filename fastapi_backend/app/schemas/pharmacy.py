"""PharmacyItem Pydantic schemas for inventory and medication tracking."""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class PharmacyItemBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    stock_quantity: int = Field(0, ge=0)
    price_per_unit: float = Field(..., ge=0.0)
    expiry_date: date
    sku: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = "unit"
    reorder_level: int = Field(10, ge=0)


class PharmacyItemCreate(PharmacyItemBase):
    pass


class PharmacyItemUpdate(BaseModel):
    name: Optional[str] = None
    stock_quantity: Optional[int] = Field(None, ge=0)
    price_per_unit: Optional[float] = Field(None, ge=0.0)
    expiry_date: Optional[date] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    reorder_level: Optional[int] = Field(None, ge=0)


class PharmacyItemOut(PharmacyItemBase):
    id: int
    is_expired: Optional[bool] = None
    is_low_stock: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RestockItemRequest(BaseModel):
    quantity_to_add: int = Field(50, ge=1, description="Quantity to increment stock by")


class PrescribedMedicationLine(BaseModel):
    name: str
    dosage: Optional[str] = None
    duration: Optional[str] = None
    quantity: int = 1
    unit_price: float = 0.0
    pharmacy_item_id: Optional[int] = None
    is_in_stock: bool = True


class PendingPrescriptionOut(BaseModel):
    appointment_id: int
    patient_id: int
    patient_name: str
    patient_email: Optional[str] = None
    doctor_name: str
    appointment_date: str
    diagnosis: str
    medications: list[PrescribedMedicationLine] = []
    invoice_number: Optional[str] = None
    invoice_id: Optional[int] = None
    status: str = "Pending"  # "Pending" | "Dispensed"
    total_amount: float = 0.0
