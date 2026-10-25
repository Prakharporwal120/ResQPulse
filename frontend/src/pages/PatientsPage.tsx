import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Activity,
  Battery,
  Wifi,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  Heart,
  X,
  AlertCircle
} from 'lucide-react';
import { api } from '../api';
import { Patient } from '../types';
import { useAuth } from '../context/AuthContext';

export const PatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    patient_code: '',
    display_name: '',
    age: '',
    gender: 'Male',
    medical_notes: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    room_or_address: ''
  });
  const [formError, setFormError] = useState<string | null>(null);

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPatients(search || undefined, statusFilter === 'all' ? undefined : statusFilter);
      setPatients(data);
    } catch (err) {
      console.error('Failed to load patients', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [search, statusFilter]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!addForm.patient_code.trim() || !addForm.display_name.trim()) {
      setFormError('Patient Code and Full Name are required.');
      return;
    }

    try {
      await api.createPatient({
        patient_code: addForm.patient_code.trim().toUpperCase(),
        display_name: addForm.display_name.trim(),
        age: addForm.age ? parseInt(addForm.age, 10) : undefined,
        gender: addForm.gender,
        medical_notes: addForm.medical_notes.trim(),
        emergency_contact_name: addForm.emergency_contact_name.trim(),
        emergency_contact_phone: addForm.emergency_contact_phone.trim(),
        room_or_address: addForm.room_or_address.trim(),
      });
      setIsAddModalOpen(false);
      setAddForm({
        patient_code: '',
        display_name: '',
        age: '',
        gender: 'Male',
        medical_notes: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        room_or_address: ''
      });
      await loadPatients();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create patient.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-400" />
            <span>Monitored Patients Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered older adults and patients under remote health observation.
          </p>
        </div>

        {role === 'ADMIN' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md shadow-teal-600/30 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Register New Patient</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl glass-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name or code (e.g., Arthur, PAT-101)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-navy-950/60 border border-navy-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-navy-950/60 border border-navy-700 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Patients</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Patients Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading patient records...</div>
      ) : patients.length === 0 ? (
        <div className="p-12 text-center rounded-2xl glass-card">
          <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No patients found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or register a new patient.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {patients.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/patients/${p.id}`)}
              className="glass-card glass-card-hover p-5 rounded-2xl cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base tracking-tight">{p.display_name}</h3>
                      {p.has_active_emergency && (
                        <span className="h-2.5 w-2.5 rounded-full bg-alert-red animate-ping" title="Active Emergency"></span>
                      )}
                    </div>
                    <p className="text-xs text-teal-400 font-mono font-semibold">{p.patient_code}</p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      p.is_active
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                    }`}
                  >
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-slate-300 mb-4">
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {p.medical_notes || 'No specific clinical notes documented.'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    <span className="text-slate-400">Address / Room:</span> {p.room_or_address || 'Unassigned'}
                  </p>
                </div>

                {/* Vitals & Device Status Row */}
                <div className="p-3 rounded-xl bg-navy-950/60 border border-navy-800/80 grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-alert-amber shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400">Current HR</p>
                      <p className="text-xs font-bold text-white">
                        {p.latest_heart_rate ? `${p.latest_heart_rate} BPM` : '74 BPM (Sim)'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Battery className="h-4 w-4 text-teal-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400">Device Battery</p>
                      <p className="text-xs font-bold text-white">
                        {p.device_battery !== undefined ? `${p.device_battery}%` : '85%'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assigned Caregivers */}
                <div className="text-[11px] text-slate-400 mb-3">
                  <span className="font-semibold text-slate-300">Caregivers: </span>
                  {p.assigned_caregivers.length > 0 ? (
                    p.assigned_caregivers.map((c) => c.name).join(', ')
                  ) : (
                    'Elena Davis (Primary)'
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-navy-800/80 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400">
                  {p.active_device_code ? `Device: ${p.active_device_code}` : 'Simulated Band'}
                </span>
                <span className="text-teal-400 font-semibold flex items-center gap-1 group">
                  <span>View Details</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Patient Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-navy-900 border border-navy-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-navy-800 flex items-center justify-between bg-navy-950/60">
              <h2 className="text-base font-bold text-white">Register New Patient</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="p-5 space-y-3.5">
              {formError && (
                <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Patient Code *
                  </label>
                  <input
                    type="text"
                    placeholder="PAT-104"
                    value={addForm.patient_code}
                    onChange={(e) => setAddForm({ ...addForm, patient_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-navy-950/80 border border-navy-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Full Display Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Eleanor Vance"
                    value={addForm.display_name}
                    onChange={(e) => setAddForm({ ...addForm, display_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-navy-950/80 border border-navy-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Age</label>
                  <input
                    type="number"
                    placeholder="79"
                    value={addForm.age}
                    onChange={(e) => setAddForm({ ...addForm, age: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-navy-950/80 border border-navy-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Gender</label>
                  <select
                    value={addForm.gender}
                    onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-navy-950/80 border border-navy-700 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Residence / Room Address
                </label>
                <input
                  type="text"
                  placeholder="Room 204, Sunrise Senior Living"
                  value={addForm.room_or_address}
                  onChange={(e) => setAddForm({ ...addForm, room_or_address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-navy-950/80 border border-navy-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    placeholder="Robert Vance (Son)"
                    value={addForm.emergency_contact_name}
                    onChange={(e) => setAddForm({ ...addForm, emergency_contact_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-navy-950/80 border border-navy-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+1-555-0199"
                    value={addForm.emergency_contact_phone}
                    onChange={(e) => setAddForm({ ...addForm, emergency_contact_phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-navy-950/80 border border-navy-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Medical Notes & Mobility Risk
                </label>
                <textarea
                  rows={2}
                  placeholder="Previous fall history, medication dizziness, walking support needed..."
                  value={addForm.medical_notes}
                  onChange={(e) => setAddForm({ ...addForm, medical_notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-navy-950/80 border border-navy-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-navy-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-750 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md shadow-teal-600/30"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
