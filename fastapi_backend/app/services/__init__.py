"""Services package."""
from app.services.email_service import (
    send_appointment_confirmation_email,
    get_sent_confirmation_emails,
    clear_sent_confirmation_emails,
)

__all__ = [
    "send_appointment_confirmation_email",
    "get_sent_confirmation_emails",
    "clear_sent_confirmation_emails",
]
