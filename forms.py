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
# Admin – Add / Edit Doctor
# ---------------------------------------------------------------------------

class AddDoctorForm(FlaskForm):
    """Admin form to create a new Doctor user + DoctorProfile."""

    # User fields
    username = StringField("Username", validators=[DataRequired(), Length(min=3, max=80)])
    email = StringField("Email", validators=[DataRequired(), Email()])
    first_name = StringField("First Name", validators=[DataRequired(), Length(max=50)])
    last_name = StringField("Last Name", validators=[DataRequired(), Length(max=50)])
    phone = StringField("Phone", validators=[Optional(), Length(max=20)])
    password = PasswordField("Password", validators=[DataRequired(), Length(min=6)])

    # DoctorProfile fields
    department_id = SelectField("Department", coerce=int, validators=[Optional()])
    specialisation = StringField("Specialisation", validators=[Optional(), Length(max=150)])
    qualification = StringField("Qualification", validators=[Optional(), Length(max=200)])
    experience_years = IntegerField(
        "Years of Experience", validators=[Optional(), NumberRange(min=0, max=60)], default=0
    )
    submit = SubmitField("Add Doctor")

    def validate_username(self, field):
        if User.query.filter_by(username=field.data).first():
            raise ValidationError("Username is already taken.")

    def validate_email(self, field):
        if User.query.filter_by(email=field.data).first():
            raise ValidationError("Email is already registered.")


class EditDoctorForm(FlaskForm):
    """Admin form to update an existing Doctor's profile."""

    # User fields (no password change here; username & email read-only context)
    first_name = StringField("First Name", validators=[DataRequired(), Length(max=50)])
    last_name = StringField("Last Name", validators=[DataRequired(), Length(max=50)])
    phone = StringField("Phone", validators=[Optional(), Length(max=20)])

    # DoctorProfile fields
    department_id = SelectField("Department", coerce=int, validators=[Optional()])
    specialisation = StringField("Specialisation", validators=[Optional(), Length(max=150)])
    qualification = StringField("Qualification", validators=[Optional(), Length(max=200)])
    experience_years = IntegerField(
        "Years of Experience", validators=[Optional(), NumberRange(min=0, max=60)], default=0
    )
    submit = SubmitField("Update Doctor")


# ---------------------------------------------------------------------------
# Admin – Search
# ---------------------------------------------------------------------------

class SearchForm(FlaskForm):
    """Search patients / doctors by name or specialisation."""

    class Meta:
        csrf = False  # GET form – no CSRF needed

    q = StringField("Search", validators=[DataRequired(), Length(min=1, max=120)])
    submit = SubmitField("Search")


# ---------------------------------------------------------------------------
# Department
# ---------------------------------------------------------------------------

class DepartmentForm(FlaskForm):
    """Create / edit a hospital department."""

    name = StringField("Department Name", validators=[DataRequired(), Length(max=100)])
    description = TextAreaField("Description", validators=[Optional()])
    submit = SubmitField("Save Department")


# ---------------------------------------------------------------------------
# Doctor – Availability
# ---------------------------------------------------------------------------

class AvailabilityForm(FlaskForm):
    """Doctor 7-day availability schedule.

    Each day has a start time, end time, and an available toggle.
    """

    mon_available = BooleanField("Monday")
    mon_start = TimeField("Start", validators=[Optional()])
    mon_end = TimeField("End", validators=[Optional()])

    tue_available = BooleanField("Tuesday")
    tue_start = TimeField("Start", validators=[Optional()])
    tue_end = TimeField("End", validators=[Optional()])

    wed_available = BooleanField("Wednesday")
    wed_start = TimeField("Start", validators=[Optional()])
    wed_end = TimeField("End", validators=[Optional()])

    thu_available = BooleanField("Thursday")
    thu_start = TimeField("Start", validators=[Optional()])
    thu_end = TimeField("End", validators=[Optional()])

    fri_available = BooleanField("Friday")
    fri_start = TimeField("Start", validators=[Optional()])
    fri_end = TimeField("End", validators=[Optional()])

    sat_available = BooleanField("Saturday")
    sat_start = TimeField("Start", validators=[Optional()])
    sat_end = TimeField("End", validators=[Optional()])

    sun_available = BooleanField("Sunday")
    sun_start = TimeField("Start", validators=[Optional()])
    sun_end = TimeField("End", validators=[Optional()])

    submit = SubmitField("Save Availability")


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

    def validate_appointment_date(self, field):
        from datetime import date
        if field.data and field.data < date.today():
            raise ValidationError("Appointment date cannot be in the past.")


# ---------------------------------------------------------------------------
# Treatment
# ---------------------------------------------------------------------------

class TreatmentForm(FlaskForm):
    """Record treatment details for a completed appointment."""

    diagnosis = TextAreaField("Diagnosis", validators=[DataRequired()])
    prescription = TextAreaField("Prescription", validators=[Optional()])
    notes = TextAreaField("Additional Notes", validators=[Optional()])
    submit = SubmitField("Save Treatment")
