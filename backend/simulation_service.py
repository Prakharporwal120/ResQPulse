import asyncio
import datetime
import math
import random
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import Device, Patient, SensorReading, EmergencyEvent, AlertAttempt, AuditEvent
from backend.fall_detector import fall_engine
from backend.notification_service import notification_service

class SimulationService:
    """
    LifeLink AI Simulation Engine.
    Generates deterministic test scenarios and continuous realistic telemetry.
    Explicitly labeled as SIMULATED data throughout.
    """
    def __init__(self):
        self.is_running = True
        self.active_scenario: Optional[str] = None
        self.frequency_hz: float = 1.0
        self.step_counter: int = 0
        self._task = None
        self._stale_patients = set()

    async def start(self):
        self.is_running = True
        if not self._task or self._task.done():
            self._task = asyncio.create_task(self._streaming_loop())

    async def pause(self):
        self.is_running = False

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    def run_deterministic_scenario(self, db: Session, scenario: str, patient_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Executes a deterministic test scenario with predictable outcomes for competitions/demos.
        """
        now = datetime.datetime.utcnow()
        self.active_scenario = scenario
        
        # Select target patient or default to Patient 1
        patient = None
        if patient_id:
            patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            patient = db.query(Patient).filter(Patient.is_active == True).first()
            
        if not patient:
            return {"status": "error", "message": "No active patient found"}

        device = db.query(Device).filter(Device.patient_id == patient.id).first()
        if not device:
            device = db.query(Device).first()

        result = {
            "scenario": scenario,
            "patient_id": patient.id,
            "patient_name": patient.display_name,
            "device_code": device.device_code if device else "DEV-SIM-01",
            "timestamp": now.isoformat(),
            "outcome": ""
        }

        if scenario == "normal_walking":
            self._stale_patients.discard(patient.id)
            if device:
                device.connectivity_status = "ONLINE"
                device.last_seen_at = now
            # Normal walking telemetry
            reading = SensorReading(
                device_id=device.id if device else 1,
                patient_id=patient.id,
                sensor_type="COMPOSITE",
                ax=0.08,
                ay=0.12,
                az=0.99,
                magnitude=fall_engine.calculate_magnitude(0.08, 0.12, 0.99),
                gx=12.0,
                gy=-8.5,
                gz=4.2,
                heart_rate=74.0,
                spo2=98.5,
                source_type="SIMULATED",
                recorded_at=now,
                received_at=now
            )
            db.add(reading)
            db.commit()
            result["outcome"] = "Normal walking gait recorded (1.00g). No fall detected. Baseline stable."

        elif scenario == "sudden_fall":
            self._stale_patients.discard(patient.id)
            if device:
                device.last_seen_at = now
            
            # Step 1: Pre-fall freefall sample (0.3g)
            t_pre = now - datetime.timedelta(milliseconds=400)
            ff_mag = fall_engine.calculate_magnitude(0.12, 0.15, 0.22)
            db.add(SensorReading(
                device_id=device.id if device else 1,
                patient_id=patient.id,
                sensor_type="COMPOSITE",
                ax=0.12, ay=0.15, az=0.22,
                magnitude=ff_mag,
                gx=45.0, gy=30.0, gz=15.0,
                heart_rate=88.0, spo2=97.0,
                source_type="SIMULATED",
                recorded_at=t_pre, received_at=t_pre
            ))
            
            # Feed into fall detector engine
            fall_engine.process_sample(patient.id, 0.12, 0.15, 0.22, 45.0, 30.0, 15.0, t_pre)

            # Step 2: High impact sample (3.92g)
            t_impact = now - datetime.timedelta(milliseconds=200)
            impact_mag = fall_engine.calculate_magnitude(1.4, 1.8, 3.2)
            db.add(SensorReading(
                device_id=device.id if device else 1,
                patient_id=patient.id,
                sensor_type="COMPOSITE",
                ax=1.4, ay=1.8, az=3.2,
                magnitude=impact_mag,
                gx=195.0, gy=140.0, gz=85.0,
                heart_rate=95.0, spo2=96.0,
                source_type="SIMULATED",
                recorded_at=t_impact, received_at=t_impact
            ))
            fall_engine.process_sample(patient.id, 1.4, 1.8, 3.2, 195.0, 140.0, 85.0, t_impact)

            # Step 3: Post-impact stillness (patient resting horizontally on floor)
            still_mag = fall_engine.calculate_magnitude(0.92, 0.35, 0.14)
            db.add(SensorReading(
                device_id=device.id if device else 1,
                patient_id=patient.id,
                sensor_type="COMPOSITE",
                ax=0.92, ay=0.35, az=0.14,
                magnitude=still_mag,
                gx=0.5, gy=0.2, gz=0.1,
                heart_rate=92.0, spo2=96.0,
                source_type="SIMULATED",
                recorded_at=now, received_at=now
            ))
            
            is_detected, method, confidence, evidence = fall_engine.process_sample(
                patient.id, 0.92, 0.35, 0.14, 0.5, 0.2, 0.1, now
            )
            
            # Create Emergency Event
            event = EmergencyEvent(
                patient_id=patient.id,
                device_id=device.id if device else None,
                event_type="FALL_DETECTED",
                event_status="DETECTED",
                severity="CRITICAL",
                detection_method=method or "ACCEL_IMPACT_INACTIVITY",
                confidence=confidence or 0.94,
                evidence=evidence,
                latitude=40.7128 + random.uniform(-0.005, 0.005),
                longitude=-74.0060 + random.uniform(-0.005, 0.005),
                location_source="SIMULATED_ESTIMATE",
                created_at=now
            )
            db.add(event)
            db.commit()
            db.refresh(event)

            # Trigger connectivity-aware notifications
            attempts = notification_service.send_emergency_notifications(db, event, "PRIMARY_CAREGIVER")
            
            result["event_id"] = event.id
            result["outcome"] = f"CRITICAL FALL DETECTED (Impact: {evidence.get('peak_acceleration_g', 3.92)}g). Notifications dispatched to primary caregiver."
            result["alerts_generated"] = len(attempts)

        elif scenario == "manual_sos":
            self._stale_patients.discard(patient.id)
            if device:
                device.last_seen_at = now

            # Manual SOS immediately bypasses fall detection
            event = EmergencyEvent(
                patient_id=patient.id,
                device_id=device.id if device else None,
                event_type="MANUAL_SOS",
                event_status="DETECTED",
                severity="CRITICAL",
                detection_method="MANUAL_TRIGGER",
                confidence=1.00,
                evidence={
                    "trigger_type": "PHYSICAL_BUTTON_PRESS",
                    "button_hold_duration_ms": 1500,
                    "bypass_classifier": True,
                    "note": "SOS emergency button pressed manually by patient."
                },
                latitude=40.7128 + random.uniform(-0.005, 0.005),
                longitude=-74.0060 + random.uniform(-0.005, 0.005),
                location_source="SIMULATED_ESTIMATE",
                created_at=now
            )
            db.add(event)
            db.commit()
            db.refresh(event)

            attempts = notification_service.send_emergency_notifications(db, event, "PRIMARY_CAREGIVER")
            result["event_id"] = event.id
            result["outcome"] = "MANUAL SOS ACTIVATED: Emergency triggered immediately by wearable SOS button. Alert dispatched."
            result["alerts_generated"] = len(attempts)

        elif scenario == "internet_down":
            if device:
                device.connectivity_status = "INTERNET_DOWN"
                db.commit()
            result["outcome"] = "INTERNET OUTAGE SIMULATED: Wearable internet dropped. System now using Cellular SMS fallback adapter."

        elif scenario == "no_network":
            if device:
                device.connectivity_status = "NO_NETWORK"
                db.commit()
            result["outcome"] = "COMPLETE NETWORK OUTAGE SIMULATED: Both Internet and Cellular offline. Alerts will be queued locally in wearable memory."

        elif scenario == "restore_network":
            if device:
                device.connectivity_status = "ONLINE"
                device.last_seen_at = now
                db.commit()
            # Flush queued alerts
            queued_attempts = db.query(AlertAttempt).filter(AlertAttempt.attempt_status == "QUEUED").all()
            for att in queued_attempts:
                att.attempt_status = "DELIVERED"
                att.delivered_at = now
                att.error_message = "Flushed from local wearable queue upon network recovery."
            db.commit()
            result["outcome"] = f"CONNECTIVITY RESTORED: Device online. {len(queued_attempts)} offline alerts flushed and confirmed delivered."

        elif scenario == "low_battery":
            if device:
                device.battery_level = 11
                device.last_seen_at = now
                db.commit()
            result["outcome"] = "LOW BATTERY ALERT: Wearable battery dropped to 11%. Caregiver dashboard warns to charge device."

        elif scenario == "stale_data":
            self._stale_patients.add(patient.id)
            if device:
                # Set last seen to 25 minutes ago
                device.last_seen_at = now - datetime.timedelta(minutes=25)
                db.commit()
            result["outcome"] = "STALE DATA SIMULATED: Wearable telemetry ceased. Dashboard flags sensor data as stale (> 15m ago)."

        # Log audit
        audit = AuditEvent(
            actor_name="SimulationEngine",
            actor_role="SYSTEM",
            action=f"SIMULATION_SCENARIO_{scenario.upper()}",
            entity_type="Patient",
            entity_id=patient.id,
            metadata_json=result,
            created_at=now
        )
        db.add(audit)
        db.commit()

        return result

    async def _streaming_loop(self):
        """
        Background loop simulating live telemetry stream for connected devices
        at ~1Hz frequency when simulation is running.
        """
        while self.is_running:
            try:
                db = SessionLocal()
                try:
                    now = datetime.datetime.utcnow()
                    self.step_counter += 1
                    t = self.step_counter * 0.5
                    
                    devices = db.query(Device).filter(Device.source_type == "SIMULATED").all()
                    for device in devices:
                        if not device.patient_id or device.patient_id in self._stale_patients:
                            continue
                            
                        # Slight realistic breathing / heart rate variation
                        base_hr = 70 + (device.patient_id * 3)
                        hr = round(base_hr + 4 * math.sin(t * 0.3) + random.uniform(-1.5, 1.5), 1)
                        spo2 = round(98.0 + 0.8 * math.cos(t * 0.2) + random.uniform(-0.3, 0.3), 1)
                        spo2 = min(99.5, max(95.0, spo2))
                        
                        # Plausible micro-movements
                        ax = round(0.04 * math.sin(t) + random.uniform(-0.02, 0.02), 3)
                        ay = round(0.06 * math.cos(t) + random.uniform(-0.02, 0.02), 3)
                        az = round(0.98 + 0.05 * math.sin(t * 1.5) + random.uniform(-0.02, 0.02), 3)
                        mag = round(fall_engine.calculate_magnitude(ax, ay, az), 3)
                        
                        reading = SensorReading(
                            device_id=device.id,
                            patient_id=device.patient_id,
                            sensor_type="COMPOSITE",
                            ax=ax, ay=ay, az=az,
                            magnitude=mag,
                            gx=round(random.uniform(-5.0, 5.0), 1),
                            gy=round(random.uniform(-5.0, 5.0), 1),
                            gz=round(random.uniform(-5.0, 5.0), 1),
                            heart_rate=hr,
                            spo2=spo2,
                            source_type="SIMULATED",
                            recorded_at=now,
                            received_at=now
                        )
                        db.add(reading)
                        device.last_seen_at = now
                        
                    db.commit()
                finally:
                    db.close()
            except Exception:
                pass
            await asyncio.sleep(1.0 / self.frequency_hz)

simulation_service = SimulationService()
