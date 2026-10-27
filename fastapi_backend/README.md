# Modern FastAPI Backend for Hospital Management System

A high-performance asynchronous RESTful API for a Hospital Management System built with **FastAPI**, **PostgreSQL**, **SQLAlchemy 2.0 (async)**, **Alembic**, and **JWT Authentication** with role-based access control (Admin, Doctor, Patient).

---

## 🚀 Features

- **Asynchronous Architecture**: Fully async database interactions with `asyncpg` and SQLAlchemy 2.0 `async_engine`.
- **Relational Models with Strict Constraints**:
  - `User`: Base auth table for all roles with unique constraints, bcrypt password hashing, and composite indexing.
  - `Role`: System roles (`Admin`, `Doctor`, `Patient`).
  - `Department`: Medical units (`id`, `name`, `description`).
  - `DoctorProfile`: Linked to User & Department, storing a 7-day schedule in a **JSONB** column.
  - `Appointment`: Patient ID, Doctor ID, datetime, duration, and status (`Booked`, `Completed`, `Cancelled`) with compound indexing for double-booking conflict prevention.
  - `TreatmentRecord`: Appointment ID, diagnosis, **prescription array** (`ARRAY(String)`), and detailed clinical notes.
- **Secure JWT Authentication**:
  - Access tokens generated using HMAC-SHA256 (`HS256`).
  - Role-based dependencies (`get_current_admin`, `get_current_doctor`, `get_current_patient`).
- **Interactive Documentation**: Automatic Swagger UI at `/docs` and ReDoc at `/redoc`.
- **Database Migrations**: Pre-configured **Alembic** migration environment for schema versioning.

---

## 📂 Project Structure

```
fastapi_backend/
├── alembic.ini                   # Alembic configuration
├── alembic/
│   ├── env.py                   # Async migration environment
│   ├── script.py.mako           # Migration template
│   └── versions/
│       └── 0001_initial_models.py # Initial database schema
├── app/
│   ├── main.py                  # FastAPI application & lifespan events
│   ├── core/
│   │   ├── config.py            # Pydantic Settings & environment variables
│   │   ├── database.py          # Async engine, sessionmaker & Base
│   │   └── security.py          # Bcrypt hashing & JWT token encoding/decoding
│   ├── models/
│   │   ├── role.py              # Role model (Admin, Doctor, Patient)
│   │   ├── user.py              # User base authentication table
│   │   ├── department.py        # Medical departments
│   │   ├── doctor_profile.py    # DoctorProfile with JSONB availability
│   │   ├── appointment.py       # Appointment with compound indexes
│   │   └── treatment_record.py  # TreatmentRecord with prescription array
│   ├── schemas/
│   │   ├── auth.py              # JWT token and login schemas
│   │   ├── user.py              # User request & response models
│   │   ├── department.py        # Department models
│   │   ├── doctor.py            # Doctor & Weekly schedule models
│   │   ├── appointment.py       # Booking & status schemas
│   │   └── treatment.py         # Treatment & prescription models
│   └── api/
│       ├── dependencies.py      # get_current_user, get_current_admin, get_current_doctor
│       └── routers/
│           ├── auth.py          # Login, Registration, /me
│           ├── users.py         # User management & Doctor creation (Admin)
│           ├── departments.py   # Department management
│           ├── doctors.py       # Doctor directory & schedule updates
│           ├── appointments.py  # Appointment booking & conflict prevention
│           └── treatments.py    # Consultation treatment & prescription array
├── requirements.txt
├── .env.example
└── README.md
```

---

## 🛠️ Setup & Running

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure your PostgreSQL database credentials:

```bash
cp .env.example .env
```

```ini
DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/hms_fastapi"
SECRET_KEY="your-64-character-hex-secret-key"
```

### 3. Run Database Migrations (Alembic)

```bash
alembic upgrade head
```

### 4. Start the FastAPI Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 📖 Interactive Swagger UI & OpenAPI

Once the server is running, navigate to:

- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **OpenAPI JSON Spec:** [http://localhost:8000/api/v1/openapi.json](http://localhost:8000/api/v1/openapi.json)

Click the **Authorize** button in Swagger UI to log in using the initial seeded Admin credentials (`admin` / `Admin@123`) or register a new Patient account.

---

## 📅 Appointment Booking Engine API

### 1. Doctor Slot Availability (`GET /api/doctors/{id}/slots?date=YYYY-MM-DD`)
Reads the doctor's JSONB availability schedule, divides working hours into 30-minute intervals, and cross-references the Appointment table to remove occupied (Booked, Completed, or Cancelled) slots:

```bash
curl -X GET "http://localhost:8000/api/doctors/1/slots?date=2026-11-02"
```

Response:
```json
["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]
```

### 2. Patient Appointment Booking with Race Condition Locks (`POST /api/appointments`)
Uses PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) on the doctor profile and slot query to serialize concurrent booking requests at the exact same millisecond:

```bash
curl -X POST "http://localhost:8000/api/appointments" \
  -H "Authorization: Bearer <PATIENT_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor_id": 1,
    "date": "2026-11-02",
    "time": "09:30",
    "duration_minutes": 30,
    "notes": "Cardiac follow-up"
  }'
```

### 3. Doctor Daily Agenda (`GET /api/doctors/me/agenda?date=YYYY-MM-DD`)
Allows an attending physician to retrieve their daily schedule with patient details and counts:

```bash
curl -X GET "http://localhost:8000/api/doctors/me/agenda?date=2026-11-02" \
  -H "Authorization: Bearer <DOCTOR_JWT>"
```

### 4. Complete Appointment with TreatmentRecord (`POST /api/appointments/{id}/complete`)
Transitions appointment status to `Completed` and attaches clinical diagnosis, prescription array, and consultation notes:

```bash
curl -X POST "http://localhost:8000/api/appointments/1/complete" \
  -H "Authorization: Bearer <DOCTOR_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "diagnosis": "Mild Essential Hypertension - Stage 1",
    "prescription": ["Amlodipine 5mg once daily", "Lifestyle changes"],
    "detailed_notes": "Patient advised to track morning BP."
  }'
```

---

## 🧪 Automated Testing

Execute the complete asynchronous backend test suite:

```bash
python3 -m pytest fastapi_backend/tests/test_fastapi_backend.py -v
```
