import React, { useState } from 'react';
import {
  X,
  Play,
  RotateCcw,
  WifiOff,
  Radio,
  Zap,
  Activity,
  BatteryLow,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../api';

interface DemoLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScenarioExecuted?: () => void;
}

export const DemoLabModal: React.FC<DemoLabModalProps> = ({ isOpen, onClose, onScenarioExecuted }) => {
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const runScenario = async (scenarioKey: string) => {
    setLoadingScenario(scenarioKey);
    setLastOutcome(null);
    setErrorMsg(null);
    try {
      const res = await api.runScenario(scenarioKey);
      setLastOutcome(res.outcome || 'Scenario executed successfully.');
      if (onScenarioExecuted) onScenarioExecuted();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute scenario.');
    } finally {
      setLoadingScenario(null);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Reset all demo data back to clean initial competition state?')) return;
    setLoadingScenario('reset');
    setLastOutcome(null);
    setErrorMsg(null);
    try {
      const res = await api.resetDemoData();
      setLastOutcome(res.message || 'Demo data reset complete.');
      if (onScenarioExecuted) onScenarioExecuted();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset demo data.');
    } finally {
      setLoadingScenario(null);
    }
  };

  const scenarios = [
    {
      id: 'sudden_fall',
      title: '1. Simulate Sudden Fall',
      description: 'Simulates a 3.92g impact with freefall & stillness. Triggers critical alert & caregiver dispatch.',
      icon: ShieldAlert,
      color: 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
    },
    {
      id: 'manual_sos',
      title: '2. Trigger Manual SOS',
      description: 'Patient presses physical SOS button. Immediately bypasses fall classifier.',
      icon: Zap,
      color: 'bg-orange-500/20 text-orange-300 border-orange-500/40 hover:bg-orange-500/30'
    },
    {
      id: 'normal_walking',
      title: '3. Normal Activity Gait',
      description: 'Generates normal human walking gait (1.00g). Tests that no false alarm is triggered.',
      icon: Activity,
      color: 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30'
    },
    {
      id: 'internet_down',
      title: '4. Simulate Internet Outage',
      description: 'Simulates WiFi network drop. Demonstrates Cellular SMS fallback via SIM800L adapter.',
      icon: WifiOff,
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
    },
    {
      id: 'no_network',
      title: '5. Full Network Disconnection',
      description: 'Both Internet and Cellular down. Wearable queues emergency alerts locally in memory.',
      icon: Radio,
      color: 'bg-slate-500/20 text-slate-300 border-slate-500/40 hover:bg-slate-500/30'
    },
    {
      id: 'restore_network',
      title: '6. Restore Network Connectivity',
      description: 'Restores connection to ONLINE and drains queued offline alerts to the cloud.',
      icon: CheckCircle2,
      color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
    },
    {
      id: 'low_battery',
      title: '7. Low Battery Warning',
      description: 'Drops device battery to 11%. Caregiver dashboard warns to charge device immediately.',
      icon: BatteryLow,
      color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 hover:bg-yellow-500/30'
    },
    {
      id: 'stale_data',
      title: '8. Simulate Stale Telemetry',
      description: 'Pauses sensor stream for 25 minutes. Demonstrates stale-data warning flags.',
      icon: Clock,
      color: 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-navy-900 border border-navy-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Drawer Header */}
        <div className="p-5 border-b border-navy-800 flex items-center justify-between bg-navy-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300">
                <Play className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Demo Scenario Lab & Stress Test Suite
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic, repeatable test scenarios designed for competition judges and live presentations.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Outcome notification box */}
          {lastOutcome && (
            <div className="p-3.5 rounded-xl bg-teal-500/15 border border-teal-500/40 flex items-start gap-3 text-teal-200 text-xs animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Execution Result:</p>
                <p className="mt-0.5">{lastOutcome}</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 flex items-start gap-3 text-red-200 text-xs">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Error:</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scenarios.map((sc) => {
              const Icon = sc.icon;
              const isLoading = loadingScenario === sc.id;
              return (
                <button
                  key={sc.id}
                  disabled={isLoading}
                  onClick={() => runScenario(sc.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${sc.color} ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : 'active:scale-98'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="p-2 rounded-lg bg-navy-900/60 border border-white/10 shrink-0">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{sc.title}</h4>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {sc.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    <span className="text-[10px] font-semibold uppercase tracking-wider underline">
                      {isLoading ? 'Running...' : 'Trigger Now &rarr;'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer with Reset Button */}
        <div className="p-4 border-t border-navy-800 bg-navy-950/60 flex items-center justify-between">
          <button
            onClick={handleResetDemo}
            disabled={loadingScenario === 'reset'}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${loadingScenario === 'reset' ? 'animate-spin' : ''}`} />
            <span>Reset Demo Data to Clean State</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-750 text-slate-300 text-xs font-medium transition-colors"
          >
            Close Lab
          </button>
        </div>
      </div>
    </div>
  );
};
