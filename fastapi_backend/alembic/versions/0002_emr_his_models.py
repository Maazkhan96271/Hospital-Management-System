"""EMR and HIS models: Vitals, PharmacyItem, LabTest, LabOrder, Invoice, and InvoiceItem.

Revision ID: 0002_emr_his_models
Revises: 0001_initial_models
Create Date: 2026-10-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0002_emr_his_models"
down_revision: Union[str, None] = "0001_initial_models"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create vitals table (1-to-1 link to appointments)
    op.create_table(
        "vitals",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "appointment_id",
            sa.Integer(),
            sa.ForeignKey("appointments.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("height", sa.Float(), nullable=True),
        sa.Column("weight", sa.Float(), nullable=True),
        sa.Column("bmi", sa.Float(), nullable=True),
        sa.Column("blood_pressure", sa.String(length=20), nullable=True),
        sa.Column("temperature", sa.Float(), nullable=True),
        sa.Column("pulse", sa.Integer(), nullable=True),
        sa.Column("respiratory_rate", sa.Integer(), nullable=True),
        sa.Column("oxygen_saturation", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_vitals_id", "vitals", ["id"])
    op.create_index("ix_vitals_appointment_id", "vitals", ["appointment_id"], unique=True)

    # 2. Create pharmacy_items table (Inventory)
    op.create_table(
        "pharmacy_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("stock_quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("price_per_unit", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("expiry_date", sa.Date(), nullable=False),
        sa.Column("sku", sa.String(length=50), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("unit", sa.String(length=50), nullable=True, server_default="unit"),
        sa.Column("reorder_level", sa.Integer(), nullable=False, server_default="10"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_pharmacy_items_id", "pharmacy_items", ["id"])
    op.create_index("ix_pharmacy_items_name", "pharmacy_items", ["name"])
    op.create_index("ix_pharmacy_items_sku", "pharmacy_items", ["sku"], unique=True)

    # 3. Create lab_tests table
    op.create_table(
        "lab_tests",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("cost", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("normal_range", sa.String(length=255), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_lab_tests_id", "lab_tests", ["id"])
    op.create_index("ix_lab_tests_name", "lab_tests", ["name"], unique=True)

    # 4. Create lab_orders table (linked to appointments & lab_tests)
    op.create_table(
        "lab_orders",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "appointment_id",
            sa.Integer(),
            sa.ForeignKey("appointments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "lab_test_id",
            sa.Integer(),
            sa.ForeignKey("lab_tests.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="Pending"),
        sa.Column("results", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "ordered_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_lab_orders_id", "lab_orders", ["id"])
    op.create_index("ix_lab_orders_appointment_id", "lab_orders", ["appointment_id"])
    op.create_index("ix_lab_orders_lab_test_id", "lab_orders", ["lab_test_id"])
    op.create_index("ix_lab_orders_status", "lab_orders", ["status"])

    # 5. Create invoices table (linked to users/patients & appointments)
    op.create_table(
        "invoices",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("invoice_number", sa.String(length=50), nullable=False),
        sa.Column(
            "patient_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "appointment_id",
            sa.Integer(),
            sa.ForeignKey("appointments.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("total_amount", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("payment_status", sa.String(length=20), nullable=False, server_default="Unpaid"),
        sa.Column("payment_method", sa.String(length=50), nullable=True),
        sa.Column("paid_amount", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column(
            "issued_date",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_invoices_id", "invoices", ["id"])
    op.create_index("ix_invoices_invoice_number", "invoices", ["invoice_number"], unique=True)
    op.create_index("ix_invoices_patient_id", "invoices", ["patient_id"])
    op.create_index("ix_invoices_appointment_id", "invoices", ["appointment_id"])
    op.create_index("ix_invoices_payment_status", "invoices", ["payment_status"])

    # 6. Create invoice_items table (linked to invoices)
    op.create_table(
        "invoice_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "invoice_id",
            sa.Integer(),
            sa.ForeignKey("invoices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("unit_price", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("total", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_invoice_items_id", "invoice_items", ["id"])
    op.create_index("ix_invoice_items_invoice_id", "invoice_items", ["invoice_id"])


def downgrade() -> None:
    op.drop_table("invoice_items")
    op.drop_table("invoices")
    op.drop_table("lab_orders")
    op.drop_table("lab_tests")
    op.drop_table("pharmacy_items")
    op.drop_table("vitals")
