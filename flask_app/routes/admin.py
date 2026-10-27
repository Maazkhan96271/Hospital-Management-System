"""Admin portal routes: dashboard, doctor management, patient management, departments, appointments, and user search."""

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
    Treatment,
)
from flask_app.decorators import admin_required
from flask_app.forms import (
    AddDoctorForm,
    EditDoctorForm,
    DoctorForm,
    AddPatientForm,
    EditPatientForm,
    DepartmentForm,
    EditDepartmentForm,
)

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


@admin_bp.route("/dashboard")
@login_required
@admin_required
def admin_dashboard():
    """Admin overview calculating and displaying total number of doctors, patients, and appointments."""
    users = User.query.all()
    departments = Department.query.order_by(Department.name.asc()).all()
    appointments = Appointment.query.order_by(Appointment.created_at.desc()).all()

    total_doctors = User.query.filter_by(role=UserRole.DOCTOR).count()
    total_patients = User.query.filter_by(role=UserRole.PATIENT).count()
    total_appointments = Appointment.query.count()
    total_departments = Department.query.count()
    total_users = len(users)

    active_doctors = User.query.filter_by(role=UserRole.DOCTOR, is_active=True).count()
    active_patients = User.query.filter_by(role=UserRole.PATIENT, is_active=True).count()
    blacklisted_users = User.query.filter_by(is_active=False).count()

    return render_template(
        "admin/dashboard.html",
        users=users,
        departments=departments,
        appointments=appointments,
        total_doctors=total_doctors,
        total_patients=total_patients,
        total_appointments=total_appointments,
        total_departments=total_departments,
        total_users=total_users,
        active_doctors=active_doctors,
        active_patients=active_patients,
        blacklisted_users=blacklisted_users,
    )


@admin_bp.route("/search")
@login_required
@admin_required
def admin_search():
    """Search patients and doctors by name, ID, email, or specialisation."""
    query = request.args.get("q", "").strip()
    role_filter = request.args.get("role", "all").strip().lower()
    results = []

    if query:
        pattern = f"%{query}%"

        target_roles = [UserRole.DOCTOR, UserRole.PATIENT]
        if role_filter == "doctor":
            target_roles = [UserRole.DOCTOR]
        elif role_filter == "patient":
            target_roles = [UserRole.PATIENT]

        user_conditions = [
            User.first_name.ilike(pattern),
            User.last_name.ilike(pattern),
            User.username.ilike(pattern),
            User.email.ilike(pattern),
            User.phone.ilike(pattern),
        ]

        # Numeric query enables matching directly by ID
        if query.isdigit():
            user_conditions.append(User.id == int(query))

        user_results = User.query.filter(
            User.role.in_(target_roles),
            or_(*user_conditions),
        ).all()

        # If role filter includes doctors, search doctor specialisation, qualification, and department name
        if role_filter in ["all", "doctor"]:
            spec_query = (
                DoctorProfile.query.join(Department, DoctorProfile.department_id == Department.id, isouter=True)
                .filter(
                    or_(
                        DoctorProfile.specialisation.ilike(pattern),
                        DoctorProfile.qualification.ilike(pattern),
                        Department.name.ilike(pattern),
                        *( [DoctorProfile.id == int(query)] if query.isdigit() else [] ),
                    )
                )
                .all()
            )
            for p in spec_query:
                if p.user and p.user not in user_results and p.user.role in target_roles:
                    user_results.append(p.user)

        results = user_results

    return render_template(
        "admin/search.html", results=results, query=query, role_filter=role_filter
    )


# ==============================================================================
# DOCTOR MANAGEMENT CRUD INTERFACES
# ==============================================================================


@admin_bp.route("/doctors")
@login_required
@admin_required
def admin_doctors():
    """List all doctors with optional search by name, ID, or specialisation."""
    q = request.args.get("q", "").strip()
    query = User.query.filter_by(role=UserRole.DOCTOR)
    if q:
        pattern = f"%{q}%"
        conditions = [
            User.first_name.ilike(pattern),
            User.last_name.ilike(pattern),
            User.username.ilike(pattern),
            User.email.ilike(pattern),
        ]
        if q.isdigit():
            conditions.append(User.id == int(q))
        query = query.filter(or_(*conditions))
    doctors = query.order_by(User.created_at.desc()).all()
    return render_template("admin/doctors.html", doctors=doctors, query=q)


