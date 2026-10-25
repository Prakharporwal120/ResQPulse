import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartHandshake,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Phone,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  Battery,
  Activity
} from 'lucide-react';
import { api } from '../api';
import { Patient, EmergencyEvent } from '../types';
import { useAuth } from '../context/AuthContext';

export const CaregiverPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activeEvents, setActiveEvents] = useState<EmergencyEvent[]>([]);
  const [historyEvents, setHistoryEvents] = useState<EmergencyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nowSec, setNowSec] = useState(Date.now());

  const fetchCaregiverData = async () => {
    try {
      const [pRes, actRes, allRes] = await Promise.all([
        api.getPatients(),
        api.getEvents('active'),
        api.getEvents(),
      ]);
      setPatients(pRes);
      setActiveEvents(actRes);
      setHistoryEvents(allRes.filter((e) => e.resolved_at !== null));
    } catch (err) {
      console.error('Failed to load caregiver data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCaregiverData();
    const interval = setInterval(fetchCaregiverData, 3000);
    const clockInterval = setInterval(() => setNowSec(Date.now()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, []);

  const handleAcknowledge = async (id: number) => {
    try {
      await api.acknowledgeEvent(id, user?.name || 'Elena Davis, RN', 'Caregiver acknowledged alert');
      await fetchCaregiverData();
    } catch (err: any) {
      alert(`Acknowledgement error: ${err.message}`);
    }
  };

  const handleResponding = async (id: number) => {
    try {
      await api.respondEvent(id, user?.name || 'Elena Davis, RN', 'Caregiver is responding to patient');
      await fetchCaregiverData();
    } catch (err: any) {
      alert(`Responding error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-navy-900 via-navy-850 to-navy-900 border border-teal-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Caregiver Operations Hub</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 font-semibold border border-teal-500/30">
                Primary Assigned Nurse
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Active caregiver on-duty: <span className="font-semibold text-white">{user?.name || 'Elena Davis, RN'}</span>. Monitoring assigned elders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-300">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Cohort</span>
            <p className="text-base font-bold text-white">{patients.length} Elders</p>
          </div>
          <div className="text-right pl-4 border-l border-navy-700">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Escalation Timer</span>
            <p className="text-base font-bold text-amber-300">60s Demo Window</p>
          </div>
        </div>
      </div>

      {/* Active Alerts with Countdown Timer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-alert-red" />
            <span>Active Alerts Requiring Caregiver Acknowledgement ({activeEvents.length})</span>
          </h2>
          <span className="text-xs text-slate-400">Live supervisor view</span>
        </div>

        {activeEvents.length === 0 ? (
          <div className="p-8 rounded-2xl glass-card text-center text-xs text-slate-400">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-200">All Assigned Elders Safe</p>
            <p className="text-xs text-slate-400 mt-0.5">No active unacknowledged falls or SOS calls at this moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeEvents.map((e) => {
              const elapsedSec = Math.floor((nowSec - new Date(e.created_at).getTime()) / 1000);
              const remainingSec = Math.max(0, 60 - elapsedSec);
              const isUrgent = remainingSec > 0 && !e.acknowledged_at;
              const isEscalated = e.is_escalated || remainingSec === 0;

              return (
                <div
                  key={e.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isEscalated
                      ? 'bg-purple-900/20 border-purple-500/50 shadow-lg shadow-purple-500/10'
                      : 'bg-alert-red/15 border-alert-red/50 shadow-lg shadow-red-500/10 animate-flash-emergency'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-alert-red text-white">
                          CRITICAL #{e.id}
                        </span>
                        <h3 className="text-base font-bold text-white">
                          {e.event_type.replace('_', ' ')} &mdash; {e.patient_name} ({e.patient_code})
                        </h3>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Detected: {new Date(e.created_at).toLocaleTimeString()} &bull; Primary Contact:{' '}
                        <span className="text-white font-semibold">{e.primary_caregiver_name || 'Elena Davis'}</span>
                      </p>
                    </div>

                    {/* Timer Strip */}
                    <div className="flex items-center gap-4 bg-navy-950/70 p-3 rounded-xl border border-navy-800">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Elapsed</span>
                        <p className="text-sm font-bold font-mono text-white">{elapsedSec}s</p>
                      </div>

                      <div className="pl-3 border-l border-navy-800">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Backup Escalation
                        </span>
                        <p
                          className={`text-sm font-bold font-mono ${
                            isEscalated
                              ? 'text-purple-300 animate-pulse'
                              : isUrgent
                              ? 'text-alert-amber animate-pulse'
                              : 'text-slate-400'
                          }`}
                        >
                          {isEscalated ? 'ESCALATED TO BACKUP' : `Auto-escalates in ${remainingSec}s`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status Breakdown */}
                  <div className="mt-4 pt-4 border-t border-navy-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4 text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-teal-400"></span>
                        <span>Delivery: Confirmed via In-App & Internet Push</span>
                      </span>
                      {e.acknowledged_at && (
                        <span className="text-emerald-400 font-semibold">
                          ✓ Acknowledged by {e.acknowledged_by}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcknowledge(e.id)}
                        disabled={e.acknowledged_at !== null}
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md shadow-teal-600/30 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {e.acknowledged_at ? '✓ Acknowledged' : 'Acknowledge Now'}
                      </button>
                      <button
                        onClick={() => handleResponding(e.id)}
                        disabled={e.responding_at !== null}
                        className="px-3.5 py-2 rounded-xl bg-navy-800 hover:bg-navy-750 text-slate-200 text-xs font-medium border border-navy-700 transition-colors disabled:opacity-50"
                      >
                        {e.responding_at ? '✓ Responding' : 'I am Responding'}
                      </button>
                      <button
                        onClick={() => navigate('/emergencies')}
                        className="px-3 py-2 rounded-xl bg-navy-800 hover:bg-navy-750 text-teal-300 text-xs font-medium border border-navy-700 flex items-center gap-1"
                      >
                        <span>Full Incident Console</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assigned Patients Quick Roster */}
      <div className="glass-card p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-teal-400" />
          <span>My Assigned Patients Roster</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {patients.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/patients/${p.id}`)}
              className="p-4 rounded-xl bg-navy-950/60 border border-navy-800 hover:border-teal-500/40 cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-bold text-white text-xs">{p.display_name}</h4>
                  <p className="text-[10px] text-teal-400 font-mono">{p.patient_code}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-navy-800 text-slate-300 border border-navy-700">
                  {p.age ? `${p.age} yrs` : 'Senior'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mb-3">
                {p.room_or_address || 'Home Residence'}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-navy-800">
                <span>Heart Rate: {p.latest_heart_rate || 74} BPM</span>
                <span className="text-teal-400 font-semibold">View Dossier &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
