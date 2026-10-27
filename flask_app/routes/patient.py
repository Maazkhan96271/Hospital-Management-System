"""Patient portal routes: dashboard, doctor discovery, booking with double-booking prevention, and history."""

from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from sqlalchemy import or_

from flask_app.extensions import db
from flask_app.models import (
    User,
    Department,
    DoctorProfile,
    Appointment,
    AppointmentStatus,
)
from flask_app.decorators import patient_required
from flask_app.forms import AppointmentBookingForm

patient_bp = Blueprint("patient", __name__, url_prefix="/patient")


@patient_bp.route("/dashboard")
@login_required
@patient_required
def patient_dashboard():
    """Patient dashboard with quick statistics and recent activity."""
    all_appts = (
        Appointment.query.filter_by(patient_id=current_user.id)
        .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc())
        .all()
    )

    upcoming = [a for a in all_appts if a.status == AppointmentStatus.SCHEDULED]
    completed = [a for a in all_appts if a.status == AppointmentStatus.COMPLETED]
    cancelled = [a for a in all_appts if a.status == AppointmentStatus.CANCELLED]

    total_departments = Department.query.count()
    total_doctors = DoctorProfile.query.join(User).filter(User.is_active == True).count()
    departments = Department.query.order_by(Department.name.asc()).all()

    return render_template(
        "patient/dashboard.html",
        appointments=all_appts,
        upcoming=upcoming,
        completed=completed,
        cancelled=cancelled,
        total_departments=total_departments,
        total_doctors=total_doctors,
        departments=departments,
    )


@patient_bp.route("/doctors")
@login_required
@patient_required
def patient_doctors():
    """View all medical departments and active doctors with 7-day availability and doctor search."""
    q = request.args.get("q", "").strip()
    departments = Department.query.order_by(Department.name.asc()).all()

    query = DoctorProfile.query.join(User).filter(User.is_active == True)
    if q:
        pattern = f"%{q}%"
        query = query.filter(
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                DoctorProfile.specialisation.ilike(pattern),
                DoctorProfile.qualification.ilike(pattern),
            )
        )

    all_doctors = query.order_by(User.first_name.asc()).all()
    unassigned_doctors = [d for d in all_doctors if d.department_id is None]

    return render_template(
        "patient/doctors.html",
        departments=departments,
        unassigned_doctors=unassigned_doctors,
        all_doctors=all_doctors,
        search_query=q,
    )


