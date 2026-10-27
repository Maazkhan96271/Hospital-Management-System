"""Configuration settings for Flask Hospital Management System."""

import os

basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class Config:
    """Base application configuration."""

    SECRET_KEY = os.environ.get("SECRET_KEY", "hms-dev-secret-key-change-in-production")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:///" + os.path.join(basedir, "hospital.db")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Default admin credentials (override via environment variables in production)
    ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@hospital.com")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@123")


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class TestingConfig(Config):
    """Testing configuration with in-memory SQLite."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
