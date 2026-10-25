import math
import datetime
from typing import Dict, Any, Optional, List, Tuple

class FallDetectionEngine:
    """
    LifeLink AI Fall Detection Engine
    Processes IMU telemetry windows (acceleration and gyroscope) to detect
    real-world fall biomechanics:
    1. Weightlessness / Free-fall phase (M < free_fall_threshold)
    2. Impact phase (M > impact_threshold)
    3. Orientation change / Angular rate spike
    4. Post-impact stillness / Inactivity verification window
    
    Includes patient-level cooldown deduplication to prevent alert storms.
    """
    def __init__(
        self,
        impact_threshold: float = 2.8,       # in g
        free_fall_threshold: float = 0.55,   # in g
        inactivity_threshold: float = 0.35,  # std deviation of accel magnitude
        cooldown_seconds: int = 20
    ):
        self.impact_threshold = impact_threshold
        self.free_fall_threshold = free_fall_threshold
        self.inactivity_threshold = inactivity_threshold
        self.cooldown_seconds = cooldown_seconds
        
        # Buffer of recent readings per patient_id: list of (timestamp, ax, ay, az, gx, gy, gz, magnitude)
        self._patient_buffers: Dict[int, List[Dict[str, Any]]] = {}
        # Cooldown tracker: patient_id -> last_event_datetime
        self._last_event_time: Dict[int, datetime.datetime] = {}

    def calculate_magnitude(self, ax: float, ay: float, az: float) -> float:
        return math.sqrt(ax * ax + ay * ay + az * az)

    def is_in_cooldown(self, patient_id: int, current_time: datetime.datetime) -> bool:
        if patient_id not in self._last_event_time:
            return False
        delta = (current_time - self._last_event_time[patient_id]).total_seconds()
        return delta < self.cooldown_seconds

    def record_event_trigger(self, patient_id: int, current_time: datetime.datetime):
        self._last_event_time[patient_id] = current_time

    def process_sample(
        self,
        patient_id: int,
        ax: float,
        ay: float,
        az: float,
        gx: float = 0.0,
        gy: float = 0.0,
        gz: float = 0.0,
        timestamp: Optional[datetime.datetime] = None
    ) -> Tuple[bool, Optional[str], Optional[float], Dict[str, Any]]:
        """
        Ingests a single sensor reading and evaluates the sliding window.
        Returns:
            (is_fall_detected, detection_method, confidence, evidence_dict)
        """
        now = timestamp or datetime.datetime.utcnow()
        mag = self.calculate_magnitude(ax, ay, az)
        
        # Initialize buffer
        if patient_id not in self._patient_buffers:
            self._patient_buffers[patient_id] = []
            
        buf = self._patient_buffers[patient_id]
        buf.append({
            "timestamp": now,
            "ax": ax, "ay": ay, "az": az,
            "gx": gx, "gy": gy, "gz": gz,
            "magnitude": mag
        })
        
        # Retain only the last 50 samples (approx. 5-10 seconds at 5-10Hz)
        if len(buf) > 50:
            self._patient_buffers[patient_id] = buf[-50:]
            buf = self._patient_buffers[patient_id]

        # Check cooldown
        if self.is_in_cooldown(patient_id, now):
            return False, "COOLDOWN_ACTIVE", None, {
                "reason": "Alert deduplication cooldown active",
                "seconds_remaining": round(self.cooldown_seconds - (now - self._last_event_time[patient_id]).total_seconds(), 1)
            }

        # If insufficient data (< 3 samples), do not fabricate confidence
        if len(buf) < 3:
            return False, "INSUFFICIENT_DATA", None, {"sample_count": len(buf)}

        # Find maximum impact in the recent window
        recent_window = buf[-15:] # last ~1.5 to 3 seconds
        max_mag_sample = max(recent_window, key=lambda s: s["magnitude"])
        max_mag = max_mag_sample["magnitude"]
        
        # Free-fall phase detection in samples preceding the peak
        peak_idx = recent_window.index(max_mag_sample)
        pre_peak_samples = recent_window[:peak_idx]
        has_free_fall = any(s["magnitude"] <= self.free_fall_threshold for s in pre_peak_samples)

        # Gyroscope rotation check
        max_gyro = max(
            math.sqrt(s["gx"]**2 + s["gy"]**2 + s["gz"]**2) for s in recent_window
        ) if any(s["gx"] != 0.0 or s["gy"] != 0.0 or s["gz"] != 0.0 for s in recent_window) else 0.0

        # Check if impact threshold breached
        if max_mag >= self.impact_threshold:
            # Check post-impact samples (if any)
            post_peak_samples = recent_window[peak_idx + 1:]
            inactivity_confirmed = False
            post_std_dev = 0.0
            
            if len(post_peak_samples) >= 3:
                post_mags = [s["magnitude"] for s in post_peak_samples]
                mean_mag = sum(post_mags) / len(post_mags)
                variance = sum((m - mean_mag)**2 for m in post_mags) / len(post_mags)
                post_std_dev = math.sqrt(variance)
                # Inactivity: low variance around resting position
                if post_std_dev <= self.inactivity_threshold:
                    inactivity_confirmed = True
            else:
                # If peak just arrived at the end of the window, mark potential impact
                inactivity_confirmed = True

            # Calculate confidence score based on biomechanical criteria
            confidence_score = 0.50 # Baseline for exceeding impact threshold
            if has_free_fall:
                confidence_score += 0.25 # Free-fall signature
            if max_gyro > 60.0:  # Rapid body rotation > 60 deg/s
                confidence_score += 0.15
            if inactivity_confirmed:
                confidence_score += 0.10
                
            confidence_score = min(0.98, round(confidence_score, 2))

            evidence = {
                "peak_acceleration_g": round(max_mag, 2),
                "threshold_g": self.impact_threshold,
                "free_fall_detected": has_free_fall,
                "free_fall_threshold_g": self.free_fall_threshold,
                "peak_angular_velocity_dps": round(max_gyro, 1),
                "inactivity_confirmed": inactivity_confirmed,
                "post_impact_std_dev": round(post_std_dev, 3),
                "detection_engine": "LifeLink-Deterministic-Biomechanical-v1",
                "disclaimer": "Simulated/experimental algorithm. Not a certified medical diagnosis."
            }

            self.record_event_trigger(patient_id, now)
            return True, "ACCEL_IMPACT_INACTIVITY", confidence_score, evidence

        return False, "NORMAL_ACTIVITY", None, {
            "current_magnitude": round(mag, 2),
            "threshold_g": self.impact_threshold
        }

# Global detection engine instance
fall_engine = FallDetectionEngine()
