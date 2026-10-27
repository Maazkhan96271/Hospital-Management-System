"""RESTful JSON API endpoints for appointments, patients, and department metrics."""

from flask import Blueprint, jsonify
from flask_login import login_required
from flask_app.models import (
    User,
    UserRole,
    Department,
    DoctorProfile,
    Appointment,
    AppointmentStatus,
)

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.route("/appointments-and-patients")
@login_required
def api_appointments_and_patients():
    """RESTful API endpoint returning JSON data for the total number of appointments and patients."""
    total_appointments = Appointment.query.count()
    total_patients = User.query.filter_by(role=UserRole.PATIENT).count()
    return jsonify({
        "total_appointments": total_appointments,
        "total_patients": total_patients,
    })


@api_bp.route("/stats")
@login_required
def api_stats():
    """RESTful API endpoint returning complete metrics for appointments, patients, and departments."""
    total_appointments = Appointment.query.count()
    total_patients = User.query.filter_by(role=UserRole.PATIENT).count()
    total_doctors = User.query.filter_by(role=UserRole.DOCTOR).count()
    total_departments = Department.query.count()

    status_counts = {
        "Scheduled": Appointment.query.filter_by(status=AppointmentStatus.SCHEDULED).count(),
        "Completed": Appointment.query.filter_by(status=AppointmentStatus.COMPLETED).count(),
        "Cancelled": Appointment.query.filter_by(status=AppointmentStatus.CANCELLED).count(),
        "No Show": Appointment.query.filter_by(status=AppointmentStatus.NO_SHOW).count(),
    }

    departments = Department.query.order_by(Department.name.asc()).all()
    dept_data = []
    for d in departments:
        count = (
            Appointment.query.join(DoctorProfile)
            .filter(DoctorProfile.department_id == d.id)
            .count()
        )
        dept_data.append({
            "department_id": d.id,
            "department": d.name,
            "appointment_count": count,
            "doctor_count": d.doctors.count(),
        })

    unassigned_count = (
        Appointment.query.join(DoctorProfile)
        .filter(DoctorProfile.department_id.is_(None))
        .count()
    )
    if unassigned_count > 0 or not dept_data:
        dept_data.append({
            "department_id": None,
            "department": "General / Unassigned",
            "appointment_count": unassigned_count,
            "doctor_count": DoctorProfile.query.filter(DoctorProfile.department_id.is_(None)).count(),
        })

    return jsonify({
        "status": "success",
        "total_appointments": total_appointments,
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "total_departments": total_departments,
        "appointments_by_status": status_counts,
        "appointments_by_department": dept_data,
    })
