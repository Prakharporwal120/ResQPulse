import datetime
import math
import random
from sqlalchemy.orm import Session
from backend.models import (
    User, Patient, Device, SensorReading, EmergencyEvent,
    AlertAttempt, CaregiverAssignment, AuditEvent, SystemSetting
)
from backend.security import get_password_hash

def seed_database(db: Session, force: bool = False):
    """
    Seeds comprehensive synthetic demo data suitable for live innovation competition presentation.
    Never uses real patient information.
    """
    if not force and db.query(User).first():
        # Already seeded
        return

    # Clear existing if force reset requested
    if force:
        db.query(AlertAttempt).delete()
        db.query(EmergencyEvent).delete()
        db.query(SensorReading).delete()
        db.query(CaregiverAssignment).delete()
        db.query(Device).delete()
        db.query(Patient).delete()
        db.query(AuditEvent).delete()
        db.query(SystemSetting).delete()
        db.query(User).delete()
        db.commit()

    now = datetime.datetime.utcnow()

    # 1. System Settings
    settings_data = [
        ("escalation_timeout_seconds", "60", "Seconds before unacknowledged alert escalates to backup caregiver"),
        ("fall_accel_threshold", "2.8", "Impact acceleration magnitude in g required to flag suspected fall"),
        ("free_fall_threshold", "0.55", "Low-g weightlessness acceleration threshold in g"),
        ("inactivity_time_window", "2.5", "Seconds of low movement required after impact"),
        ("cooldown_seconds", "20", "Patient alert deduplication cooldown in seconds"),
        ("environment_mode", "SIMULATED", "Environment label: DEMO, SIMULATED, or CONNECTED_TO_HARDWARE")
    ]
    for k, v, desc in settings_data:
        db.add(SystemSetting(key=k, value=v, description=desc, updated_at=now))

    # 2. Users (3 Roles: Admin, Caregivers, Patient)
    admin_user = User(
        name="Dr. Sarah Patel",
        email="admin@lifelink.ai",
        password_hash=get_password_hash("admin123"),
        role="ADMIN",
        phone="+1-555-0101",
        is_active=True,
        created_at=now - datetime.timedelta(days=30)
    )
    primary_caregiver = User(
        name="Elena Davis, RN",
        email="caregiver@lifelink.ai",
        password_hash=get_password_hash("caregiver123"),
        role="CAREGIVER",
        phone="+1-555-0142",
        is_active=True,
        created_at=now - datetime.timedelta(days=20)
    )
    backup_caregiver = User(
        name="Marcus Vance",
        email="backup@lifelink.ai",
        password_hash=get_password_hash("backup123"),
        role="CAREGIVER",
        phone="+1-555-0199",
        is_active=True,
        created_at=now - datetime.timedelta(days=15)
    )
    patient_user = User(
        name="Arthur King",
        email="patient@lifelink.ai",
        password_hash=get_password_hash("patient123"),
        role="PATIENT",
        phone="+1-555-0177",
        is_active=True,
        created_at=now - datetime.timedelta(days=10)
    )
    db.add_all([admin_user, primary_caregiver, backup_caregiver, patient_user])
    db.commit()

    # 3. Synthetic Patients
    p1 = Patient(
        patient_code="PAT-101",
        display_name="Arthur King",
        age=78,
        gender="Male",
        medical_notes="History of mild balance loss, osteoarthritis in right knee. Ambulatory with cane.",
        emergency_contact_name="Grace King (Daughter)",
        emergency_contact_phone="+1-555-0188",
        room_or_address="Apt 4B, Sunflower Senior Residence, Springfield",
        user_id=patient_user.id,
        is_active=True,
        created_at=now - datetime.timedelta(days=10)
    )
    p2 = Patient(
        patient_code="PAT-102",
        display_name="Beatrice Moreno",
        age=84,
        gender="Female",
        medical_notes="Hypertension, previous hip replacement in 2024. Uses walker for outdoor walks.",
        emergency_contact_name="Carlos Moreno (Son)",
        emergency_contact_phone="+1-555-0211",
        room_or_address="Room 112, Golden Oaks Community",
        is_active=True,
        created_at=now - datetime.timedelta(days=12)
    )
    p3 = Patient(
        patient_code="PAT-103",
        display_name="David Chen",
        age=72,
        gender="Male",
        medical_notes="Arrhythmia management, high risk of nocturnal dizziness upon standing.",
        emergency_contact_name="Lin Chen (Spouse)",
        emergency_contact_phone="+1-555-0344",
        room_or_address="14 Pinecrest Way, Springfield",
        is_active=True,
        created_at=now - datetime.timedelta(days=8)
    )
    db.add_all([p1, p2, p3])
    db.commit()

    # 4. Caregiver Assignments (Primary & Backup)
    # Patient 1: Elena (Primary), Marcus (Backup)
    # Patient 2: Elena (Primary), Marcus (Backup)
    # Patient 3: Marcus (Primary), Elena (Backup)
    assignments = [
        CaregiverAssignment(patient_id=p1.id, caregiver_id=primary_caregiver.id, priority=1, is_active=True),
        CaregiverAssignment(patient_id=p1.id, caregiver_id=backup_caregiver.id, priority=2, is_active=True),
        CaregiverAssignment(patient_id=p2.id, caregiver_id=primary_caregiver.id, priority=1, is_active=True),
        CaregiverAssignment(patient_id=p2.id, caregiver_id=backup_caregiver.id, priority=2, is_active=True),
        CaregiverAssignment(patient_id=p3.id, caregiver_id=backup_caregiver.id, priority=1, is_active=True),
        CaregiverAssignment(patient_id=p3.id, caregiver_id=primary_caregiver.id, priority=2, is_active=True),
    ]
    db.add_all(assignments)
    db.commit()

    # 5. Devices
    d1 = Device(
        device_code="LL-BAND-001",
        patient_id=p1.id,
        device_type="WEARABLE_BAND",
        source_type="SIMULATED",
        firmware_version="v1.4.2-sim",
        battery_level=86,
        connectivity_status="ONLINE",
        cellular_signal=4,
        last_seen_at=now,
        created_at=now - datetime.timedelta(days=10)
    )
    d2 = Device(
        device_code="LL-PEND-002",
        patient_id=p2.id,
        device_type="PENDANT",
        source_type="SIMULATED",
        firmware_version="v1.4.0-sim",
        battery_level=18,  # Low battery demonstration
        connectivity_status="ONLINE",
        cellular_signal=3,
        last_seen_at=now - datetime.timedelta(minutes=2),
        created_at=now - datetime.timedelta(days=12)
    )
    d3 = Device(
        device_code="LL-WATCH-003",
        patient_id=p3.id,
        device_type="WATCH",
        source_type="SIMULATED",
        firmware_version="v1.4.1-sim",
        battery_level=64,
        connectivity_status="ONLINE",
        cellular_signal=5,
        last_seen_at=now - datetime.timedelta(seconds=45),
        created_at=now - datetime.timedelta(days=8)
    )
    db.add_all([d1, d2, d3])
    db.commit()

    # 6. Historical Sensor Readings (Last 20 readings for each patient)
    for p, d, base_hr in [(p1, d1, 72), (p2, d2, 78), (p3, d3, 68)]:
        for i in range(25):
            t = now - datetime.timedelta(seconds=(25 - i) * 3)
            ax = round(0.04 * math.sin(i * 0.4) + random.uniform(-0.02, 0.02), 3)
            ay = round(0.05 * math.cos(i * 0.4) + random.uniform(-0.02, 0.02), 3)
            az = round(0.98 + 0.03 * math.sin(i * 0.6), 3)
            mag = round(math.sqrt(ax**2 + ay**2 + az**2), 3)
            hr = round(base_hr + 3 * math.sin(i * 0.2) + random.uniform(-1, 1), 1)
            spo2 = round(98.2 + random.uniform(-0.4, 0.4), 1)
            
            db.add(SensorReading(
                device_id=d.id,
                patient_id=p.id,
                sensor_type="COMPOSITE",
                ax=ax, ay=ay, az=az,
                magnitude=mag,
                gx=round(random.uniform(-4, 4), 1),
                gy=round(random.uniform(-4, 4), 1),
                gz=round(random.uniform(-4, 4), 1),
                heart_rate=hr,
                spo2=spo2,
                source_type="SIMULATED",
                recorded_at=t,
                received_at=t
            ))
    db.commit()

    # 7. Seed Emergency Events (Per spec: 1 resolved historical, 1 acknowledged, 1 active)
    
    # Event 1: Resolved Historical Event (3 days ago, Beatrice Moreno)
    t_ev1 = now - datetime.timedelta(days=3, hours=4)
    ev1 = EmergencyEvent(
        patient_id=p2.id,
        device_id=d2.id,
        event_type="FALL_DETECTED",
        event_status="RESOLVED",
        severity="HIGH",
        detection_method="ACCEL_IMPACT_INACTIVITY",
        confidence=0.88,
        evidence={
            "peak_acceleration_g": 3.12,
            "threshold_g": 2.8,
            "free_fall_detected": True,
            "post_impact_std_dev": 0.08,
            "simulated": True
        },
        latitude=40.7128,
        longitude=-74.0060,
        location_source="SIMULATED_ESTIMATE",
        created_at=t_ev1,
        acknowledged_at=t_ev1 + datetime.timedelta(seconds=24),
        acknowledged_by="Elena Davis, RN",
        responding_at=t_ev1 + datetime.timedelta(seconds=45),
        responding_by="Elena Davis, RN",
        patient_contacted_at=t_ev1 + datetime.timedelta(minutes=2),
        resolved_at=t_ev1 + datetime.timedelta(minutes=18),
        resolved_by="Elena Davis, RN",
        resolution_note="Patient slipped while getting up from armchair. No fractures or head injury. Helped back to seated position, vitals checked and normal."
    )
    db.add(ev1)
    db.commit()
    db.refresh(ev1)

    db.add(AlertAttempt(
        event_id=ev1.id,
        recipient_id=primary_caregiver.id,
        recipient_name=primary_caregiver.name,
        recipient_phone=primary_caregiver.phone,
        recipient_role="PRIMARY_CAREGIVER",
        channel="IN_APP",
        attempt_number=1,
        attempt_status="DELIVERED",
        provider_message_id="inapp-hist-001",
        message_content=f"🚨 [LifeLink AI] CRITICAL ALERT: FALL_DETECTED for Beatrice Moreno",
        attempted_at=t_ev1,
        delivered_at=t_ev1,
    ))
    db.add(AlertAttempt(
        event_id=ev1.id,
        recipient_id=primary_caregiver.id,
        recipient_name=primary_caregiver.name,
        recipient_phone=primary_caregiver.phone,
        recipient_role="PRIMARY_CAREGIVER",
        channel="INTERNET_PUSH",
        attempt_number=1,
        attempt_status="DELIVERED",
        provider_message_id="fcm-hist-001",
        message_content=f"🚨 [LifeLink AI] CRITICAL ALERT: FALL_DETECTED for Beatrice Moreno",
        attempted_at=t_ev1,
        delivered_at=t_ev1 + datetime.timedelta(milliseconds=110),
    ))

    # Event 2: Acknowledged Event (25 minutes ago, David Chen)
    t_ev2 = now - datetime.timedelta(minutes=25)
    ev2 = EmergencyEvent(
        patient_id=p3.id,
        device_id=d3.id,
        event_type="THRESHOLD_BREACH",
        event_status="ACKNOWLEDGED",
        severity="MEDIUM",
        detection_method="THRESHOLD_CHECK",
        confidence=0.92,
        evidence={
            "metric": "HEART_RATE_ELEVATED",
            "reading_bpm": 128.0,
            "threshold_bpm": 115.0,
            "duration_seconds": 60,
            "simulated": True
        },
        latitude=40.7180,
        longitude=-73.9980,
        location_source="SIMULATED_ESTIMATE",
        created_at=t_ev2,
        acknowledged_at=t_ev2 + datetime.timedelta(seconds=38),
        acknowledged_by="Marcus Vance",
        responding_at=t_ev2 + datetime.timedelta(seconds=70),
        responding_by="Marcus Vance",
        patient_contacted_at=t_ev2 + datetime.timedelta(minutes=3),
        resolved_at=None,
        resolution_note=None
    )
    db.add(ev2)
    db.commit()
    db.refresh(ev2)

    db.add(AlertAttempt(
        event_id=ev2.id,
        recipient_id=backup_caregiver.id,
        recipient_name=backup_caregiver.name,
        recipient_phone=backup_caregiver.phone,
        recipient_role="PRIMARY_CAREGIVER",
        channel="IN_APP",
        attempt_number=1,
        attempt_status="DELIVERED",
        provider_message_id="inapp-hist-002",
        message_content=f"🚨 [LifeLink AI] ALERT: THRESHOLD_BREACH for David Chen",
        attempted_at=t_ev2,
        delivered_at=t_ev2,
    ))

    # Event 3: ACTIVE Emergency Event (Detected 45 seconds ago, Arthur King - Ready for live demonstration!)
    t_ev3 = now - datetime.timedelta(seconds=45)
    ev3 = EmergencyEvent(
        patient_id=p1.id,
        device_id=d1.id,
        event_type="FALL_DETECTED",
        event_status="NOTIFICATION_ATTEMPTED",
        severity="CRITICAL",
        detection_method="ACCEL_IMPACT_INACTIVITY",
        confidence=0.96,
        evidence={
            "peak_acceleration_g": 3.84,
            "threshold_g": 2.8,
            "free_fall_detected": True,
            "free_fall_magnitude_g": 0.28,
            "post_impact_std_dev": 0.04,
            "peak_angular_velocity_dps": 184.2,
            "note": "Biomechanical pattern indicates severe backward fall onto hardwood floor."
        },
        latitude=40.7145,
        longitude=-74.0082,
        location_source="SIMULATED_ESTIMATE",
        created_at=t_ev3,
        acknowledged_at=None,
        acknowledged_by=None,
        responding_at=None,
        resolved_at=None
    )
    db.add(ev3)
    db.commit()
    db.refresh(ev3)

    # In-App and Push notification attempts recorded
    db.add(AlertAttempt(
        event_id=ev3.id,
        recipient_id=primary_caregiver.id,
        recipient_name=primary_caregiver.name,
        recipient_phone=primary_caregiver.phone,
        recipient_role="PRIMARY_CAREGIVER",
        channel="IN_APP",
        attempt_number=1,
        attempt_status="DELIVERED",
        provider_message_id=f"inapp-active-{ev3.id}",
        message_content=f"🚨 [LifeLink AI] CRITICAL ALERT: FALL_DETECTED for Arthur King (PAT-101)",
        attempted_at=t_ev3,
        delivered_at=t_ev3,
    ))
    db.add(AlertAttempt(
        event_id=ev3.id,
        recipient_id=primary_caregiver.id,
        recipient_name=primary_caregiver.name,
        recipient_phone=primary_caregiver.phone,
        recipient_role="PRIMARY_CAREGIVER",
        channel="INTERNET_PUSH",
        attempt_number=1,
        attempt_status="DELIVERED",
        provider_message_id=f"fcm-active-{ev3.id}",
        message_content=f"🚨 [LifeLink AI] CRITICAL ALERT: FALL_DETECTED for Arthur King (PAT-101)",
        attempted_at=t_ev3,
        delivered_at=t_ev3 + datetime.timedelta(milliseconds=135),
    ))

    # Audit Events
    db.add(AuditEvent(
        actor_name="SystemBootstrapper",
        actor_role="SYSTEM",
        action="DATABASE_SEEDED",
        entity_type="System",
        entity_id=1,
        metadata_json={"patients": 3, "devices": 3, "events": 3, "simulated": True},
        created_at=now
    ))
    db.commit()
