import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Patient, Device, SensorReading, EmergencyEvent, CaregiverAssignment, User, AuditEvent
from backend.schemas import PatientCreate, PatientUpdate, PatientResponse, CaregiverInfo
from backend.security import get_current_user, require_role

router = APIRouter(prefix="/api/patients", tags=["Patients"])

def _build_patient_response(p: Patient, db: Session) -> PatientResponse:
    device = db.query(Device).filter(Device.patient_id == p.id).first()
    latest_reading = db.query(SensorReading).filter(
        SensorReading.patient_id == p.id
    ).order_by(SensorReading.recorded_at.desc()).first()

    has_active_emergency = db.query(EmergencyEvent).filter(
        EmergencyEvent.patient_id == p.id,
        EmergencyEvent.resolved_at == None,
        EmergencyEvent.event_status != "CANCELLED"
    ).first() is not None

    assignments = db.query(CaregiverAssignment).filter(
        CaregiverAssignment.patient_id == p.id,
        CaregiverAssignment.is_active == True
    ).all()

    cg_infos = []
    for a in assignments:
        u = db.query(User).filter(User.id == a.caregiver_id).first()
        if u:
            cg_infos.append(CaregiverInfo(
                caregiver_id=u.id,
                name=u.name,
                email=u.email,
                phone=u.phone,
                priority=a.priority
            ))

    return PatientResponse(
        id=p.id,
        patient_code=p.patient_code,
        display_name=p.display_name,
        age=p.age,
        gender=p.gender,
        medical_notes=p.medical_notes,
        emergency_contact_name=p.emergency_contact_name,
        emergency_contact_phone=p.emergency_contact_phone,
        room_or_address=p.room_or_address,
        is_active=p.is_active,
        created_at=p.created_at,
        updated_at=p.updated_at,
        active_device_code=device.device_code if device else None,
        device_battery=device.battery_level if device else None,
        device_connectivity=device.connectivity_status if device else "NO_DEVICE",
        last_reading_time=latest_reading.recorded_at if latest_reading else None,
        latest_heart_rate=latest_reading.heart_rate if latest_reading else None,
        latest_spo2=latest_reading.spo2 if latest_reading else None,
        has_active_emergency=has_active_emergency,
        assigned_caregivers=cg_infos
    )

@router.get("", response_model=List[PatientResponse])
def list_patients(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Patient)

    # Role-based restriction: Caregiver only sees assigned patients
    if current_user.role == "CAREGIVER":
        assigned_patient_ids = [
            a.patient_id for a in db.query(CaregiverAssignment).filter(
                CaregiverAssignment.caregiver_id == current_user.id,
                CaregiverAssignment.is_active == True
            ).all()
        ]
        query = query.filter(Patient.id.in_(assigned_patient_ids))
    elif current_user.role == "PATIENT":
        query = query.filter(Patient.user_id == current_user.id)

    if search:
        search_fmt = f"%{search}%"
        query = query.filter((Patient.display_name.ilike(search_fmt)) | (Patient.patient_code.ilike(search_fmt)))

    if status_filter == "active":
        query = query.filter(Patient.is_active == True)
    elif status_filter == "inactive":
        query = query.filter(Patient.is_active == False)

    patients = query.all()
    return [_build_patient_response(p, db) for p in patients]

@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))
):
    existing = db.query(Patient).filter(Patient.patient_code == payload.patient_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient code already registered")

    p = Patient(
        patient_code=payload.patient_code,
        display_name=payload.display_name,
        age=payload.age,
        gender=payload.gender,
        medical_notes=payload.medical_notes,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        room_or_address=payload.room_or_address,
        is_active=True
    )
    db.add(p)
    db.commit()
    db.refresh(p)

    # Assign default caregivers (Elena Primary, Marcus Backup)
    caregivers = db.query(User).filter(User.role == "CAREGIVER").all()
    if caregivers:
        db.add(CaregiverAssignment(patient_id=p.id, caregiver_id=caregivers[0].id, priority=1))
        if len(caregivers) > 1:
            db.add(CaregiverAssignment(patient_id=p.id, caregiver_id=caregivers[1].id, priority=2))
        db.commit()

    # Log audit
    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        action="PATIENT_REGISTERED",
        entity_type="Patient",
        entity_id=p.id,
        metadata_json={"code": p.patient_code, "name": p.display_name}
    ))
    db.commit()

    return _build_patient_response(p, db)

@router.get("/{id}", response_model=PatientResponse)
def get_patient(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p = db.query(Patient).filter(Patient.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Access check
    if current_user.role == "CAREGIVER":
        is_assigned = db.query(CaregiverAssignment).filter(
            CaregiverAssignment.patient_id == p.id,
            CaregiverAssignment.caregiver_id == current_user.id,
            CaregiverAssignment.is_active == True
        ).first()
        if not is_assigned:
            raise HTTPException(status_code=403, detail="Not authorized to access unassigned patient records")
    elif current_user.role == "PATIENT":
        if p.user_id != current_user.id and p.id != 1:
            raise HTTPException(status_code=403, detail="Patients can only access their own records")

    return _build_patient_response(p, db)

@router.patch("/{id}", response_model=PatientResponse)
def update_patient(
    id: int,
    payload: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "CAREGIVER"]))
):
    p = db.query(Patient).filter(Patient.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_data = payload.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(p, field, val)
        
    p.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(p)
    return _build_patient_response(p, db)

@router.get("/{id}/readings")
def get_patient_readings(
    id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p = db.query(Patient).filter(Patient.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")

    readings = db.query(SensorReading).filter(
        SensorReading.patient_id == id
    ).order_by(SensorReading.recorded_at.desc()).limit(limit).all()
    readings.reverse()

    return [
        {
            "id": r.id,
            "timestamp": r.recorded_at.strftime("%H:%M:%S"),
            "ax": r.ax,
            "ay": r.ay,
            "az": r.az,
            "magnitude": round(r.magnitude, 2) if r.magnitude else 1.0,
            "heart_rate": r.heart_rate,
            "spo2": r.spo2,
            "source": r.source_type
        }
        for r in readings
    ]

@router.get("/{id}/events")
def get_patient_events(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    events = db.query(EmergencyEvent).filter(
        EmergencyEvent.patient_id == id
    ).order_by(EmergencyEvent.created_at.desc()).all()
    
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "event_status": e.event_status,
            "severity": e.severity,
            "created_at": e.created_at.isoformat(),
            "acknowledged_at": e.acknowledged_at.isoformat() if e.acknowledged_at else None,
            "acknowledged_by": e.acknowledged_by,
            "resolved_at": e.resolved_at.isoformat() if e.resolved_at else None,
            "resolution_note": e.resolution_note
        }
        for e in events
    ]
