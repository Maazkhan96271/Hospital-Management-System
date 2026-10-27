"""RESTful JSON API endpoints for appointments, patients, and doctor availability slots."""

from datetime import datetime, date, timedelta, time as dt_time
from flask import Blueprint, jsonify, request
from flask_login import login_required
from flask_app.models import (
    User,
    UserRole,
    Department,
    DoctorProfile,
    Appointment,
    AppointmentStatus,
)

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.route("/doctors/<int:doctor_id>/slots")
@api_bp.route("/doctors/<int:doctor_id>/availability")
def api_doctor_slots(doctor_id: int):
    """
    RESTful API endpoint returning available 7-day time slots for a specific doctor.
    Supports ?date=YYYY-MM-DD for single date query or ?start_date=YYYY-MM-DD for 7-day window.
    Calculates 30-minute intervals according to the doctor's weekly schedule and excludes
    slots with existing active appointments.
    """
    doc_profile = DoctorProfile.query.get_or_404(doctor_id)
    target_date_str = request.args.get("date")
    start_date_str = request.args.get("start_date")

    today = date.today()
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"status": "error", "message": "Invalid start_date format (YYYY-MM-DD required)"}), 400
    else:
        start_date = today

    schedule = doc_profile.parsed_availability

    def compute_slots_for_date(d: date):
        day_key = d.strftime("%A").lower()
        day_config = schedule.get(day_key, {})
        is_available = day_config.get("available", False)

        if not is_available:
            return {
                "date": d.strftime("%Y-%m-%d"),
                "day_name": d.strftime("%A"),
                "is_available": False,
                "working_hours": None,
                "available_slots": [],
                "booked_slots": [],
                "total_slots": 0,
                "available_count": 0,
            }

        start_str = day_config.get("start", "09:00")
        end_str = day_config.get("end", "17:00")

        try:
            sh, sm = map(int, start_str.split(":"))
            eh, em = map(int, end_str.split(":"))
        except (ValueError, TypeError):
            sh, sm, eh, em = 9, 0, 17, 0

        # Divide into 30-minute slots
        all_slots = []
        cur_dt = datetime.combine(d, dt_time(sh, sm))
        end_dt = datetime.combine(d, dt_time(eh, em))
        while cur_dt < end_dt:
            all_slots.append(cur_dt.strftime("%H:%M"))
            cur_dt += timedelta(minutes=30)

        # Cross-reference existing booked/completed appointments
        booked_appts = Appointment.query.filter(
            Appointment.doctor_id == doc_profile.id,
            Appointment.appointment_date == d,
            Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED]),
        ).all()
        booked_slots = [a.appointment_time.strftime("%H:%M") for a in booked_appts]

        available_slots = [slot for slot in all_slots if slot not in booked_slots]

        return {
            "date": d.strftime("%Y-%m-%d"),
            "day_name": d.strftime("%A"),
            "is_available": True,
            "working_hours": {"start": start_str, "end": end_str},
            "available_slots": available_slots,
            "booked_slots": booked_slots,
            "total_slots": len(all_slots),
            "available_count": len(available_slots),
        }

    # Single date query response
    if target_date_str:
        try:
            single_d = datetime.strptime(target_date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"status": "error", "message": "Invalid date format (YYYY-MM-DD required)"}), 400

        day_result = compute_slots_for_date(single_d)
        return jsonify({
            "status": "success",
            "doctor_id": doc_profile.id,
            "doctor_name": doc_profile.user.full_name if doc_profile.user else f"Doctor #{doc_profile.id}",
            "specialisation": doc_profile.specialisation or "General Medicine",
            "department": doc_profile.department.name if doc_profile.department else "General",
            **day_result,
        })

    # Full 7-day availability schedule
    days_data = []
    available_slots_by_date = {}
    for offset in range(7):
        d = start_date + timedelta(days=offset)
        day_res = compute_slots_for_date(d)
        days_data.append(day_res)
        available_slots_by_date[day_res["date"]] = day_res["available_slots"]

    return jsonify({
        "status": "success",
        "doctor_id": doc_profile.id,
        "doctor_name": doc_profile.user.full_name if doc_profile.user else f"Doctor #{doc_profile.id}",
        "specialisation": doc_profile.specialisation or "General Medicine",
        "department": doc_profile.department.name if doc_profile.department else "General",
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": (start_date + timedelta(days=6)).strftime("%Y-%m-%d"),
        "days": days_data,
        "available_slots_by_date": available_slots_by_date,
    })


@api_bp.route("/appointments-and-patients")
@login_required
def api_appointments_and_patients():
    """RESTful API endpoint returning JSON data for the total number of appointments and patients."""
    total_appointments = Appointment.query.count()
    total_patients = User.query.filter_by(role=UserRole.PATIENT).count()
    return jsonify({
        "total_appointments": total_appointments,
        "total_patients": total_patients,
    })


@api_bp.route("/stats")
@login_required
def api_stats():
    """RESTful API endpoint returning complete metrics for appointments, patients, and departments."""
    total_appointments = Appointment.query.count()
    total_patients = User.query.filter_by(role=UserRole.PATIENT).count()
    total_doctors = User.query.filter_by(role=UserRole.DOCTOR).count()
    total_departments = Department.query.count()

    status_counts = {
        "Scheduled": Appointment.query.filter_by(status=AppointmentStatus.SCHEDULED).count(),
        "Completed": Appointment.query.filter_by(status=AppointmentStatus.COMPLETED).count(),
        "Cancelled": Appointment.query.filter_by(status=AppointmentStatus.CANCELLED).count(),
        "No Show": Appointment.query.filter_by(status=AppointmentStatus.NO_SHOW).count(),
    }

    departments = Department.query.order_by(Department.name.asc()).all()
    dept_data = []
    for d in departments:
        count = (
            Appointment.query.join(DoctorProfile)
            .filter(DoctorProfile.department_id == d.id)
            .count()
        )
        dept_data.append({
            "department_id": d.id,
            "department": d.name,
            "appointment_count": count,
            "doctor_count": d.doctors.count(),
        })

    unassigned_count = (
        Appointment.query.join(DoctorProfile)
        .filter(DoctorProfile.department_id.is_(None))
        .count()
    )
    if unassigned_count > 0 or not dept_data:
        dept_data.append({
            "department_id": None,
            "department": "General / Unassigned",
            "appointment_count": unassigned_count,
            "doctor_count": DoctorProfile.query.filter(DoctorProfile.department_id.is_(None)).count(),
        })

    return jsonify({
        "status": "success",
        "total_appointments": total_appointments,
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "total_departments": total_departments,
        "appointments_by_status": status_counts,
        "appointments_by_department": dept_data,
    })
