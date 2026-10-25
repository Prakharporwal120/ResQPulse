import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Clock,
  Radio,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api } from '../api';
import { AnalyticsSummary } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const res = await api.getAnalyticsSummary();
        setData(res);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  const handleDownloadCsv = () => {
    window.open(api.getExportCsvUrl(), '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header with CSV Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-teal-400" />
            <span>Emergency Analytics & Performance Reports</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Telemetry metrics, acknowledgement latency, delivery channel breakdown, and audit exports.
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md shadow-teal-600/30 transition-all active:scale-95"
        >
          <Download className="h-4 w-4" />
          <span>Export Incidents CSV</span>
        </button>
      </div>

      {/* Synthetic Metric Notice Banner */}
      <div className="p-3.5 rounded-xl bg-navy-900 border border-navy-800 text-xs text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
          <span>
            <strong className="text-white">Validation Notice:</strong> Analytics reflect local benchmark telemetry and simulated scenarios. Does not claim measured clinical validation.
          </span>
        </div>
        <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">
          Demo Benchmark Data
        </span>
      </div>

      {/* Key Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Falls */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Suspected Falls</span>
            <ShieldAlert className="h-4 w-4 text-alert-red" />
          </div>
          <p className="text-2xl font-bold text-white">{data?.total_falls_detected ?? '--'}</p>
          <p className="text-[10px] text-slate-400 mt-1">Freefall + Impact &gt; 2.8g</p>
        </div>

        {/* Total Manual SOS */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Manual SOS Calls</span>
            <Zap className="h-4 w-4 text-alert-amber" />
          </div>
          <p className="text-2xl font-bold text-white">{data?.total_manual_sos ?? '--'}</p>
          <p className="text-[10px] text-slate-400 mt-1">Classifier bypassed</p>
        </div>

        {/* Acknowledgement Rate */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Caregiver Ack Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{data ? `${data.acknowledgement_rate_pct}%` : '--'}</p>
          <p className="text-[10px] text-emerald-400 mt-1">Target &gt; 95% met</p>
        </div>

        {/* Avg Ack Latency */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Mean / Median Ack</span>
            <Clock className="h-4 w-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {data ? `${data.avg_ack_time_seconds}s` : '--'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Median: {data?.median_ack_time_seconds || 0}s
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events Timeline Breakdown */}
        <div className="lg:col-span-2 glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-teal-400" />
                <span>Incident Frequency & Event Types (7-Day Trend)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Distribution of falls detected, manual SOS triggers, and vital threshold events.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">Total: {data?.total_events || 0}</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.timeline || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3E62" opacity={0.6} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B192C', borderColor: '#1E3E62', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="falls" fill="#EF4444" name="Suspected Falls" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sos" fill="#F59E0B" name="Manual SOS" radius={[4, 4, 0, 0]} />
                <Bar dataKey="threshold" fill="#3B82F6" name="Threshold Breach" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Delivery Channel Distribution */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Radio className="h-4 w-4 text-teal-400" />
              <span>Connectivity Route Outcomes</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Dispatched alerts by communication route and fallback adapters.
            </p>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.delivery_breakdown || []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={45}
                    paddingAngle={4}
                  >
                    {(data?.delivery_breakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B192C', borderColor: '#1E3E62', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 text-xs pt-3 border-t border-navy-800">
            {(data?.delivery_breakdown || []).map((b) => (
              <div key={b.name} className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }}></span>
                  <span className="text-[11px]">{b.name}</span>
                </span>
                <span className="font-semibold">{b.value} alerts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
