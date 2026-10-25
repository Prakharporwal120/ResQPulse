# LifeLink AI — Architecture & System Design

LifeLink AI is a connectivity-aware emergency response and remote health monitoring system architected to guarantee rapid alert dissemination even under degraded network conditions.

---

## 1. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph "Tier 1: Data Ingestion & Edge Sensors"
        ESP32["ESP32 Physical Wearable<br/>(MPU6050 IMU + SOS Button)"]
        SIM["Sensor Simulation Engine<br/>(Normal, Sudden Fall, SOS, Outage)"]
    end

    subgraph "Tier 2: Ingestion & Biomechanical Analysis"
        API["FastAPI Telemetry Ingestion<br/>(/api/telemetry)"]
        ENGINE["Deterministic Fall Engine<br/>- Freefall (<0.55g)<br/>- Impact (>2.8g)<br/>- Gyro Rotation (>60 dps)<br/>- Post-impact Stillness<br/>- Cooldown Deduplication"]
        SOS_BYPASS["Manual SOS Bypass<br/>(Immediate Emergency Path)"]
    end

    subgraph "Tier 3: Emergency Orchestration & State Machine"
        STATE["Emergency Event Lifecycle<br/>DETECTED &rarr; NOTIFIED &rarr; ACKNOWLEDGED &rarr; RESPONDING &rarr; RESOLVED"]
        WORKER["Automated Escalation Worker<br/>(Background Timeout Check & Idempotent Escalation)"]
        ROUTER["Connectivity-Aware Notification Router"]
    end

    subgraph "Tier 4: Connectivity & Dispatch Adapters"
        INAPP["In-App Alert Channel<br/>(Realtime WebSocket)"]
        PUSH["Internet Push Adapter<br/>(FCM Mock Provider)"]
        SMS["Cellular SMS Adapter<br/>(SIM800L Cellular Modem)"]
        OFFLINE["Wearable Offline Queue<br/>(Pending Network Recovery)"]
    end

    subgraph "Tier 5: Healthcare Operator & Caregiver UI"
        DASH["Modern Healthcare SaaS Frontend<br/>(Vite + React + Tailwind + Recharts)"]
        ADMIN_VIEW["Administrator / Operator Center"]
        CG_VIEW["Primary & Backup Caregiver Portal"]
        PATIENT_VIEW["Patient Self-Monitoring View"]
    end

    ESP32 -->|WiFi HTTP POST| API
    SIM -->|Simulated Telemetry| API
    ESP32 -.->|No WiFi: Direct SMS| SMS

    API -->|Normal Telemetry| ENGINE
    API -->|is_sos_pressed=True| SOS_BYPASS

    ENGINE -->|Threshold Exceeded| STATE
    SOS_BYPASS -->|Instant Trigger| STATE

    STATE --> ROUTER
    WORKER -->|Timeout Exceeded| STATE

    ROUTER -->|Network: ONLINE| INAPP
    ROUTER -->|Network: ONLINE| PUSH
    ROUTER -->|Network: INTERNET_DOWN| SMS
    ROUTER -->|Network: NO_NETWORK| OFFLINE

    INAPP --> DASH
    PUSH --> DASH
    SMS --> DASH
    DASH --> ADMIN_VIEW
    DASH --> CG_VIEW
    DASH --> PATIENT_VIEW
```

---

## 2. Core Architectural Pillars

1. **Biomechanical Sliding Window Detection**:
   Rather than triggering false alarms on transient vibrations, the detection engine analyzes acceleration windows to verify the complete biomechanical trajectory of a fall (weightlessness phase, impact peak, orientation change, followed by stillness).

2. **Deduplication Cooldown**:
   A patient-level cooldown buffer prevents multiple alarms from flooding caregivers if repeated sensor spikes arrive during a single incident.

3. **Deterministic Manual SOS Bypass**:
   Human intent takes absolute priority. Pressing the physical or simulated SOS button immediately enters the emergency state machine, completely bypassing the heuristic fall classifier.

4. **Connectivity-Aware Routing Matrix**:
   - **ONLINE**: Dispatches high-speed internet push and updates in-app dashboard.
   - **INTERNET_DOWN**: Detects WiFi drop and automatically routes emergency dispatch to cellular SMS modem.
   - **NO_NETWORK**: Stores the alert in local wearable buffer, warning operators in the UI until network recovery flushes the queue.

5. **Automated Escalation Worker**:
   A persistent background supervisor tracks unacknowledged critical emergencies. If the primary caregiver does not acknowledge within the configured timeout (e.g., 60 seconds), the system idempotently triggers notifications to the assigned backup caregiver and marks the event as `ESCALATED`.
