"""Migration and seeding script for EMR/HIS database models.

Run with:
    python scripts/migrate_emr_models.py

This script:
1. Verifies/creates all database tables including:
   - vitals
   - pharmacy_items
   - lab_tests
   - lab_orders
   - invoices
   - invoice_items
2. Provisions standard initial catalog items for Pharmacy and Laboratory investigations.
3. Ensures zero manual DB editing (e.g. SQLite DB Browser) is required.
"""

import os
import sys
from datetime import date, timedelta

# Ensure project root is on sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from flask_app import create_app, db
from flask_app.models import (
    PharmacyItem,
    LabTest,
    User,
    DoctorProfile,
    Appointment,
    Vitals,
    LabOrder,
    Invoice,
    InvoiceItem,
)


def migrate_and_seed_emr():
    """Run database migration and seed essential EMR/HIS catalog data."""
    app = create_app()

    with app.app_context():
        print("🏥 [EMR MIGRATION] Verifying/creating all database tables via db.create_all()...")
        db.create_all()

        existing_tables = db.metadata.tables.keys()
        emr_tables = ["vitals", "pharmacy_items", "lab_tests", "lab_orders", "invoices", "invoice_items"]
        for tbl in emr_tables:
            assert tbl in existing_tables, f"Missing table: {tbl}"
        print(f"✅ [EMR MIGRATION] All EMR/HIS tables verified: {', '.join(emr_tables)}")

        # 1. Seed Pharmacy Catalog if empty
        if PharmacyItem.query.count() == 0:
            print("📦 [EMR SEED] Seeding initial pharmacy inventory items...")
            today = date.today()
            pharmacy_seeds = [
                PharmacyItem(
                    name="Paracetamol 500mg",
                    stock_quantity=500,
                    price_per_unit=5.00,
                    expiry_date=today + timedelta(days=730),
                    sku="MED-PAR-500",
                    category="Analgesic / Antipyretic",
                    unit="tablet",
                    reorder_level=50,
                ),
                PharmacyItem(
                    name="Amoxicillin 500mg",
                    stock_quantity=250,
                    price_per_unit=12.50,
                    expiry_date=today + timedelta(days=365),
                    sku="MED-AMX-500",
                    category="Antibiotic",
                    unit="capsule",
                    reorder_level=30,
                ),
                PharmacyItem(
                    name="Metformin 500mg",
                    stock_quantity=400,
                    price_per_unit=6.00,
                    expiry_date=today + timedelta(days=540),
                    sku="MED-MET-500",
                    category="Antidiabetic",
                    unit="tablet",
                    reorder_level=40,
                ),
                PharmacyItem(
                    name="Atorvastatin 20mg",
                    stock_quantity=300,
                    price_per_unit=15.00,
                    expiry_date=today + timedelta(days=600),
                    sku="MED-ATV-020",
                    category="Cardiovascular / Statin",
                    unit="tablet",
                    reorder_level=35,
                ),
                PharmacyItem(
                    name="Omeprazole 20mg",
                    stock_quantity=350,
                    price_per_unit=8.00,
                    expiry_date=today + timedelta(days=450),
                    sku="MED-OMP-020",
                    category="Antacid / PPI",
                    unit="capsule",
                    reorder_level=40,
                ),
                PharmacyItem(
                    name="Azithromycin 500mg",
                    stock_quantity=180,
                    price_per_unit=25.00,
                    expiry_date=today + timedelta(days=400),
                    sku="MED-AZI-500",
                    category="Antibiotic",
                    unit="tablet",
                    reorder_level=25,
                ),
            ]
            db.session.add_all(pharmacy_seeds)
            db.session.commit()
            print(f"✅ [EMR SEED] Seeded {len(pharmacy_seeds)} pharmacy inventory items.")
        else:
            print(f"ℹ️ [EMR SEED] Pharmacy items already exist ({PharmacyItem.query.count()} records).")

        # 2. Seed Lab Tests Catalog if empty
        if LabTest.query.count() == 0:
            print("🔬 [EMR SEED] Seeding initial diagnostic lab test catalog...")
            lab_seeds = [
                LabTest(
                    name="Complete Blood Count (CBC)",
                    cost=350.00,
                    normal_range="Hemoglobin: 13.5-17.5 g/dL, WBC: 4,500-11,000 /mcL, Platelets: 150k-450k",
                    category="Hematology",
                    description="Evaluates overall health and detects disorders such as anemia, infection and leukemia.",
                ),
                LabTest(
                    name="Fasting Blood Glucose (FBS)",
                    cost=150.00,
                    normal_range="70 - 99 mg/dL",
                    category="Biochemistry",
                    description="Measures blood glucose levels after fasting for at least 8 hours.",
                ),
                LabTest(
                    name="Lipid Profile",
                    cost=600.00,
                    normal_range="Total Chol: < 200 mg/dL, HDL: > 40 mg/dL, LDL: < 100 mg/dL, Triglycerides: < 150 mg/dL",
                    category="Biochemistry",
                    description="Assesses cardiovascular disease risk by checking cholesterol and triglyceride levels.",
                ),
                LabTest(
                    name="Liver Function Test (LFT)",
                    cost=750.00,
                    normal_range="ALT: 7-56 U/L, AST: 10-40 U/L, Bilirubin: 0.1-1.2 mg/dL",
                    category="Pathology",
                    description="Measures proteins, liver enzymes, and bilirubin in blood to assess liver health.",
                ),
                LabTest(
                    name="Thyroid Stimulating Hormone (TSH)",
                    cost=400.00,
                    normal_range="0.4 - 4.0 mIU/L",
                    category="Endocrinology",
                    description="Screens for thyroid gland disorders including hypothyroidism and hyperthyroidism.",
                ),
                LabTest(
                    name="HbA1c (Glycated Hemoglobin)",
                    cost=500.00,
                    normal_range="Normal: < 5.7%, Prediabetes: 5.7-6.4%, Diabetes: >= 6.5%",
                    category="Biochemistry",
                    description="Reflects average blood sugar level over the past 2 to 3 months.",
                ),
                LabTest(
                    name="Urinalysis Routine",
                    cost=200.00,
                    normal_range="pH: 4.5-8.0, Specific Gravity: 1.005-1.030, Protein: Negative",
                    category="Clinical Pathology",
                    description="Detects urinary tract infections, kidney disease and diabetes.",
                ),
            ]
            db.session.add_all(lab_seeds)
            db.session.commit()
            print(f"✅ [EMR SEED] Seeded {len(lab_seeds)} diagnostic lab test items.")
        else:
            print(f"ℹ️ [EMR SEED] Lab tests catalog already populated ({LabTest.query.count()} records).")

        print("🎉 [EMR MIGRATION] Migration and seeding complete!")


if __name__ == "__main__":
    migrate_and_seed_emr()
