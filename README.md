# LifeLink AI — Connectivity-Aware Emergency Response & Remote Health Monitoring System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite%20%2B%20TS-61DAFB.svg?style=flat-square&logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

> **Tagline:** *Detect. Verify. Connect. Confirm.*

LifeLink AI is a customizable emergency-response and remote health-monitoring system designed for older adults living alone, individuals at high risk of falls, their families, caregivers, and community healthcare workers.

---

## 1. System Innovations & Core Architecture

1. **Biomechanical Sliding-Window Fall Detection**:
   Evaluates tri-axial acceleration ($a_x, a_y, a_z$) and angular velocity ($g_x, g_y, g_z$) to detect:
   - Freefall / weightlessness phase ($M < 0.55g$)
   - Sudden impact peak ($M > 2.8g$)
   - Post-impact stillness verification ($< 0.35$ standard deviation)
   - Patient-level cooldown window ($20s$) to suppress alert storms

2. **Deterministic Manual SOS Bypass**:
   Human distress takes absolute priority. Pressing the physical or simulated SOS button immediately triggers an emergency without waiting for fall classification.

3. **Connectivity-Aware Alert Routing**:
   - **ONLINE (WiFi / Ethernet Available)**: Dispatches real-time In-App WebSocket notifications and Internet Push (FCM adapter).
   - **INTERNET_DOWN (Cellular Modem Available)**: Automatically switches to Cellular SMS fallback using simulated/physical SIM800L AT commands.
   - **NO_NETWORK (Both Down)**: Stores the event in the wearable's local memory buffer and displays an alert in the operator console until network recovery flushes the queue.

4. **Multi-Tier Caregiver Escalation Protocol**:
   Tracks notification attempts separately from delivery and acknowledgement. If the primary caregiver does not acknowledge the alert within a configurable timeout (default 60s in demo mode), the system idempotently triggers notifications to the backup contact and marks the event as `ESCALATED`.

5. **Role-Based Access Control (RBAC)**:
   - **Administrator**: Global patient directory, system health, settings, telemetry ingestion, device provisioning.
   - **Caregiver**: Assigned patients only, emergency acknowledgement, countdown timers, response dispatching, resolution note compliance.
   - **Patient**: Personal wearable vitals, device status, instant manual SOS trigger.

---

## 2. Project Directory Structure

```
vishwakarma/
├── backend/
│   ├── routers/
│   │   ├── auth.py              # Login, token verification, demo switcher
│   │   ├── dashboard.py         # Summary metrics, vital trends, audit activity
│   │   ├── patients.py          # Directory, profile management, history
│   │   ├── devices.py           # Device provisioning & status
│   │   ├── events.py            # Emergency lifecycle (Ack, Respond, Resolve, Escalate)
│   │   ├── telemetry.py         # Sensor ingestion endpoint (Simulator & ESP32)
│   │   ├── simulation.py        # Scenario launcher & demo reset
│   │   ├── analytics.py         # Metrics, chart aggregations, CSV export
│   │   └── settings.py          # Escalation timeout & threshold controls
│   ├── config.py                # Pydantic BaseSettings & CORS
│   ├── database.py              # SQLAlchemy engine & SQLite session
│   ├── models.py                # Relational ORM models
│   ├── schemas.py               # Pydantic v2 schemas
│   ├── security.py              # Password hashing, JWT & RBAC dependencies
│   ├── fall_detector.py         # Biomechanical sliding-window engine
│   ├── notification_service.py  # Connectivity-aware router (Internet/SMS/Offline)
│   ├── escalation_worker.py     # Background worker checking unacknowledged timeouts
│   ├── simulation_service.py    # 1Hz continuous generator & deterministic scenarios
│   ├── seed_data.py             # Seed data (3 patients, 3 devices, 3 events)
│   ├── main.py                  # FastAPI entry point & WebSocket endpoint
│   ├── tests/
│   │   └── test_lifelink.py     # 16 automated pytest integration tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # Sidebar, Header, DemoLabModal
│   │   ├── context/             # AuthContext, AlertSoundContext (Web Audio API)
│   │   ├── pages/               # 10 Application Pages
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── PatientsPage.tsx
│   │   │   ├── PatientDetailPage.tsx
│   │   │   ├── LiveMonitoringPage.tsx
│   │   │   ├── EmergencyCenterPage.tsx
│   │   │   ├── CaregiverPage.tsx
│   │   │   ├── AnalyticsPage.tsx
│   │   │   ├── DevicesPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   └── LoginPage.tsx
│   │   ├── api.ts               # Type-safe API client
│   │   ├── types.ts             # TypeScript interfaces
│   │   ├── App.tsx              # React Router v6 layout
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.app.json
├── firmware/
│   ├── lifelink_esp32/
│   │   └── lifelink_esp32.ino   # Arduino C++ sketch for ESP32 + MPU6050 + SIM800L
│   └── README.md                # Wiring pinout, BOM & telemetry contract
├── docs/
│   ├── architecture.md          # Architecture tier diagram (Mermaid)
│   └── emergency_sequence.md    # Emergency lifecycle sequence diagram (Mermaid)
├── .env.example
├── pytest.ini
└── README.md
```

