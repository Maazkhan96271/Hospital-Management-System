"""Blueprint registration package for the Flask Hospital Management System."""

from flask import Flask
from flask_app.routes.main import main_bp
from flask_app.routes.auth import auth_bp
from flask_app.routes.admin import admin_bp
from flask_app.routes.doctor import doctor_bp
from flask_app.routes.patient import patient_bp
from flask_app.routes.api import api_bp


def register_blueprints(app: Flask) -> None:
    """Register all application blueprints and setup endpoint aliases for template compatibility."""
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(doctor_bp)
    app.register_blueprint(patient_bp)
    app.register_blueprint(api_bp)

    # Alias blueprint endpoints so url_for('patient_dashboard') and url_for('patient.patient_dashboard') both resolve
    for endpoint, view_func in list(app.view_functions.items()):
        if "." in endpoint:
            short_name = endpoint.split(".", 1)[1]
            if short_name not in app.view_functions:
                app.view_functions[short_name] = view_func


__all__ = [
    "main_bp",
    "auth_bp",
    "admin_bp",
    "doctor_bp",
    "patient_bp",
    "api_bp",
    "register_blueprints",
]
