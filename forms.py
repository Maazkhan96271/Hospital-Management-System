"""WTForms form classes for the Hospital Management System."""

from flask_wtf import FlaskForm
from wtforms import (
    StringField,
    PasswordField,
    SelectField,
    TextAreaField,
    DateField,
    TimeField,
    IntegerField,
    BooleanField,
    SubmitField,
)
from wtforms.validators import (
    DataRequired,
    Email,
    EqualTo,
    Length,
    Optional,
    NumberRange,
    ValidationError,
)

from models import User


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

class LoginForm(FlaskForm):
    """Login form for all user roles."""

    username = StringField(
        "Username", validators=[DataRequired(), Length(min=3, max=80)]
    )
    password = PasswordField("Password", validators=[DataRequired()])
    remember_me = BooleanField("Remember Me")
    submit = SubmitField("Log In")


class RegistrationForm(FlaskForm):
    """Self-registration form (defaults to Patient role)."""

    username = StringField(
        "Username", validators=[DataRequired(), Length(min=3, max=80)]
    )
    email = StringField("Email", validators=[DataRequired(), Email()])
    first_name = StringField("First Name", validators=[DataRequired(), Length(max=50)])
    last_name = StringField("Last Name", validators=[DataRequired(), Length(max=50)])
    phone = StringField("Phone", validators=[Optional(), Length(max=20)])
    password = PasswordField(
        "Password", validators=[DataRequired(), Length(min=6)]
    )
    confirm_password = PasswordField(
        "Confirm Password", validators=[DataRequired(), EqualTo("password")]
    )
    submit = SubmitField("Register")

    # Custom validators --------------------------------------------------

    def validate_username(self, field):
        if User.query.filter_by(username=field.data).first():
            raise ValidationError("Username is already taken.")

    def validate_email(self, field):
        if User.query.filter_by(email=field.data).first():
            raise ValidationError("Email is already registered.")


# ---------------------------------------------------------------------------
# Department
# ---------------------------------------------------------------------------

class DepartmentForm(FlaskForm):
    """Create / edit a hospital department."""

    name = StringField("Department Name", validators=[DataRequired(), Length(max=100)])
    description = TextAreaField("Description", validators=[Optional()])
    submit = SubmitField("Save Department")


# ---------------------------------------------------------------------------
# Appointment
# ---------------------------------------------------------------------------

class AppointmentForm(FlaskForm):
    """Book or update an appointment."""

    doctor_id = SelectField("Doctor", coerce=int, validators=[DataRequired()])
    appointment_date = DateField("Date", validators=[DataRequired()])
    appointment_time = TimeField("Time", validators=[DataRequired()])
    reason = TextAreaField("Reason for Visit", validators=[Optional(), Length(max=500)])
    submit = SubmitField("Book Appointment")


# ---------------------------------------------------------------------------
# Treatment
# ---------------------------------------------------------------------------

class TreatmentForm(FlaskForm):
    """Record treatment details for a completed appointment."""

    diagnosis = TextAreaField("Diagnosis", validators=[DataRequired()])
    prescription = TextAreaField("Prescription", validators=[Optional()])
    notes = TextAreaField("Additional Notes", validators=[Optional()])
    submit = SubmitField("Save Treatment")
