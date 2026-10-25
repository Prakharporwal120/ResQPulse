import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  Phone,
  Radio,
  MapPin,
  ArrowRight,
  Send,
  UserX,
  FileText,
  X,
  Zap,
  Info,
  Activity
} from 'lucide-react';
import { api } from '../api';
import { EmergencyEvent } from '../types';
import { useAuth } from '../context/AuthContext';

export const EmergencyCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [events, setEvents] = useState<EmergencyEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'acknowledged' | 'escalated' | 'resolved'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Resolution Modal State
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEvents = async () => {
    try {
      const data = await api.getEvents(statusFilter === 'all' ? undefined : statusFilter);
      setEvents(data);
      if (data.length > 0 && selectedEventId === null) {
        setSelectedEventId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching emergency events', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0] || null;

  const handleAcknowledge = async (eventId: number) => {
    setActionLoading(true);
    try {
      await api.acknowledgeEvent(eventId, user?.name || 'On-Duty Nurse', 'Acknowledged via Emergency Response Console');
      await fetchEvents();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkResponding = async (eventId: number) => {
    setActionLoading(true);
    try {
      await api.respondEvent(eventId, user?.name || 'On-Duty Nurse', 'Caregiver dispatched / heading to patient location');
      await fetchEvents();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkContacted = async (eventId: number) => {
    setActionLoading(true);
    try {
      await api.markContacted(eventId, 'Patient reached via phone / intercom');
      await fetchEvents();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalateNow = async (eventId: number) => {
    if (!window.confirm('Escalate this emergency directly to backup caregiver?')) return;
    setActionLoading(true);
    try {
      await api.escalateEvent(eventId, 'Manual immediate escalation triggered by operator');
      await fetchEvents();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !resolutionNote.trim()) return;
    setActionLoading(true);
    try {
      await api.resolveEvent(selectedEvent.id, resolutionNote.trim(), user?.name || 'Supervisor');
      setIsResolveModalOpen(false);
      setResolutionNote('');
      await fetchEvents();
    } catch (err: any) {
      alert(`Could not resolve event: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-alert-red" />
            <span>Emergency Operations Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time incident dispatch, acknowledgement lifecycle, and backup caregiver escalation.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-navy-900 border border-navy-700">
          {(['all', 'active', 'acknowledged', 'escalated', 'resolved'] as const).map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setStatusFilter(filterKey)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                statusFilter === filterKey
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
              }`}
            >
              {filterKey}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Incident Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Events Queue (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1 text-xs text-slate-400 font-medium">
            <span>Incident Queue ({events.length})</span>
            <span>Auto-refreshing</span>
          </div>

          {events.length === 0 ? (
            <div className="p-12 text-center rounded-2xl glass-card text-xs text-slate-400">
              No emergency incidents matching "{statusFilter}".
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
              {events.map((e) => {
                const isSelected = selectedEvent?.id === e.id;
                const isCritical = e.severity === 'CRITICAL' && !e.resolved_at;
                return (
                  <div
                    key={e.id}
                    onClick={() => setSelectedEventId(e.id)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-navy-800/90 border-teal-500 shadow-md shadow-teal-500/10'
                        : isCritical
                        ? 'bg-alert-red/10 border-alert-red/40 hover:bg-alert-red/15'
                        : 'glass-card glass-card-hover'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-teal-400">#{e.id}</span>
                        <span className="font-semibold text-white text-xs">{e.patient_name}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                          e.event_status === 'RESOLVED'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : e.event_status === 'ESCALATED'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse'
                            : e.event_status === 'ACKNOWLEDGED'
                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                            : 'bg-alert-red/20 text-red-300 border-alert-red/40 animate-pulse'
                        }`}
                      >
                        {e.event_status}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
                      <span>{e.event_type.replace('_', ' ')}</span>
                      <span className="text-slate-400">{new Date(e.created_at).toLocaleTimeString()}</span>
                    </div>

                    {e.event_status === 'NOTIFICATION_ATTEMPTED' && !e.acknowledged_at && (
                      <div className="mt-2 pt-2 border-t border-navy-700/60 flex items-center justify-between text-[10px] text-amber-300">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Waiting Caregiver Ack</span>
                        </span>
                        <span>Auto-escalates in &lt; 60s</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Incident Inspector (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedEvent ? (
            <div className="glass-card p-6 rounded-2xl space-y-6">
              {/* Event Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-navy-800">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-teal-400">
                      INCIDENT #{selectedEvent.id}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-alert-red/20 text-red-300 font-bold border border-alert-red/40">
                      {selectedEvent.severity}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Detected: {new Date(selectedEvent.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1">
                    {selectedEvent.event_type.replace('_', ' ')}: {selectedEvent.patient_name}
                  </h2>
                </div>

                <button
                  onClick={() => navigate(`/patients/${selectedEvent.patient_id}`)}
                  className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
                >
                  <span>Patient Dossier</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="p-3.5 rounded-xl bg-navy-950/70 border border-navy-800 flex flex-wrap items-center gap-2.5">
                {/* Acknowledge */}
                <button
                  onClick={() => handleAcknowledge(selectedEvent.id)}
                  disabled={actionLoading || selectedEvent.acknowledged_at !== null}
                  className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-40"
                >
                  {selectedEvent.acknowledged_at ? '✓ Acknowledged' : 'Acknowledge Alert'}
                </button>

                {/* Respond */}
                <button
                  onClick={() => handleMarkResponding(selectedEvent.id)}
                  disabled={actionLoading || selectedEvent.responding_at !== null || selectedEvent.resolved_at !== null}
                  className="px-3.5 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-medium border border-navy-700 transition-colors disabled:opacity-40"
                >
                  {selectedEvent.responding_at ? '✓ Responding' : 'Mark Caregiver Responding'}
                </button>

                {/* Patient Contacted */}
                <button
                  onClick={() => handleMarkContacted(selectedEvent.id)}
                  disabled={actionLoading || selectedEvent.patient_contacted_at !== null || selectedEvent.resolved_at !== null}
                  className="px-3.5 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-medium border border-navy-700 transition-colors disabled:opacity-40"
                >
                  {selectedEvent.patient_contacted_at ? '✓ Patient Contacted' : 'Mark Patient Contacted'}
                </button>

                {/* Escalate Now */}
                {selectedEvent.resolved_at === null && (
                  <button
                    onClick={() => handleEscalateNow(selectedEvent.id)}
                    disabled={actionLoading || selectedEvent.is_escalated}
                    className="px-3.5 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/40 transition-colors disabled:opacity-40"
                  >
                    {selectedEvent.is_escalated ? 'Escalated to Backup' : 'Escalate to Backup Now'}
                  </button>
                )}

                {/* Resolve */}
                {selectedEvent.resolved_at === null ? (
                  <button
                    onClick={() => setIsResolveModalOpen(true)}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all ml-auto"
                  >
                    Resolve Incident
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400 font-semibold ml-auto flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Resolved</span>
                  </span>
                )}
              </div>

              {/* Sensor Evidence & Biomechanical Telemetry */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-teal-400" />
                  <span>Sensor Evidence & Biomechanical Classification</span>
                </h3>
                <div className="p-4 rounded-xl bg-navy-950/60 border border-navy-800/80 text-xs space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400">Detection Method</span>
                      <p className="font-semibold text-white">{selectedEvent.detection_method}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Classifier Confidence</span>
                      <p className="font-semibold text-teal-300">
                        {selectedEvent.confidence ? `${(selectedEvent.confidence * 100).toFixed(0)}%` : '100% (Direct SOS)'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Location Source</span>
                      <p className="font-semibold text-white">{selectedEvent.location_source || 'Simulated Home Anchor'}</p>
                    </div>
                  </div>

                  {selectedEvent.evidence && (
                    <div className="mt-3 pt-3 border-t border-navy-800 text-[11px] font-mono text-slate-300 bg-navy-900/50 p-2.5 rounded-lg overflow-x-auto">
                      <pre>{JSON.stringify(selectedEvent.evidence, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Notification Delivery Attempts (Distinction between Sent, Delivered, and Acknowledged!) */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Send className="h-4 w-4 text-teal-400" />
                  <span>Notification Dispatch Attempts & Outcomes</span>
                </h3>
                <div className="space-y-2">
                  {selectedEvent.alert_attempts.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No delivery attempts recorded.</p>
                  ) : (
                    selectedEvent.alert_attempts.map((att) => (
                      <div
                        key={att.id}
                        className="p-3 rounded-xl bg-navy-950/60 border border-navy-800/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{att.recipient_name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-navy-800 text-teal-300 border border-navy-700">
                              {att.recipient_role}
                            </span>
                            <span className="text-slate-400 text-[11px] font-mono">
                              via {att.channel.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Attempted: {new Date(att.attempted_at).toLocaleTimeString()}
                            {att.provider_message_id && ` &bull; ID: ${att.provider_message_id}`}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            att.attempt_status === 'DELIVERED'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : att.attempt_status === 'QUEUED'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-red-500/15 text-red-300 border-red-500/30'
                          }`}
                        >
                          {att.attempt_status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Event Resolution Note Display if resolved */}
              {selectedEvent.resolved_at && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                  <p className="font-semibold text-emerald-300">
                    Incident Resolved by {selectedEvent.resolved_by} at {new Date(selectedEvent.resolved_at).toLocaleTimeString()}:
                  </p>
                  <p className="text-slate-200 mt-1 italic leading-relaxed">
                    "{selectedEvent.resolution_note}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl glass-card text-xs text-slate-400">
              Select an incident from the queue on the left to review details and take action.
            </div>
          )}
        </div>
      </div>

      {/* Mandatory Resolution Modal */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-navy-900 border border-navy-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-navy-800 flex items-center justify-between bg-navy-950/60">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span>Resolve Emergency Incident</span>
              </h2>
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="p-5 space-y-4">
              <p className="text-xs text-slate-300">
                To close this incident, healthcare compliance mandates documenting the assessment and assistance provided.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Mandatory Clinical Resolution Note *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Attending nurse verified patient is seated safely. No fractures or head injury. Vitals normal."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-950/80 border border-navy-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-750 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !resolutionNote.trim()}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 disabled:opacity-50"
                >
                  Confirm & Close Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
