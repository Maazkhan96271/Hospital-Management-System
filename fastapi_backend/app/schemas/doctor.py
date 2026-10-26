"""Doctor profile Pydantic schemas."""

from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserOut
from app.schemas.department import DepartmentOut


class DaySchedule(BaseModel):
    available: bool = True
    start: str = "09:00"
    end: str = "17:00"


class WeeklySchedule(BaseModel):
    monday: DaySchedule = Field(default_factory=DaySchedule)
    tuesday: DaySchedule = Field(default_factory=DaySchedule)
    wednesday: DaySchedule = Field(default_factory=DaySchedule)
    thursday: DaySchedule = Field(default_factory=DaySchedule)
    friday: DaySchedule = Field(default_factory=DaySchedule)
    saturday: DaySchedule = Field(default_factory=lambda: DaySchedule(available=False))
    sunday: DaySchedule = Field(default_factory=lambda: DaySchedule(available=False))


class DoctorProfileBase(BaseModel):
    department_id: Optional[int] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: int = Field(0, ge=0, le=70)


class DoctorProfileCreate(DoctorProfileBase):
    user_id: int
    weekly_availability: Optional[Dict[str, Any]] = None


class DoctorProfileUpdate(BaseModel):
    department_id: Optional[int] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = Field(None, ge=0, le=70)
    weekly_availability: Optional[Dict[str, Any]] = None


class DoctorProfileOut(DoctorProfileBase):
    id: int
    user_id: int
    weekly_availability: Dict[str, Any]
    created_at: datetime
    user: Optional[UserOut] = None
    department: Optional[DepartmentOut] = None
    model_config = ConfigDict(from_attributes=True)
