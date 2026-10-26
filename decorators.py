"""Custom role-based access-control decorators for the Hospital Management System.

Usage::

    from decorators import admin_required, doctor_required, patient_required

    @app.route("/admin/dashboard")
    @login_required
    @admin_required
    def admin_dashboard():
        ...

Each decorator must be placed **after** ``@login_required`` so that
Flask-Login redirects anonymous users first; the role decorator then
checks whether the *authenticated* user holds the correct role.
"""

from functools import wraps

from flask import flash, redirect, url_for, abort
from flask_login import current_user

from models import UserRole


def role_required(*allowed_roles):
    """Generic factory that returns a decorator restricting access to the
    specified role(s).

    Parameters
    ----------
    *allowed_roles : str
        One or more ``UserRole`` constants (e.g. ``UserRole.ADMIN``).

    Returns
    -------
    decorator
        A Flask view decorator that checks ``current_user.role``.
    """

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
    """Allow access only to users with the **Admin** role.

    Unauthorised users are redirected to the login page with a flash
    message.
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            flash("Please log in to access this page.", "warning")
            return redirect(url_for("login"))
        if current_user.role != UserRole.ADMIN:
            flash("Access denied. Admin privileges required.", "danger")
            return redirect(url_for("login"))
        return func(*args, **kwargs)
    return wrapper


def doctor_required(func):
    """Allow access only to users with the **Doctor** role.

    Unauthorised users are redirected to the login page with a flash
    message.
    """

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
    """Allow access only to users with the **Patient** role.

    Unauthorised users are redirected to the login page with a flash
    message.
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            flash("Please log in to access this page.", "warning")
            return redirect(url_for("login"))
        if current_user.role != UserRole.PATIENT:
            flash("Access denied. Patient account required.", "danger")
            return redirect(url_for("login"))
        return func(*args, **kwargs)
    return wrapper
