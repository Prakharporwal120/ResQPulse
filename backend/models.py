import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(30), nullable=False, default="CAREGIVER")  # ADMIN, CAREGIVER, PATIENT
    phone = Column(String(30), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    caregiver_assignments = relationship("CaregiverAssignment", back_populates="caregiver", foreign_keys="CaregiverAssignment.caregiver_id")


class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_code = Column(String(50), unique=True, index=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    medical_notes = Column(Text, nullable=True)
    emergency_contact_name = Column(String(100), nullable=True)
    emergency_contact_phone = Column(String(30), nullable=True)
    room_or_address = Column(String(200), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    devices = relationship("Device", back_populates="patient", cascade="all, delete-orphan")
    events = relationship("EmergencyEvent", back_populates="patient", cascade="all, delete-orphan")
    caregivers = relationship("CaregiverAssignment", back_populates="patient", cascade="all, delete-orphan")
    sensor_readings = relationship("SensorReading", back_populates="patient", cascade="all, delete-orphan")


class Device(Base):
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True, index=True)
    device_code = Column(String(50), unique=True, index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    device_type = Column(String(50), default="WEARABLE_BAND")  # WEARABLE_BAND, PENDANT, WATCH
    source_type = Column(String(50), default="SIMULATED")      # SIMULATED, PHYSICAL_ESP32
    firmware_version = Column(String(30), default="v1.4.0-sim")
    battery_level = Column(Integer, nullable=True, default=88)  # Percentage 0-100
    connectivity_status = Column(String(30), default="ONLINE") # ONLINE, INTERNET_DOWN, NO_NETWORK, OFFLINE
    cellular_signal = Column(Integer, default=4)               # Signal strength bars 0-5
    last_seen_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="devices")
    readings = relationship("SensorReading", back_populates="device")


class SensorReading(Base):
    __tablename__ = "sensor_readings"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    sensor_type = Column(String(40), default="COMPOSITE")  # IMU, HEART_RATE, SPO2, COMPOSITE
    ax = Column(Float, nullable=True)  # in g
    ay = Column(Float, nullable=True)  # in g
    az = Column(Float, nullable=True)  # in g
    magnitude = Column(Float, nullable=True) # derived sqrt(ax^2 + ay^2 + az^2)
    gx = Column(Float, nullable=True)  # in deg/s or rad/s
    gy = Column(Float, nullable=True)
    gz = Column(Float, nullable=True)
    heart_rate = Column(Float, nullable=True) # BPM (simulated/demo)
    spo2 = Column(Float, nullable=True)       # % (simulated/demo)
    source_type = Column(String(30), default="SIMULATED") # SIMULATED, ESTIMATED, PHYSICAL
    raw_payload = Column(JSON, nullable=True)
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    received_at = Column(DateTime, default=datetime.datetime.utcnow)

    device = relationship("Device", back_populates="readings")
    patient = relationship("Patient", back_populates="sensor_readings")


class EmergencyEvent(Base):
    __tablename__ = "emergency_events"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    event_type = Column(String(50), nullable=False) # FALL_DETECTED, MANUAL_SOS, THRESHOLD_BREACH
    event_status = Column(String(50), default="DETECTED", index=True) 
    # Valid statuses:
    # DETECTED -> NOTIFICATION_PENDING -> NOTIFICATION_ATTEMPTED -> ACKNOWLEDGED -> RESPONDING -> RESOLVED
    # Alternative branches: NOTIFICATION_FAILED, ESCALATION_PENDING, ESCALATED, CANCELLED
    
    severity = Column(String(20), default="CRITICAL") # CRITICAL, HIGH, MEDIUM
    detection_method = Column(String(60), default="ACCEL_IMPACT_INACTIVITY")
    confidence = Column(Float, nullable=True) # 0.0 - 1.0 (labeled clearly for simulated vs test)
    evidence = Column(JSON, nullable=True)    # peak_g, impact_time, pre_fall_g, post_fall_variance
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_source = Column(String(40), default="SIMULATED_ESTIMATE") # SIMULATED_ESTIMATE, GPS_FIX, NONE
    
    # Lifecycle Timestamps & Actors
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String(100), nullable=True)
    responding_at = Column(DateTime, nullable=True)
    responding_by = Column(String(100), nullable=True)
    patient_contacted_at = Column(DateTime, nullable=True)
    escalated_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(100), nullable=True)
    resolution_note = Column(Text, nullable=True)
    
    # Relationships
    patient = relationship("Patient", back_populates="events")
    alert_attempts = relationship("AlertAttempt", back_populates="event", cascade="all, delete-orphan")


class AlertAttempt(Base):
    __tablename__ = "alert_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("emergency_events.id"), nullable=False, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    recipient_name = Column(String(100), nullable=False)
    recipient_phone = Column(String(40), nullable=True)
    recipient_role = Column(String(30), default="PRIMARY_CAREGIVER") # PRIMARY_CAREGIVER, BACKUP_CAREGIVER
    channel = Column(String(40), default="IN_APP") # IN_APP, INTERNET_PUSH, CELLULAR_SMS
    attempt_number = Column(Integer, default=1)
    attempt_status = Column(String(40), default="SENT") # QUEUED, SENT, DELIVERED, FAILED
    provider_message_id = Column(String(100), nullable=True)
    message_content = Column(Text, nullable=True)
    attempted_at = Column(DateTime, default=datetime.datetime.utcnow)
    delivered_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

    event = relationship("EmergencyEvent", back_populates="alert_attempts")


class CaregiverAssignment(Base):
    __tablename__ = "caregiver_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    caregiver_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    priority = Column(Integer, default=1) # 1 = Primary, 2 = Backup
    is_active = Column(Boolean, default=True)

    patient = relationship("Patient", back_populates="caregivers")
    caregiver = relationship("User", back_populates="caregiver_assignments")


class AuditEvent(Base):
    __tablename__ = "audit_events"
    
    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, nullable=True)
    actor_name = Column(String(100), default="System")
    actor_role = Column(String(30), default="SYSTEM")
    action = Column(String(100), nullable=False) # e.g., EVENT_DETECTED, ALERT_SENT, ACKNOWLEDGED, ESCALATED, RESOLVED
    entity_type = Column(String(50), nullable=False) # EmergencyEvent, Patient, Device, SystemSetting
    entity_id = Column(Integer, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


class SystemSetting(Base):
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(80), unique=True, index=True, nullable=False)
    value = Column(String(200), nullable=False)
    description = Column(String(250), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
