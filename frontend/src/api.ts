import {
  User, Patient, Device, EmergencyEvent, DashboardSummary,
  SensorReading, AuditActivity, AnalyticsSummary
} from './types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('lifelink_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const demoRole = localStorage.getItem('lifelink_demo_role') || 'ADMIN';
    headers['X-Demo-Role'] = demoRole;
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      let errorMsg = `API Error ${res.status}: ${res.statusText}`;
      try {
        const json = await res.json();
        if (json.detail) errorMsg = typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail);
      } catch {}
      throw new Error(errorMsg);
    }

    return res.json();
  }

  // Auth
  async login(email: string, password: string):Promise<{ access_token: string; user: User }> {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe(): Promise<User> {
    return this.request('/api/auth/me');
  }

  async getDemoUsers(): Promise<Array<{ id: number; name: string; email: string; role: string; description: string }>> {
    return this.request('/api/auth/demo-users');
  }

  async switchDemoRole(role: string): Promise<{ access_token: string; user: User }> {
    return this.request(`/api/auth/demo-switch/${role}`, { method: 'POST' });
  }

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    return this.request('/api/dashboard/summary');
  }

  async getDashboardActivity(limit: number = 10): Promise<AuditActivity[]> {
    return this.request(`/api/dashboard/activity?limit=${limit}`);
  }

  async getVitalsTrend(patientId?: number, limit: number = 30): Promise<SensorReading[]> {
    const q = patientId ? `?patient_id=${patientId}&limit=${limit}` : `?limit=${limit}`;
    return this.request(`/api/dashboard/vitals-trend${q}`);
  }

  // Patients
  async getPatients(search?: string, statusFilter?: string): Promise<Patient[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (statusFilter) params.append('status_filter', statusFilter);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/patients${qs}`);
  }

  async getPatient(id: number): Promise<Patient> {
    return this.request(`/api/patients/${id}`);
  }

  async createPatient(payload: Partial<Patient>): Promise<Patient> {
    return this.request('/api/patients', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updatePatient(id: number, payload: Partial<Patient>): Promise<Patient> {
    return this.request(`/api/patients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async getPatientReadings(id: number, limit: number = 40): Promise<SensorReading[]> {
    return this.request(`/api/patients/${id}/readings?limit=${limit}`);
  }

  async getPatientEvents(id: number): Promise<EmergencyEvent[]> {
    return this.request(`/api/patients/${id}/events`);
  }

  // Devices
  async getDevices(): Promise<Device[]> {
    return this.request('/api/devices');
  }

  async createDevice(payload: Partial<Device>): Promise<Device> {
    return this.request('/api/devices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateDevice(id: number, payload: Partial<Device>): Promise<Device> {
    return this.request(`/api/devices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // Emergency Events
  async getEvents(statusFilter?: string, patientId?: number): Promise<EmergencyEvent[]> {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status_filter', statusFilter);
    if (patientId) params.append('patient_id', patientId.toString());
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/events${qs}`);
  }

  async getEvent(id: number): Promise<EmergencyEvent> {
    return this.request(`/api/events/${id}`);
  }

  async triggerTestAlert(patientId: number, eventType: string = 'MANUAL_SOS', severity: string = 'CRITICAL'): Promise<EmergencyEvent> {
    return this.request('/api/events/test', {
      method: 'POST',
      body: JSON.stringify({ patient_id: patientId, event_type: eventType, severity }),
    });
  }

  async acknowledgeEvent(id: number, caregiverName?: string, note?: string): Promise<EmergencyEvent> {
    return this.request(`/api/events/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ caregiver_name: caregiverName, note }),
    });
  }

  async respondEvent(id: number, responderName?: string, note?: string): Promise<EmergencyEvent> {
    return this.request(`/api/events/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ responder_name: responderName, note }),
    });
  }

  async markContacted(id: number, note?: string): Promise<EmergencyEvent> {
    return this.request(`/api/events/${id}/contacted`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  async resolveEvent(id: number, resolutionNote: string, resolverName?: string): Promise<EmergencyEvent> {
    return this.request(`/api/events/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution_note: resolutionNote, resolver_name: resolverName }),
    });
  }

  async escalateEvent(id: number, reason?: string): Promise<EmergencyEvent> {
    return this.request(`/api/events/${id}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Simulation
  async runScenario(scenario: string, patientId?: number): Promise<any> {
    return this.request('/api/simulation/scenario', {
      method: 'POST',
      body: JSON.stringify({ scenario, patient_id: patientId }),
    });
  }

  async getSimulationStatus(): Promise<any> {
    return this.request('/api/simulation/status');
  }

  async startSimulation(): Promise<any> {
    return this.request('/api/simulation/start', { method: 'POST' });
  }

  async pauseSimulation(): Promise<any> {
    return this.request('/api/simulation/pause', { method: 'POST' });
  }

  async resetDemoData(): Promise<any> {
    return this.request('/api/simulation/reset-demo', { method: 'POST' });
  }

  // Analytics
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    return this.request('/api/analytics/summary');
  }

  getExportCsvUrl(): string {
    return `${BASE_URL}/api/analytics/export.csv`;
  }

  // Settings
  async getSettings(): Promise<any> {
    return this.request('/api/settings');
  }

  async updateSettings(payload: Record<string, any>): Promise<any> {
    return this.request('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiService();
