from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field

# --- User & Auth Schemas ---
class UserBase(BaseModel):
    name: str
    email: str
    role: str = "CAREGIVER"
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Patient Schemas ---
class PatientBase(BaseModel):
    patient_code: str
    display_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    medical_notes: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    room_or_address: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    display_name: Optional[str] = None
    age: Optional[int] = None
    medical_notes: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    room_or_address: Optional[str] = None
    is_active: Optional[bool] = None

class CaregiverInfo(BaseModel):
    caregiver_id: int
    name: str
    email: str
    phone: Optional[str] = None
    priority: int  # 1 = Primary, 2 = Backup

    class Config:
        from_attributes = True

class PatientResponse(PatientBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    active_device_code: Optional[str] = None
    device_battery: Optional[int] = None
    device_connectivity: Optional[str] = None
    last_reading_time: Optional[datetime] = None
    latest_heart_rate: Optional[float] = None
    latest_spo2: Optional[float] = None
    has_active_emergency: bool = False
    assigned_caregivers: List[CaregiverInfo] = []

    class Config:
        from_attributes = True


# --- Device Schemas ---
class DeviceBase(BaseModel):
    device_code: str
    device_type: str = "WEARABLE_BAND"
    source_type: str = "SIMULATED"
    firmware_version: str = "v1.4.0-sim"

class DeviceCreate(DeviceBase):
    patient_id: Optional[int] = None

class DeviceUpdate(BaseModel):
    patient_id: Optional[int] = None
    battery_level: Optional[int] = None
    connectivity_status: Optional[str] = None
    firmware_version: Optional[str] = None

class DeviceResponse(DeviceBase):
    id: int
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    battery_level: Optional[int] = None
    connectivity_status: str
    cellular_signal: int
    last_seen_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# --- Telemetry & Sensor Schemas ---
class TelemetryIngest(BaseModel):
    device_code: str
    patient_code: Optional[str] = None
    ax: float = Field(..., description="Acceleration X in g")
    ay: float = Field(..., description="Acceleration Y in g")
    az: float = Field(..., description="Acceleration Z in g")
    gx: Optional[float] = Field(0.0, description="Gyroscope X in deg/s")
    gy: Optional[float] = Field(0.0, description="Gyroscope Y in deg/s")
    gz: Optional[float] = Field(0.0, description="Gyroscope Z in deg/s")
    heart_rate: Optional[float] = Field(None, description="BPM (demo/simulated)")
    spo2: Optional[float] = Field(None, description="SpO2 percentage (demo/simulated)")
    battery_level: Optional[int] = None
    connectivity_status: Optional[str] = "ONLINE"
    source_type: Optional[str] = "SIMULATED"
    is_sos_pressed: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: Optional[datetime] = None

class SensorReadingResponse(BaseModel):
    id: int
    device_id: int
    patient_id: int
    sensor_type: str
    ax: Optional[float] = None
    ay: Optional[float] = None
    az: Optional[float] = None
    magnitude: Optional[float] = None
    gx: Optional[float] = None
    gy: Optional[float] = None
    gz: Optional[float] = None
    heart_rate: Optional[float] = None
    spo2: Optional[float] = None
    source_type: str
    recorded_at: datetime

    class Config:
        from_attributes = True


# --- Alert Attempt Schemas ---
class AlertAttemptResponse(BaseModel):
    id: int
    event_id: int
    recipient_id: Optional[int] = None
    recipient_name: str
    recipient_phone: Optional[str] = None
    recipient_role: str
    channel: str
    attempt_number: int
    attempt_status: str
    provider_message_id: Optional[str] = None
    message_content: Optional[str] = None
    attempted_at: datetime
    delivered_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


# --- Emergency Event Schemas ---
class EmergencyEventResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: str
    patient_code: str
    device_id: Optional[int] = None
    device_code: Optional[str] = None
    event_type: str
    event_status: str
    severity: str
    detection_method: str
    confidence: Optional[float] = None
    evidence: Optional[Dict[str, Any]] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_source: Optional[str] = None
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    responding_at: Optional[datetime] = None
    responding_by: Optional[str] = None
    patient_contacted_at: Optional[datetime] = None
    escalated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_note: Optional[str] = None
    alert_attempts: List[AlertAttemptResponse] = []
    primary_caregiver_name: Optional[str] = None
    backup_caregiver_name: Optional[str] = None
    seconds_elapsed: Optional[int] = None
    is_escalated: bool = False

    class Config:
        from_attributes = True

# --- Event Actions ---
class AcknowledgeRequest(BaseModel):
    caregiver_name: Optional[str] = None
    note: Optional[str] = None

class RespondRequest(BaseModel):
    responder_name: Optional[str] = None
    note: Optional[str] = None

class ContactedRequest(BaseModel):
    note: Optional[str] = None

class ResolveRequest(BaseModel):
    resolver_name: Optional[str] = None
    resolution_note: str = Field(..., min_length=3, description="Mandatory resolution note explaining actions taken")

class EscalateRequest(BaseModel):
    reason: Optional[str] = "Manual escalation triggered by operator"

class TestAlertRequest(BaseModel):
    patient_id: int
    event_type: str = "MANUAL_SOS" # or "FALL_DETECTED"
    severity: str = "CRITICAL"
    notes: Optional[str] = "Manual test alert from dashboard"


# --- Simulation Schemas ---
class SimulationScenarioRequest(BaseModel):
    scenario: str = Field(..., description="normal_walking, sudden_fall, manual_sos, internet_down, no_network, restore_network, low_battery, stale_data")
    patient_id: Optional[int] = None
    custom_params: Optional[Dict[str, Any]] = None

class SimulationStatusResponse(BaseModel):
    is_running: bool
    active_scenario: Optional[str] = None
    frequency_hz: float
    simulated_patients: int
    last_tick: Optional[datetime] = None


# --- Dashboard & Analytics Schemas ---
class DashboardSummaryResponse(BaseModel):
    total_patients: int
    online_patients: int
    active_emergencies: int
    low_battery_devices: int
    stale_devices: int
    acknowledgement_rate_pct: float
    avg_ack_time_seconds: float
    system_connectivity: str
    environment: str

class AnalyticsSummaryResponse(BaseModel):
    total_falls_detected: int
    total_manual_sos: int
    total_events: int
    acknowledgement_rate_pct: float
    avg_ack_time_seconds: float
    median_ack_time_seconds: float
    false_positive_count: int
    in_app_deliveries: int
    cellular_sms_deliveries: int
    queued_offline_attempts: int
    device_uptime_pct: float
    timeline: List[Dict[str, Any]]
    delivery_breakdown: List[Dict[str, Any]]


# --- Settings Schemas ---
class SystemSettingsUpdate(BaseModel):
    escalation_timeout_seconds: Optional[int] = None
    fall_accel_threshold: Optional[float] = None
    free_fall_threshold: Optional[float] = None
    inactivity_time_window: Optional[float] = None
    cooldown_seconds: Optional[int] = None
    mock_sms_failure_rate: Optional[float] = None
