import React from 'react';
import { 
  Users, 
  UserPlus, 
  FileText, 
  PlusCircle, 
  Clock, 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  Stethoscope, 
  PenTool, 
  Search,
  Building2,
  Calendar
} from 'lucide-react';
import { usePatients } from '../../context/PatientContext';
import { useAuth } from '../../context/AuthContext';
import { Patient, MedicalRecord } from '../../types';
import { getStaffDisplayName } from '../../utils/staffDisplay';

interface DoctorDashboardProps {
  onSelectPatient: (patient: Patient) => void;
  onOpenNewPatientModal: () => void;
  onNewRecord: () => void;
  onViewRecord: (record: MedicalRecord, patient: Patient) => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  onSelectPatient,
  onOpenNewPatientModal,
  onNewRecord,
  onViewRecord,
}) => {
  const { doctor, staffProfile } = useAuth();
  const displayName = getStaffDisplayName(staffProfile);
  const { 
    patients, 
    medicalRecords, 
    clinicInfo, 
    setActiveView, 
    setSearchQuery 
  } = usePatients();

  // Metrics
  const totalPatients = patients.filter((p) => !p.is_archived).length;
  const totalRecords = medicalRecords.filter((r) => !r.is_archived).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = medicalRecords.filter(
    (r) => !r.is_archived && r.record_date === todayStr
  ).length;

  // New patients this month
  const currentMonthPrefix = todayStr.substring(0, 7);
  const newPatientsThisMonth = patients.filter(
    (p) => !p.is_archived && p.created_at.startsWith(currentMonthPrefix)
  ).length;

  // Recent Patients
  const recentPatients = [...patients]
    .filter((p) => !p.is_archived)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Recent Medical Records
  const recentRecords = [...medicalRecords]
    .filter((r) => !r.is_archived)
    .sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative medical cross grid */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-5 pointer-events-none flex items-center justify-center">
          <Stethoscope className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-3">
            <Activity className="w-3.5 h-3.5" />
            <span>Healthcare Electronic Health Record Platform</span>
            {staffProfile?.role && (
              <>
                <span className="opacity-60">•</span>
                <span className="capitalize">{staffProfile.role} Workspace</span>
              </>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Welcome back, {displayName}
          </h1>
          <div className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-white capitalize">
              {staffProfile?.role ? `${staffProfile.role === 'doctor' ? 'Physician' : staffProfile.role}` : 'Staff'}
            </span>
            {staffProfile?.title && (
              <>
                <span className="opacity-60">•</span>
                <span>{staffProfile.title}</span>
              </>
            )}
            {(staffProfile?.specialty || clinicInfo.specialty) && (
              <>
                <span className="opacity-60">•</span>
                <span>{staffProfile?.specialty || clinicInfo.specialty}</span>
              </>
            )}
            {staffProfile?.license_number && (
              <>
                <span className="opacity-60">•</span>
                <span className="text-slate-400">Lic. #{staffProfile.license_number}</span>
              </>
            )}
            {staffProfile?.organization_id && (
              <>
                <span className="opacity-60">•</span>
                <span className="text-slate-400 font-mono text-[11px]">Org: {staffProfile.organization_id}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              type="button"
              onClick={onOpenNewPatientModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              Quick Add Patient
            </button>
            <button
              type="button"
              onClick={onNewRecord}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border border-white/20 transition"
            >
              <PlusCircle className="w-4 h-4" />
              Quick New Medical Record
            </button>
            <button
              type="button"
              onClick={() => setActiveView('patients')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition"
            >
              Browse All Patients <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patients */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Patients</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalPatients}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Registered active charts</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* New Patients This Month */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Patients</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{newPatientsThisMonth}</h3>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" /> This month
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserPlus className="w-6 h-6" />
          </div>
        </div>

        {/* Total Medical Records */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Medical Records</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalRecords}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Documented encounters</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Records */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Records</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{todayRecords}</h3>
            <span className="text-[11px] text-blue-600 font-medium flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" /> Scheduled & Walk-in
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Patients & Recent Medical Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Recent Patient Charts
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('patients')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {recentPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => onSelectPatient(patient)}
                className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-100 group-hover:scale-105 transition">
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                      {patient.name}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      <span className="font-mono font-medium text-slate-600">{patient.patient_number}</span> •{' '}
                      {patient.age} y/o {patient.sex} • {patient.phone || 'No phone'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 group-hover:text-slate-600">
                    Profile →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Medical Records */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Recent Clinical Consultations
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('medical-records')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {recentRecords.map((record) => {
              const patient = patients.find((p) => p.id === record.patient_id);
              const hasDrawings = record.drawings && record.drawings.length > 0;

              return (
                <div
                  key={record.id}
                  onClick={() => {
                    if (patient) onViewRecord(record, patient);
                  }}
                  className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between cursor-pointer group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-xs text-slate-900">
                        {record.record_date}
                      </span>
                      {hasDrawings && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          <PenTool className="w-2.5 h-2.5" /> Drawing
                        </span>
                      )}
                      {record.adm && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          ADM
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition">
                      {record.diagnoses}
                    </h4>

                    <p className="text-[11px] text-slate-500">
                      Patient: <strong className="text-slate-700">{patient?.name || 'Unknown'}</strong>{' '}
                      • Dr. {record.doctor_name || 'Fausto Tancongco'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs font-semibold text-slate-800 block">
                      ₱{Number(record.charges || 0).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-blue-600 group-hover:underline">
                      Open Record →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
