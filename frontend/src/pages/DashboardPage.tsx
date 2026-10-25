import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Wifi,
  ShieldAlert,
  BatteryWarning,
  Activity,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Heart,
  Droplets,
  Zap,
  ArrowRight
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
import { DashboardSummary, EmergencyEvent, SensorReading, AuditActivity } from '../types';
import { useAlertSound } from '../context/AlertSoundContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { playAlertChime } = useAlertSound();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<EmergencyEvent[]>([]);
  const [vitalsData, setVitalsData] = useState<SensorReading[]>([]);
  const [activities, setActivities] = useState<AuditActivity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [ackLoadingId, setAckLoadingId] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [sumRes, evRes, vitRes, actRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getEvents('active'),
        api.getVitalsTrend(undefined, 25),
        api.getDashboardActivity(6),
      ]);
      setSummary(sumRes);
      setRecentEvents(evRes);
      setVitalsData(vitRes);
      setActivities(actRes);

      // Sound alert if there is a critical active unacknowledged alert
      if (evRes.some(e => e.event_status === 'DETECTED' || e.event_status === 'NOTIFICATION_ATTEMPTED')) {
        playAlertChime();
      }
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000); // 3s polling for real-time responsiveness
    return () => clearInterval(interval);
  }, []);

  const handleQuickAcknowledge = async (eventId: number) => {
    setAckLoadingId(eventId);
    try {
      await api.acknowledgeEvent(eventId, 'Caregiver (Dashboard Quick Ack)', 'Acknowledged from main dashboard overview');
      await fetchDashboardData();
    } catch (err) {
      alert(`Could not acknowledge: ${err}`);
    } finally {
      setAckLoadingId(null);
    }
  };

  const handleQuickScenario = async (scenario: string) => {
    try {
      await api.runScenario(scenario);
      await fetchDashboardData();
    } catch (err) {
      alert(`Simulation error: ${err}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner for Active Emergency */}
      {recentEvents.length > 0 && (
        <div className="p-4 rounded-xl bg-alert-red/15 border border-alert-red/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-flash-emergency">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-alert-red text-white shadow-lg shadow-red-500/30">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-red-300">
                  Critical Event in Progress
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>
                <span className="text-xs text-slate-300">
                  {recentEvents[0].event_type.replace('_', ' ')}: {recentEvents[0].patient_name}
                </span>
              </div>
              <p className="text-sm font-semibold text-white mt-0.5">
                Primary Caregiver ({recentEvents[0].primary_caregiver_name || 'Elena Davis'}) notified via Internet Push & Cellular SMS fallback.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => handleQuickAcknowledge(recentEvents[0].id)}
              disabled={ackLoadingId === recentEvents[0].id || recentEvents[0].acknowledged_at !== null}
              className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md shadow-teal-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {recentEvents[0].acknowledged_at ? 'Already Acknowledged' : 'Acknowledge Alert'}
            </button>
            <button
              onClick={() => navigate('/emergencies')}
              className="px-3.5 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-medium border border-navy-700 transition-colors flex items-center gap-1.5"
            >
              <span>Emergency Center</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patients */}
        <div className="glass-card glass-card-hover p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Registered Patients</span>
            <Users className="h-4 w-4 text-teal-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white tracking-tight">
              {summary ? summary.total_patients : '--'}
            </span>
            <span className="text-[11px] text-teal-400 font-medium flex items-center gap-0.5">
              <span>All Monitored</span>
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-navy-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Online Wearables:</span>
            <span className="font-semibold text-slate-200">{summary?.online_patients || 0}</span>
          </div>
        </div>

        {/* Active Emergency Alerts */}
        <div className="glass-card glass-card-hover p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Emergencies</span>
            <ShieldAlert className="h-4 w-4 text-alert-red" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-bold tracking-tight ${summary && summary.active_emergencies > 0 ? 'text-alert-red animate-pulse' : 'text-white'}`}>
              {summary ? summary.active_emergencies : '--'}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {summary && summary.active_emergencies > 0 ? 'Action Needed' : 'Normal'}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-navy-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Escalation Timeout:</span>
            <span className="font-semibold text-slate-200">60s Demo Window</span>
          </div>
        </div>

        {/* Acknowledgement Rate */}
        <div className="glass-card glass-card-hover p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Acknowledgement Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white tracking-tight">
              {summary ? `${summary.acknowledgement_rate_pct}%` : '--'}
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">
              Avg {summary?.avg_ack_time_seconds || 0}s
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-navy-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Target Response:</span>
            <span className="font-semibold text-slate-200">&lt; 45 seconds</span>
          </div>
        </div>

        {/* Low Battery & Stale Readings */}
        <div className="glass-card glass-card-hover p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Device Health Warnings</span>
            <BatteryWarning className="h-4 w-4 text-alert-amber" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white tracking-tight">
              {summary ? summary.low_battery_devices + summary.stale_devices : '--'}
            </span>
            <span className="text-[11px] text-amber-300 font-medium">
              {summary?.low_battery_devices || 0} Low Batt &bull; {summary?.stale_devices || 0} Stale
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-navy-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Network Gateway:</span>
            <span className="font-semibold text-teal-300">{summary?.system_connectivity || 'ONLINE'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Telemetry Trends & Quick Scenarios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vitals & Movement Trend (2 Columns) */}
        <div className="lg:col-span-2 glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Activity className="h-4 w-4 text-teal-400" />
                <span>Live Sensor Telemetry & Vital Trends (Simulated Stream)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Composite IMU magnitude (g) and simulated photoplethysmogram heart rate (BPM)
              </p>
            </div>
            <button
              onClick={() => navigate('/live')}
              className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
            >
              <span>Full Live View</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vitalsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3E62" opacity={0.6} />
                <XAxis dataKey="timestamp" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis yAxisId="left" domain={[0, 5]} stroke="#14B8A6" fontSize={10} tickLine={false} label={{ value: 'Magnitude (g)', angle: -90, position: 'insideLeft', fill: '#14B8A6', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" domain={[50, 130]} stroke="#F59E0B" fontSize={10} tickLine={false} label={{ value: 'Heart Rate (BPM)', angle: 90, position: 'insideRight', fill: '#F59E0B', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B192C', borderColor: '#1E3E62', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#94A3B8' }}
                />
                <Line yAxisId="left" type="monotone" dataKey="magnitude" stroke="#14B8A6" strokeWidth={2} dot={false} name="Accel Magnitude (g)" />
                <Line yAxisId="right" type="monotone" dataKey="heart_rate" stroke="#F59E0B" strokeWidth={2} dot={false} name="Heart Rate (BPM)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-navy-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-teal-400"></span>
                <span>Normal Gait: ~1.0g</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                <span>Impact Threshold: &gt; 2.8g</span>
              </span>
            </div>
            <span className="text-[11px] text-slate-400 italic">Auto-refreshing 1Hz</span>
          </div>
        </div>

        {/* Quick Competition Actions & System Activity */}
        <div className="space-y-6 flex flex-col justify-between">
          {/* Quick Actions Card */}
          <div className="glass-card p-5 rounded-2xl">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>Interactive Demo Quick Triggers</span>
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Instantly test the emergency response workflow with predictable outcomes.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleQuickScenario('sudden_fall')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-alert-red/15 hover:bg-alert-red/25 border border-alert-red/40 text-red-200 text-xs font-semibold transition-all flex items-center justify-between active:scale-98"
              >
                <span>Trigger Sudden Fall (3.9g Impact)</span>
                <Play className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleQuickScenario('manual_sos')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs font-semibold transition-all flex items-center justify-between active:scale-98"
              >
                <span>Press Manual SOS Button</span>
                <Play className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleQuickScenario('internet_down')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-750 border border-navy-700 text-slate-300 text-xs font-semibold transition-all flex items-center justify-between active:scale-98"
              >
                <span>Simulate Internet Outage (SMS Fallback)</span>
                <Play className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Audit Event Activity Feed */}
          <div className="glass-card p-5 rounded-2xl flex-1">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-teal-400" />
              <span>Live System Audit Trail</span>
            </h3>
            <div className="space-y-2.5">
              {activities.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No recent activity recorded.</p>
              ) : (
                activities.slice(0, 4).map((a) => (
                  <div key={a.id} className="text-xs border-b border-navy-800/80 pb-2 last:border-none last:pb-0">
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span className="font-semibold text-slate-300">{a.action}</span>
                      <span>{new Date(a.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] mt-0.5 truncate">
                      Actor: <span className="text-teal-300">{a.actor}</span> ({a.role})
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
