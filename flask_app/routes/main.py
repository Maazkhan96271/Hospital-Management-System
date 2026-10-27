"""Main public routes and smart dashboard router."""

from flask import Blueprint, render_template, redirect, url_for
from flask_login import login_required, current_user
from flask_app.models.user import UserRole

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
