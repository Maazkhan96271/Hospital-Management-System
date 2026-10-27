"""Role-based route protection decorators for the Flask Hospital Management System."""

from functools import wraps
from flask import flash, redirect, url_for
from flask_login import current_user
from flask_app.models.user import UserRole


def role_required(*allowed_roles):
    """Factory restricting route access to specified UserRole(s)."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not current_user.is_authenticated:
                flash("Please log in to access this page.", "warning")
                return redirect(url_for("login"))
            if current_user.role not in allowed_roles:
                flash("You do not have permission to access this page.", "danger")
                return redirect(url_for("login"))
            return func(*args, **kwargs)
        return wrapper
    return decorator


def admin_required(func):
    """Restrict route access to Administrators only."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            flash("Please log in to access this page.", "warning")
            return redirect(url_for("login"))
        if current_user.role != UserRole.ADMIN:
            flash("Access denied. Administrator privileges required.", "danger")
            return redirect(url_for("login"))
        return func(*args, **kwargs)
    return wrapper


def doctor_required(func):
    """Restrict route access to Attending Physicians / Doctors only."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            flash("Please log in to access this page.", "warning")
            return redirect(url_for("login"))
        if current_user.role != UserRole.DOCTOR:
            flash("Access denied. Doctor privileges required.", "danger")
            return redirect(url_for("login"))
        return func(*args, **kwargs)
    return wrapper


def patient_required(func):
    """Restrict route access to Registered Patients only."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            flash("Please log in to access this page.", "warning")
            return redirect(url_for("login"))
        if current_user.role != UserRole.PATIENT:
            flash("Access denied. Patient privileges required.", "danger")
            return redirect(url_for("login"))
        return func(*args, **kwargs)
    return wrapper
