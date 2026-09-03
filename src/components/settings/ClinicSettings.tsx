import React, { useState } from 'react';
import { 
  Building2, 
  Database, 
  Shield, 
  Save, 
  Check, 
  Key, 
  Globe, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  Stethoscope,
  Clock,
  UserCheck,
  FileCode2
} from 'lucide-react';
import { usePatients } from '../../context/PatientContext';
import { useAuth } from '../../context/AuthContext';
import { ClinicInfo } from '../../types';
import { getSupabaseConfig, setSupabaseConfig } from '../../lib/supabase';

export const ClinicSettings: React.FC = () => {
  const { doctor } = useAuth();
  const { clinicInfo, updateClinicInfo, auditLogs, syncStatus } = usePatients();

  // Clinic info form state
  const [formData, setFormData] = useState<ClinicInfo>(clinicInfo);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Supabase connection keys state
  const currentConfig = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState<string>(currentConfig.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState<string>(currentConfig.anonKey);
  const [supabaseSaved, setSupabaseSaved] = useState<boolean>(false);

  const handleClinicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateClinicInfo(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSupabaseConfig(supabaseUrl.trim(), supabaseAnonKey.trim());
    setSupabaseSaved(true);
    setTimeout(() => {
      setSupabaseSaved(false);
      window.location.reload();
    }, 1500);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Practice & System Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure clinic letterhead, doctor credentials, Supabase cloud database credentials, and audit security logs.
        </p>
      </div>

      {/* Clinic Details / Letterhead Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Clinic & Physician Letterhead Information
            </h2>
          </div>
          {savedSuccess && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Letterhead details updated!
            </span>
          )}
        </div>

        <form onSubmit={handleClinicSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinic / Hospital Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Medical Specialty
              </label>
              <input
                type="text"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Attending Physician Name
              </label>
              <input
                type="text"
                value={formData.doctor_name}
                onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PRC License Number
              </label>
              <input
                type="text"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinic Telephone / Mobile
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinic Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinic Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition"
            >
              <Save className="w-3.5 h-3.5" />
              Save Letterhead Settings
            </button>
          </div>
        </form>
      </div>

      {/* Supabase PostgreSQL Database Settings */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Supabase Backend & PostgreSQL Connection
              </h2>
              <p className="text-xs text-slate-500">
                Current Mode:{' '}
                <span className="font-semibold text-blue-600 capitalize">{syncStatus}</span>
              </p>
            </div>
          </div>
          {supabaseSaved && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Credentials Saved! Reloading...
            </span>
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
          <p>
            The system comes with an instant offline demo engine seeded with the Melanie Arceñas records from your legacy medical database.
          </p>
          <p>
            To connect to your live Supabase cloud database, provide your <strong>Project URL</strong> and <strong>Anon Public Key</strong> below. The schema file is located at <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-800">supabase-schema.sql</code>.
          </p>
        </div>

        <form onSubmit={handleSaveSupabaseConfig} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              Supabase Project URL
            </label>
            <input
              type="text"
              placeholder="https://your-project-id.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full text-xs font-mono rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              Supabase Anon Public API Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              className="w-full text-xs font-mono rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setSupabaseUrl('');
                setSupabaseAnonKey('');
                setSupabaseConfig('', '');
                window.location.reload();
              }}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Reset to Demo Mode
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition"
            >
              <Save className="w-3.5 h-3.5" />
              Save & Test Connection
            </button>
          </div>
        </form>
      </div>

      {/* Security & Audit Logs Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              HIPAA Compliant Clinical Audit Trail
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {auditLogs.length} logged events
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Immutable audit records tracking patient chart views, creation, modifications, clinical drawings, and print exports.
        </p>

        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Resource</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleDateString()}{' '}
                    {new Date(log.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                    {log.resource_type}
                  </td>
                  <td className="py-2 px-3 text-slate-500 max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
