import React, { useState, useEffect } from 'react';
import {
  Activity,
  Play,
  Pause,
  Square,
  ShieldAlert,
  Battery,
  Wifi,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Heart
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { api } from '../api';
import { Patient, SensorReading, Device } from '../types';

export const LiveMonitoringPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number>(1);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [device, setDevice] = useState<Device | null>(null);
  const [isSimRunning, setIsSimRunning] = useState<boolean>(true);
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [lastTick, setLastTick] = useState<string>(new Date().toLocaleTimeString());

  const fetchStreamData = async () => {
    try {
      const [pts, rds, devs] = await Promise.all([
        api.getPatients(),
        api.getPatientReadings(selectedPatientId, 30),
        api.getDevices(),
      ]);
      setPatients(pts);
      setReadings(rds);
      const matchDev = devs.find((d) => d.patient_id === selectedPatientId) || devs[0];
      setDevice(matchDev || null);
      setLastTick(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Telemetry stream polling failed', err);
    }
  };

  useEffect(() => {
    fetchStreamData();
    const interval = setInterval(fetchStreamData, 1500); // 1.5s refresh
    return () => clearInterval(interval);
  }, [selectedPatientId]);

  const handleStartSim = async () => {
    setSimLoading(true);
    try {
      await api.startSimulation();
      setIsSimRunning(true);
    } finally {
      setSimLoading(false);
    }
  };

  const handlePauseSim = async () => {
    setSimLoading(true);
    try {
      await api.pauseSimulation();
      setIsSimRunning(false);
    } finally {
      setSimLoading(false);
    }
  };

  const latestReading = readings.length > 0 ? readings[readings.length - 1] : null;
  const currentMagnitude = latestReading?.magnitude || 1.0;
  const isFreeFall = currentMagnitude < 0.55;
  const isImpact = currentMagnitude > 2.8;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-teal-400" />
            <span>Live Telemetry & Sensor Stream Monitor</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-axis accelerometer and vital sign telemetry. Polling at 1.5Hz.
          </p>
        </div>

        {/* Patient Selector & Simulation Control */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(parseInt(e.target.value, 10))}
            className="px-3 py-2 rounded-xl bg-navy-900 border border-navy-700 text-xs font-semibold text-slate-200 focus:outline-none focus:border-teal-500"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name} ({p.patient_code})
              </option>
            ))}
          </select>

          {/* Stream Generator Controls */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-navy-900 border border-navy-700">
            {isSimRunning ? (
              <button
                onClick={handlePauseSim}
                disabled={simLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-750 text-amber-300 text-xs font-semibold transition-colors"
                title="Pause simulated sensor generator"
              >
                <Pause className="h-3.5 w-3.5" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                onClick={handleStartSim}
                disabled={simLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-colors shadow-sm"
                title="Start continuous telemetry stream"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Resume Stream</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sensor Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Current Impact Magnitude */}
        <div className={`p-4 rounded-xl border transition-all ${
          isImpact
            ? 'bg-alert-red/20 border-alert-red/60 text-white'
            : 'glass-card'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Derived Magnitude</span>
            <Activity className={`h-4 w-4 ${isImpact ? 'text-alert-red animate-bounce' : 'text-teal-400'}`} />
          </div>
          <p className="text-2xl font-bold font-mono tracking-tight text-white">
            {currentMagnitude.toFixed(2)} g
          </p>
          <div className="mt-1 flex items-center gap-1 text-[10px]">
            {isImpact ? (
              <span className="font-bold text-red-300 animate-pulse">Impact Peak &gt; 2.8g!</span>
            ) : isFreeFall ? (
              <span className="font-bold text-amber-300">Freefall Phase (&lt;0.55g)</span>
            ) : (
              <span className="text-slate-400">Baseline Range (0.8 - 1.2g)</span>
            )}
          </div>
        </div>

        {/* Biomechanical State Machine */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Fall Engine Classifier</span>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-sm font-bold text-white mt-1">
            {isImpact ? 'IMPACT DETECTED' : 'NORMAL ACTIVITY'}
          </p>
          <div className="mt-2 text-[10px] text-slate-400 space-y-0.5">
            <p>Freefall Threshold: &lt; 0.55g</p>
            <p>Impact Threshold: &gt; 2.80g</p>
          </div>
        </div>

        {/* Device Battery */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Wearable Power</span>
            <Battery className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {device?.battery_level !== undefined ? `${device.battery_level}%` : '88%'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Device Code: {device?.device_code || 'LL-BAND-001'}
          </p>
        </div>

        {/* Connectivity Route */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Active Ingestion Channel</span>
            <Wifi className="h-4 w-4 text-teal-400" />
          </div>
          <p className="text-base font-bold text-teal-300 truncate">
            {device?.connectivity_status || 'ONLINE'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Last Packet: {lastTick}
          </p>
        </div>
      </div>

      {/* Main Tri-Axial Accelerometer Chart */}
      <div className="glass-card p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-400" />
              <span>Tri-Axial Acceleration ($a_x, a_y, a_z$) & Resultant Magnitude ($M$)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Unit: standard gravity ($1g \approx 9.81 m/s^2$). Measured at 100Hz onboard, streamed at 1-2Hz.
            </p>
          </div>
          <span className="text-xs font-mono text-teal-400 font-semibold px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
            {readings.length} Samples in Window
          </span>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={readings}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3E62" opacity={0.6} />
              <XAxis dataKey="timestamp" stroke="#64748B" fontSize={10} tickLine={false} />
              <YAxis domain={[-1.5, 4.5]} stroke="#64748B" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0B192C', borderColor: '#1E3E62', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="ax" stroke="#38BDF8" strokeWidth={1.5} dot={false} name="X-Axis (g)" />
              <Line type="monotone" dataKey="ay" stroke="#34D399" strokeWidth={1.5} dot={false} name="Y-Axis (g)" />
              <Line type="monotone" dataKey="az" stroke="#F472B6" strokeWidth={1.5} dot={false} name="Z-Axis (g)" />
              <Line type="monotone" dataKey="magnitude" stroke="#F59E0B" strokeWidth={2.5} dot={false} name="Resultant Magnitude M (g)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
