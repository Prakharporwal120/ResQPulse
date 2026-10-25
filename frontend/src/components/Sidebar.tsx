import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Activity,
  ShieldAlert,
  HeartHandshake,
  BarChart3,
  Radio,
  Sliders,
  Heart,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeEmergencyCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeEmergencyCount }) => {
  const { role, user } = useAuth();

  const navItems = [
    { to: '/', label: 'Main Dashboard', icon: LayoutDashboard },
    { to: '/patients', label: 'Patient Directory', icon: Users },
    { to: '/live', label: 'Live Monitoring', icon: Activity },
    {
      to: '/emergencies',
      label: 'Emergency Center',
      icon: ShieldAlert,
      badge: activeEmergencyCount > 0 ? activeEmergencyCount : undefined,
      alert: activeEmergencyCount > 0
    },
    { to: '/caregiver', label: 'Caregiver Portal', icon: HeartHandshake },
    { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { to: '/devices', label: 'Device Management', icon: Radio },
    { to: '/settings', label: 'System Settings', icon: Sliders },
  ];

  return (
    <aside className="w-64 bg-navy-900 border-r border-navy-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-navy-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-navy-950 font-bold shadow-md shadow-teal-500/20">
              <Heart className="h-5 w-5 fill-current text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-white tracking-tight">LifeLink</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
                Detect &bull; Verify &bull; Confirm
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-navy-800/80'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-teal-400" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold animate-pulse ${
                      item.alert
                        ? 'bg-alert-red/30 text-red-300 border border-alert-red/50 shadow-sm shadow-red-500/30'
                        : 'bg-navy-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Role Card at Bottom */}
      <div className="p-3 border-t border-navy-800 bg-navy-950/40">
        <div className="p-2.5 rounded-lg bg-navy-800/60 border border-navy-700/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Active Session
            </span>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                role === 'ADMIN'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : role === 'CAREGIVER'
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}
            >
              {role}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-navy-700 flex items-center justify-center text-slate-300">
              <UserCheck className="h-3.5 w-3.5 text-teal-400" />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || 'admin@lifelink.ai'}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
