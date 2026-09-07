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
  FileCode2,
  Users,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { usePatients } from '../../context/PatientContext';
import { useAuth } from '../../context/AuthContext';
import { ClinicInfo, StaffProfile } from '../../types';
import { getSupabaseConfig, setSupabaseConfig } from '../../lib/supabase';
import { getStaffDisplayName, formatStaffRole } from '../../utils/staffDisplay';

export const ClinicSettings: React.FC = () => {
  const { doctor, staffProfile, updateStaffProfile } = useAuth();
  const displayName = getStaffDisplayName(staffProfile);
  const { 
    clinicInfo, 
    updateClinicInfo, 
    auditLogs, 
    syncStatus, 
    scanExistingDuplicates, 
    setSelectedPatient, 
    setActiveView 
  } = usePatients();

  const duplicateClusters = scanExistingDuplicates ? scanExistingDuplicates() : [];

  // Clinic info form state
  const [formData, setFormData] = useState<ClinicInfo>(clinicInfo);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Staff profile edit state
  const [staffFormData, setStaffFormData] = useState<Partial<StaffProfile>>({
    full_name: staffProfile?.full_name || '',
    title: staffProfile?.title || '',
    specialty: staffProfile?.specialty || '',
    license_number: staffProfile?.license_number || '',
    phone: staffProfile?.phone || '',
  });
  const [staffUpdateMsg, setStaffUpdateMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Supabase connection keys state
  const currentConfig = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState<string>(currentConfig.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState<string>(currentConfig.anonKey);
  const [supabaseSaved, setSupabaseSaved] = useState<boolean>(false);

  const handleStaffProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffUpdateMsg(null);
    const res = await updateStaffProfile(staffFormData);
    if (res.success) {
      setStaffUpdateMsg({ text: 'Staff profile updated successfully!' });
      setTimeout(() => setStaffUpdateMsg(null), 3500);
    } else {
      setStaffUpdateMsg({ text: res.error || 'Failed to update profile.', error: true });
    }
  };

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
          Configure clinic letterhead, authenticated staff credentials, Supabase cloud database credentials, and audit security logs.
        </p>
      </div>

      {/* Authenticated Staff Identity & Role Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Authenticated Clinical Staff Identity
            </h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 capitalize">
            {formatStaffRole(staffProfile?.role)}
          </span>
        </div>

        {/* Read-Only Verified Profile Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Canonical Display Name</span>
            <span className="text-sm font-bold text-slate-900 block mt-0.5">{displayName}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Auth Email</span>
            <span className="text-sm font-medium text-slate-700 block mt-0.5 truncate">{staffProfile?.email || 'Authenticated User'}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Clinical Role</span>
            <span className="text-sm font-semibold text-blue-700 block mt-0.5">{formatStaffRole(staffProfile?.role)}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Organization Scoping</span>
            <span className="text-xs font-mono text-slate-600 block mt-1 truncate">{staffProfile?.organization_id || 'org-default'}</span>
          </div>
        </div>

        {/* Form to Update Profile */}
        <form onSubmit={handleStaffProfileSubmit} className="space-y-4 pt-2">
          {staffUpdateMsg && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              staffUpdateMsg.error 
                ? 'bg-rose-50 border border-rose-200 text-rose-700' 
                : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}>
              {staffUpdateMsg.error ? <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
              <span>{staffUpdateMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Display Name (public.staff_profiles.full_name)
              </label>
              <input
                type="text"
                value={staffFormData.full_name}
                onChange={(e) => setStaffFormData({ ...staffFormData, full_name: e.target.value })}
                placeholder="e.g. Dr. Fausto Tancongco"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Canonical name displayed on dashboard, sidebar, and clinical printouts.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Professional Title & Degrees
              </label>
              <input
                type="text"
                value={staffFormData.title}
                onChange={(e) => setStaffFormData({ ...staffFormData, title: e.target.value })}
                placeholder="e.g. M.D., FPCP, FPCCP"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Specialty
              </label>
              <input
                type="text"
                value={staffFormData.specialty}
                onChange={(e) => setStaffFormData({ ...staffFormData, specialty: e.target.value })}
                placeholder="e.g. Internal Medicine & Pulmonology"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PRC / Professional License Number
              </label>
              <input
                type="text"
                value={staffFormData.license_number}
                onChange={(e) => setStaffFormData({ ...staffFormData, license_number: e.target.value })}
                placeholder="e.g. PRC-0084921"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-slate-400 max-w-md">
              <span className="font-semibold text-slate-600">RBAC Guardrails:</span> Normal staff are restricted to modifying display credentials. Role reassignments, organization scoping, and account status require super-administrator authorization.
            </p>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <Save className="w-3.5 h-3.5" /> Save Staff Profile
            </button>
          </div>
        </form>
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
            Connect to your live Supabase cloud database to enable secure, real-time clinical synchronization and row-level security.
          </p>
          <p>
            Provide your <strong>Project URL</strong> and <strong>Anon Public Key</strong> below. The schema file is located at <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-800">supabase-schema.sql</code>.
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
              Clear Custom Config
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

      {/* Duplicate Patient Audit & Review Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Duplicate Patient Screening & Integrity Audit
            </h2>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
            duplicateClusters.length > 0 
              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {duplicateClusters.length > 0 
              ? `${duplicateClusters.length} duplicate cluster${duplicateClusters.length > 1 ? 's' : ''} detected` 
              : 'Zero duplicate clusters detected'}
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          The clinic prevents concurrent creation of duplicate patient files using atomic database locking and normalized demographic matching.
          In accordance with medical record safety standards, existing duplicates are <strong>never automatically merged or deleted</strong>, but are audited here for clinical review.
        </p>

        {duplicateClusters.length === 0 ? (
          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center gap-3 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>All existing patient records in your clinic database have distinct demographic profiles.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {duplicateClusters.map((cluster) => (
              <div 
                key={cluster.id} 
                className={`p-4 rounded-xl border ${
                  cluster.severity === 'strong' 
                    ? 'bg-rose-50/40 border-rose-200' 
                    : 'bg-amber-50/40 border-amber-200'
                } space-y-2.5`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      cluster.severity === 'strong' 
                        ? 'bg-rose-100 text-rose-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {cluster.severity === 'strong' ? 'STRONG DUPLICATE' : 'CONTACT SIMILARITY'}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {cluster.reason}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {cluster.patients.length} records involved
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {cluster.patients.map((pat) => (
                    <div 
                      key={pat.id}
                      className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between shadow-2xs hover:border-blue-400 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{pat.name}</span>
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                            {pat.patient_number}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex gap-2">
                          <span>Age {pat.age}</span>
                          <span>•</span>
                          <span>{pat.sex === 'F' ? 'Female' : 'Male'}</span>
                          {pat.phone && (
                            <>
                              <span>•</span>
                              <span>{pat.phone}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(pat);
                          setActiveView('profile');
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 p-1.5 rounded-md hover:bg-blue-50 transition"
                        title="View Patient Chart"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">View Chart</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security & Audit Logs Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Role-Based Clinical Audit Trail
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