@patient_bp.route("/appointments/book", methods=["GET", "POST"])
@login_required
@patient_required
def patient_book_appointment():
    """Appointment booking engine with strict database validation against double-booking."""
    form = AppointmentBookingForm()

    active_doctors = (
        DoctorProfile.query.join(User)
        .filter(User.is_active == True)
        .order_by(User.first_name.asc(), User.last_name.asc())
        .all()
    )

    form.doctor_id.choices = [
        (
            doc.id,
            f"Dr. {doc.user.full_name} — {doc.specialisation or 'General Medicine'} "
            f"({doc.department.name if doc.department else 'General'})",
        )
        for doc in active_doctors
    ]

    preselected_id = request.args.get("doctor_id", type=int)
    if request.method == "GET" and preselected_id:
        valid_ids = [d.id for d in active_doctors]
        if preselected_id in valid_ids:
            form.doctor_id.data = preselected_id

    selected_doctor_info = None
    current_selection_id = form.doctor_id.data or preselected_id
    if current_selection_id:
        selected_doctor_info = db.session.get(DoctorProfile, current_selection_id)

    if form.validate_on_submit():
        doctor_profile = db.session.get(DoctorProfile, form.doctor_id.data)

        if not doctor_profile or not doctor_profile.user or not doctor_profile.user.is_active:
            form.doctor_id.errors.append("Selected doctor is currently unavailable.")
        else:
            has_error = False

            # 1. Strict double-booking check:
            doctor_conflict = Appointment.query.filter(
                Appointment.doctor_id == doctor_profile.id,
                Appointment.appointment_date == form.appointment_date.data,
                Appointment.appointment_time == form.appointment_time.data,
                Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED]),
            ).first()

            if doctor_conflict:
                has_error = True
                conflict_time_str = form.appointment_time.data.strftime("%H:%M")
                conflict_date_str = form.appointment_date.data.strftime("%Y-%m-%d")
                error_message = (
                    f"Double-Booking Conflict: Dr. {doctor_profile.user.full_name} is already booked "
                    f"on {conflict_date_str} at {conflict_time_str}. Please select another time or doctor."
                )
                form.appointment_time.errors.append(error_message)
                flash(error_message, "danger")

            # 2. Patient conflict check:
            patient_conflict = Appointment.query.filter(
                Appointment.patient_id == current_user.id,
                Appointment.appointment_date == form.appointment_date.data,
                Appointment.appointment_time == form.appointment_time.data,
                Appointment.status.in_([AppointmentStatus.SCHEDULED]),
            ).first()

            if patient_conflict:
                has_error = True
                patient_err = (
                    f"You already have another appointment scheduled on "
                    f"{form.appointment_date.data.strftime('%Y-%m-%d')} at "
                    f"{form.appointment_time.data.strftime('%H:%M')}."
                )
                form.appointment_time.errors.append(patient_err)
                flash(patient_err, "danger")

            # 3. Doctor weekly 7-day schedule check:
            weekday_keys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            day_name = weekday_keys[form.appointment_date.data.weekday()]
            sched = doctor_profile.parsed_availability
            if sched and day_name in sched:
                day_sched = sched[day_name]
                if not day_sched.get("available", False):
                    has_error = True
                    sched_err = (
                        f"Dr. {doctor_profile.user.full_name} is marked as unavailable on "
                        f"{day_name.capitalize()}s according to their weekly schedule."
                    )
                    form.appointment_date.errors.append(sched_err)
                    flash(sched_err, "warning")

            if not has_error:
                appointment = Appointment(
                    patient_id=current_user.id,
                    doctor_id=doctor_profile.id,
                    appointment_date=form.appointment_date.data,
                    appointment_time=form.appointment_time.data,
                    reason=form.reason.data,
                    status=AppointmentStatus.SCHEDULED,
                )
                db.session.add(appointment)
                db.session.commit()
                flash(
                    f"Appointment successfully booked with Dr. {doctor_profile.user.full_name} for "
                    f"{appointment.appointment_date.strftime('%A, %b %d, %Y')} at "
                    f"{appointment.appointment_time.strftime('%I:%M %p')}!",
                    "success",
                )
                return redirect(url_for("patient.patient_appointments"))

    return render_template(
        "patient/book_appointment.html",
        form=form,
        active_doctors=active_doctors,
        selected_doctor_info=selected_doctor_info,
    )


@patient_bp.route("/appointments")
@login_required
@patient_required
def patient_appointments():
    """View all patient appointments, dynamic statuses, and treatment records."""
    appointments = (
        Appointment.query.filter_by(patient_id=current_user.id)
        .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc())
        .all()
    )
    return render_template("patient/appointments.html", appointments=appointments)


@patient_bp.route("/appointments/<int:appointment_id>")
@login_required
@patient_required
def patient_appointment_detail(appointment_id):
    """Detailed view for a specific appointment and its treatment record."""
    appointment = Appointment.query.get_or_404(appointment_id)
    if appointment.patient_id != current_user.id:
        flash("You do not have permission to view this appointment.", "danger")
        return redirect(url_for("patient.patient_appointments"))

    return render_template(
        "patient/appointment_detail.html",
        appointment=appointment,
    )


@patient_bp.route("/appointments/<int:appointment_id>/cancel", methods=["POST"])
@login_required
@patient_required
def patient_cancel_appointment(appointment_id):
    """Cancel an upcoming scheduled appointment."""
    appointment = Appointment.query.get_or_404(appointment_id)
    if appointment.patient_id != current_user.id:
        flash("You do not have permission to modify this appointment.", "danger")
        return redirect(url_for("patient.patient_appointments"))

    if appointment.status == AppointmentStatus.SCHEDULED:
        appointment.status = AppointmentStatus.CANCELLED
        db.session.commit()
        flash(f"Appointment #{appointment.id} has been successfully cancelled.", "info")
    else:
        flash("Only scheduled appointments can be cancelled.", "warning")

    return redirect(url_for("patient.patient_appointments"))
