import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import (
    EmergencyEvent, Patient, Device, AlertAttempt, CaregiverAssignment, AuditEvent, User
)
from backend.schemas import (
    EmergencyEventResponse, AlertAttemptResponse,
    AcknowledgeRequest, RespondRequest, ContactedRequest, ResolveRequest, EscalateRequest, TestAlertRequest
)
from backend.security import get_current_user, require_role
from backend.notification_service import notification_service

router = APIRouter(prefix="/api/events", tags=["Emergency Events"])

def _format_event_response(e: EmergencyEvent, db: Session) -> EmergencyEventResponse:
    now = datetime.datetime.utcnow()
    patient = e.patient
    device = db.query(Device).filter(Device.id == e.device_id).first() if e.device_id else None

    # Assigned caregivers
    assignments = db.query(CaregiverAssignment).filter(
        CaregiverAssignment.patient_id == e.patient_id,
        CaregiverAssignment.is_active == True
    ).all()
    primary_cg = None
    backup_cg = None
    for a in assignments:
        u = db.query(User).filter(User.id == a.caregiver_id).first()
        if u:
            if a.priority == 1 and not primary_cg:
                primary_cg = u.name
            elif a.priority == 2 and not backup_cg:
                backup_cg = u.name

    attempts = [
        AlertAttemptResponse(
            id=att.id,
            event_id=att.event_id,
            recipient_id=att.recipient_id,
            recipient_name=att.recipient_name,
            recipient_phone=att.recipient_phone,
            recipient_role=att.recipient_role,
            channel=att.channel,
            attempt_number=att.attempt_number,
            attempt_status=att.attempt_status,
            provider_message_id=att.provider_message_id,
            message_content=att.message_content,
            attempted_at=att.attempted_at,
            delivered_at=att.delivered_at,
            error_message=att.error_message
        )
        for att in e.alert_attempts
    ]

    elapsed = int((now - e.created_at).total_seconds())

    return EmergencyEventResponse(
        id=e.id,
        patient_id=e.patient_id,
        patient_name=patient.display_name if patient else "Unknown Patient",
        patient_code=patient.patient_code if patient else "PAT-???",
        device_id=e.device_id,
        device_code=device.device_code if device else None,
        event_type=e.event_type,
        event_status=e.event_status,
        severity=e.severity,
        detection_method=e.detection_method,
        confidence=e.confidence,
        evidence=e.evidence,
        latitude=e.latitude,
        longitude=e.longitude,
        location_source=e.location_source,
        created_at=e.created_at,
        acknowledged_at=e.acknowledged_at,
        acknowledged_by=e.acknowledged_by,
        responding_at=e.responding_at,
        responding_by=e.responding_by,
        patient_contacted_at=e.patient_contacted_at,
        escalated_at=e.escalated_at,
        resolved_at=e.resolved_at,
        resolved_by=e.resolved_by,
        resolution_note=e.resolution_note,
        alert_attempts=attempts,
        primary_caregiver_name=primary_cg or "Elena Davis, RN",
        backup_caregiver_name=backup_cg or "Marcus Vance",
        seconds_elapsed=elapsed,
        is_escalated=(e.escalated_at is not None or e.event_status == "ESCALATED")
    )

