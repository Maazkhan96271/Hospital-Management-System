"""Initial schema with PostgreSQL models, JSONB, ARRAY, and high-performance indexes.

Revision ID: 0001_initial_models
Revises: 
Create Date: 2026-10-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial_models"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create roles table
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
    )
    op.create_index("ix_roles_id", "roles", ["id"])
    op.create_index("ix_roles_name", "roles", ["name"], unique=True)

    # 2. Create departments table
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_departments_id", "departments", ["id"])
    op.create_index("ix_departments_name", "departments", ["name"], unique=True)

    # 3. Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_role_id", "users", ["role_id"])
    op.create_index("ix_users_is_active", "users", ["is_active"])
    op.create_index("ix_users_first_name", "users", ["first_name"])
    op.create_index("ix_users_last_name", "users", ["last_name"])
    op.create_index("ix_users_role_active", "users", ["role_id", "is_active"])
    op.create_index("ix_users_name_search", "users", ["first_name", "last_name"])

    # 4. Create doctor_profiles table (with JSONB weekly availability schedule)
    op.create_table(
        "doctor_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("specialization", sa.String(length=150), nullable=True),
        sa.Column("qualification", sa.String(length=200), nullable=True),
        sa.Column("experience_years", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "weekly_availability",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_doctor_profiles_id", "doctor_profiles", ["id"])
    op.create_index("ix_doctor_profiles_user_id", "doctor_profiles", ["user_id"])
    op.create_index("ix_doctor_profiles_department_id", "doctor_profiles", ["department_id"])
    op.create_index("ix_doctor_profiles_specialization", "doctor_profiles", ["specialization"])
    op.create_index("ix_doctor_profiles_experience_years", "doctor_profiles", ["experience_years"])
    op.create_index("ix_doctor_profiles_dept_spec", "doctor_profiles", ["department_id", "specialization"])

    # 5. Create appointments table
    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("appointment_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), server_default="30", nullable=False),
        sa.Column("status", sa.String(length=20), server_default="Booked", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_appointments_id", "appointments", ["id"])
    op.create_index("ix_appointments_patient_id", "appointments", ["patient_id"])
    op.create_index("ix_appointments_doctor_id", "appointments", ["doctor_id"])
    op.create_index("ix_appointments_appointment_datetime", "appointments", ["appointment_datetime"])
    op.create_index("ix_appointments_status", "appointments", ["status"])
    op.create_index(
        "ix_appointments_doctor_datetime_status",
        "appointments",
        ["doctor_id", "appointment_datetime", "status"],
    )
    op.create_index(
        "ix_appointments_patient_datetime",
        "appointments",
        ["patient_id", "appointment_datetime"],
    )
    op.create_index(
        "ix_appointments_datetime_status",
        "appointments",
        ["appointment_datetime", "status"],
    )

    # 6. Create treatment_records table (with prescription array)
    op.create_table(
        "treatment_records",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("appointment_id", sa.Integer(), sa.ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("diagnosis", sa.Text(), nullable=False),
        sa.Column(
            "prescription",
            postgresql.ARRAY(sa.String()).with_variant(sa.JSON(), "sqlite"),
            nullable=False,
        ),
        sa.Column("detailed_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_treatment_records_id", "treatment_records", ["id"])
    op.create_index("ix_treatment_records_appointment_id", "treatment_records", ["appointment_id"])


def downgrade() -> None:
    op.drop_table("treatment_records")
    op.drop_table("appointments")
    op.drop_table("doctor_profiles")
    op.drop_table("users")
    op.drop_table("departments")
    op.drop_table("roles")
