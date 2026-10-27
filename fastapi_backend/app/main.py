"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.future import select

from app.core.config import settings
from app.core.database import async_engine, AsyncSessionLocal, Base
from app.core.security import hash_password
from app.models.role import Role
from app.models.user import User
from app.models.pharmacy import PharmacyItem
from app.models.lab import LabTest
from datetime import date as dt_date, timedelta
from app.api.routers import (
    auth,
    users,
    departments,
    doctors,
    appointments,
    treatments,
    pharmacy,
    lab,
    billing,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize database tables and seed baseline roles/superuser."""
    async with async_engine.begin() as conn:
        # Create all tables (useful for development & testing without manual DB tools)
        await conn.run_sync(Base.metadata.create_all)

    # Seed baseline roles (Admin, Doctor, Patient) and initial Admin account
    async with AsyncSessionLocal() as session:
        # 1. Ensure baseline roles exist
        for role_name, role_desc in [
            ("Admin", "Full administrative access"),
            ("Doctor", "Attending medical practitioner"),
            ("Patient", "Registered hospital patient"),
        ]:
            role_check = await session.execute(
                select(Role).filter(Role.name == role_name)
            )
            if not role_check.scalar_one_or_none():
                session.add(Role(name=role_name, description=role_desc))
        await session.commit()

        # 2. Seed initial Admin superuser if none exists
        admin_check = await session.execute(
            select(User)
            .join(Role)
            .filter(Role.name == "Admin")
        )
        if not admin_check.scalar_one_or_none():
            admin_role = (
                await session.execute(select(Role).filter(Role.name == "Admin"))
            ).scalar_one()

            superuser = User(
                email=settings.FIRST_SUPERUSER_EMAIL,
                username=settings.FIRST_SUPERUSER_USERNAME,
                hashed_password=hash_password(settings.FIRST_SUPERUSER_PASSWORD),
                first_name="System",
                last_name="Administrator",
                phone="1234567890",
                role_id=admin_role.id,
                is_active=True,
            )
            session.add(superuser)
            await session.commit()
            print(
                f"[INIT] Admin superuser seeded – "
                f"Username: {settings.FIRST_SUPERUSER_USERNAME} | "
                f"Password: {settings.FIRST_SUPERUSER_PASSWORD}"
            )

        # 3. Seed Pharmacy catalog if empty
        pharm_check = await session.execute(select(PharmacyItem))
        if not pharm_check.first():
            today = dt_date.today()
            pharm_seeds = [
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
            session.add_all(pharm_seeds)
            await session.commit()

        # 4. Seed Lab Tests catalog if empty
        lab_check = await session.execute(select(LabTest))
        if not lab_check.first():
            lab_seeds = [
                LabTest(
                    name="Complete Blood Count (CBC)",
                    cost=350.00,
                    normal_range="Hemoglobin: 13.5-17.5 g/dL, WBC: 4.5-11.0k",
                    category="Hematology",
                    description="Evaluates general health and checks for anemia, infection, and leukemia.",
                ),
                LabTest(
                    name="Fasting Blood Glucose (FBS)",
                    cost=150.00,
                    normal_range="70 - 99 mg/dL",
                    category="Biochemistry",
                    description="Measures blood glucose after 8 hours of fasting.",
                ),
                LabTest(
                    name="Lipid Profile",
                    cost=600.00,
                    normal_range="Total Chol: < 200 mg/dL, HDL: > 40 mg/dL, LDL: < 100 mg/dL",
                    category="Biochemistry",
                    description="Cardiovascular disease risk assessment.",
                ),
                LabTest(
                    name="Liver Function Test (LFT)",
                    cost=750.00,
                    normal_range="ALT: 7-56 U/L, AST: 10-40 U/L, Bilirubin: 0.1-1.2 mg/dL",
                    category="Pathology",
                    description="Measures liver enzymes, bilirubin and total proteins.",
                ),
                LabTest(
                    name="Thyroid Stimulating Hormone (TSH)",
                    cost=400.00,
                    normal_range="0.4 - 4.0 mIU/L",
                    category="Endocrinology",
                    description="Screens for thyroid disorders.",
                ),
                LabTest(
                    name="HbA1c (Glycated Hemoglobin)",
                    cost=500.00,
                    normal_range="Normal: < 5.7%, Prediabetes: 5.7-6.4%, Diabetes: >= 6.5%",
                    category="Biochemistry",
                    description="3-month average blood glucose control.",
                ),
                LabTest(
                    name="Urinalysis Routine",
                    cost=200.00,
                    normal_range="pH: 4.5-8.0, Protein: Negative, Glucose: Negative",
                    category="Clinical Pathology",
                    description="Screens for kidney diseases and metabolic abnormalities.",
                ),
            ]
            session.add_all(lab_seeds)
            await session.commit()

    yield

    # Clean up engine resources on shutdown
    await async_engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
    swagger_ui_parameters={
        "persistAuthorization": True,
        "displayRequestDuration": True,
        "filter": True,
    },
)

# CORS middleware for modern frontend integrations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api/v1 (standard) and /api (direct alias)
for prefix in [settings.API_V1_STR, "/api"]:
    app.include_router(auth.router, prefix=prefix)
    app.include_router(users.router, prefix=prefix)
    app.include_router(departments.router, prefix=prefix)
    app.include_router(doctors.router, prefix=prefix)
    app.include_router(appointments.router, prefix=prefix)
    app.include_router(treatments.router, prefix=prefix)
    app.include_router(pharmacy.router, prefix=prefix)
    app.include_router(lab.router, prefix=prefix)
    app.include_router(billing.router, prefix=prefix)


@app.get(
    "/",
    tags=["Root"],
    summary="API Health & Documentation Index",
)
async def root():
    """Healthcheck and navigation index."""
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "documentation": {
            "swagger_ui": "/docs",
            "redoc": "/redoc",
            "openapi_spec": f"{settings.API_V1_STR}/openapi.json",
        },
        "endpoints_prefix": settings.API_V1_STR,
    }
