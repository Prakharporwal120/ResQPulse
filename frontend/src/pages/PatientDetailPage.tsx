import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Heart,
  Droplets,
  Activity,
  Battery,
  Wifi,
  Phone,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Play,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { api } from '../api';
import { Patient, SensorReading, EmergencyEvent } from '../types';
import { useAuth } from '../context/AuthContext';

export const PatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [events, setEvents] = useState<EmergencyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestTriggering, setIsTestTriggering] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const loadPatientData = async () => {
    if (!id) return;
    try {
      const patientId = parseInt(id, 10);
      const [pRes, rRes, eRes] = await Promise.all([
        api.getPatient(patientId),
        api.getPatientReadings(patientId, 30),
        api.getEvents(undefined, patientId),
      ]);
      setPatient(pRes);
      setReadings(rRes);
      setEvents(eRes);
    } catch (err) {
      console.error('Failed to load patient detail', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
    const interval = setInterval(loadPatientData, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const handleTriggerTest = async (type: string) => {
    if (!patient) return;
    setIsTestTriggering(true);
    setTestResult(null);
    try {
      const res = await api.triggerTestAlert(patient.id, type, 'CRITICAL');
      setTestResult(`Test emergency #${res.id} triggered. Alert notifications dispatched to ${patient.assigned_caregivers[0]?.name || 'Primary Caregiver'}.`);
      await loadPatientData();
    } catch (err: any) {
      alert(`Failed to trigger test: ${err.message}`);
    } finally {
      setIsTestTriggering(false);
    }
  };

  if (isLoading || !patient) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Loading patient dossier...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Directory</span>
        </button>
        <span className="text-xs text-amber-300 font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
          Simulated Health Telemetry &bull; Not Diagnostic
        </span>
      </div>

      {/* Patient Dossier Header Card */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold text-xl">
              {patient.display_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white tracking-tight">{patient.display_name}</h1>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-navy-800 text-teal-300 border border-navy-700">
                  {patient.patient_code}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                    patient.is_active
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                  }`}
                >
                  {patient.is_active ? 'Active Monitoring' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {patient.age ? `${patient.age} years old` : 'Age N/A'} &bull; {patient.gender || 'Unspecified'} &bull; Residence: {patient.room_or_address || 'Home Residence'}
              </p>
            </div>
          </div>

          {/* Quick Test Alert Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTriggerTest('FALL_DETECTED')}
              disabled={isTestTriggering}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-alert-red/20 hover:bg-alert-red/30 border border-alert-red/40 text-red-200 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Simulate Fall Alert</span>
            </button>
            <button
              onClick={() => handleTriggerTest('MANUAL_SOS')}
              disabled={isTestTriggering}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Trigger Manual SOS</span>
            </button>
          </div>
        </div>

        {testResult && (
          <div className="mt-4 p-3 rounded-xl bg-teal-500/15 border border-teal-500/40 text-xs text-teal-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
            <span>{testResult}</span>
          </div>
        )}
      </div>

      {/* Vitals Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Heart Rate */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Heart Rate</span>
            <Heart className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-white">
            {patient.latest_heart_rate ? `${patient.latest_heart_rate} BPM` : '74.2 BPM'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Source: Simulated PPG</p>
        </div>

        {/* SpO2 */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Estimated SpO2</span>
            <Droplets className="h-4 w-4 text-teal-400" />
          </div>
          <p className="text-xl font-bold text-white">
            {patient.latest_spo2 ? `${patient.latest_spo2}%` : '98.5%'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Normal baseline (demo)</p>
        </div>

        {/* Device Battery */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Wearable Battery</span>
            <Battery className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-white">
            {patient.device_battery !== undefined ? `${patient.device_battery}%` : '86%'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            {patient.active_device_code || 'LL-BAND-001'}
          </p>
        </div>

        {/* Connectivity */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Connectivity</span>
            <Wifi className="h-4 w-4 text-teal-400" />
          </div>
          <p className="text-xl font-bold text-teal-300">
            {patient.device_connectivity || 'ONLINE'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">WiFi + Cellular Ready</p>
        </div>
      </div>

      {/* Main Charts & Caregivers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Telemetry Chart */}
        <div className="lg:col-span-2 glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-400" />
              <span>Real-Time Acceleration Magnitude ($g$) & Heart Rate</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Stream: 1Hz</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={readings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3E62" opacity={0.6} />
                <XAxis dataKey="timestamp" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis yAxisId="left" domain={[0, 4.5]} stroke="#14B8A6" fontSize={10} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[55, 120]} stroke="#F59E0B" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B192C', borderColor: '#1E3E62', borderRadius: '8px', fontSize: '12px' }}
                />
                <Line yAxisId="left" type="monotone" dataKey="magnitude" stroke="#14B8A6" strokeWidth={2} dot={false} name="Magnitude (g)" />
                <Line yAxisId="right" type="monotone" dataKey="heart_rate" stroke="#F59E0B" strokeWidth={2} dot={false} name="Heart Rate (BPM)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Assigned Contacts & Medical Notes */}
        <div className="space-y-6">
          <div className="glass-card p-5 rounded-2xl">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4 text-teal-400" />
              <span>Emergency Contacts & Caregivers</span>
            </h3>

            <div className="space-y-3 text-xs">
              {/* Primary Family Contact */}
              <div className="p-3 rounded-xl bg-navy-950/60 border border-navy-800">
                <span className="text-[10px] uppercase font-bold text-teal-400">Family Next of Kin</span>
                <p className="font-semibold text-white mt-0.5">{patient.emergency_contact_name || 'Grace King (Daughter)'}</p>
                <p className="text-slate-400 font-mono mt-0.5">{patient.emergency_contact_phone || '+1-555-0188'}</p>
              </div>

              {/* Assigned Clinical Caregiver */}
              <div className="p-3 rounded-xl bg-navy-950/60 border border-navy-800">
                <span className="text-[10px] uppercase font-bold text-teal-400">Assigned Nurse / Primary</span>
                {patient.assigned_caregivers.length > 0 ? (
                  patient.assigned_caregivers.map((cg) => (
                    <div key={cg.caregiver_id} className="mt-1">
                      <p className="font-semibold text-white">{cg.name} (Priority {cg.priority})</p>
                      <p className="text-slate-400 text-[11px]">{cg.phone || cg.email}</p>
                    </div>
                  ))
                ) : (
                  <p className="font-semibold text-white mt-0.5">Elena Davis, RN (Primary)</p>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <h3 className="text-sm font-bold text-white mb-2">Medical History & Risk Notes</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {patient.medical_notes || 'No chronic mobility issues reported.'}
            </p>
          </div>
        </div>
      </div>

      {/* Patient Recent Emergencies Table */}
      <div className="glass-card p-5 rounded-2xl">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-alert-red" />
          <span>Patient Emergency Event History</span>
        </h3>

        {events.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No historical emergency incidents recorded for this patient.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase font-semibold text-slate-400 border-b border-navy-800">
                <tr>
                  <th className="pb-2.5">Event ID</th>
                  <th className="pb-2.5">Type</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5">Severity</th>
                  <th className="pb-2.5">Detected At</th>
                  <th className="pb-2.5">Acknowledged By</th>
                  <th className="pb-2.5">Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-navy-800/30">
                    <td className="py-2.5 font-mono text-teal-300 font-semibold">#{e.id}</td>
                    <td className="py-2.5 font-medium text-white">{e.event_type.replace('_', ' ')}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          e.event_status === 'RESOLVED'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : e.event_status === 'ACKNOWLEDGED'
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            : 'bg-red-500/15 text-red-300 border border-red-500/30 animate-pulse'
                        }`}
                      >
                        {e.event_status}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="text-[10px] font-semibold text-alert-amber">{e.severity}</span>
                    </td>
                    <td className="py-2.5 text-slate-400">{new Date(e.created_at).toLocaleTimeString()}</td>
                    <td className="py-2.5 text-slate-300">{e.acknowledged_by || '--'}</td>
                    <td className="py-2.5 text-slate-400 max-w-xs truncate">{e.resolution_note || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
