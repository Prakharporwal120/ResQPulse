import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import get_db
from backend.models import Patient, Device, EmergencyEvent, SensorReading, AuditEvent, User
from backend.schemas import DashboardSummaryResponse
from backend.security import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.datetime.utcnow()
    stale_cutoff = now - datetime.timedelta(minutes=10)

    # Scoped queries if Patient role
    if current_user.role == "PATIENT":
        total_patients = 1
        online_patients = 1
        active_emergencies = db.query(EmergencyEvent).filter(
            EmergencyEvent.patient_id.in_([p.id for p in current_user.caregiver_assignments or []] or [1]),
            EmergencyEvent.resolved_at == None
        ).count()
    else:
        total_patients = db.query(Patient).filter(Patient.is_active == True).count()
        online_patients = db.query(Device).filter(Device.connectivity_status == "ONLINE").count()
        active_emergencies = db.query(EmergencyEvent).filter(
            EmergencyEvent.resolved_at == None,
            EmergencyEvent.event_status != "CANCELLED"
        ).count()

    low_battery_devices = db.query(Device).filter(
        Device.battery_level != None,
        Device.battery_level < 20
    ).count()

    stale_devices = db.query(Device).filter(
        (Device.last_seen_at < stale_cutoff) | (Device.connectivity_status == "OFFLINE")
    ).count()

    # Acknowledgement statistics
    all_events = db.query(EmergencyEvent).all()
    total_events = len(all_events)
    acknowledged_events = [e for e in all_events if e.acknowledged_at is not None]
    ack_rate = round((len(acknowledged_events) / total_events * 100), 1) if total_events > 0 else 100.0

    ack_times = [
        (e.acknowledged_at - e.created_at).total_seconds()
        for e in acknowledged_events
        if e.acknowledged_at and e.created_at
    ]
    avg_ack_time = round(sum(ack_times) / len(ack_times), 1) if ack_times else 0.0

    # System overall connectivity check
    devices = db.query(Device).all()
    if any(d.connectivity_status == "ONLINE" for d in devices):
        system_conn = "ONLINE"
    elif any(d.connectivity_status == "INTERNET_DOWN" for d in devices):
        system_conn = "CELLULAR_FALLBACK"
    else:
        system_conn = "OFFLINE"

    return {
        "total_patients": total_patients,
        "online_patients": online_patients,
        "active_emergencies": active_emergencies,
        "low_battery_devices": low_battery_devices,
        "stale_devices": stale_devices,
        "acknowledgement_rate_pct": ack_rate,
        "avg_ack_time_seconds": avg_ack_time,
        "system_connectivity": system_conn,
        "environment": "SIMULATED DEMO"
    }

@router.get("/activity")
def get_recent_activity(
    limit: int = 15,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    activities = db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(limit).all()
    return [
        {
            "id": a.id,
            "actor": a.actor_name,
            "role": a.actor_role,
            "action": a.action,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "details": a.metadata_json,
            "created_at": a.created_at.isoformat()
        }
        for a in activities
    ]

@router.get("/vitals-trend")
def get_vitals_trend(
    patient_id: Optional[int] = None,
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(SensorReading).order_by(SensorReading.recorded_at.desc())
    if patient_id:
        query = query.filter(SensorReading.patient_id == patient_id)
        
    readings = query.limit(limit).all()
    readings.reverse() # chronological
    
    return [
        {
            "id": r.id,
            "timestamp": r.recorded_at.strftime("%H:%M:%S"),
            "heart_rate": r.heart_rate,
            "spo2": r.spo2,
            "magnitude": round(r.magnitude, 2) if r.magnitude else 1.0,
            "patient_id": r.patient_id,
            "source": r.source_type
        }
        for r in readings
    ]
