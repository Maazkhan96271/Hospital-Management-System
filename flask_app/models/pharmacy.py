"""PharmacyItem inventory model for hospital pharmacy management."""

from datetime import datetime, date
from flask_app.extensions import db


class PharmacyItem(db.Model):
    """Pharmacy inventory item tracking medication stocks, prices, and expiry dates."""

    __tablename__ = "pharmacy_items"

    id = db.Column(db.Integer, primary_key=True)  # Item ID
    name = db.Column(db.String(200), nullable=False, index=True)
    stock_quantity = db.Column(db.Integer, nullable=False, default=0)
    price_per_unit = db.Column(db.Float, nullable=False, default=0.0)
    expiry_date = db.Column(db.Date, nullable=False)

    # Optional HIS Inventory Attributes
    sku = db.Column(db.String(50), unique=True, nullable=True, index=True)
    category = db.Column(db.String(100), nullable=True)  # e.g., "Antibiotics", "Analgesics"
    unit = db.Column(db.String(50), default="unit")      # e.g., "tablet", "strip", "syrup", "vial"
    reorder_level = db.Column(db.Integer, default=10)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def is_expired(self) -> bool:
        """Check if medication is expired relative to current date."""
        if not self.expiry_date:
            return False
        return self.expiry_date < date.today()

    @property
    def is_low_stock(self) -> bool:
        """Check if stock has reached or fallen below the reorder threshold."""
        return self.stock_quantity <= self.reorder_level

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "stock_quantity": self.stock_quantity,
            "price_per_unit": float(self.price_per_unit),
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "sku": self.sku,
            "category": self.category,
            "unit": self.unit,
            "reorder_level": self.reorder_level,
            "is_expired": self.is_expired,
            "is_low_stock": self.is_low_stock,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return (
            f"<PharmacyItem #{self.id} '{self.name}' "
            f"stock={self.stock_quantity} price={self.price_per_unit} exp={self.expiry_date}>"
        )
