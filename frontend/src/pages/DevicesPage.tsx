import React, { useState, useEffect } from 'react';
import {
  Radio,
  Plus,
  Battery,
  Wifi,
  Cpu,
  Clock,
  UserCheck,
  ShieldCheck,
  X,
  AlertCircle,
  FileCode2
} from 'lucide-react';
import { api } from '../api';
import { Device, Patient } from '../types';
import { useAuth } from '../context/AuthContext';

export const DevicesPage: React.FC = () => {
  const { role } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    device_code: '',
    device_type: 'WEARABLE_BAND',
    source_type: 'SIMULATED',
    firmware_version: 'v1.4.2-sim',
    patient_id: ''
  });
  const [formError, setFormError] = useState<string | null>(null);

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const [devs, pts] = await Promise.all([api.getDevices(), api.getPatients()]);
      setDevices(devs);
      setPatients(pts);
    } catch (err) {
      console.error('Failed to load devices', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!registerForm.device_code.trim()) {
      setFormError('Device code is required.');
      return;
    }

    try {
      await api.createDevice({
        device_code: registerForm.device_code.trim().toUpperCase(),
        device_type: registerForm.device_type,
        source_type: registerForm.source_type,
        firmware_version: registerForm.firmware_version,
        patient_id: registerForm.patient_id ? parseInt(registerForm.patient_id, 10) : undefined,
      });
      setIsRegisterModalOpen(false);
      setRegisterForm({
        device_code: '',
        device_type: 'WEARABLE_BAND',
        source_type: 'SIMULATED',
        firmware_version: 'v1.4.2-sim',
        patient_id: ''
      });
      await loadDevices();
    } catch (err: any) {
      setFormError(err.message || 'Failed to register device.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Radio className="h-5 w-5 text-teal-400" />
            <span>Wearable Hardware & Device Registry</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered wearable wristbands, SOS emergency pendants, and smart sensors.
          </p>
        </div>

        {role === 'ADMIN' && (
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md shadow-teal-600/30 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Provision New Device</span>
          </button>
        )}
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {devices.map((d) => (
          <div key={d.id} className="glass-card glass-card-hover p-5 rounded-2xl flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-white text-sm font-mono">{d.device_code}</h3>
                  <p className="text-[11px] text-teal-400">{d.device_type.replace('_', ' ')}</p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    d.connectivity_status === 'ONLINE'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : d.connectivity_status === 'INTERNET_DOWN'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-red-500/15 text-red-300 border-red-500/30'
                  }`}
                >
                  {d.connectivity_status}
                </span>
              </div>

              {/* Patient Assignment */}
              <div className="p-3 rounded-xl bg-navy-950/60 border border-navy-800/80 mb-3 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Patient</span>
                <p className="text-xs font-semibold text-white">
                  {d.patient_name || 'Unassigned / Available in Stock'}
                </p>
              </div>

              {/* Status details */}
              <div className="space-y-2 text-xs text-slate-300 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Telemetry Source:</span>
                  <span className="font-semibold text-white px-1.5 py-0.5 rounded bg-navy-800 text-[10px] border border-navy-700">
                    {d.source_type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Battery Level:</span>
                  <span
                    className={`font-bold font-mono ${
                      (d.battery_level || 0) < 20 ? 'text-alert-red animate-pulse' : 'text-emerald-400'
                    }`}
                  >
                    {d.battery_level !== undefined ? `${d.battery_level}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Firmware:</span>
                  <span className="font-mono text-[10px] text-slate-400">{d.firmware_version}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-navy-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>Last seen: {new Date(d.last_seen_at).toLocaleTimeString()}</span>
              </span>
              <span className="text-teal-400 font-mono font-semibold">Signal: {d.cellular_signal}/5</span>
            </div>
          </div>
        ))}
      </div>

      {/* Hardware Telemetry Ingestion Contract Box */}
      <div className="glass-card p-6 rounded-2xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-teal-400" />
          <span>Physical Wearable Telemetry Endpoint Contract (ESP32 Integration)</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Physical ESP32 wearables with MPU-6050 IMU and SIM800L cellular modems stream 100Hz onboard samples averaged to 1Hz HTTP POST packets to <code className="text-teal-300 bg-navy-950 px-1.5 py-0.5 rounded font-mono">/api/telemetry</code>.
        </p>
        <div className="p-3.5 rounded-xl bg-navy-950/80 border border-navy-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
          <code>
            {`POST http://localhost:8000/api/telemetry
Content-Type: application/json

{
  "device_code": "LL-ESP32-HARDWARE-01",
  "ax": 0.045, "ay": 0.082, "az": 0.985,
  "gx": 1.2, "gy": -0.8, "gz": 0.4,
  "heart_rate": 74.0, "spo2": 98.2,
  "battery_level": 88,
  "connectivity_status": "ONLINE",
  "is_sos_pressed": false
}`}
          </code>
        </div>
      </div>

      {/* Register Device Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-navy-900 border border-navy-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-navy-800 flex items-center justify-between bg-navy-950/60">
              <h2 className="text-base font-bold text-white">Provision Wearable Device</h2>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterDevice} className="p-5 space-y-3.5">
              {formError && (
                <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Device Hardware Code *
                </label>
                <input
                  type="text"
                  placeholder="LL-BAND-004 or LL-ESP32-01"
                  value={registerForm.device_code}
                  onChange={(e) => setRegisterForm({ ...registerForm, device_code: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-navy-950/80 border border-navy-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Form Factor
                  </label>
                  <select
                    value={registerForm.device_type}
                    onChange={(e) => setRegisterForm({ ...registerForm, device_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-navy-950/80 border border-navy-700 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="WEARABLE_BAND">Wearable Band</option>
                    <option value="PENDANT">Emergency Pendant</option>
                    <option value="WATCH">Smart Watch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Telemetry Source
                  </label>
                  <select
                    value={registerForm.source_type}
                    onChange={(e) => setRegisterForm({ ...registerForm, source_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-navy-950/80 border border-navy-700 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="SIMULATED">Simulated Feed</option>
                    <option value="PHYSICAL_ESP32">Physical ESP32 Wearable</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Assign to Patient
                </label>
                <select
                  value={registerForm.patient_id}
                  onChange={(e) => setRegisterForm({ ...registerForm, patient_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-navy-950/80 border border-navy-700 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="">Unassigned (Keep in Inventory)</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name} ({p.patient_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-navy-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-750 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md shadow-teal-600/30"
                >
                  Register Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
