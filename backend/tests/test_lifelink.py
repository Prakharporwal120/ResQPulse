import pytest
import datetime
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal, Base, engine
from backend.models import User, Patient, Device, EmergencyEvent, AlertAttempt, SystemSetting, AuditEvent
from backend.fall_detector import fall_engine
from backend.simulation_service import simulation_service
from backend.escalation_worker import escalation_worker
from backend.seed_data import seed_database

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db, force=True)
    db.close()
    yield

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def admin_headers():
    return {"X-Demo-Role": "ADMIN"}

@pytest.fixture
def caregiver_headers():
    return {"X-Demo-Role": "CAREGIVER"}

@pytest.fixture
def patient_headers():
    return {"X-Demo-Role": "PATIENT"}

# Test 1: Dashboard loads successfully
def test_dashboard_summary_loads(client, admin_headers):
    response = client.get("/api/dashboard/summary", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_patients"] >= 3
    assert "active_emergencies" in data
    assert data["environment"] == "SIMULATED DEMO"

# Test 2: Patient list loads and supports search
def test_patient_list_and_search(client, admin_headers):
    response = client.get("/api/patients", headers=admin_headers)
    assert response.status_code == 200
    patients = response.json()
    assert len(patients) >= 3

    # Search by name
    res_search = client.get("/api/patients?search=Arthur", headers=admin_headers)
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert len(search_data) >= 1
    assert "Arthur" in search_data[0]["display_name"]

# Test 3: Role-based access control restricts unauthorized users
def test_rbac_patient_cannot_create_patient(client, patient_headers):
    new_patient = {
        "patient_code": "PAT-999",
        "display_name": "Unauthorized Test Patient"
    }
    # Patient role is forbidden from registering new patients
    response = client.post("/api/patients", json=new_patient, headers=patient_headers)
    assert response.status_code == 403

# Test 4: Ingest simulated telemetry
def test_telemetry_ingestion(client):
    payload = {
        "device_code": "LL-BAND-001",
        "ax": 0.05,
        "ay": 0.08,
        "az": 0.99,
        "gx": 2.0,
        "gy": 1.5,
        "gz": 0.5,
        "heart_rate": 72.0,
        "spo2": 98.0,
        "battery_level": 84,
        "connectivity_status": "ONLINE",
        "source_type": "SIMULATED",
        "is_sos_pressed": False
    }
    response = client.post("/api/telemetry", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "ingested"
    assert data["device_code"] == "LL-BAND-001"
    assert data["magnitude_g"] >= 0.9

# Test 5: Normal movement does NOT automatically create a fall event
def test_normal_movement_no_fall():
    fall_engine._patient_buffers[1] = []
    # 5 samples of gentle walking (magnitude ~ 1.0g)
    for _ in range(5):
        is_fall, method, conf, evidence = fall_engine.process_sample(
            patient_id=1,
            ax=0.08, ay=0.12, az=0.98,
            gx=10.0, gy=5.0, gz=2.0
        )
        assert is_fall is False
        assert method in ["NORMAL_ACTIVITY", "INSUFFICIENT_DATA"]

# Test 6: A configured fall scenario creates the expected event
def test_configured_fall_scenario(client, admin_headers):
    response = client.post(
        "/api/simulation/scenario",
        json={"scenario": "sudden_fall", "patient_id": 1},
        headers=admin_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "CRITICAL FALL DETECTED" in data["outcome"]
    assert "event_id" in data

    # Verify event persisted in database
    event_id = data["event_id"]
    event_res = client.get(f"/api/events/{event_id}", headers=admin_headers)
    assert event_res.status_code == 200
    ev = event_res.json()
    assert ev["event_type"] == "FALL_DETECTED"
    assert ev["severity"] == "CRITICAL"
    assert len(ev["alert_attempts"]) >= 1

# Test 7: Manual SOS creates an emergency event immediately without waiting for fall classification
def test_manual_sos_immediate_bypass(client, admin_headers):
    response = client.post(
        "/api/simulation/scenario",
        json={"scenario": "manual_sos", "patient_id": 2},
        headers=admin_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "MANUAL SOS" in data["outcome"]
    
    event_id = data["event_id"]
    event_res = client.get(f"/api/events/{event_id}", headers=admin_headers)
    ev = event_res.json()
    assert ev["event_type"] == "MANUAL_SOS"
    assert ev["detection_method"] == "MANUAL_TRIGGER"
    assert ev["confidence"] == 1.0

# Test 8: Deduplication cooldown prevents repeated alerts
def test_cooldown_deduplication():
    now = datetime.datetime.utcnow()
    # First fall trigger records timestamp
    fall_engine.record_event_trigger(patient_id=99, current_time=now)
    assert fall_engine.is_in_cooldown(patient_id=99, current_time=now + datetime.timedelta(seconds=5)) is True
    
    # Second immediate sample within cooldown window
    is_fall, method, conf, evidence = fall_engine.process_sample(
        patient_id=99, ax=1.5, ay=2.0, az=3.5, timestamp=now + datetime.timedelta(seconds=5)
    )
    assert is_fall is False
    assert method == "COOLDOWN_ACTIVE"

# Test 9 & 10: Caregiver acknowledges alert, updates status and audit log
def test_caregiver_acknowledgement(client, caregiver_headers):
    # Trigger a test alert
    test_alert = client.post(
        "/api/events/test",
        json={"patient_id": 1, "event_type": "FALL_DETECTED", "severity": "CRITICAL"},
        headers=caregiver_headers
    ).json()
    event_id = test_alert["id"]

    # Caregiver acknowledges
    ack_res = client.post(
        f"/api/events/{event_id}/acknowledge",
        json={"caregiver_name": "Elena Davis, RN", "note": "Acknowledged alert, assessing patient"},
        headers=caregiver_headers
    )
    assert ack_res.status_code == 200
    ev = ack_res.json()
    assert ev["event_status"] == "ACKNOWLEDGED"
    assert ev["acknowledged_by"] == "Elena Davis, RN"
    assert ev["acknowledged_at"] is not None

    # Duplicate acknowledgement is rejected
    dup_ack = client.post(
        f"/api/events/{event_id}/acknowledge",
        headers=caregiver_headers
    )
    assert dup_ack.status_code == 400

# Test 11: Escalation worker escalates when timeout expires
def test_escalation_on_timeout():
    db = SessionLocal()
    try:
        now = datetime.datetime.utcnow()
        # Create an unacknowledged event created 90s ago (timeout is 60s)
        old_time = now - datetime.timedelta(seconds=90)
        event = EmergencyEvent(
            patient_id=1,
            event_type="FALL_DETECTED",
            event_status="NOTIFICATION_ATTEMPTED",
            severity="CRITICAL",
            detection_method="ACCEL_IMPACT_INACTIVITY",
            created_at=old_time
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        # Trigger worker check
        escalated = escalation_worker.check_and_escalate_events(db)
        assert any(e.id == event.id for e in escalated)

        # Verify escalated state
        db.refresh(event)
        assert event.event_status == "ESCALATED"
        assert event.escalated_at is not None

        # Verify backup caregiver notification was queued/sent
        backup_attempt = db.query(AlertAttempt).filter(
            AlertAttempt.event_id == event.id,
            AlertAttempt.recipient_role == "BACKUP_CAREGIVER"
        ).first()
        assert backup_attempt is not None
    finally:
        db.close()

# Test 12: Acknowledgement before timeout prevents escalation
def test_acknowledgement_prevents_escalation():
    db = SessionLocal()
    try:
        now = datetime.datetime.utcnow()
        event = EmergencyEvent(
            patient_id=1,
            event_type="FALL_DETECTED",
            event_status="ACKNOWLEDGED",
            severity="CRITICAL",
            detection_method="ACCEL_IMPACT_INACTIVITY",
            created_at=now - datetime.timedelta(seconds=90),
            acknowledged_at=now - datetime.timedelta(seconds=40),
            acknowledged_by="Elena Davis, RN"
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        escalated = escalation_worker.check_and_escalate_events(db)
        assert not any(e.id == event.id for e in escalated)
        assert event.event_status == "ACKNOWLEDGED"
        assert event.escalated_at is None
    finally:
        db.close()

# Test 13 & 14: Cellular SMS fallback and offline queuing under network interruption
def test_connectivity_aware_routing(client, admin_headers):
    # Simulate Internet Down scenario
    res = client.post("/api/simulation/scenario", json={"scenario": "internet_down", "patient_id": 1}, headers=admin_headers)
    assert res.status_code == 200

    # Ingest event while Internet is down -> must use Cellular SMS fallback
    db = SessionLocal()
    try:
        p1 = db.query(Patient).filter(Patient.id == 1).first()
        ev = EmergencyEvent(
            patient_id=p1.id,
            event_type="MANUAL_SOS",
            event_status="DETECTED",
            severity="CRITICAL",
            detection_method="MANUAL_TRIGGER",
            created_at=datetime.datetime.utcnow()
        )
        db.add(ev)
        db.commit()
        db.refresh(ev)

        from backend.notification_service import notification_service
        attempts = notification_service.send_emergency_notifications(db, ev, "PRIMARY_CAREGIVER")
        channels = [a.channel for a in attempts]
        assert "CELLULAR_SMS" in channels

        # Now simulate complete network outage (NO_NETWORK)
        dev = db.query(Device).filter(Device.patient_id == 1).first()
        dev.connectivity_status = "NO_NETWORK"
        db.commit()

        ev_offline = EmergencyEvent(
            patient_id=p1.id,
            event_type="FALL_DETECTED",
            event_status="DETECTED",
            severity="CRITICAL",
            detection_method="ACCEL_IMPACT_INACTIVITY",
            created_at=datetime.datetime.utcnow()
        )
        db.add(ev_offline)
        db.commit()
        db.refresh(ev_offline)

        offline_attempts = notification_service.send_emergency_notifications(db, ev_offline, "PRIMARY_CAREGIVER")
        queued_att = [a for a in offline_attempts if a.attempt_status == "QUEUED"]
        assert len(queued_att) >= 1

        # Restore network
        res_restore = client.post("/api/simulation/scenario", json={"scenario": "restore_network", "patient_id": 1}, headers=admin_headers)
        assert "CONNECTIVITY RESTORED" in res_restore.json()["outcome"]
    finally:
        db.close()

# Test 15: CSV export works for authorized users
def test_csv_export(client, admin_headers):
    response = client.get("/api/analytics/export.csv", headers=admin_headers)
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    content = response.text
    assert "Event ID" in content
    assert "Patient Name" in content
    assert "Detection Method" in content

# Test 16: Resolution requires a note explaining action taken
def test_resolution_requires_note(client, caregiver_headers):
    # Trigger an alert
    alert = client.post(
        "/api/events/test",
        json={"patient_id": 1, "event_type": "FALL_DETECTED", "severity": "HIGH"},
        headers=caregiver_headers
    ).json()

    # Empty resolution note should fail validation
    bad_res = client.post(
        f"/api/events/{alert['id']}/resolve",
        json={"resolution_note": ""},
        headers=caregiver_headers
    )
    assert bad_res.status_code == 422 # Unprocessable Entity / validation error

    # Valid resolution note succeeds
    good_res = client.post(
        f"/api/events/{alert['id']}/resolve",
        json={"resolution_note": "Patient checked by on-duty nurse. No injuries found."},
        headers=caregiver_headers
    )
    assert good_res.status_code == 200
    assert good_res.json()["event_status"] == "RESOLVED"
    assert good_res.json()["resolution_note"] == "Patient checked by on-duty nurse. No injuries found."
