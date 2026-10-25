import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldCheck,
  Bell,
  Clock,
  RotateCcw,
  Save,
  CheckCircle2,
  Lock,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { role } = useAuth();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [escalationTimeout, setEscalationTimeout] = useState<number>(60);
  const [fallThreshold, setFallThreshold] = useState<number>(2.8);
  const [freeFallThreshold, setFreeFallThreshold] = useState<number>(0.55);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(20);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setCaregivers(data.caregivers || []);
      setAssignments(data.assignments || []);

      const params = data.parameters || {};
      if (params.escalation_timeout_seconds) setEscalationTimeout(parseInt(params.escalation_timeout_seconds, 10));
      if (params.fall_accel_threshold) setFallThreshold(parseFloat(params.fall_accel_threshold));
      if (params.free_fall_threshold) setFreeFallThreshold(parseFloat(params.free_fall_threshold));
      if (params.cooldown_seconds) setCooldownSeconds(parseInt(params.cooldown_seconds, 10));
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.updateSettings({
        escalation_timeout_seconds: escalationTimeout,
        fall_accel_threshold: fallThreshold,
        free_fall_threshold: freeFallThreshold,
        cooldown_seconds: cooldownSeconds,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadSettings();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDemoData = async () => {
    if (!window.confirm('Reset all demo data back to clean innovation presentation state?')) return;
    try {
      await api.resetDemoData();
      alert('Demo data successfully reset.');
      await loadSettings();
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Sliders className="h-5 w-5 text-teal-400" />
          <span>System Settings & Escalation Protocols</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure automated caregiver escalation timeouts, IMU algorithm thresholds, and demo parameters.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-teal-500/15 border border-teal-500/40 text-xs text-teal-200 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
          <span>System configuration successfully updated and applied to active engines.</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Escalation & Notification Protocols */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-teal-400" />
              <span>Caregiver Escalation Protocol</span>
            </h3>
            <p className="text-xs text-slate-400">
              When an emergency alert is dispatched, the primary caregiver must acknowledge it within this time window before the system escalates to the backup contact.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-200">
                    Acknowledgement Timeout Window
                  </span>
                  <span className="font-mono font-bold text-teal-300">
                    {escalationTimeout} seconds
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="180"
                  step="5"
                  value={escalationTimeout}
                  disabled={role !== 'ADMIN'}
                  onChange={(e) => setEscalationTimeout(parseInt(e.target.value, 10))}
                  className="w-full accent-teal-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>15s (Aggressive demo)</span>
                  <span>60s (Recommended demo)</span>
                  <span>180s (Standard)</span>
                </div>
              </div>

              {/* Notification Channel Routing Matrix */}
              <div className="pt-3 border-t border-navy-800">
                <span className="text-[11px] font-semibold text-slate-300 block mb-2">
                  Connectivity-Aware Dispatch Matrix
                </span>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-navy-950/60 border border-navy-800">
                    <span>WiFi Connected (ONLINE):</span>
                    <span className="text-teal-300 font-semibold">In-App + Internet Push</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-navy-950/60 border border-navy-800">
                    <span>WiFi Interrupted (INTERNET_DOWN):</span>
                    <span className="text-amber-300 font-semibold">SIM800L Cellular SMS Fallback</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-navy-950/60 border border-navy-800">
                    <span>All Networks Down (NO_NETWORK):</span>
                    <span className="text-red-300 font-semibold">Local Memory Queue & UI Warning</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Biomechanical Fall Detection Sensitivity */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-400" />
              <span>Biomechanical Algorithm Sensitivity</span>
            </h3>
            <p className="text-xs text-slate-400">
              Heuristic sliding-window parameters calibrated for senior fall trajectory verification.
            </p>

            <div className="space-y-3.5 pt-2">
              {/* Impact Threshold */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-200">Impact Threshold (g)</span>
                  <span className="font-mono font-bold text-teal-300">{fallThreshold.toFixed(1)} g</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="4.5"
                  step="0.1"
                  value={fallThreshold}
                  disabled={role !== 'ADMIN'}
                  onChange={(e) => setFallThreshold(parseFloat(e.target.value))}
                  className="w-full accent-teal-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Minimum acceleration magnitude to confirm ground impact.
                </p>
              </div>

              {/* Freefall Threshold */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-200">Free-fall Threshold (g)</span>
                  <span className="font-mono font-bold text-teal-300">{freeFallThreshold.toFixed(2)} g</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="0.8"
                  step="0.05"
                  value={freeFallThreshold}
                  disabled={role !== 'ADMIN'}
                  onChange={(e) => setFreeFallThreshold(parseFloat(e.target.value))}
                  className="w-full accent-teal-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Weightlessness phase threshold preceding impact.
                </p>
              </div>

              {/* Cooldown Deduplication */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-200">Alert Cooldown Deduplication</span>
                  <span className="font-mono font-bold text-teal-300">{cooldownSeconds}s</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={cooldownSeconds}
                  disabled={role !== 'ADMIN'}
                  onChange={(e) => setCooldownSeconds(parseInt(e.target.value, 10))}
                  className="w-full accent-teal-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Suppresses duplicate alarms if sensor spikes repeat during a single event.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Save button (Admin only) */}
        {role === 'ADMIN' ? (
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleResetDemoData}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-750 text-slate-300 text-xs font-semibold border border-navy-700 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset Database to Clean State</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md shadow-teal-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Applying Changes...' : 'Save Configuration'}</span>
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            * System settings modification requires Administrator role. Use the role switcher above to switch to Dr. Sarah Patel (Admin).
          </p>
        )}
      </form>

      {/* Security & Clinical Privacy Disclosures */}
      <div className="glass-card p-5 rounded-2xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Lock className="h-4 w-4 text-teal-400" />
          <span>Security, Privacy, and Regulatory Disclaimer</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          <strong>Educational Prototype:</strong> LifeLink AI is an advanced prototype developed for collegiate health-tech competition and demonstration purposes. It is not an FDA-cleared or CE-marked medical device. All measurements and emergency contacts are simulated with synthetic identities. Data is stored on a local SQLite database with server-side role-based access control.
        </p>
      </div>
    </div>
  );
};
