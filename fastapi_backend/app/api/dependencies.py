"""Security and role-based dependencies for FastAPI routes."""

from typing import Callable, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    description="JWT Bearer token authentication.",
)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validate JWT token and return the authenticated User with role eagerly loaded."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise credentials_exception

    # Query user with eager-loaded role and doctor profile
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.role),
            selectinload(User.doctor_profile),
        )
        .filter(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure the authenticated user account is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account. Please contact system administrator.",
        )
    return current_user


def require_role(*allowed_roles: str) -> Callable:
    """Dependency factory restricting route access to specified roles."""

    async def role_checker(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        user_role_name = current_user.role.name if current_user.role else ""
        if user_role_name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied: Operation requires one of {allowed_roles} roles. "
                    f"Current role: '{user_role_name}'."
                ),
            )
        return current_user

    return role_checker


# Convenient named role dependencies
get_current_admin: Callable = require_role("Admin")
get_current_doctor: Callable = require_role("Doctor")
get_current_patient: Callable = require_role("Patient")
get_current_doctor_or_admin: Callable = require_role("Doctor", "Admin")
