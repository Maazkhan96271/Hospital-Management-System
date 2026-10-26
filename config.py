import os

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    """Base configuration for the Hospital Management System."""

    SECRET_KEY = os.environ.get("SECRET_KEY", "hms-dev-secret-key-change-in-production")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:///" + os.path.join(basedir, "hospital.db")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Default admin credentials (override via environment variables in production)
    ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@hospital.com")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@123")
