"""Department model for medical specialisations."""

from datetime import datetime
from flask_app.extensions import db


class Department(db.Model):
    """Hospital department (e.g. Cardiology, Neurology)."""

    __tablename__ = "departments"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    doctors = db.relationship("DoctorProfile", backref="department", lazy="dynamic")

    def __repr__(self) -> str:
        return f"<Department {self.name}>"
