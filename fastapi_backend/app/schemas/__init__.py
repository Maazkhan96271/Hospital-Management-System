"""Pydantic schema exports."""

from app.schemas.auth import Token, TokenPayload, LoginRequest
from app.schemas.user import UserBase, UserCreate, DoctorUserCreate, UserUpdate, UserOut, RoleOut
from app.schemas.department import DepartmentBase, DepartmentCreate, DepartmentUpdate, DepartmentOut
from app.schemas.doctor import DoctorProfileBase, DoctorProfileCreate, DoctorProfileUpdate, DoctorProfileOut
from app.schemas.appointment import AppointmentBase, AppointmentCreate, AppointmentStatusUpdate, AppointmentOut
from app.schemas.treatment import TreatmentRecordBase, TreatmentRecordCreate, TreatmentRecordUpdate, TreatmentRecordOut

__all__ = [
    "Token",
    "TokenPayload",
    "LoginRequest",
    "UserBase",
    "UserCreate",
    "DoctorUserCreate",
    "UserUpdate",
    "UserOut",
    "RoleOut",
    "DepartmentBase",
    "DepartmentCreate",
    "DepartmentUpdate",
    "DepartmentOut",
    "DoctorProfileBase",
    "DoctorProfileCreate",
    "DoctorProfileUpdate",
    "DoctorProfileOut",
    "AppointmentBase",
    "AppointmentCreate",
    "AppointmentStatusUpdate",
    "AppointmentOut",
    "TreatmentRecordBase",
    "TreatmentRecordCreate",
    "TreatmentRecordUpdate",
    "TreatmentRecordOut",
]
