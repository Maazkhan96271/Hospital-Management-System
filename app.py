"""
Hospital Management System – Flask Application Entry Point
===========================================================

Run with:
    python app.py

The modular application factory inside `flask_app.create_app()` will:
  1. Initialize the modular folder structure.
  2. Create all database tables (db.create_all()) if they do not exist.
  3. Seed a default Admin superuser (with a securely hashed password)
     when no admin account is found in the database.

No manual database creation tools (e.g. DB Browser / sqlite3) are required.
"""

from flask_app import create_app, db, init_db_and_seed_admin
from flask_app.config import Config
from flask_app.models import (
    User,
    UserRole,
    Department,
    DoctorProfile,
    Appointment,
    AppointmentStatus,
    Treatment,
)

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
