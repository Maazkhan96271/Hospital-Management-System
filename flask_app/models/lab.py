"""Laboratory models: LabTest and LabOrder for EMR diagnostic investigations."""

from datetime import datetime
import json
from flask_app.extensions import db


class LabOrderStatus:
    """Standard statuses for laboratory investigation orders."""
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class LabTest(db.Model):
    """Diagnostic laboratory test catalog item."""

    __tablename__ = "lab_tests"

    id = db.Column(db.Integer, primary_key=True)  # Test ID
    name = db.Column(db.String(200), nullable=False, unique=True, index=True)
    cost = db.Column(db.Float, nullable=False, default=0.0)
    normal_range = db.Column(db.String(255), nullable=True)  # e.g., "13.5 - 17.5 g/dL" or "70 - 100 mg/dL"

    # Optional HIS catalog attributes
    category = db.Column(db.String(100), nullable=True)  # e.g., "Hematology", "Biochemistry", "Pathology"
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    orders = db.relationship(
        "LabOrder",
        backref="lab_test",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "cost": float(self.cost),
            "normal_range": self.normal_range,
            "category": self.category,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<LabTest #{self.id} '{self.name}' cost={self.cost} normal='{self.normal_range}'>"


class LabOrder(db.Model):
    """Laboratory test order linked to an Appointment and a LabTest."""

    __tablename__ = "lab_orders"

    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(
        db.Integer,
        db.ForeignKey("appointments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lab_test_id = db.Column(
        db.Integer,
        db.ForeignKey("lab_tests.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status = db.Column(
        db.String(20),
        nullable=False,
        default=LabOrderStatus.PENDING,
        index=True,
    )
    # Results can store plain text findings or JSON-encoded parameter values
    results = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    ordered_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    @property
    def parsed_results(self):
        """Return parsed JSON results if formatted as JSON, else raw string."""
        if not self.results:
            return None
        try:
            return json.loads(self.results)
        except (json.JSONDecodeError, TypeError):
            return self.results

    def set_results(self, data) -> None:
        """Store results as JSON string if dict/list, or raw string."""
        if isinstance(data, (dict, list)):
            self.results = json.dumps(data)
        else:
            self.results = str(data)

    def mark_completed(self, results_data=None, notes: str = None) -> None:
        """Helper to mark order as completed with timestamp and results."""
        self.status = LabOrderStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        if results_data is not None:
            self.set_results(results_data)
        if notes:
            self.notes = notes

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "appointment_id": self.appointment_id,
            "lab_test_id": self.lab_test_id,
            "lab_test_name": self.lab_test.name if self.lab_test else None,
            "cost": float(self.lab_test.cost) if self.lab_test else 0.0,
            "status": self.status,
            "results": self.parsed_results,
            "notes": self.notes,
            "ordered_at": self.ordered_at.isoformat() if self.ordered_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }

    def __repr__(self) -> str:
        return (
            f"<LabOrder #{self.id} Appointment=#{self.appointment_id} "
            f"Test=#{self.lab_test_id} status='{self.status}'>"
        )
