"""Authentication routes for Login, Self-Registration, and Logout."""

from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from flask_app.extensions import db
from flask_app.models.user import User, UserRole
from flask_app.forms import LoginForm, RegistrationForm

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    """Public login for Patients (and unified fallback)."""
    if current_user.is_authenticated:
        return redirect(url_for("main.dashboard"))

    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and user.is_active and user.check_password(form.password.data):
            login_user(user, remember=form.remember_me.data)
            flash(f"Welcome back, {user.full_name}!", "success")
            next_page = request.args.get("next")
            return redirect(next_page or url_for("main.dashboard"))
        if user and not user.is_active:
            flash("Your account has been deactivated. Please contact hospital administration.", "danger")
        else:
            flash("Invalid username or password.", "danger")
    return render_template("login.html", form=form)


@auth_bp.route("/staff/login", methods=["GET", "POST"])
@auth_bp.route("/admin/login", methods=["GET", "POST"])
@auth_bp.route("/doctor/login", methods=["GET", "POST"])
def staff_login():
    """Restricted login route exclusively for Doctors and Administrators."""
    if current_user.is_authenticated:
        return redirect(url_for("main.dashboard"))

    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and user.is_active and user.check_password(form.password.data):
            # Enforce staff-only access (Doctor or Admin)
            if user.role not in [UserRole.ADMIN, UserRole.DOCTOR]:
                flash(
                    "Access Denied: This portal is strictly for Doctors and Administrators. "
                    "Patients must log in via the Patient Portal.",
                    "danger",
                )
                return render_template("staff_login.html", form=form)

            login_user(user, remember=form.remember_me.data)
            role_title = "Doctor" if user.role == UserRole.DOCTOR else "Administrator"
            flash(f"Welcome to Staff Portal, {role_title} {user.full_name}!", "success")
            next_page = request.args.get("next")
            return redirect(next_page or url_for("main.dashboard"))

        if user and not user.is_active:
            flash("Your staff account has been deactivated. Please contact an administrator.", "danger")
        else:
            flash("Invalid staff credentials.", "danger")

    return render_template("staff_login.html", form=form)


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    """Public self-registration strictly for Patients (Admins/Doctors cannot self-register)."""
    if current_user.is_authenticated:
        return redirect(url_for("main.dashboard"))

    form = RegistrationForm()
    if form.validate_on_submit():
        # Public self-registration always assigns the Patient role
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
        flash("Registration successful! You may now log in to schedule appointments.", "success")
        return redirect(url_for("auth.login"))
    return render_template("register.html", form=form)


@auth_bp.route("/logout")
@login_required
def logout():
    """Sign out current user and end session."""
    logout_user()
    flash("You have been successfully logged out.", "info")
    return redirect(url_for("main.index"))