@admin_bp.route("/doctors/add", methods=["GET", "POST"])
@login_required
@admin_required
def admin_add_doctor():
    """Create a new Doctor user + DoctorProfile."""
    form = AddDoctorForm()
    form.department_id.choices = [(0, "— None / General —")] + [
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
        flash(f"Doctor Dr. {user.full_name} added successfully.", "success")
        return redirect(url_for("admin.admin_doctors"))

    return render_template("admin/add_doctor.html", form=form)


@admin_bp.route("/doctors/<int:doctor_id>/edit", methods=["GET", "POST"])
@login_required
@admin_required
def admin_edit_doctor(doctor_id):
    """Edit an existing Doctor user + DoctorProfile."""
    user = db.session.get(User, doctor_id)
    if not user or user.role != UserRole.DOCTOR:
        flash("Doctor not found.", "danger")
        return redirect(url_for("admin.admin_doctors"))

    profile = user.doctor_profile
    if not profile:
        profile = DoctorProfile(user_id=user.id)
        db.session.add(profile)
        db.session.flush()

    form = EditDoctorForm(obj=user)
    form.department_id.choices = [(0, "— None / General —")] + [
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
        flash(f"Doctor Dr. {user.full_name} updated successfully.", "success")
        return redirect(url_for("admin.admin_doctors"))

    return render_template("admin/edit_doctor.html", form=form, doctor=user)


@admin_bp.route("/doctors/<int:doctor_id>/delete", methods=["POST"])
@login_required
@admin_required
def admin_delete_doctor(doctor_id):
    """Delete a Doctor account and their associated profile & appointments."""
    doctor = db.session.get(User, doctor_id)
    if not doctor or doctor.role != UserRole.DOCTOR:
        flash("Doctor not found.", "danger")
        return redirect(url_for("admin.admin_doctors"))

    name = doctor.full_name
    db.session.delete(doctor)
    db.session.commit()
    flash(f"Doctor Dr. {name} has been permanently removed.", "success")
    return redirect(url_for("admin.admin_doctors"))


# ==============================================================================
# PATIENT MANAGEMENT CRUD INTERFACES
# ==============================================================================


@admin_bp.route("/patients")
@login_required
@admin_required
def admin_patients():
    """List all registered patients with search by name/ID, appointment stats and active statuses."""
    q = request.args.get("q", "").strip()
    query = User.query.filter_by(role=UserRole.PATIENT)
    if q:
        pattern = f"%{q}%"
        conditions = [
            User.first_name.ilike(pattern),
            User.last_name.ilike(pattern),
            User.username.ilike(pattern),
            User.email.ilike(pattern),
            User.phone.ilike(pattern),
        ]
        if q.isdigit():
            conditions.append(User.id == int(q))
        query = query.filter(or_(*conditions))
    patients = query.order_by(User.created_at.desc()).all()
    return render_template("admin/patients.html", patients=patients, query=q)


@admin_bp.route("/patients/add", methods=["GET", "POST"])
@login_required
@admin_required
def admin_add_patient():
    """Admin interface to create a new Patient account."""
    form = AddPatientForm()
    if form.validate_on_submit():
        patient = User(
            username=form.username.data,
            email=form.email.data,
            first_name=form.first_name.data,
            last_name=form.last_name.data,
            phone=form.phone.data,
            role=UserRole.PATIENT,
            is_active=True,
        )
        patient.set_password(form.password.data)
        db.session.add(patient)
        db.session.commit()
        flash(f"Patient {patient.full_name} added successfully.", "success")
        return redirect(url_for("admin.admin_patients"))

    return render_template("admin/add_patient.html", form=form)


@admin_bp.route("/patients/<int:patient_id>/edit", methods=["GET", "POST"])
@login_required
@admin_required
def admin_edit_patient(patient_id):
    """Admin interface to update an existing Patient account."""
    patient = db.session.get(User, patient_id)
    if not patient or patient.role != UserRole.PATIENT:
        flash("Patient not found.", "danger")
        return redirect(url_for("admin.admin_patients"))

    form = EditPatientForm(obj=patient)
    if form.validate_on_submit():
        # Check email uniqueness if changed
        if form.email.data != patient.email:
            existing = User.query.filter_by(email=form.email.data).first()
            if existing and existing.id != patient.id:
                form.email.errors.append("This email is already in use by another user.")
                return render_template("admin/edit_patient.html", form=form, patient=patient)

        patient.first_name = form.first_name.data
        patient.last_name = form.last_name.data
        patient.email = form.email.data
        patient.phone = form.phone.data
        patient.is_active = form.is_active.data
        if form.password.data:
            patient.set_password(form.password.data)
        db.session.commit()
        flash(f"Patient {patient.full_name} updated successfully.", "success")
        return redirect(url_for("admin.admin_patients"))

    return render_template("admin/edit_patient.html", form=form, patient=patient)


@admin_bp.route("/patients/<int:patient_id>/delete", methods=["POST"])
@login_required
@admin_required
def admin_delete_patient(patient_id):
    """Delete a Patient account and cascade their appointments."""
    patient = db.session.get(User, patient_id)
    if not patient or patient.role != UserRole.PATIENT:
        flash("Patient not found.", "danger")
        return redirect(url_for("admin.admin_patients"))

    name = patient.full_name
    db.session.delete(patient)
    db.session.commit()
    flash(f"Patient {name} has been permanently removed.", "success")
    return redirect(url_for("admin.admin_patients"))


# ==============================================================================
# USER BLACKLIST / REACTIVATION & DEPARTMENTS
# ==============================================================================


@admin_bp.route("/users/<int:user_id>/toggle-active", methods=["POST"])
@login_required
@admin_required
def admin_toggle_active(user_id):
    """Blacklist / reactivate any user account (Doctor or Patient)."""
    user = db.session.get(User, user_id)
    if not user:
        flash("User not found.", "danger")
        return redirect(url_for("admin.admin_dashboard"))

    if user.id == current_user.id:
        flash("You cannot deactivate your own administrator account.", "warning")
        return redirect(url_for("admin.admin_dashboard"))

    user.is_active = not user.is_active
    db.session.commit()
    status_str = "reactivated" if user.is_active else "blacklisted"
    flash(f"User {user.full_name} ({user.role.title()}) has been {status_str}.", "success")

    redirect_url = request.referrer or url_for("admin.admin_dashboard")
    return redirect(redirect_url)


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
        return redirect(url_for("admin.admin_departments"))
    return render_template("admin/add_department.html", form=form)


# ==============================================================================
# DEPARTMENTS MANAGEMENT
# ==============================================================================


@admin_bp.route("/departments")
@login_required
@admin_required
def admin_departments():
    """List all medical departments with doctor counts and edit/delete controls."""
    departments = Department.query.order_by(Department.name.asc()).all()
    return render_template("admin/departments.html", departments=departments, form=DepartmentForm())


@admin_bp.route("/departments/<int:dept_id>/edit", methods=["GET", "POST"])
@login_required
@admin_required
def admin_edit_department(dept_id):
    """Edit an existing medical department."""
    dept = db.session.get(Department, dept_id)
    if not dept:
        flash("Department not found.", "danger")
        return redirect(url_for("admin.admin_departments"))

    form = EditDepartmentForm(obj=dept)
    if form.validate_on_submit():
        dept.name = form.name.data
        dept.description = form.description.data
        db.session.commit()
        flash(f"Department '{dept.name}' updated.", "success")
        return redirect(url_for("admin.admin_departments"))

    return render_template("admin/edit_department.html", form=form, dept=dept)


@admin_bp.route("/departments/<int:dept_id>/delete", methods=["POST"])
@login_required
@admin_required
def admin_delete_department(dept_id):
    """Delete a medical department (doctor profiles become unassigned)."""
    dept = db.session.get(Department, dept_id)
    if not dept:
        flash("Department not found.", "danger")
        return redirect(url_for("admin.admin_departments"))

    # Unassign doctors instead of cascading delete
    for profile in dept.doctors.all():
        profile.department_id = None
    name = dept.name
    db.session.delete(dept)
    db.session.commit()
    flash(f"Department '{name}' removed. Doctors have been reassigned to General.", "success")
    return redirect(url_for("admin.admin_departments"))


# ==============================================================================
# ALL APPOINTMENTS VIEW
# ==============================================================================


@admin_bp.route("/appointments")
@login_required
@admin_required
def admin_appointments():
    """Full paginated appointments list with filtering by status and date."""
    status_filter = request.args.get("status", "all").strip().lower()
    date_filter = request.args.get("date", "").strip()
    page = request.args.get("page", 1, type=int)

    query = Appointment.query

    if status_filter != "all" and status_filter in [
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
    ]:
        query = query.filter_by(status=status_filter)

    if date_filter:
        from datetime import datetime as dt
        try:
            filter_date = dt.strptime(date_filter, "%Y-%m-%d").date()
            query = query.filter(Appointment.appointment_date == filter_date)
        except ValueError:
            pass

    appointments = (
        query.order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc())
        .paginate(page=page, per_page=25, error_out=False)
    )

    total_all = Appointment.query.count()
    total_scheduled = Appointment.query.filter_by(status=AppointmentStatus.SCHEDULED).count()
    total_completed = Appointment.query.filter_by(status=AppointmentStatus.COMPLETED).count()
    total_cancelled = Appointment.query.filter_by(status=AppointmentStatus.CANCELLED).count()

    return render_template(
        "admin/appointments.html",
        appointments=appointments,
        status_filter=status_filter,
        date_filter=date_filter,
        total_all=total_all,
        total_scheduled=total_scheduled,
        total_completed=total_completed,
        total_cancelled=total_cancelled,
    )


@admin_bp.route("/appointments/<int:appointment_id>/cancel", methods=["POST"])
@login_required
@admin_required
def admin_cancel_appointment(appointment_id):
    """Admin cancels any appointment."""
    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        flash("Appointment not found.", "danger")
        return redirect(url_for("admin.admin_appointments"))

    appt.status = AppointmentStatus.CANCELLED
    db.session.commit()
    flash(f"Appointment #{appointment_id} has been cancelled.", "success")
    return redirect(request.referrer or url_for("admin.admin_appointments"))
