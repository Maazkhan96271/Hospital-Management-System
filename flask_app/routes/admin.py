"""Admin portal routes: dashboard, doctor management, departments, and user search."""

from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from sqlalchemy import or_

from flask_app.extensions import db
from flask_app.models import (
    User,
    UserRole,
    Department,
    DoctorProfile,
    Appointment,
    AppointmentStatus,
)
from flask_app.decorators import admin_required
from flask_app.forms import DoctorForm, DepartmentForm

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


@admin_bp.route("/dashboard")
@login_required
@admin_required
def admin_dashboard():
    """Admin overview with aggregate metrics and system activity."""
    users = User.query.all()
    departments = Department.query.all()
    appointments = Appointment.query.order_by(Appointment.created_at.desc()).all()

    total_doctors = User.query.filter_by(role=UserRole.DOCTOR).count()
    total_patients = User.query.filter_by(role=UserRole.PATIENT).count()
    total_appointments = Appointment.query.count()

    return render_template(
        "admin/dashboard.html",
        users=users,
        departments=departments,
        appointments=appointments,
        total_doctors=total_doctors,
        total_patients=total_patients,
        total_appointments=total_appointments,
    )


@admin_bp.route("/search")
@login_required
@admin_required
def admin_search():
    """Search patients and doctors by name, email, or specialisation."""
    query = request.args.get("q", "").strip()
    results = []

    if query:
        pattern = f"%{query}%"
        user_results = User.query.filter(
            User.role.in_([UserRole.DOCTOR, UserRole.PATIENT]),
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                User.username.ilike(pattern),
                User.email.ilike(pattern),
            ),
        ).all()

        spec_profiles = DoctorProfile.query.filter(
            DoctorProfile.specialisation.ilike(pattern)
        ).all()
        spec_users = [p.user for p in spec_profiles if p.user not in user_results]
        results = user_results + spec_users

    # Form dummy or query string
    class DummyForm:
        class DummyQ:
            data = query
        q = DummyQ()

    return render_template(
        "admin/search.html", form=DummyForm(), results=results, query=query
    )


@admin_bp.route("/doctors")
@login_required
@admin_required
def admin_doctors():
    """List all doctors with their profiles."""
    doctors = User.query.filter_by(role=UserRole.DOCTOR).all()
    return render_template("admin/doctors.html", doctors=doctors)


@admin_bp.route("/doctors/add", methods=["GET", "POST"])
@login_required
@admin_required
def admin_add_doctor():
    """Create a new Doctor user + DoctorProfile."""
    form = DoctorForm()
    form.department_id.choices = [(0, "— None —")] + [
        (d.id, d.name) for d in Department.query.order_by(Department.name).all()
    ]

    if form.validate_on_submit():
        user = User(
            username=form.username.data,
            email=form.email.data,
            first_name=form.first_name.data,
            last_name=form.last_name.data,
            phone=form.phone.data,
            role=UserRole.DOCTOR,
        )
        user.set_password(form.password.data or "Doctor@123")
        db.session.add(user)
        db.session.flush()

        profile = DoctorProfile(
            user_id=user.id,
            department_id=form.department_id.data if form.department_id.data else None,
            specialisation=form.specialisation.data,
            qualification=form.qualification.data,
            experience_years=form.experience_years.data or 0,
        )
        db.session.add(profile)
        db.session.commit()
        flash(f"Doctor {user.full_name} added successfully.", "success")
        return redirect(url_for("admin.admin_doctors"))

    return render_template("admin/add_doctor.html", form=form)


@admin_bp.route("/doctors/<int:doctor_id>/edit", methods=["GET", "POST"])
@login_required
@admin_required
def admin_edit_doctor(doctor_id):
    """Edit an existing Doctor user + DoctorProfile."""
    user = User.query.get_or_404(doctor_id)
    if user.role != UserRole.DOCTOR:
        flash("User is not a doctor.", "danger")
        return redirect(url_for("admin.admin_doctors"))

    profile = user.doctor_profile
    if not profile:
        profile = DoctorProfile(user_id=user.id)
        db.session.add(profile)
        db.session.flush()

    form = DoctorForm(obj=user)
    form.department_id.choices = [(0, "— None —")] + [
        (d.id, d.name) for d in Department.query.order_by(Department.name).all()
    ]

    if request.method == "GET":
        form.department_id.data = profile.department_id or 0
        form.specialisation.data = profile.specialisation
        form.qualification.data = profile.qualification
        form.experience_years.data = profile.experience_years

    if form.validate_on_submit():
        user.first_name = form.first_name.data
        user.last_name = form.last_name.data
        user.phone = form.phone.data
        if form.password.data:
            user.set_password(form.password.data)
        profile.department_id = form.department_id.data if form.department_id.data else None
        profile.specialisation = form.specialisation.data
        profile.qualification = form.qualification.data
        profile.experience_years = form.experience_years.data or 0
        db.session.commit()
        flash(f"Doctor {user.full_name} updated successfully.", "success")
        return redirect(url_for("admin.admin_doctors"))

    return render_template("admin/edit_doctor.html", form=form, doctor=user)


@admin_bp.route("/users/<int:user_id>/toggle-active", methods=["POST"])
@login_required
@admin_required
def admin_toggle_active(user_id):
    """Blacklist / reactivate a user account."""
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        flash("You cannot deactivate your own account.", "warning")
        return redirect(url_for("admin.admin_dashboard"))

    user.is_active = not user.is_active
    db.session.commit()
    status_str = "activated" if user.is_active else "blacklisted"
    flash(f"User {user.full_name} has been {status_str}.", "success")
    return redirect(url_for("admin.admin_dashboard"))


@admin_bp.route("/departments/add", methods=["GET", "POST"])
@login_required
@admin_required
def admin_add_department():
    """Create a new medical department."""
    form = DepartmentForm()
    if form.validate_on_submit():
        dept = Department(name=form.name.data, description=form.description.data)
        db.session.add(dept)
        db.session.commit()
        flash(f"Department '{dept.name}' created.", "success")
        return redirect(url_for("admin.admin_dashboard"))
    return render_template("admin/add_department.html", form=form)
