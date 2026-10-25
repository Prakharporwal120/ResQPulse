import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Device, Patient, AuditEvent, User
from backend.schemas import DeviceCreate, DeviceUpdate, DeviceResponse
from backend.security import get_current_user, require_role

router = APIRouter(prefix="/api/devices", tags=["Devices"])

@router.get("", response_model=List[DeviceResponse])
def list_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    devices = db.query(Device).all()
    res = []
    for d in devices:
        res.append(DeviceResponse(
            id=d.id,
            device_code=d.device_code,
            patient_id=d.patient_id,
            patient_name=d.patient.display_name if d.patient else None,
            device_type=d.device_type,
            source_type=d.source_type,
            firmware_version=d.firmware_version,
            battery_level=d.battery_level,
            connectivity_status=d.connectivity_status,
            cellular_signal=d.cellular_signal,
            last_seen_at=d.last_seen_at,
            created_at=d.created_at
        ))
    return res

@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def register_device(
    payload: DeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))
):
    existing = db.query(Device).filter(Device.device_code == payload.device_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device code already registered")

    device = Device(
        device_code=payload.device_code,
        patient_id=payload.patient_id,
        device_type=payload.device_type,
        source_type=payload.source_type,
        firmware_version=payload.firmware_version,
        battery_level=100,
        connectivity_status="ONLINE",
        cellular_signal=4,
        last_seen_at=datetime.datetime.utcnow()
    )
    db.add(device)
    db.commit()
    db.refresh(device)

    # Log audit
    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.name,
        actor_role=current_user.role,
        action="DEVICE_REGISTERED",
        entity_type="Device",
        entity_id=device.id,
        metadata_json={"device_code": device.device_code, "type": device.device_type, "source": device.source_type}
    ))
    db.commit()

    return DeviceResponse(
        id=device.id,
        device_code=device.device_code,
        patient_id=device.patient_id,
        patient_name=device.patient.display_name if device.patient else None,
        device_type=device.device_type,
        source_type=device.source_type,
        firmware_version=device.firmware_version,
        battery_level=device.battery_level,
        connectivity_status=device.connectivity_status,
        cellular_signal=device.cellular_signal,
        last_seen_at=device.last_seen_at,
        created_at=device.created_at
    )

@router.get("/{id}", response_model=DeviceResponse)
def get_device(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    d = db.query(Device).filter(Device.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Device not found")
    return DeviceResponse(
        id=d.id,
        device_code=d.device_code,
        patient_id=d.patient_id,
        patient_name=d.patient.display_name if d.patient else None,
        device_type=d.device_type,
        source_type=d.source_type,
        firmware_version=d.firmware_version,
        battery_level=d.battery_level,
        connectivity_status=d.connectivity_status,
        cellular_signal=d.cellular_signal,
        last_seen_at=d.last_seen_at,
        created_at=d.created_at
    )

@router.patch("/{id}", response_model=DeviceResponse)
def update_device(
    id: int,
    payload: DeviceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))
):
    d = db.query(Device).filter(Device.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Device not found")

    data = payload.dict(exclude_unset=True)
    for k, v in data.items():
        setattr(d, k, v)
        
    db.commit()
    db.refresh(d)
    return DeviceResponse(
        id=d.id,
        device_code=d.device_code,
        patient_id=d.patient_id,
        patient_name=d.patient.display_name if d.patient else None,
        device_type=d.device_type,
        source_type=d.source_type,
        firmware_version=d.firmware_version,
        battery_level=d.battery_level,
        connectivity_status=d.connectivity_status,
        cellular_signal=d.cellular_signal,
        last_seen_at=d.last_seen_at,
        created_at=d.created_at
    )
