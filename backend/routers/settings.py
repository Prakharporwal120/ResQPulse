from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import SystemSetting, User, CaregiverAssignment, Patient, AuditEvent
from backend.schemas import SystemSettingsUpdate
from backend.security import get_current_user, require_role
from backend.fall_detector import fall_engine

router = APIRouter(prefix="/api/settings", tags=["System Settings"])

@router.get("")
def get_system_settings(db: Session = Depends(get_db)):
    settings_records = db.query(SystemSetting).all()
    settings_dict = {s.key: s.value for s in settings_records}

    # Caregivers list
    caregivers = db.query(User).filter(User.role == "CAREGIVER").all()
    cg_list = [
        {"id": u.id, "name": u.name, "email": u.email, "phone": u.phone}
        for u in caregivers
    ]

    # Patient assignments
    assignments = db.query(CaregiverAssignment).all()
    assign_list = [
        {
            "id": a.id,
            "patient_id": a.patient_id,
            "patient_name": a.patient.display_name if a.patient else None,
            "caregiver_id": a.caregiver_id,
            "caregiver_name": a.caregiver.name if a.caregiver else None,
            "priority": a.priority,
            "is_active": a.is_active
        }
        for a in assignments
    ]

    return {
        "parameters": settings_dict,
        "caregivers": cg_list,
        "assignments": assign_list,
        "environment": settings_dict.get("environment_mode", "SIMULATED"),
        "privacy_notice": "LifeLink AI is an educational / research HealthTech prototype. It does not provide certified medical diagnosis. Data is stored locally.",
        "firmware_telemetry_endpoint": "/api/telemetry"
    }

@router.patch("")
def update_system_settings(
    payload: SystemSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))
):
    updates = payload.dict(exclude_unset=True)
    for key, val in updates.items():
        if val is None:
            continue
        setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        str_val = str(val)
        if setting:
            setting.value = str_val
        else:
            db.add(SystemSetting(key=key, value=str_val))
            
        # Update in-memory engines if relevant
        if key == "fall_accel_threshold":
            fall_engine.impact_threshold = float(val)
        elif key == "free_fall_threshold":
            fall_engine.free_fall_threshold = float(val)
        elif key == "cooldown_seconds":
            fall_engine.cooldown_seconds = int(val)

    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        action="SYSTEM_SETTINGS_UPDATED",
        entity_type="SystemSetting",
        metadata_json=updates
    ))
    db.commit()

    return {"status": "updated", "updated_keys": list(updates.keys())}
