import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  FlaskConical,
  Wifi,
  ChevronDown,
  UserCheck,
  ShieldCheck,
  Radio,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlertSound } from '../context/AlertSoundContext';

interface HeaderProps {
  onOpenDemoLab: () => void;
  systemConnectivity?: string;
  activeEmergencyCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDemoLab,
  systemConnectivity = 'ONLINE',
  activeEmergencyCount = 0
}) => {
  const { role, user, switchRole } = useAuth();
  const { isMuted, toggleMute } = useAlertSound();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const demoAccounts: Array<{ name: string; email: string; role: 'ADMIN' | 'CAREGIVER' | 'PATIENT'; label: string }> = [
    { name: 'Dr. Sarah Patel', email: 'admin@lifelink.ai', role: 'ADMIN', label: 'Admin / Clinician' },
    { name: 'Elena Davis, RN', email: 'caregiver@lifelink.ai', role: 'CAREGIVER', label: 'Primary Caregiver' },
    { name: 'Marcus Vance', email: 'backup@lifelink.ai', role: 'CAREGIVER', label: 'Backup Caregiver' },
    { name: 'Arthur King', email: 'patient@lifelink.ai', role: 'PATIENT', label: 'Wearable Patient' },
  ];

  const handleRoleSelect = async (newRole: 'ADMIN' | 'CAREGIVER' | 'PATIENT') => {
    setDropdownOpen(false);
    await switchRole(newRole);
  };

  return (
    <header className="h-16 bg-navy-900/90 backdrop-blur-md border-b border-navy-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Environment and Status Badges */}
      <div className="flex items-center gap-3">
        {/* Environment Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>SIMULATED DEMO</span>
        </div>

        {/* Connectivity Status Pill */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            systemConnectivity === 'ONLINE'
              ? 'bg-teal-500/15 border-teal-500/30 text-teal-300'
              : systemConnectivity === 'CELLULAR_FALLBACK'
              ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
              : 'bg-red-500/15 border-red-500/30 text-red-300'
          }`}
        >
          <Wifi className="h-3 w-3" />
          <span>
            {systemConnectivity === 'ONLINE'
              ? 'ONLINE &bull; WiFi + Cellular Ready'
              : systemConnectivity === 'CELLULAR_FALLBACK'
              ? 'CELLULAR SMS FALLBACK ACTIVE'
              : 'OFFLINE &bull; LOCAL QUEUE'}
          </span>
        </div>

        {/* Active Emergency Blinking Pill */}
        {activeEmergencyCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-alert-red/20 border border-alert-red/50 text-red-300 text-xs font-bold animate-pulse">
            <AlertTriangle className="h-3.5 w-3.5 text-alert-red" />
            <span>{activeEmergencyCount} CRITICAL ALERT{activeEmergencyCount > 1 ? 'S' : ''} ACTIVE</span>
          </div>
        )}
      </div>

      {/* Right: Controls & Role Switcher */}
      <div className="flex items-center gap-3">
        {/* Audio Alert Toggle */}
        <button
          onClick={toggleMute}
          title={isMuted ? 'Unmute Emergency Siren' : 'Mute Emergency Siren'}
          className={`p-2 rounded-lg border transition-colors ${
            isMuted
              ? 'bg-navy-800 border-navy-700 text-slate-400 hover:text-slate-200'
              : 'bg-teal-500/15 border-teal-500/30 text-teal-300 hover:bg-teal-500/25'
          }`}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {/* Demo Lab Scenario Launcher */}
        <button
          onClick={onOpenDemoLab}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-all shadow-sm shadow-teal-600/30 active:scale-95"
        >
          <FlaskConical className="h-3.5 w-3.5" />
          <span>Demo Scenario Lab</span>
        </button>

        {/* Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700/80 border border-navy-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Role:</span>
              <span className="font-semibold text-teal-300">{role}</span>
              <span className="text-slate-400">({user?.name?.split(' ')[0] || 'User'})</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-navy-900 border border-navy-700 shadow-xl py-1.5 z-50">
              <div className="px-3 py-1.5 border-b border-navy-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Switch Interactive Role
              </div>
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => handleRoleSelect(acc.role)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                    user?.email === acc.email
                      ? 'bg-teal-500/15 text-teal-300 font-semibold'
                      : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                  }`}
                >
                  <div>
                    <p className="font-medium">{acc.name}</p>
                    <p className="text-[10px] text-slate-400">{acc.label}</p>
                  </div>
                  {user?.email === acc.email && (
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
