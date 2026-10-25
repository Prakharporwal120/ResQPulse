export interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'CAREGIVER' | 'PATIENT';
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface CaregiverInfo {
  caregiver_id: number;
  name: string;
  email: string;
  phone?: string;
  priority: number; // 1 = Primary, 2 = Backup
}

export interface Patient {
  id: number;
  patient_code: string;
  display_name: string;
  age?: number;
  gender?: string;
  medical_notes?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  room_or_address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  active_device_code?: string;
  device_battery?: number;
  device_connectivity?: string;
  last_reading_time?: string;
  latest_heart_rate?: number;
  latest_spo2?: number;
  has_active_emergency: boolean;
  assigned_caregivers: CaregiverInfo[];
}

export interface Device {
  id: number;
  device_code: string;
  patient_id?: number;
  patient_name?: string;
  device_type: string;
  source_type: string;
  firmware_version: string;
  battery_level?: number;
  connectivity_status: 'ONLINE' | 'INTERNET_DOWN' | 'NO_NETWORK' | 'OFFLINE';
  cellular_signal: number;
  last_seen_at: string;
  created_at: string;
}

export interface AlertAttempt {
  id: number;
  event_id: number;
  recipient_id?: number;
  recipient_name: string;
  recipient_phone?: string;
  recipient_role: string;
  channel: 'IN_APP' | 'INTERNET_PUSH' | 'CELLULAR_SMS';
  attempt_number: number;
  attempt_status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED';
  provider_message_id?: string;
  message_content?: string;
  attempted_at: string;
  delivered_at?: string;
  error_message?: string;
}

export interface EmergencyEvent {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_code: string;
  device_id?: number;
  device_code?: string;
  event_type: 'FALL_DETECTED' | 'MANUAL_SOS' | 'THRESHOLD_BREACH';
  event_status: 'DETECTED' | 'NOTIFICATION_PENDING' | 'NOTIFICATION_ATTEMPTED' | 'ACKNOWLEDGED' | 'RESPONDING' | 'RESOLVED' | 'ESCALATED' | 'CANCELLED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  detection_method: string;
  confidence?: number;
  evidence?: Record<string, any>;
  latitude?: number;
  longitude?: number;
  location_source?: string;
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  responding_at?: string;
  responding_by?: string;
  patient_contacted_at?: string;
  escalated_at?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_note?: string;
  alert_attempts: AlertAttempt[];
  primary_caregiver_name?: string;
  backup_caregiver_name?: string;
  seconds_elapsed?: number;
  is_escalated: boolean;
}

export interface DashboardSummary {
  total_patients: number;
  online_patients: number;
  active_emergencies: number;
  low_battery_devices: number;
  stale_devices: number;
  acknowledgement_rate_pct: number;
  avg_ack_time_seconds: number;
  system_connectivity: string;
  environment: string;
}

export interface SensorReading {
  id: number;
  timestamp: string;
  ax?: number;
  ay?: number;
  az?: number;
  magnitude?: number;
  heart_rate?: number;
  spo2?: number;
  source: string;
}

export interface AuditActivity {
  id: number;
  actor: string;
  role: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  details?: Record<string, any>;
  created_at: string;
}

export interface AnalyticsSummary {
  total_falls_detected: number;
  total_manual_sos: number;
  total_events: number;
  acknowledgement_rate_pct: number;
  avg_ack_time_seconds: number;
  median_ack_time_seconds: number;
  false_positive_count: number;
  in_app_deliveries: number;
  cellular_sms_deliveries: number;
  queued_offline_attempts: number;
  device_uptime_pct: number;
  timeline: Array<{
    date: string;
    falls: number;
    sos: number;
    threshold: number;
    total: number;
  }>;
  delivery_breakdown: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}
