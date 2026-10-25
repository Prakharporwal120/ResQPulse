import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api';

interface AuthContextType {
  user: User | null;
  role: 'ADMIN' | 'CAREGIVER' | 'PATIENT';
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: 'ADMIN' | 'CAREGIVER' | 'PATIENT') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'ADMIN' | 'CAREGIVER' | 'PATIENT'>('ADMIN');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedRole = localStorage.getItem('lifelink_demo_role') as 'ADMIN' | 'CAREGIVER' | 'PATIENT';
    if (savedRole) {
      setRole(savedRole);
    }
    loadCurrentUser(savedRole || 'ADMIN');
  }, []);

  const loadCurrentUser = async (demoRole: 'ADMIN' | 'CAREGIVER' | 'PATIENT') => {
    setIsLoading(true);
    try {
      // Fetch user matching current demo role
      const res = await api.switchDemoRole(demoRole);
      setUser(res.user);
      setRole(res.user.role as any);
      localStorage.setItem('lifelink_token', res.access_token);
      localStorage.setItem('lifelink_demo_role', res.user.role);
    } catch (err) {
      console.warn('Failed to fetch initial user, running in local fallback', err);
      // Fallback demo user
      setUser({
        id: 1,
        name: 'Dr. Sarah Patel',
        email: 'admin@lifelink.ai',
        role: demoRole,
        is_active: true,
        created_at: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, password);
      setUser(res.user);
      setRole(res.user.role as any);
      localStorage.setItem('lifelink_token', res.access_token);
      localStorage.setItem('lifelink_demo_role', res.user.role);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('lifelink_token');
    // Default to admin for seamless evaluation
    switchRole('ADMIN');
  };

  const switchRole = async (newRole: 'ADMIN' | 'CAREGIVER' | 'PATIENT') => {
    setIsLoading(true);
    try {
      localStorage.setItem('lifelink_demo_role', newRole);
      setRole(newRole);
      const res = await api.switchDemoRole(newRole);
      setUser(res.user);
      localStorage.setItem('lifelink_token', res.access_token);
    } catch (err) {
      console.error('Failed to switch role', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, isLoading, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
