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

from flask import Flask, render_template, redirect, url_for, flash, request
from flask_login import LoginManager, login_user, logout_user, login_required, current_user

from config import Config
from models import db, User, UserRole, Department, DoctorProfile, Appointment, Treatment
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
        db.create_all()  # Create tables programmatically

        # Seed the default admin superuser if none exists
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
    #  ROUTES
    # ======================================================================

    # ---- Public pages --------------------------------------------------

    @app.route("/")
    def index():
        """Landing page."""
        return render_template("index.html")

    # ---- Unified Login (Admin, Doctor, Patient) ------------------------

    @app.route("/login", methods=["GET", "POST"])
    def login():
        """Single login route for all roles (Admin, Doctor, Patient).

        After successful authentication the user is redirected to their
        role-specific dashboard.
        """
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
                if next_page:
                    return redirect(next_page)
                return redirect(url_for("dashboard"))
            flash("Invalid username or password.", "danger")
        return render_template("login.html", form=form)

    # ---- Public Patient Registration -----------------------------------

    @app.route("/register", methods=["GET", "POST"])
    def register():
        """Self-registration for **Patients only**.

        Admin accounts are created only via the seed script or by an
        existing Admin through the admin panel.  Doctor accounts are
        created by Admins.  Public registration always assigns the
        Patient role.
        """
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
                role=UserRole.PATIENT,  # Hard-coded – no public admin/doctor reg
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
        """Redirect the authenticated user to their role-specific dashboard."""
        if current_user.role == UserRole.ADMIN:
            return redirect(url_for("admin_dashboard"))
        elif current_user.role == UserRole.DOCTOR:
            return redirect(url_for("doctor_dashboard"))
        else:
            return redirect(url_for("patient_dashboard"))

    # ==================================================================
    #  ADMIN ROUTES – protected by @admin_required
    # ==================================================================

    @app.route("/admin/dashboard")
    @login_required
    @admin_required
    def admin_dashboard():
        """Admin overview: users, departments, and all appointments."""
        users = User.query.all()
        departments = Department.query.all()
        appointments = Appointment.query.order_by(Appointment.created_at.desc()).all()
        return render_template(
            "admin/dashboard.html",
            users=users,
            departments=departments,
            appointments=appointments,
        )

    # ==================================================================
    #  DOCTOR ROUTES – protected by @doctor_required
    # ==================================================================

    @app.route("/doctor/dashboard")
    @login_required
    @doctor_required
    def doctor_dashboard():
        """Doctor view: profile summary and assigned appointments."""
        profile = DoctorProfile.query.filter_by(user_id=current_user.id).first()
        appointments = profile.doctor_appointments.order_by(
            Appointment.appointment_date.desc()
        ).all() if profile else []
        return render_template(
            "doctor/dashboard.html",
            profile=profile,
            appointments=appointments,
        )

    # ==================================================================
    #  PATIENT ROUTES – protected by @patient_required
    # ==================================================================

    @app.route("/patient/dashboard")
    @login_required
    @patient_required
    def patient_dashboard():
        """Patient view: personal appointments and quick-book action."""
        appointments = current_user.patient_appointments.order_by(
            Appointment.appointment_date.desc()
        ).all()
        return render_template(
            "patient/dashboard.html",
            appointments=appointments,
        )

    return app


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
