"""Doctor portal routes: daily & weekly agenda, 7-day availability, and consultation treatments."""

import json
from datetime import date, timedelta, time as dt_time
from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user

from flask_app.extensions import db
from flask_app.models import (
    DoctorProfile,
    Appointment,
    AppointmentStatus,
    Treatment,
)
from flask_app.decorators import doctor_required
from flask_app.forms import TreatmentForm, AvailabilityForm

doctor_bp = Blueprint("doctor", __name__, url_prefix="/doctor")


@doctor_bp.route("/dashboard")
@login_required
@doctor_required
def doctor_dashboard():
    """Doctor dashboard: upcoming appointments for the current week."""
    profile = DoctorProfile.query.filter_by(user_id=current_user.id).first()

    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())  # Monday
    end_of_week = start_of_week + timedelta(days=6)          # Sunday

    if profile:
        upcoming = (
            Appointment.query.filter(
                Appointment.doctor_id == profile.id,
                Appointment.appointment_date >= start_of_week,
                Appointment.appointment_date <= end_of_week,
            )
            .order_by(Appointment.appointment_date, Appointment.appointment_time)
            .all()
        )
        all_appointments = (
            Appointment.query.filter_by(doctor_id=profile.id)
            .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc())
            .all()
        )
    else:
        upcoming = []
        all_appointments = []

    availability = profile.parsed_availability if profile else {}

    return render_template(
        "doctor/dashboard.html",
        profile=profile,
        upcoming=upcoming,
        appointments=all_appointments,
        availability=availability,
        week_start=start_of_week,
        week_end=end_of_week,
    )


@doctor_bp.route("/availability", methods=["GET", "POST"])
@login_required
@doctor_required
def doctor_availability():
    """Update the 7-day weekly availability schedule."""
    profile = DoctorProfile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        flash("No doctor profile found. Contact an administrator.", "warning")
        return redirect(url_for("doctor.doctor_dashboard"))

    days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    day_labels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    form = AvailabilityForm()

    if request.method == "GET" and profile.availability:
        saved = profile.parsed_availability
        for abbr, full in zip(days, [d.lower() for d in day_labels]):
            if full in saved:
                getattr(form, f"{abbr}_available").data = saved[full].get("available", False)
                start_str = saved[full].get("start", "09:00")
                end_str = saved[full].get("end", "17:00")
                try:
                    sh, sm = map(int, start_str.split(":"))
                    eh, em = map(int, end_str.split(":"))
                    getattr(form, f"{abbr}_start").data = dt_time(sh, sm)
                    getattr(form, f"{abbr}_end").data = dt_time(eh, em)
                except (ValueError, AttributeError):
                    pass

    if form.validate_on_submit():
        schedule = {}
        for abbr, full in zip(days, [d.lower() for d in day_labels]):
            avail = getattr(form, f"{abbr}_available").data
            start = getattr(form, f"{abbr}_start").data
            end = getattr(form, f"{abbr}_end").data
            schedule[full] = {
                "available": bool(avail),
                "start": start.strftime("%H:%M") if start else "09:00",
                "end": end.strftime("%H:%M") if end else "17:00",
            }
        profile.set_availability(schedule)
        db.session.commit()
        flash("7-day availability schedule updated successfully.", "success")
        return redirect(url_for("doctor.doctor_dashboard"))

    return render_template(
        "doctor/availability.html",
        form=form,
        days=list(zip(days, day_labels)),
    )


@doctor_bp.route("/consultation/<int:appointment_id>", methods=["GET", "POST"])
@login_required
@doctor_required
def doctor_consultation(appointment_id):
    """Consultation view: review patient history, complete appointment, and log treatment."""
    profile = DoctorProfile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        flash("No doctor profile found.", "warning")
        return redirect(url_for("doctor.doctor_dashboard"))

    appointment = Appointment.query.get_or_404(appointment_id)
    if appointment.doctor_id != profile.id:
        flash("This appointment is not assigned to you.", "danger")
        return redirect(url_for("doctor.doctor_dashboard"))

    past_treatments = (
        db.session.query(Treatment)
        .join(Appointment, Treatment.appointment_id == Appointment.id)
        .filter(Appointment.patient_id == appointment.patient_id)
        .order_by(Appointment.appointment_date.desc())
        .all()
    )

    form = TreatmentForm()

    if request.method == "GET" and appointment.treatment:
        form.diagnosis.data = appointment.treatment.diagnosis
        form.prescription.data = appointment.treatment.prescription
        form.notes.data = appointment.treatment.notes

    if form.validate_on_submit():
        appointment.status = AppointmentStatus.COMPLETED

        if appointment.treatment:
            appointment.treatment.diagnosis = form.diagnosis.data
            appointment.treatment.prescription = form.prescription.data
            appointment.treatment.notes = form.notes.data
        else:
            treatment = Treatment(
                appointment_id=appointment.id,
                diagnosis=form.diagnosis.data,
                prescription=form.prescription.data,
                notes=form.notes.data,
            )
            db.session.add(treatment)

        db.session.commit()
        flash("Consultation completed and treatment recorded.", "success")
        return redirect(url_for("doctor.doctor_dashboard"))

    return render_template(
        "doctor/consultation.html",
        appointment=appointment,
        form=form,
        past_treatments=past_treatments,
    )
