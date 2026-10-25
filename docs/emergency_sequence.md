# LifeLink AI — Emergency Response & Escalation Sequence

The following sequence diagram details the complete end-to-end lifecycle of an emergency event from sensor spike to caregiver acknowledgement, timeout escalation, and incident resolution.

---

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Wearable / Patient
    participant Engine as Detection Engine
    participant Backend as LifeLink API & DB
    participant Router as Notification Router
    participant Worker as Escalation Worker
    actor PrimaryCG as Primary Caregiver
    actor BackupCG as Backup Caregiver

    rect rgb(240, 245, 255)
    Note over Patient, Engine: Phase 1: Event Ingestion & Biomechanical Verification
    Patient->>Backend: POST /api/telemetry (ax=1.4, ay=1.8, az=3.2g, mag=3.92g)
    Backend->>Engine: process_sample(patient_id, accels, gyros)
    Engine->>Engine: Verify Freefall (<0.55g) + Impact (>2.8g) + Post-Impact Stillness
    Engine-->>Backend: is_fall=True, confidence=0.96, method=ACCEL_IMPACT_INACTIVITY
    end

    rect rgb(255, 243, 243)
    Note over Backend, Router: Phase 2: State Creation & Connectivity-Aware Routing
    Backend->>Backend: Create EmergencyEvent (Status: DETECTED, Severity: CRITICAL)
    Backend->>Router: send_emergency_notifications(event, role="PRIMARY_CAREGIVER")
    alt Device is ONLINE
        Router->>PrimaryCG: In-App WebSocket Alert + Internet Push Notification
        Router->>Backend: Create AlertAttempt (Status: DELIVERED, Channel: IN_APP/PUSH)
    else Device has INTERNET_DOWN
        Router->>PrimaryCG: Dispatches Cellular SMS via SIM800L Adapter
        Router->>Backend: Create AlertAttempt (Status: DELIVERED, Channel: CELLULAR_SMS)
    else Device has NO_NETWORK
        Router->>Backend: Create AlertAttempt (Status: QUEUED, Reason: Local buffer pending sync)
    end
    Backend->>Backend: Update EmergencyEvent (Status: NOTIFICATION_ATTEMPTED)
    end

    rect rgb(255, 250, 235)
    Note over Worker, BackupCG: Phase 3: Timeout Monitoring & Escalation Branch
    loop Every 2 seconds
        Worker->>Backend: Inspect active events where acknowledged_at is null
        alt Elapsed Time < Timeout (e.g., < 60s)
            Worker->>Worker: Continue countdown in dashboard
        else Elapsed Time >= Timeout (Primary Caregiver Unresponsive)
            Worker->>Backend: Mark Event Status = ESCALATED, record escalated_at
            Worker->>Router: send_emergency_notifications(event, role="BACKUP_CAREGIVER")
            Router->>BackupCG: Critical Alert dispatched to Backup Caregiver (Marcus Vance)
            Worker->>Backend: AuditEvent logged: ESCALATED_TO_BACKUP
        end
    end
    end

    rect rgb(235, 255, 245)
    Note over PrimaryCG, Backend: Phase 4: Caregiver Response & Incident Resolution
    PrimaryCG->>Backend: POST /api/events/{id}/acknowledge
    Backend->>Backend: Prevent duplicate ack. Set acknowledged_at = now, Status = ACKNOWLEDGED
    PrimaryCG->>Backend: POST /api/events/{id}/respond
    Backend->>Backend: Set responding_at = now, Status = RESPONDING
    PrimaryCG->>Backend: POST /api/events/{id}/contacted
    Backend->>Backend: Set patient_contacted_at = now
    PrimaryCG->>Backend: POST /api/events/{id}/resolve (with mandatory resolution note)
    Backend->>Backend: Set resolved_at = now, Status = RESOLVED, Note recorded
    Backend-->>PrimaryCG: Incident closed, timeline finalized, analytics updated
    end
```
