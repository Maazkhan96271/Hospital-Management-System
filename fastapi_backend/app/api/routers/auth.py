"""Authentication endpoints: login, patient registration, and current user profile."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.api.dependencies import get_current_active_user
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import Token, LoginRequest
from app.schemas.user import UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=Token,
    summary="Login to obtain a JWT access token",
    description="Supports OAuth2 Password form submission (for Swagger UI Authorize button) and standard username/password.",
)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> Token:
    """OAuth2 compatible token login."""
    # Find user by username or email
    result = await db.execute(
        select(User)
        .options(selectinload(User.role))
        .filter(
            (User.username == form_data.username) | (User.email == form_data.username)
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    role_name = user.role.name if user.role else "Patient"
    access_token = create_access_token(
        subject=user.id,
        role=role_name,
        extra_claims={"username": user.username, "email": user.email},
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        role=role_name,
        username=user.username,
        user_id=user.id,
    )


@router.post(
    "/login/json",
    response_model=Token,
    summary="JSON Login endpoint",
    description="Login using a JSON body with username/email and password.",
)
async def login_json(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> Token:
    """JSON body authentication endpoint."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.role))
        .filter(
            (User.username == credentials.username) | (User.email == credentials.username)
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    role_name = user.role.name if user.role else "Patient"
    access_token = create_access_token(
        subject=user.id,
        role=role_name,
        extra_claims={"username": user.username, "email": user.email},
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        role=role_name,
        username=user.username,
        user_id=user.id,
    )


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Patient self-registration",
    description="Public registration endpoint. All self-registered users are assigned the Patient role.",
)
async def register_patient(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """Register a new patient account."""
    # Check if username exists
    username_check = await db.execute(
        select(User).filter(User.username == user_in.username)
    )
    if username_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered.",
        )

    # Check if email exists
    email_check = await db.execute(
        select(User).filter(User.email == user_in.email)
    )
    if email_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered.",
        )

    # Fetch Patient role
    role_result = await db.execute(select(Role).filter(Role.name == "Patient"))
    patient_role = role_result.scalar_one_or_none()

    if not patient_role:
        # Create Patient role if not present
        patient_role = Role(name="Patient", description="Registered hospital patient")
        db.add(patient_role)
        await db.flush()

    new_user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=hash_password(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone=user_in.phone,
        role_id=patient_role.id,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Eager load role for schema serialization
    res = await db.execute(
        select(User).options(selectinload(User.role)).filter(User.id == new_user.id)
    )
    return res.scalar_one()


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get current user profile",
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
) -> UserOut:
    """Return the profile of the currently logged-in user."""
    return current_user
