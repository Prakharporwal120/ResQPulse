import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Device, Patient, SensorReading, EmergencyEvent
from backend.schemas import TelemetryIngest, SensorReadingResponse
from backend.fall_detector import fall_engine
from backend.notification_service import notification_service

router = APIRouter(prefix="/api/telemetry", tags=["Telemetry Ingestion"])

@router.post("", status_code=status.HTTP_201_CREATED)
def ingest_telemetry(payload: TelemetryIngest, db: Session = Depends(get_db)):
    now = payload.timestamp or datetime.datetime.utcnow()

    # Look up device
    device = db.query(Device).filter(Device.device_code == payload.device_code).first()
    if not device:
        # Auto-register physical or simulated device
        patient = db.query(Patient).first()
        device = Device(
            device_code=payload.device_code,
            patient_id=patient.id if patient else None,
            device_type="WEARABLE_BAND",
            source_type=payload.source_type or "PHYSICAL_ESP32",
            firmware_version="v1.0-ingest",
            battery_level=payload.battery_level or 85,
            connectivity_status=payload.connectivity_status or "ONLINE",
            last_seen_at=now
        )
        db.add(device)
        db.commit()
        db.refresh(device)
    else:
        # Update device telemetry heartbeat
        if payload.battery_level is not None:
            device.battery_level = payload.battery_level
        if payload.connectivity_status:
            device.connectivity_status = payload.connectivity_status
        device.last_seen_at = now

    patient_id = device.patient_id
    if not patient_id:
        # If not assigned, assign to patient 1 for demo stability
        p = db.query(Patient).first()
        patient_id = p.id if p else 1
        device.patient_id = patient_id

    # Compute magnitude
    mag = fall_engine.calculate_magnitude(payload.ax, payload.ay, payload.az)

    # Save Sensor Reading
    reading = SensorReading(
        device_id=device.id,
        patient_id=patient_id,
        sensor_type="COMPOSITE",
        ax=payload.ax,
        ay=payload.ay,
        az=payload.az,
        magnitude=round(mag, 3),
        gx=payload.gx or 0.0,
        gy=payload.gy or 0.0,
        gz=payload.gz or 0.0,
        heart_rate=payload.heart_rate,
        spo2=payload.spo2,
        source_type=payload.source_type or device.source_type,
        raw_payload=payload.dict(exclude={"timestamp"}),
        recorded_at=now,
        received_at=now
    )
    db.add(reading)
    db.commit()

    created_event_id = None

    # Check 1: Manual SOS Button Pressed (Bypasses fall classification!)
    if payload.is_sos_pressed:
        event = EmergencyEvent(
            patient_id=patient_id,
            device_id=device.id,
            event_type="MANUAL_SOS",
            event_status="DETECTED",
            severity="CRITICAL",
            detection_method="MANUAL_TRIGGER",
            confidence=1.00,
            evidence={
                "trigger_type": "WEARABLE_SOS_BUTTON",
                "bypass_classifier": True,
                "reading_magnitude": round(mag, 2)
            },
            latitude=payload.latitude or 40.7128,
            longitude=payload.longitude or -74.0060,
            location_source="GPS_FIX" if (payload.latitude and payload.source_type == "PHYSICAL_ESP32") else "SIMULATED_ESTIMATE",
            created_at=now
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        notification_service.send_emergency_notifications(db, event, "PRIMARY_CAREGIVER")
        created_event_id = event.id

    # Check 2: Fall Detection Engine Evaluation
    else:
        is_fall, method, confidence, evidence = fall_engine.process_sample(
            patient_id=patient_id,
            ax=payload.ax,
            ay=payload.ay,
            az=payload.az,
            gx=payload.gx or 0.0,
            gy=payload.gy or 0.0,
            gz=payload.gz or 0.0,
            timestamp=now
        )
        if is_fall:
            event = EmergencyEvent(
                patient_id=patient_id,
                device_id=device.id,
                event_type="FALL_DETECTED",
                event_status="DETECTED",
                severity="CRITICAL",
                detection_method=method or "ACCEL_IMPACT_INACTIVITY",
                confidence=confidence,
                evidence=evidence,
                latitude=payload.latitude or 40.7128,
                longitude=payload.longitude or -74.0060,
                location_source="SIMULATED_ESTIMATE",
                created_at=now
            )
            db.add(event)
            db.commit()
            db.refresh(event)
            notification_service.send_emergency_notifications(db, event, "PRIMARY_CAREGIVER")
            created_event_id = event.id

    return {
        "status": "ingested",
        "device_code": device.device_code,
        "magnitude_g": round(mag, 2),
        "event_triggered": created_event_id is not None,
        "event_id": created_event_id
    }
