"""
Hospital Management System – Flask Application Entry Point
===========================================================

Run with:
    python app.py

The initialisation script inside ``create_app()`` will:
  1. Create all database tables if they do not exist.
  2. Seed a default Admin superuser (with a securely hashed password)
     when no admin account is found in the database.

No manual database creation tools (e.g. ``flask db`` / ``sqlite3``) are required.
"""

import json
from datetime import date, timedelta, time as dt_time

from flask import Flask, render_template, redirect, url_for, flash, request, jsonify
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_wtf.csrf import CSRFProtect
from sqlalchemy import or_

from config import Config
from models import (
    db, User, UserRole, Department, DoctorProfile,
    Appointment, AppointmentStatus, Treatment,
)
from decorators import admin_required, doctor_required, patient_required

# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

def create_app(config_class=Config) -> Flask:
    """Create and configure the Flask application."""

    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialise extensions
    db.init_app(app)
    csrf = CSRFProtect(app)
    login_manager = LoginManager()
    login_manager.login_view = "login"
    login_manager.login_message = "Please log in to access this page."
    login_manager.login_message_category = "warning"
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    # ------------------------------------------------------------------
    # Database initialisation & admin seeding
    # ------------------------------------------------------------------
    with app.app_context():
        db.create_all()

        admin = User.query.filter_by(role=UserRole.ADMIN).first()
        if admin is None:
            admin = User(
                username=app.config["ADMIN_USERNAME"],
                email=app.config["ADMIN_EMAIL"],
                first_name="System",
                last_name="Administrator",
                role=UserRole.ADMIN,
            )
            admin.set_password(app.config["ADMIN_PASSWORD"])
            db.session.add(admin)
            db.session.commit()
            print(
                f"[INIT] Admin superuser created  –  "
                f"username: {app.config['ADMIN_USERNAME']}  |  "
                f"password: {app.config['ADMIN_PASSWORD']}"
            )
        else:
            print("[INIT] Admin superuser already exists – skipping seed.")

    # ======================================================================
    #  PUBLIC ROUTES
    # ======================================================================

    @app.route("/")
    def index():
        """Landing page."""
        return render_template("index.html")

    # ---- Unified Login -------------------------------------------------

    @app.route("/login", methods=["GET", "POST"])
    def login():
        from forms import LoginForm

        if current_user.is_authenticated:
            return redirect(url_for("dashboard"))

        form = LoginForm()
        if form.validate_on_submit():
            user = User.query.filter_by(username=form.username.data).first()
            if user and user.is_active and user.check_password(form.password.data):
                login_user(user, remember=form.remember_me.data)
                flash(f"Welcome back, {user.full_name}!", "success")
                next_page = request.args.get("next")
                return redirect(next_page or url_for("dashboard"))
            if user and not user.is_active:
                flash("Your account has been deactivated. Contact an administrator.", "danger")
            else:
                flash("Invalid username or password.", "danger")
        return render_template("login.html", form=form)

    # ---- Patient Registration ------------------------------------------

    @app.route("/register", methods=["GET", "POST"])
    def register():
        from forms import RegistrationForm

        if current_user.is_authenticated:
            return redirect(url_for("dashboard"))

        form = RegistrationForm()
        if form.validate_on_submit():
            user = User(
                username=form.username.data,
                email=form.email.data,
                first_name=form.first_name.data,
                last_name=form.last_name.data,
                phone=form.phone.data,
                role=UserRole.PATIENT,
            )
            user.set_password(form.password.data)
            db.session.add(user)
            db.session.commit()
            flash("Registration successful! Please log in.", "success")
            return redirect(url_for("login"))
        return render_template("register.html", form=form)

    # ---- Logout --------------------------------------------------------

    @app.route("/logout")
    @login_required
    def logout():
        logout_user()
        flash("You have been logged out.", "info")
        return redirect(url_for("index"))

    # ---- Smart Dashboard Router ----------------------------------------

    @app.route("/dashboard")
    @login_required
    def dashboard():
        if current_user.role == UserRole.ADMIN:
            return redirect(url_for("admin_dashboard"))
        elif current_user.role == UserRole.DOCTOR:
            return redirect(url_for("doctor_dashboard"))
        else:
            return redirect(url_for("patient_dashboard"))

    # ==================================================================
    #  ADMIN ROUTES
    # ==================================================================

    @app.route("/admin/dashboard")
    @login_required
    @admin_required
    def admin_dashboard():
        """Admin overview with aggregate metrics."""
        users = User.query.all()
        departments = Department.query.all()
        appointments = Appointment.query.order_by(Appointment.created_at.desc()).all()

        # Aggregate counts
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

    # ==================================================================
    #  RESTful API ENDPOINTS
    # ==================================================================

    @app.route("/api/appointments-and-patients")
    @login_required
    def api_appointments_and_patients():
        """RESTful API endpoint returning JSON data for the total number of appointments and patients."""
        total_appointments = Appointment.query.count()
        total_patients = User.query.filter_by(role=UserRole.PATIENT).count()
        return jsonify({
            "total_appointments": total_appointments,
            "total_patients": total_patients,
        })

    @app.route("/api/stats")
    @login_required
    def api_stats():
        """RESTful API endpoint returning complete metrics for appointments, patients, and departments."""
        total_appointments = Appointment.query.count()
        total_patients = User.query.filter_by(role=UserRole.PATIENT).count()
        total_doctors = User.query.filter_by(role=UserRole.DOCTOR).count()
        total_departments = Department.query.count()

        # Breakdown by appointment status
        status_counts = {
            "Scheduled": Appointment.query.filter_by(status=AppointmentStatus.SCHEDULED).count(),
            "Completed": Appointment.query.filter_by(status=AppointmentStatus.COMPLETED).count(),
            "Cancelled": Appointment.query.filter_by(status=AppointmentStatus.CANCELLED).count(),
            "No Show": Appointment.query.filter_by(status=AppointmentStatus.NO_SHOW).count(),
        }

        # Appointments per department
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

        # Check for unassigned / general appointments
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

    # ---- Admin: Search -------------------------------------------------

    @app.route("/admin/search")
    @login_required
    @admin_required
    def admin_search():
        """Search patients and doctors by name or specialisation."""
        from forms import SearchForm
        form = SearchForm(request.args)
        results = []
        query = ""

        if form.q.data:
            query = form.q.data.strip()
            pattern = f"%{query}%"

            # Search users by name
            user_results = User.query.filter(
                User.role.in_([UserRole.DOCTOR, UserRole.PATIENT]),
                or_(
                    User.first_name.ilike(pattern),
                    User.last_name.ilike(pattern),
                    User.username.ilike(pattern),
                    User.email.ilike(pattern),
                ),
            ).all()

            # Search doctor profiles by specialisation
            spec_profiles = DoctorProfile.query.filter(
                DoctorProfile.specialisation.ilike(pattern)
            ).all()
            spec_users = [p.user for p in spec_profiles if p.user not in user_results]

            results = user_results + spec_users

        return render_template(
            "admin/search.html", form=form, results=results, query=query
        )

    # ---- Admin: Doctor CRUD --------------------------------------------

    @app.route("/admin/doctors")
    @login_required
    @admin_required
    def admin_doctors():
        """List all doctors with their profiles."""
        doctors = User.query.filter_by(role=UserRole.DOCTOR).all()
        return render_template("admin/doctors.html", doctors=doctors)

    @app.route("/admin/doctors/add", methods=["GET", "POST"])
    @login_required
    @admin_required
    def admin_add_doctor():
        """Create a new Doctor user + DoctorProfile."""
        from forms import AddDoctorForm
        form = AddDoctorForm()
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
            user.set_password(form.password.data)
            db.session.add(user)
            db.session.flush()  # get user.id

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
            return redirect(url_for("admin_doctors"))

        return render_template("admin/add_doctor.html", form=form)

    @app.route("/admin/doctors/<int:doctor_id>/edit", methods=["GET", "POST"])
    @login_required
    @admin_required
    def admin_edit_doctor(doctor_id):
        """Edit an existing Doctor user + DoctorProfile."""
        from forms import EditDoctorForm
        user = User.query.get_or_404(doctor_id)
        if user.role != UserRole.DOCTOR:
            flash("User is not a doctor.", "danger")
            return redirect(url_for("admin_doctors"))

        profile = user.doctor_profile
        if not profile:
            profile = DoctorProfile(user_id=user.id)
            db.session.add(profile)
            db.session.flush()

        form = EditDoctorForm(obj=user)
        form.department_id.choices = [(0, "— None —")] + [
            (d.id, d.name) for d in Department.query.order_by(Department.name).all()
        ]

        if request.method == "GET":
            # Pre-fill profile fields
            form.department_id.data = profile.department_id or 0
            form.specialisation.data = profile.specialisation
            form.qualification.data = profile.qualification
            form.experience_years.data = profile.experience_years

        if form.validate_on_submit():
            user.first_name = form.first_name.data
            user.last_name = form.last_name.data
            user.phone = form.phone.data
            profile.department_id = form.department_id.data if form.department_id.data else None
            profile.specialisation = form.specialisation.data
            profile.qualification = form.qualification.data
            profile.experience_years = form.experience_years.data or 0
            db.session.commit()
            flash(f"Doctor {user.full_name} updated successfully.", "success")
            return redirect(url_for("admin_doctors"))

        return render_template("admin/edit_doctor.html", form=form, doctor=user)

    # ---- Admin: Blacklist (toggle active) ------------------------------

    @app.route("/admin/users/<int:user_id>/toggle-active", methods=["POST"])
    @login_required
    @admin_required
    def admin_toggle_active(user_id):
        """Blacklist / reactivate a user (cannot deactivate yourself)."""
        user = User.query.get_or_404(user_id)
        if user.id == current_user.id:
            flash("You cannot deactivate your own account.", "warning")
            return redirect(url_for("admin_dashboard"))

        user.is_active = not user.is_active
        db.session.commit()
        status = "activated" if user.is_active else "blacklisted"
        flash(f"User {user.full_name} has been {status}.", "success")
        return redirect(url_for("admin_dashboard"))

    # ---- Admin: Department CRUD ----------------------------------------

    @app.route("/admin/departments/add", methods=["GET", "POST"])
    @login_required
    @admin_required
    def admin_add_department():
        """Create a new department."""
        from forms import DepartmentForm
        form = DepartmentForm()
        if form.validate_on_submit():
            dept = Department(name=form.name.data, description=form.description.data)
            db.session.add(dept)
            db.session.commit()
            flash(f"Department '{dept.name}' created.", "success")
            return redirect(url_for("admin_dashboard"))
        return render_template("admin/add_department.html", form=form)

    # ==================================================================
    #  DOCTOR ROUTES
    # ==================================================================

    @app.route("/doctor/dashboard")
    @login_required
    @doctor_required
    def doctor_dashboard():
        """Doctor dashboard – upcoming appointments for the current week."""
        profile = DoctorProfile.query.filter_by(user_id=current_user.id).first()

        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())  # Monday
        end_of_week = start_of_week + timedelta(days=6)          # Sunday

        if profile:
            upcoming = Appointment.query.filter(
                Appointment.doctor_id == profile.id,
                Appointment.appointment_date >= start_of_week,
                Appointment.appointment_date <= end_of_week,
            ).order_by(
                Appointment.appointment_date, Appointment.appointment_time
            ).all()

            all_appointments = Appointment.query.filter_by(
                doctor_id=profile.id
            ).order_by(
                Appointment.appointment_date.desc(), Appointment.appointment_time.desc()
            ).all()
        else:
            upcoming = []
            all_appointments = []

        # Parse availability JSON for display
        availability = {}
        if profile and profile.availability:
            try:
                availability = json.loads(profile.availability)
            except (json.JSONDecodeError, TypeError):
                availability = {}

        return render_template(
            "doctor/dashboard.html",
            profile=profile,
            upcoming=upcoming,
            appointments=all_appointments,
            availability=availability,
            week_start=start_of_week,
            week_end=end_of_week,
        )

    # ---- Doctor: Availability ------------------------------------------

    @app.route("/doctor/availability", methods=["GET", "POST"])
    @login_required
    @doctor_required
    def doctor_availability():
        """Update the 7-day weekly availability schedule."""
        from forms import AvailabilityForm

        profile = DoctorProfile.query.filter_by(user_id=current_user.id).first()
        if not profile:
            flash("No doctor profile found. Contact an administrator.", "warning")
            return redirect(url_for("doctor_dashboard"))

        form = AvailabilityForm()
        days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        day_labels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        if request.method == "GET" and profile.availability:
            try:
                saved = json.loads(profile.availability)
                for abbr, full in zip(days, [d.lower() for d in day_labels]):
                    if full in saved:
                        getattr(form, f"{abbr}_available").data = saved[full].get("available", False)
                        start_str = saved[full].get("start", "09:00")
                        end_str = saved[full].get("end", "17:00")
                        try:
                            sh, sm = map(int, start_str.split(":"))
                            eh, em = map(int, end_str.split(":"))
                            getattr(form, f"{abbr}_start").data = dt_time(sh, sm)
                            getattr(form, f"{abbr}_end").data = dt_time(eh, em)
                        except (ValueError, AttributeError):
                            pass
            except (json.JSONDecodeError, TypeError):
                pass

        if form.validate_on_submit():
            schedule = {}
            for abbr, full in zip(days, [d.lower() for d in day_labels]):
                avail = getattr(form, f"{abbr}_available").data
                start = getattr(form, f"{abbr}_start").data
                end = getattr(form, f"{abbr}_end").data
                schedule[full] = {
                    "available": bool(avail),
                    "start": start.strftime("%H:%M") if start else "09:00",
                    "end": end.strftime("%H:%M") if end else "17:00",
                }
            profile.availability = json.dumps(schedule)
            db.session.commit()
            flash("Availability schedule updated.", "success")
            return redirect(url_for("doctor_dashboard"))

        return render_template(
            "doctor/availability.html",
            form=form,
            days=list(zip(days, day_labels)),
        )

    # ---- Doctor: Consultation ------------------------------------------

    @app.route("/doctor/consultation/<int:appointment_id>", methods=["GET", "POST"])
    @login_required
    @doctor_required
    def doctor_consultation(appointment_id):
        """Consultation view: update status, view patient history, add treatment."""
        from forms import TreatmentForm

        profile = DoctorProfile.query.filter_by(user_id=current_user.id).first()
        if not profile:
            flash("No doctor profile found.", "warning")
            return redirect(url_for("doctor_dashboard"))

        appointment = Appointment.query.get_or_404(appointment_id)
        if appointment.doctor_id != profile.id:
            flash("This appointment is not assigned to you.", "danger")
            return redirect(url_for("doctor_dashboard"))

        # Patient's past treatments (from all their appointments)
        past_treatments = (
            db.session.query(Treatment)
            .join(Appointment, Treatment.appointment_id == Appointment.id)
            .filter(Appointment.patient_id == appointment.patient_id)
            .order_by(Appointment.appointment_date.desc())
            .all()
        )

        form = TreatmentForm()

        # Pre-fill if treatment already exists
        if request.method == "GET" and appointment.treatment:
            form.diagnosis.data = appointment.treatment.diagnosis
            form.prescription.data = appointment.treatment.prescription
            form.notes.data = appointment.treatment.notes

        if form.validate_on_submit():
            # Mark appointment as completed
            appointment.status = AppointmentStatus.COMPLETED

            if appointment.treatment:
                # Update existing treatment
                appointment.treatment.diagnosis = form.diagnosis.data
                appointment.treatment.prescription = form.prescription.data
                appointment.treatment.notes = form.notes.data
            else:
                # Create new treatment
                treatment = Treatment(
                    appointment_id=appointment.id,
                    diagnosis=form.diagnosis.data,
                    prescription=form.prescription.data,
                    notes=form.notes.data,
                )
                db.session.add(treatment)

            db.session.commit()
            flash("Consultation completed and treatment recorded.", "success")
            return redirect(url_for("doctor_dashboard"))

        return render_template(
            "doctor/consultation.html",
            appointment=appointment,
            form=form,
            past_treatments=past_treatments,
        )

    # ==================================================================
    #  PATIENT ROUTES
    # ==================================================================

    @app.route("/patient/dashboard")
    @login_required
    @patient_required
    def patient_dashboard():
        """Patient dashboard with quick statistics and recent activity."""
        all_appts = Appointment.query.filter_by(
            patient_id=current_user.id
        ).order_by(
            Appointment.appointment_date.desc(), Appointment.appointment_time.desc()
        ).all()

        upcoming = [a for a in all_appts if a.status == AppointmentStatus.SCHEDULED]
        completed = [a for a in all_appts if a.status == AppointmentStatus.COMPLETED]
        cancelled = [a for a in all_appts if a.status == AppointmentStatus.CANCELLED]

        total_departments = Department.query.count()
        total_doctors = DoctorProfile.query.join(User).filter(User.is_active == True).count()

        return render_template(
            "patient/dashboard.html",
            appointments=all_appts,
            upcoming=upcoming,
            completed=completed,
            cancelled=cancelled,
            total_departments=total_departments,
            total_doctors=total_doctors,
        )

    # ---- Patient: Departments & Doctors with 7-Day Availability --------

    @app.route("/patient/doctors")
    @login_required
    @patient_required
    def patient_doctors():
        """View all medical departments and active doctors with 7-day availability."""
        departments = Department.query.order_by(Department.name.asc()).all()
        # Doctors not assigned to any department
        unassigned_doctors = (
            DoctorProfile.query.join(User)
            .filter(User.is_active == True, DoctorProfile.department_id.is_(None))
            .all()
        )
        all_doctors = (
            DoctorProfile.query.join(User)
            .filter(User.is_active == True)
            .order_by(User.first_name.asc())
            .all()
        )

        return render_template(
            "patient/doctors.html",
            departments=departments,
            unassigned_doctors=unassigned_doctors,
            all_doctors=all_doctors,
        )

    # ---- Patient: Book Appointment with Double-Booking Prevention ------

    @app.route("/patient/appointments/book", methods=["GET", "POST"])
    @login_required
    @patient_required
    def patient_book_appointment():
        """Appointment booking engine with strict database validation against double-booking."""
        from forms import AppointmentForm

        form = AppointmentForm()

        active_doctors = (
            DoctorProfile.query.join(User)
            .filter(User.is_active == True)
            .order_by(User.first_name.asc(), User.last_name.asc())
            .all()
        )

        form.doctor_id.choices = [
            (
                doc.id,
                f"Dr. {doc.user.full_name} — {doc.specialisation or 'General Medicine'} "
                f"({doc.department.name if doc.department else 'General'})",
            )
            for doc in active_doctors
        ]

        # Handle pre-selected doctor passed via query parameter (e.g. from doctors list)
        preselected_id = request.args.get("doctor_id", type=int)
        if request.method == "GET" and preselected_id:
            valid_ids = [d.id for d in active_doctors]
            if preselected_id in valid_ids:
                form.doctor_id.data = preselected_id

        selected_doctor_info = None
        current_selection_id = form.doctor_id.data or preselected_id
        if current_selection_id:
            selected_doctor_info = DoctorProfile.query.get(current_selection_id)

        if form.validate_on_submit():
            doctor_profile = DoctorProfile.query.get(form.doctor_id.data)

            if not doctor_profile or not doctor_profile.user or not doctor_profile.user.is_active:
                form.doctor_id.errors.append("Selected doctor is currently unavailable.")
            else:
                has_error = False

                # 1. STRICT DOUBLE-BOOKING CHECK:
                # Query database for any active/scheduled appointment for this doctor at the exact same date & time
                doctor_conflict = Appointment.query.filter(
                    Appointment.doctor_id == doctor_profile.id,
                    Appointment.appointment_date == form.appointment_date.data,
                    Appointment.appointment_time == form.appointment_time.data,
                    Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED]),
                ).first()

                if doctor_conflict:
                    has_error = True
                    conflict_time_str = form.appointment_time.data.strftime("%H:%M")
                    conflict_date_str = form.appointment_date.data.strftime("%Y-%m-%d")
                    error_message = (
                        f"Double-Booking Conflict: Dr. {doctor_profile.user.full_name} is already booked "
                        f"on {conflict_date_str} at {conflict_time_str}. Please select another time or doctor."
                    )
                    form.appointment_time.errors.append(error_message)
                    flash(error_message, "danger")

                # 2. PATIENT CONFLICT CHECK:
                # Prevent the same patient from booking two overlapping appointments
                patient_conflict = Appointment.query.filter(
                    Appointment.patient_id == current_user.id,
                    Appointment.appointment_date == form.appointment_date.data,
                    Appointment.appointment_time == form.appointment_time.data,
                    Appointment.status.in_([AppointmentStatus.SCHEDULED]),
                ).first()

                if patient_conflict:
                    has_error = True
                    patient_err = (
                        f"You already have another appointment scheduled on "
                        f"{form.appointment_date.data.strftime('%Y-%m-%d')} at "
                        f"{form.appointment_time.data.strftime('%H:%M')}."
                    )
                    form.appointment_time.errors.append(patient_err)
                    flash(patient_err, "danger")

                # 3. DOCTOR WEEKLY SCHEDULE CHECK:
                # Check whether doctor is available on the selected weekday
                weekday_keys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
                day_name = weekday_keys[form.appointment_date.data.weekday()]
                sched = doctor_profile.parsed_availability
                if sched and day_name in sched:
                    day_sched = sched[day_name]
                    if not day_sched.get("available", False):
                        has_error = True
                        sched_err = (
                            f"Dr. {doctor_profile.user.full_name} is marked as unavailable on "
                            f"{day_name.capitalize()}s according to their weekly schedule."
                        )
                        form.appointment_date.errors.append(sched_err)
                        flash(sched_err, "warning")

                if not has_error:
                    appointment = Appointment(
                        patient_id=current_user.id,
                        doctor_id=doctor_profile.id,
                        appointment_date=form.appointment_date.data,
                        appointment_time=form.appointment_time.data,
                        reason=form.reason.data,
                        status=AppointmentStatus.SCHEDULED,
                    )
                    db.session.add(appointment)
                    db.session.commit()
                    flash(
                        f"Appointment successfully booked with Dr. {doctor_profile.user.full_name} for "
                        f"{appointment.appointment_date.strftime('%A, %b %d, %Y')} at "
                        f"{appointment.appointment_time.strftime('%I:%M %p')}!",
                        "success",
                    )
                    return redirect(url_for("patient_appointments"))

        return render_template(
            "patient/book_appointment.html",
            form=form,
            active_doctors=active_doctors,
            selected_doctor_info=selected_doctor_info,
        )

    # ---- Patient: Appointment History & Dynamic Treatment Records ------

    @app.route("/patient/appointments")
    @login_required
    @patient_required
    def patient_appointments():
        """View all patient appointments, dynamic statuses, and treatment records."""
        appointments = Appointment.query.filter_by(
            patient_id=current_user.id
        ).order_by(
            Appointment.appointment_date.desc(), Appointment.appointment_time.desc()
        ).all()
        return render_template("patient/appointments.html", appointments=appointments)

    @app.route("/patient/appointments/<int:appointment_id>")
    @login_required
    @patient_required
    def patient_appointment_detail(appointment_id):
        """Detailed view for a specific appointment and its treatment record."""
        appointment = Appointment.query.get_or_404(appointment_id)
        if appointment.patient_id != current_user.id:
            flash("You do not have permission to view this appointment.", "danger")
            return redirect(url_for("patient_appointments"))

        return render_template(
            "patient/appointment_detail.html",
            appointment=appointment,
        )

    @app.route("/patient/appointments/<int:appointment_id>/cancel", methods=["POST"])
    @login_required
    @patient_required
    def patient_cancel_appointment(appointment_id):
        """Cancel an upcoming scheduled appointment."""
        appointment = Appointment.query.get_or_404(appointment_id)
        if appointment.patient_id != current_user.id:
            flash("You do not have permission to modify this appointment.", "danger")
            return redirect(url_for("patient_appointments"))

        if appointment.status == AppointmentStatus.SCHEDULED:
            appointment.status = AppointmentStatus.CANCELLED
            db.session.commit()
            flash(f"Appointment #{appointment.id} has been successfully cancelled.", "info")
        else:
            flash("Only scheduled appointments can be cancelled.", "warning")

        return redirect(url_for("patient_appointments"))

    return app


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
