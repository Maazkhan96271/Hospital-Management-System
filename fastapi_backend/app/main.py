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
from app.api.routers import (
    auth,
    users,
    departments,
    doctors,
    appointments,
    treatments,
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

# Include API Routers under /api/v1
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(departments.router, prefix=settings.API_V1_STR)
app.include_router(doctors.router, prefix=settings.API_V1_STR)
app.include_router(appointments.router, prefix=settings.API_V1_STR)
app.include_router(treatments.router, prefix=settings.API_V1_STR)


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
