"""Main public routes and smart dashboard router."""

from flask import Blueprint, render_template, redirect, url_for, request
from flask_login import login_required, current_user
from flask_app.models.user import UserRole
from flask_app.models import Department, DoctorProfile, User

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    """Hospital landing page."""
    return render_template("index.html")


@main_bp.route("/dashboard")
@login_required
def dashboard():
    """Smart role-based dashboard router."""
    if current_user.role == UserRole.ADMIN:
        return redirect(url_for("admin.admin_dashboard"))
    elif current_user.role == UserRole.DOCTOR:
        return redirect(url_for("doctor.doctor_dashboard"))
    else:
        return redirect(url_for("patient.patient_dashboard"))


@main_bp.route("/directory")
def public_directory():
    """
    Public-facing doctor and department directory.
    Accessible without login. Searchable by name or specialisation.
    """
    q = request.args.get("q", "").strip()
    dept_id = request.args.get("dept", "").strip()

    departments = Department.query.order_by(Department.name.asc()).all()

    doctor_query = (
        DoctorProfile.query
        .join(User, DoctorProfile.user_id == User.id)
        .filter(User.is_active == True)
    )

    if q:
        pattern = f"%{q}%"
        from sqlalchemy import or_
        doctor_query = doctor_query.filter(
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                DoctorProfile.specialisation.ilike(pattern),
                DoctorProfile.qualification.ilike(pattern),
            )
        )

    if dept_id and dept_id.isdigit():
        doctor_query = doctor_query.filter(DoctorProfile.department_id == int(dept_id))

    doctors = doctor_query.all()

    return render_template(
        "public/directory.html",
        departments=departments,
        doctors=doctors,
        query=q,
        dept_id=dept_id,
    )
