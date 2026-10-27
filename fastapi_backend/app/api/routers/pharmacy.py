"""Pharmacy inventory API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.pharmacy import PharmacyItem
from app.models.user import User
from app.api.dependencies import get_current_active_user
from app.schemas.pharmacy import (
    PharmacyItemCreate,
    PharmacyItemOut,
    PharmacyItemUpdate,
)

router = APIRouter(prefix="/pharmacy", tags=["Pharmacy Inventory"])


@router.get(
    "/items",
    response_model=List[PharmacyItemOut],
    summary="List all pharmacy inventory items",
)
@router.get(
    "/search",
    response_model=List[PharmacyItemOut],
    summary="Search pharmacy inventory medications",
)
async def search_pharmacy_items(
    q: Optional[str] = Query(None, description="Search query by name, sku, or category"),
    category: Optional[str] = Query(None, description="Filter by therapeutic category"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> List[PharmacyItemOut]:
    """Retrieve catalog of available medications for prescription ordering and inventory tracking."""
    stmt = select(PharmacyItem)

    if q and q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.filter(
            (PharmacyItem.name.ilike(term))
            | (PharmacyItem.sku.ilike(term))
            | (PharmacyItem.category.ilike(term))
        )

    if category and category.strip():
        stmt = stmt.filter(PharmacyItem.category.ilike(f"%{category.strip()}%"))

    stmt = stmt.order_by(PharmacyItem.name.asc()).limit(limit)
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    return [PharmacyItemOut.model_validate(item) for item in items]


@router.get(
    "/items/{item_id}",
    response_model=PharmacyItemOut,
    summary="Get single pharmacy item details",
)
async def get_pharmacy_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
) -> PharmacyItemOut:
    """Retrieve specific pharmacy medication item."""
    item = await db.get(PharmacyItem, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pharmacy item #{item_id} not found.",
        )
    return PharmacyItemOut.model_validate(item)


@router.post(
    "/items",
    response_model=PharmacyItemOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create pharmacy inventory item (Admin only)",
)
async def create_pharmacy_item(
    item_in: PharmacyItemCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> PharmacyItemOut:
    """Create a new pharmacy inventory item."""
    role_name = current_user.role.name if current_user.role else ""
    if role_name not in ["Admin", "Doctor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators or medical staff can create pharmacy items.",
        )

    item = PharmacyItem(**item_in.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return PharmacyItemOut.model_validate(item)
