"""Vitals Pydantic schemas for EMR clinical measurements."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class VitalsBase(BaseModel):
    appointment_id: int
    height: Optional[float] = Field(None, description="Height in cm")
    weight: Optional[float] = Field(None, description="Weight in kg")
    bmi: Optional[float] = Field(None, description="Body Mass Index (kg/m²)")
    blood_pressure: Optional[str] = Field(None, description="Blood pressure (e.g., '120/80')")
    temperature: Optional[float] = Field(None, description="Temperature in °F or °C")
    pulse: Optional[int] = Field(None, description="Heart rate in beats per minute")
    respiratory_rate: Optional[int] = Field(None, description="Breaths per minute")
    oxygen_saturation: Optional[float] = Field(None, description="SpO2 percentage")
    notes: Optional[str] = None


class VitalsCreate(VitalsBase):
    pass


class VitalsUpdate(BaseModel):
    height: Optional[float] = None
    weight: Optional[float] = None
    bmi: Optional[float] = None
    blood_pressure: Optional[str] = None
    temperature: Optional[float] = None
    pulse: Optional[int] = None
    respiratory_rate: Optional[int] = None
    oxygen_saturation: Optional[float] = None
    notes: Optional[str] = None


class VitalsOut(VitalsBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