@router.get("", response_model=List[EmergencyEventResponse])
def list_events(
    status_filter: Optional[str] = None, # "active", "acknowledged", "resolved", "escalated"
    patient_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(EmergencyEvent).order_by(EmergencyEvent.created_at.desc())

    # Role-based restriction: Caregiver sees only assigned patients
    if current_user.role == "CAREGIVER":
        assigned_patient_ids = [
            a.patient_id for a in db.query(CaregiverAssignment).filter(
                CaregiverAssignment.caregiver_id == current_user.id,
                CaregiverAssignment.is_active == True
            ).all()
        ]
        query = query.filter(EmergencyEvent.patient_id.in_(assigned_patient_ids))
    elif current_user.role == "PATIENT":
        query = query.filter(EmergencyEvent.patient_id == 1)

    if patient_id:
        query = query.filter(EmergencyEvent.patient_id == patient_id)

    if status_filter:
        s_lower = status_filter.lower()
        if s_lower == "active":
            query = query.filter(EmergencyEvent.resolved_at == None, EmergencyEvent.event_status != "CANCELLED")
        elif s_lower == "acknowledged":
            query = query.filter(EmergencyEvent.acknowledged_at != None, EmergencyEvent.resolved_at == None)
        elif s_lower == "resolved":
            query = query.filter(EmergencyEvent.resolved_at != None)
        elif s_lower == "escalated":
            query = query.filter(EmergencyEvent.escalated_at != None)

    events = query.limit(limit).all()
    return [_format_event_response(e, db) for e in events]

@router.get("/{id}", response_model=EmergencyEventResponse)
def get_event(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    e = db.query(EmergencyEvent).filter(EmergencyEvent.id == id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Emergency event not found")
    return _format_event_response(e, db)

@router.post("/test", response_model=EmergencyEventResponse)
def trigger_test_alert(
    payload: TestAlertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.datetime.utcnow()
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    device = db.query(Device).filter(Device.patient_id == patient.id).first()

    event = EmergencyEvent(
        patient_id=patient.id,
        device_id=device.id if device else None,
        event_type=payload.event_type,
        event_status="DETECTED",
        severity=payload.severity,
        detection_method="MANUAL_TEST_TRIGGER",
        confidence=1.00,
        evidence={
            "triggered_by": current_user.name,
            "role": current_user.role,
            "notes": payload.notes,
            "test_mode": True
        },
        latitude=40.7128,
        longitude=-74.0060,
        location_source="SIMULATED_TEST_LOCATION",
        created_at=now
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # Dispatch alerts
    notification_service.send_emergency_notifications(db, event, "PRIMARY_CAREGIVER")

    # Audit log
    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        action="TEST_EMERGENCY_TRIGGERED",
        entity_type="EmergencyEvent",
        entity_id=event.id,
        metadata_json={"type": payload.event_type, "patient": patient.display_name}
    ))
    db.commit()

    return _format_event_response(event, db)

@router.post("/{id}/acknowledge", response_model=EmergencyEventResponse)
def acknowledge_event(
    id: int,
    payload: Optional[AcknowledgeRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CAREGIVER"]))
):
    now = datetime.datetime.utcnow()
    event = db.query(EmergencyEvent).filter(EmergencyEvent.id == id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Emergency event not found")

    # Prevent duplicate acknowledgement
    if event.acknowledged_at is not None:
        raise HTTPException(
            status_code=400,
            detail=f"Event was already acknowledged by {event.acknowledged_by} at {event.acknowledged_at.isoformat()}"
        )

    actor_name = (payload.caregiver_name if payload and payload.caregiver_name else None) or current_user.name
    event.acknowledged_at = now
    event.acknowledged_by = actor_name
    event.event_status = "ACKNOWLEDGED"

    # Audit event
    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_name=actor_name,
        actor_role=current_user.role,
        action="ALERT_ACKNOWLEDGED",
        entity_type="EmergencyEvent",
        entity_id=event.id,
        metadata_json={
            "elapsed_seconds": (now - event.created_at).total_seconds(),
            "note": payload.note if payload else None
        },
        created_at=now
    ))
    db.commit()
    db.refresh(event)
    return _format_event_response(event, db)

@router.post("/{id}/respond", response_model=EmergencyEventResponse)
def mark_responding(
    id: int,
    payload: Optional[RespondRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CAREGIVER"]))
):
    now = datetime.datetime.utcnow()
    event = db.query(EmergencyEvent).filter(EmergencyEvent.id == id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Emergency event not found")

    actor_name = (payload.responder_name if payload and payload.responder_name else None) or current_user.name
    event.responding_at = now
    event.responding_by = actor_name
    event.event_status = "RESPONDING"

    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_name=actor_name,
        actor_role=current_user.role,
        action="CAREGIVER_RESPONDING",
        entity_type="EmergencyEvent",
        entity_id=event.id,
        metadata_json={"note": payload.note if payload else None},
        created_at=now
    ))
    db.commit()
    db.refresh(event)
    return _format_event_response(event, db)

@router.post("/{id}/contacted", response_model=EmergencyEventResponse)
def mark_patient_contacted(
    id: int,
    payload: Optional[ContactedRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CAREGIVER"]))
):
    now = datetime.datetime.utcnow()
    event = db.query(EmergencyEvent).filter(EmergencyEvent.id == id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Emergency event not found")

    event.patient_contacted_at = now
    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        action="PATIENT_CONTACTED",
        entity_type="EmergencyEvent",
        entity_id=event.id,
        metadata_json={"note": payload.note if payload else None},
        created_at=now
    ))
    db.commit()
    db.refresh(event)
    return _format_event_response(event, db)

@router.post("/{id}/resolve", response_model=EmergencyEventResponse)
def resolve_event(
    id: int,
    payload: ResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CAREGIVER"]))
):
    now = datetime.datetime.utcnow()
    event = db.query(EmergencyEvent).filter(EmergencyEvent.id == id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Emergency event not found")

    if event.resolved_at is not None:
        raise HTTPException(status_code=400, detail="Event is already resolved")

    actor_name = payload.resolver_name or current_user.name
    event.resolved_at = now
    event.resolved_by = actor_name
    event.resolution_note = payload.resolution_note
    event.event_status = "RESOLVED"

    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_name=actor_name,
        actor_role=current_user.role,
        action="EVENT_RESOLVED",
        entity_type="EmergencyEvent",
        entity_id=event.id,
        metadata_json={"resolution_note": payload.resolution_note},
        created_at=now
    ))
    db.commit()
    db.refresh(event)
    return _format_event_response(event, db)

@router.post("/{id}/escalate", response_model=EmergencyEventResponse)
def manual_escalate(
    id: int,
    payload: Optional[EscalateRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CAREGIVER"]))
):
    now = datetime.datetime.utcnow()
    event = db.query(EmergencyEvent).filter(EmergencyEvent.id == id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Emergency event not found")

    if event.resolved_at is not None:
        raise HTTPException(status_code=400, detail="Cannot escalate a resolved event")

    event.escalated_at = now
    event.event_status = "ESCALATED"

    # Send alerts to backup caregiver
    notification_service.send_emergency_notifications(db, event, "BACKUP_CAREGIVER")

    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        action="MANUAL_ESCALATION_TRIGGERED",
        entity_type="EmergencyEvent",
        entity_id=event.id,
        metadata_json={"reason": payload.reason if payload else "Manual operator escalation"},
        created_at=now
    ))
    db.commit()
    db.refresh(event)
    return _format_event_response(event, db)
