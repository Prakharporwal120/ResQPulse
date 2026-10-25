import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, switchRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (roleType: 'ADMIN' | 'CAREGIVER' | 'PATIENT') => {
    setIsLoading(true);
    setError(null);
    try {
      await switchRole(roleType);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Demo switch failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center items-center p-4 selection:bg-teal-500 selection:text-navy-950">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 items-center justify-center text-white shadow-xl shadow-teal-500/20 mb-1">
            <Heart className="h-6 w-6 fill-current animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
            <span>LifeLink AI</span>
            <span className="text-xs px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
              HealthTech
            </span>
          </h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
            Detect &bull; Verify &bull; Connect &bull; Confirm
          </p>
        </div>

        {/* Demo Mode Notice */}
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
          <span>
            <strong>Competition Demo Mode:</strong> Use the 1-click role logins below to evaluate Admin, Caregiver, or Patient experiences.
          </span>
        </div>

        {/* Login Form Card */}
        <div className="glass-card p-6 rounded-2xl border border-navy-700 shadow-2xl space-y-4">
          <h2 className="text-sm font-bold text-white tracking-tight">Sign In with Credentials</h2>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  placeholder="admin@lifelink.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-navy-950/80 border border-navy-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-navy-950/80 border border-navy-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md shadow-teal-600/30 transition-all active:scale-98 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Quick 1-Click Demo Logins */}
          <div className="pt-4 border-t border-navy-800 space-y-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
              Or Choose 1-Click Demo Persona
            </span>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('ADMIN')}
                className="p-2 rounded-xl bg-navy-800 hover:bg-navy-750 border border-navy-700 text-left transition-colors text-xs"
              >
                <p className="font-bold text-white text-[11px]">Admin</p>
                <p className="text-[10px] text-slate-400">Dr. Patel</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('CAREGIVER')}
                className="p-2 rounded-xl bg-navy-800 hover:bg-navy-750 border border-navy-700 text-left transition-colors text-xs"
              >
                <p className="font-bold text-teal-300 text-[11px]">Caregiver</p>
                <p className="text-[10px] text-slate-400">Nurse Elena</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('PATIENT')}
                className="p-2 rounded-xl bg-navy-800 hover:bg-navy-750 border border-navy-700 text-left transition-colors text-xs"
              >
                <p className="font-bold text-blue-300 text-[11px]">Patient</p>
                <p className="text-[10px] text-slate-400">Arthur King</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
