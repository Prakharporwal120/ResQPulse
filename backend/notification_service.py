import datetime
import uuid
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from backend.models import EmergencyEvent, AlertAttempt, CaregiverAssignment, User, Device, AuditEvent

class NotificationService:
    """
    Connectivity-Aware Emergency Notification Router.
    Routes alerts dynamically based on device & network connectivity state:
    - ONLINE: In-App notification + Internet Push mock adapter
    - INTERNET_DOWN: Cellular SMS fallback adapter via simulated SIM800L modem
    - NO_NETWORK: Local storage & offline queueing with UI warning
    """
    def __init__(self, mock_sms_failure_rate: float = 0.0):
        self.mock_sms_failure_rate = mock_sms_failure_rate

    def send_emergency_notifications(
        self,
        db: Session,
        event: EmergencyEvent,
        recipient_role: str = "PRIMARY_CAREGIVER"
    ) -> List[AlertAttempt]:
        """
        Dispatches emergency alerts to designated caregiver(s) based on priority
        and current device connectivity.
        """
        now = datetime.datetime.utcnow()
        patient = event.patient
        device = None
        if event.device_id:
            device = db.query(Device).filter(Device.id == event.device_id).first()
        if not device and event.patient_id:
            device = db.query(Device).filter(Device.patient_id == event.patient_id).first()
        connectivity = device.connectivity_status if device else "ONLINE"
        
        # Determine priority: 1 for PRIMARY, 2 for BACKUP
        priority_level = 1 if recipient_role == "PRIMARY_CAREGIVER" else 2
        
        # Look up assigned caregiver(s)
        assignments = db.query(CaregiverAssignment).filter(
            CaregiverAssignment.patient_id == event.patient_id,
            CaregiverAssignment.priority == priority_level,
            CaregiverAssignment.is_active == True
        ).all()
        
        # If no explicit caregiver assigned, fallback to any available caregiver/admin
        recipients = []
        for assign in assignments:
            user = db.query(User).filter(User.id == assign.caregiver_id).first()
            if user:
                recipients.append(user)
                
        if not recipients:
            admin_or_caregiver = db.query(User).filter(
                User.role.in_(["CAREGIVER", "ADMIN"]),
                User.is_active == True
            ).first()
            if admin_or_caregiver:
                recipients.append(admin_or_caregiver)

        alert_attempts: List[AlertAttempt] = []

        # Prepare message text
        coords = f"lat: {event.latitude:.4f}, lon: {event.longitude:.4f}" if event.latitude and event.longitude else (patient.room_or_address or "Location: Home Room A")
        alert_text = (
            f"🚨 [LifeLink AI] CRITICAL ALERT: {event.event_type} for patient {patient.display_name} ({patient.patient_code}). "
            f"Location: {coords}. Severity: {event.severity}. Immediate response requested."
        )

        for recipient in recipients:
            # 1. ALWAYS generate In-App Alert Attempt
            in_app_attempt = AlertAttempt(
                event_id=event.id,
                recipient_id=recipient.id,
                recipient_name=recipient.name,
                recipient_phone=recipient.phone,
                recipient_role=recipient_role,
                channel="IN_APP",
                attempt_number=1,
                attempt_status="DELIVERED",
                provider_message_id=f"inapp-{uuid.uuid4().hex[:10]}",
                message_content=alert_text,
                attempted_at=now,
                delivered_at=now,
                error_message=None
            )
            db.add(in_app_attempt)
            alert_attempts.append(in_app_attempt)

            # 2. Channel selection based on Connectivity State
            if connectivity == "ONLINE":
                # Primary route: Internet-based Push Notification
                push_attempt = AlertAttempt(
                    event_id=event.id,
                    recipient_id=recipient.id,
                    recipient_name=recipient.name,
                    recipient_phone=recipient.phone,
                    recipient_role=recipient_role,
                    channel="INTERNET_PUSH",
                    attempt_number=1,
                    attempt_status="DELIVERED",
                    provider_message_id=f"fcm-mock-{uuid.uuid4().hex[:12]}",
                    message_content=alert_text,
                    attempted_at=now,
                    delivered_at=now + datetime.timedelta(milliseconds=120),
                    error_message=None
                )
                db.add(push_attempt)
                alert_attempts.append(push_attempt)

            elif connectivity == "INTERNET_DOWN":
                # Fallback route: Cellular SMS Mock Adapter
                sms_id = f"sms-sim800l-{uuid.uuid4().hex[:10]}"
                sms_status = "DELIVERED"
                err = None
                delivered_time = now + datetime.timedelta(seconds=2)
                
                sms_attempt = AlertAttempt(
                    event_id=event.id,
                    recipient_id=recipient.id,
                    recipient_name=recipient.name,
                    recipient_phone=recipient.phone or patient.emergency_contact_phone or "+1-555-0199",
                    recipient_role=recipient_role,
                    channel="CELLULAR_SMS",
                    attempt_number=1,
                    attempt_status=sms_status,
                    provider_message_id=sms_id,
                    message_content=f"[FALLBACK SMS via Cellular Modem] {alert_text}",
                    attempted_at=now,
                    delivered_at=delivered_time,
                    error_message=err
                )
                db.add(sms_attempt)
                alert_attempts.append(sms_attempt)

            elif connectivity in ["NO_NETWORK", "OFFLINE"]:
                # Offline route: Queued locally in wearable buffer
                queued_attempt = AlertAttempt(
                    event_id=event.id,
                    recipient_id=recipient.id,
                    recipient_name=recipient.name,
                    recipient_phone=recipient.phone,
                    recipient_role=recipient_role,
                    channel="CELLULAR_SMS",
                    attempt_number=1,
                    attempt_status="QUEUED",
                    provider_message_id=None,
                    message_content=f"[QUEUED OFFLINE] {alert_text}",
                    attempted_at=now,
                    delivered_at=None,
                    error_message="Device network unavailable (Internet & Cellular down). Alert queued in local memory."
                )
                db.add(queued_attempt)
                alert_attempts.append(queued_attempt)

        # Update event status if still in initial DETECTED or PENDING state
        if event.event_status in ["DETECTED", "NOTIFICATION_PENDING"]:
            if connectivity in ["ONLINE", "INTERNET_DOWN"]:
                event.event_status = "NOTIFICATION_ATTEMPTED"
            else:
                event.event_status = "NOTIFICATION_PENDING"
            
        # Log Audit Event
        audit = AuditEvent(
            actor_name="NotificationRouter",
            actor_role="SYSTEM",
            action=f"ALERTS_DISPATCHED_{recipient_role}",
            entity_type="EmergencyEvent",
            entity_id=event.id,
            metadata_json={
                "connectivity": connectivity,
                "recipient_count": len(recipients),
                "channels": [a.channel for a in alert_attempts],
                "statuses": [a.attempt_status for a in alert_attempts]
            },
            created_at=now
        )
        db.add(audit)
        db.commit()
        
        return alert_attempts

notification_service = NotificationService()
