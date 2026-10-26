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
    login_manager.login_message_category = "info"
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

    # ------------------------------------------------------------------
    # Routes
    # ------------------------------------------------------------------

    @app.route("/")
    def index():
        """Landing / dashboard page."""
        return render_template("index.html")

    # ---- Authentication ------------------------------------------------

    @app.route("/login", methods=["GET", "POST"])
    def login():
        from forms import LoginForm

        if current_user.is_authenticated:
            return redirect(url_for("dashboard"))

        form = LoginForm()
        if form.validate_on_submit():
            user = User.query.filter_by(username=form.username.data).first()
            if user and user.check_password(form.password.data):
                login_user(user, remember=form.remember_me.data)
                flash("Logged in successfully.", "success")
                next_page = request.args.get("next")
                return redirect(next_page or url_for("dashboard"))
            flash("Invalid username or password.", "danger")
        return render_template("login.html", form=form)

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

    @app.route("/logout")
    @login_required
    def logout():
        logout_user()
        flash("You have been logged out.", "info")
        return redirect(url_for("index"))

    # ---- Dashboard -----------------------------------------------------

    @app.route("/dashboard")
    @login_required
    def dashboard():
        """Role-aware dashboard."""
        if current_user.role == UserRole.ADMIN:
            users = User.query.all()
            departments = Department.query.all()
            appointments = Appointment.query.all()
            return render_template(
                "dashboard.html",
                users=users,
                departments=departments,
                appointments=appointments,
            )
        elif current_user.role == UserRole.DOCTOR:
            profile = DoctorProfile.query.filter_by(user_id=current_user.id).first()
            appointments = (
                profile.doctor_appointments.all() if profile else []
            )
            return render_template(
                "dashboard.html", profile=profile, appointments=appointments
            )
        else:  # Patient
            appointments = current_user.patient_appointments.all()
            return render_template("dashboard.html", appointments=appointments)

    return app


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
