import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AlertSoundProvider } from './context/AlertSoundContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DemoLabModal } from './components/DemoLabModal';
import { api } from './api';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { PatientsPage } from './pages/PatientsPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { EmergencyCenterPage } from './pages/EmergencyCenterPage';
import { CaregiverPage } from './pages/CaregiverPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DevicesPage } from './pages/DevicesPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

const MainLayout: React.FC = () => {
  const [isDemoLabOpen, setIsDemoLabOpen] = useState(false);
  const [activeEmergencyCount, setActiveEmergencyCount] = useState(0);
  const [systemConnectivity, setSystemConnectivity] = useState('ONLINE');

  const refreshGlobalStatus = async () => {
    try {
      const summary = await api.getDashboardSummary();
      setActiveEmergencyCount(summary.active_emergencies);
      setSystemConnectivity(summary.system_connectivity);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    refreshGlobalStatus();
    const interval = setInterval(refreshGlobalStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen bg-navy-950 text-slate-100">
      {/* Persistent Sidebar */}
      <Sidebar activeEmergencyCount={activeEmergencyCount} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onOpenDemoLab={() => setIsDemoLabOpen(true)}
          systemConnectivity={systemConnectivity}
          activeEmergencyCount={activeEmergencyCount}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/patients/:id" element={<PatientDetailPage />} />
            <Route path="/live" element={<LiveMonitoringPage />} />
            <Route path="/emergencies" element={<EmergencyCenterPage />} />
            <Route path="/caregiver" element={<CaregiverPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Demo Scenario Lab Drawer */}
      <DemoLabModal
        isOpen={isDemoLabOpen}
        onClose={() => setIsDemoLabOpen(false)}
        onScenarioExecuted={refreshGlobalStatus}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AlertSoundProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<MainLayout />} />
          </Routes>
        </AlertSoundProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
