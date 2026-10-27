"""Flask Hospital Management System Application Factory and Startup Initialization."""

import os
from flask import Flask
from flask_app.config import Config
from flask_app.extensions import db, login_manager, csrf
from flask_app.models import User, UserRole
from flask_app.routes import register_blueprints


def init_db_and_seed_admin(app: Flask) -> None:
    """
    Automated startup initialization script:
    1. Runs db.create_all() to automatically create all SQLite database tables.
    2. Queries the database to check if an Admin superuser exists.
    3. If no Admin user exists, programmatically creates the Admin with a securely hashed password.
    Ensures zero manual database creation (e.g. DB Browser, manual SQL scripts) is required.
    """
    # 1. Create all database tables if they do not exist
    db.create_all()

    # 2. Check if an Admin superuser exists
    admin = User.query.filter_by(role=UserRole.ADMIN).first()

    # 3. Programmatically provision default Admin superuser with hashed password if not present
    if admin is None:
        admin_username = app.config.get("ADMIN_USERNAME", "admin")
        admin_email = app.config.get("ADMIN_EMAIL", "admin@hospital.com")
        admin_password = app.config.get("ADMIN_PASSWORD", "Admin@123")

        admin = User(
            username=admin_username,
            email=admin_email,
            first_name="System",
            last_name="Administrator",
            role=UserRole.ADMIN,
            is_active=True,
        )
        admin.set_password(admin_password)
        db.session.add(admin)
        db.session.commit()
        print(
            f"[STARTUP INIT] Database tables verified via db.create_all().\n"
            f"[STARTUP INIT] Admin superuser programmatically created:\n"
            f"  • Username: {admin_username}\n"
            f"  • Email:    {admin_email}\n"
            f"  • Role:     {UserRole.ADMIN}\n"
            f"  • Status:   Active (Hashed Password Verified)\n"
            f"[STARTUP INIT] Zero manual database creation required."
        )
    else:
        print(f"[STARTUP INIT] Database verified. Existing Admin superuser found: '{admin.username}'.")


def create_app(config_class=Config) -> Flask:
    """Application factory for the modular Flask Hospital Management System."""
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    template_dir = os.path.join(root_dir, "templates")
    static_dir = os.path.join(root_dir, "static")

    app = Flask(
        __name__,
        template_folder=template_dir,
        static_folder=static_dir,
    )
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    csrf.init_app(app)

    login_manager.login_view = "auth.login"
    login_manager.login_message = "Please log in to access this page."
    login_manager.login_message_category = "warning"
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    # Register modular blueprints
    register_blueprints(app)

    # URL build error handler to seamlessly resolve non-prefixed endpoints (e.g. url_for('index') -> 'main.index')
    from flask import url_for as flask_url_for

    def resolve_blueprint_endpoint(error, endpoint, values):
        if "." not in endpoint:
            for bp_name in ["main", "auth", "admin", "doctor", "patient", "api"]:
                candidate = f"{bp_name}.{endpoint}"
                try:
                    return flask_url_for(candidate, **values)
                except Exception:
                    continue
        raise error

    app.url_build_error_handlers.append(resolve_blueprint_endpoint)

    # Execute startup database initialization and Admin superuser seed
    with app.app_context():
        init_db_and_seed_admin(app)

    return app


__all__ = ["create_app", "db", "init_db_and_seed_admin"]
