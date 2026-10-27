"""Email notification simulation service executed via FastAPI BackgroundTasks."""

import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

logger = logging.getLogger("hospital.email_service")

# In-memory delivery log to audit and verify dispatched background emails
SENT_EMAIL_CONFIRMATIONS: List[Dict[str, Any]] = []


def send_appointment_confirmation_email(
    patient_email: str,
    patient_name: str,
    doctor_name: str,
    department_name: Optional[str],
    appointment_id: int,
    appointment_datetime: datetime,
    duration_minutes: int,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Simulates sending an appointment confirmation email asynchronously.
    Designed for execution within FastAPI BackgroundTasks.
    """
    formatted_time = (
        appointment_datetime.strftime("%A, %B %d, %Y at %I:%M %p")
        if isinstance(appointment_datetime, datetime)
        else str(appointment_datetime)
    )
    dept_label = f" ({department_name})" if department_name else ""
    subject = f"Appointment Confirmed: #{appointment_id} with {doctor_name}{dept_label}"
    
    body = (
        f"Dear {patient_name},\n\n"
        f"Your appointment has been successfully scheduled!\n\n"
        f"Appointment Details:\n"
        f"  • Reference ID: #{appointment_id}\n"
        f"  • Consulting Physician: {doctor_name}{dept_label}\n"
        f"  • Date & Time: {formatted_time}\n"
        f"  • Duration: {duration_minutes} minutes\n"
        f"  • Clinical Notes: {notes or 'Standard consultation'}\n\n"
        f"Location: MediCare Hospital Campus, Main Consultation Wing\n"
        f"If you need to reschedule or cancel, please visit your patient portal.\n\n"
        f"Warm regards,\n"
        f"MediCare Hospital Management Team"
    )

    record: Dict[str, Any] = {
        "message_id": f"MSG-APPT-{appointment_id}-{int(datetime.now(timezone.utc).timestamp())}",
        "recipient_email": patient_email,
        "recipient_name": patient_name,
        "doctor_name": doctor_name,
        "department_name": department_name,
        "appointment_id": appointment_id,
        "appointment_datetime": appointment_datetime.isoformat() if isinstance(appointment_datetime, datetime) else str(appointment_datetime),
        "duration_minutes": duration_minutes,
        "subject": subject,
        "body": body,
        "status": "DELIVERED",
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }

    SENT_EMAIL_CONFIRMATIONS.append(record)

    logger.info(
        "📧 [BACKGROUND TASK] Dispatched appointment confirmation email to %s for Appointment #%d with %s",
        patient_email,
        appointment_id,
        doctor_name,
    )
    print(
        f"\n======================================================\n"
        f"📨 [BACKGROUND TASK: EMAIL CONFIRMATION DELIVERED]\n"
        f"To: {patient_name} <{patient_email}>\n"
        f"Subject: {subject}\n"
        f"Status: DELIVERED\n"
        f"------------------------------------------------------\n"
        f"{body}\n"
        f"======================================================\n"
    )

    return record


def get_sent_confirmation_emails() -> List[Dict[str, Any]]:
    """Retrieve all simulated background email confirmations."""
    return list(SENT_EMAIL_CONFIRMATIONS)


def clear_sent_confirmation_emails() -> None:
    """Clear delivery log (useful for testing)."""
    SENT_EMAIL_CONFIRMATIONS.clear()