---

## 3. Quick Start Guide

### Prerequisites
- **Python 3.10+** (Tested on Python 3.14)
- **Node.js v18+** (Tested on Node v24)
- Git & modern web browser (Chrome, Edge, Firefox)

### Step 1: Backend Setup
```bash
# 1. Navigate to project root
cd vishwakarma

# 2. Activate Python virtual environment
.\backend\venv\Scripts\activate   # On Windows
# source backend/venv/bin/activate # On Linux/macOS

# 3. Start FastAPI dev server
uvicorn backend.main:app --reload --port 8000
```
- API will start at: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Step 2: Frontend Setup
```bash
# In a separate terminal
cd vishwakarma/frontend

# Install dependencies (if not already installed)
npm install

# Start Vite development server
npm run dev
```
- Web Application URL: `http://localhost:5173`

---

## 4. Demo Access & Credentials

The platform includes built-in 1-click role switching in both the Login Page and the sticky Header:

| Role | Name | Email | Password | Scope & Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | Dr. Sarah Patel | `admin@lifelink.ai` | `admin123` | Full access to all patients, device provisioning, global analytics, and algorithm sensitivity settings. |
| **Primary Caregiver** | Elena Davis, RN | `caregiver@lifelink.ai` | `caregiver123` | Assigned patients cohort, alert countdowns, emergency acknowledgement, and response logging. |
| **Backup Caregiver** | Marcus Vance | `backup@lifelink.ai` | `backup123` | Escalation recipient when primary caregiver is unresponsive. |
| **Patient** | Arthur King | `patient@lifelink.ai` | `patient123` | Self vitals monitoring, wearable connection status, manual SOS button. |

---

## 5. Running Demo Scenarios in the Demo Lab

Click the **"Demo Scenario Lab"** button in the header (or navigate to `/demo-lab`) to trigger deterministic scenarios:

1. **Simulate Sudden Fall**:
   Feeds a calibrated 3.92g impact with pre-fall weightlessness ($0.22g$) and post-impact stillness into the sliding window. Confirms fall detection, dispatches notifications, and triggers the audio alert chime.
2. **Trigger Manual SOS**:
   Simulates pressing the wearable's physical emergency button. Bypasses fall classification and immediately dispatches alerts.
3. **Normal Activity Gait**:
   Streams gentle walking motion ($1.00g \pm 0.15g$) to verify that routine activities do not cause false alarms.
4. **Simulate Internet Outage (Cellular Fallback)**:
   Drops device WiFi connectivity. Demonstrates that subsequent alerts route via the Cellular SMS adapter.
5. **Full Network Disconnection**:
   Simulates both Internet and Cellular loss. Alerts are safely stored in the wearable's offline queue.
6. **Restore Network Connectivity**:
   Brings connectivity back to ONLINE and drains queued offline alerts to the cloud.
7. **Low Battery Warning**:
   Drops battery to 11% to trigger proactive charging reminders.
8. **Reset Demo Data**:
   Resets SQLite database back to the clean initial competition presentation state.

---

## 6. Running Automated Tests

Run the full pytest suite covering all 16 required scenarios:
```bash
.\backend\venv\Scripts\python -m pytest -v
```
All tests pass, verifying:
- Dashboard metrics and summary
- Patient search and filtering
- Server-side RBAC restriction
- Normal walking vs. sudden fall classification
- Instant SOS classifier bypass
- Cooldown deduplication
- Caregiver acknowledgement and duplicate rejection
- 60-second escalation timeout and backup notification dispatch
- Acknowledgement before timeout preventing escalation
- Cellular SMS fallback and offline queueing
- Mandatory clinical resolution note validation
- Downloadable CSV export

---

## 7. Simulated Features vs. Physical Hardware Implementation

| Feature | In Demo Application | On Physical Hardware (ESP32) |
| :--- | :--- | :--- |
| **Fall Detection** | Real sliding-window algorithm running on simulated/real telemetry | Real onboard MPU-6050 reading via I2C |
| **Emergency SOS** | Simulated button & API endpoint | Real GPIO 14 active-low hardware interrupt push button |
| **Alert Routing** | Real state machine with mock SMS & in-app WebSocket | Real HTTP POST via WiFi + AT command SMS via SIM800L |
| **Escalation** | Real background asynchronous worker checking active SQLite records | Fully managed by LifeLink AI backend |
| **Vitals (HR/SpO2)**| Simulated realistic physiological signals for UI testing | Requires optional MAX30102 pulse oximeter module |
| **Location** | Simulated GPS coordinates with anchor tags | Requires optional NEO-6M GPS UART module |

---

## 8. Safety & Regulatory Disclaimers

> [!IMPORTANT]
> **Educational & Innovation Prototype Disclaimer**:
> LifeLink AI is developed solely for educational, research, and hackathon/competition presentation purposes. It is **not** a certified medical device (FDA / CE-IVD) and must not be used as the sole alert mechanism in life-threatening scenarios. No simulated measurement represents actual medical diagnosis.
