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
