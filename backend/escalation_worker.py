import asyncio
import datetime
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import EmergencyEvent, SystemSetting, AuditEvent
from backend.notification_service import notification_service

class EscalationWorker:
    """
    Automated Background Escalation Manager.
    Regularly inspects active emergency events. If primary caregiver has not
    acknowledged an alert within the configured timeout window, the worker
    escalates the event to the designated backup caregiver.
    """
    def __init__(self, check_interval_seconds: float = 2.0):
        self.check_interval_seconds = check_interval_seconds
        self.is_running = False
        self._task = None

    async def start(self):
        self.is_running = True
        self._task = asyncio.create_task(self._run_loop())

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    def get_escalation_timeout(self, db: Session) -> int:
        setting = db.query(SystemSetting).filter(SystemSetting.key == "escalation_timeout_seconds").first()
        if setting:
            try:
                return int(setting.value)
            except ValueError:
                pass
        return 60  # default 60s for interactive demo

    def check_and_escalate_events(self, db: Session) -> list:
        now = datetime.datetime.utcnow()
        timeout = self.get_escalation_timeout(db)
        
        # Candidate events: active, unacknowledged, un-escalated
        active_events = db.query(EmergencyEvent).filter(
            EmergencyEvent.event_status.in_(["DETECTED", "NOTIFICATION_PENDING", "NOTIFICATION_ATTEMPTED", "ESCALATION_PENDING"]),
            EmergencyEvent.acknowledged_at == None,
            EmergencyEvent.escalated_at == None,
            EmergencyEvent.resolved_at == None
        ).all()

        escalated_events = []
        for event in active_events:
            elapsed = (now - event.created_at).total_seconds()
            if elapsed >= timeout:
                # Idempotent escalation to backup caregiver
                event.event_status = "ESCALATED"
                event.escalated_at = now
                
                # Dispatch notification to backup caregiver
                notification_service.send_emergency_notifications(
                    db=db,
                    event=event,
                    recipient_role="BACKUP_CAREGIVER"
                )
                
                # Audit log
                audit = AuditEvent(
                    actor_name="AutomatedEscalationEngine",
                    actor_role="SYSTEM",
                    action="ESCALATED_TO_BACKUP",
                    entity_type="EmergencyEvent",
                    entity_id=event.id,
                    metadata_json={
                        "timeout_configured_seconds": timeout,
                        "elapsed_seconds": round(elapsed, 1),
                        "reason": f"Primary caregiver did not acknowledge within {timeout}s timeout"
                    },
                    created_at=now
                )
                db.add(audit)
                escalated_events.append(event)
                
        if escalated_events:
            db.commit()
            
        return escalated_events

    async def _run_loop(self):
        while self.is_running:
            try:
                db = SessionLocal()
                try:
                    self.check_and_escalate_events(db)
                finally:
                    db.close()
            except Exception as e:
                # Keep worker resilient
                pass
            await asyncio.sleep(self.check_interval_seconds)

escalation_worker = EscalationWorker()
