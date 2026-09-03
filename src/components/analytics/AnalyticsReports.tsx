import React, { useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  Hospital, 
  PieChart, 
  DollarSign, 
  Calendar,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { usePatients } from '../../context/PatientContext';

export const AnalyticsReports: React.FC = () => {
  const { patients, medicalRecords } = usePatients();

  // Metric 1: Demographics by Sex
  const sexDistribution = useMemo(() => {
    const counts = { F: 0, M: 0, Other: 0 };
    patients.forEach((p) => {
      if (p.sex === 'F') counts.F++;
      else if (p.sex === 'M') counts.M++;
      else counts.Other++;
    });
    return counts;
  }, [patients]);

  // Metric 2: Admission vs Outpatient
  const admissionStats = useMemo(() => {
    let admitted = 0;
    let outpatient = 0;
    let totalCharges = 0;

    medicalRecords.forEach((r) => {
      if (r.adm) admitted++;
      else outpatient++;
      totalCharges += Number(r.charges || 0);
    });

    return {
      admitted,
      outpatient,
      total: medicalRecords.length,
      totalCharges,
      avgCharge: medicalRecords.length > 0 ? totalCharges / medicalRecords.length : 0,
    };
  }, [medicalRecords]);

  // Metric 3: Top Diagnoses
  const topDiagnoses = useMemo(() => {
    const map: { [key: string]: number } = {};
    medicalRecords.forEach((r) => {
      // Split comma separated or take whole
      const parts = r.diagnoses.split(/[,;/]/).map((d) => d.trim()).filter(Boolean);
      parts.forEach((p) => {
        map[p] = (map[p] || 0) + 1;
      });
    });

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [medicalRecords]);

  // Metric 4: Age Group Distribution
  const ageGroups = useMemo(() => {
    const groups = {
      '0-18 (Pediatric)': 0,
      '19-35 (Young Adult)': 0,
      '36-50 (Adult)': 0,
      '51-65 (Middle Age)': 0,
      '65+ (Senior)': 0,
    };

    patients.forEach((p) => {
      if (p.age <= 18) groups['0-18 (Pediatric)']++;
      else if (p.age <= 35) groups['19-35 (Young Adult)']++;
      else if (p.age <= 50) groups['36-50 (Adult)']++;
      else if (p.age <= 65) groups['51-65 (Middle Age)']++;
      else groups['65+ (Senior)']++;
    });

    return groups;
  }, [patients]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              <BarChart3 className="w-4 h-4" />
              Clinical Intelligence & Practice Analytics
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Clinical Performance & Demographics
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Longitudinal metrics, patient demographic patterns, and clinical encounter distributions.
            </p>
          </div>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Active Charts</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{patients.length}</h3>
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
            <TrendingUp className="w-3 h-3" /> 100% cloud encrypted
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Consultations</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{medicalRecords.length}</h3>
          <span className="text-[11px] text-blue-600 font-medium mt-0.5 block">
            {admissionStats.admitted} Inpatient • {admissionStats.outpatient} Outpatient
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recorded Billing Total</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">
            ₱{admissionStats.totalCharges.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Avg ₱{admissionStats.avgCharge.toFixed(2)} / visit
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospital Admission Rate</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">
            {admissionStats.total > 0
              ? `${((admissionStats.admitted / admissionStats.total) * 100).toFixed(1)}%`
              : '0%'}
          </h3>
          <span className="text-[11px] text-amber-600 font-medium mt-0.5 block">
            {admissionStats.admitted} patient admissions
          </span>
        </div>
      </div>

      {/* Analytics Grid: Diagnoses & Gender/Admission */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Frequent Diagnoses */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Most Frequent Clinical Diagnoses
            </h2>
            <span className="text-xs text-slate-400">Frequency count</span>
          </div>

          <div className="space-y-3 pt-2">
            {topDiagnoses.map(([diagnosis, count]) => {
              const percentage =
                medicalRecords.length > 0 ? (count / medicalRecords.length) * 100 : 0;
              return (
                <div key={diagnosis} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate max-w-[70%]">
                      {diagnosis}
                    </span>
                    <span className="font-mono text-slate-500">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, percentage * 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Age Group Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Patient Age Demographics
            </h2>
            <span className="text-xs text-slate-400">Cohort distribution</span>
          </div>

          <div className="space-y-3 pt-2">
            {Object.entries(ageGroups).map(([group, countValue]) => {
              const count = Number(countValue);
              const pct = patients.length > 0 ? (count / patients.length) * 100 : 0;
              return (
                <div key={group} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{group}</span>
                    <span className="font-mono text-slate-500">
                      {count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gender Demographics Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
            <PieChart className="w-4 h-4 text-blue-600" />
            Gender Ratio
          </h2>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-pink-50/50 border border-pink-100 p-4 rounded-xl text-center">
              <span className="text-xs font-semibold text-pink-700 uppercase">Female (F)</span>
              <p className="text-2xl font-bold text-pink-900 mt-1">{sexDistribution.F}</p>
              <span className="text-[11px] text-pink-600">
                {patients.length > 0 ? ((sexDistribution.F / patients.length) * 100).toFixed(1) : 0}% of registry
              </span>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl text-center">
              <span className="text-xs font-semibold text-blue-700 uppercase">Male (M)</span>
              <p className="text-2xl font-bold text-blue-900 mt-1">{sexDistribution.M}</p>
              <span className="text-[11px] text-blue-600">
                {patients.length > 0 ? ((sexDistribution.M / patients.length) * 100).toFixed(1) : 0}% of registry
              </span>
            </div>
          </div>
        </div>

        {/* Encounter Classification Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Hospital className="w-4 h-4 text-blue-600" />
            Hospital Admission Ratio (ADM)
          </h2>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl text-center">
              <span className="text-xs font-semibold text-emerald-700 uppercase">Outpatient Clinic</span>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{admissionStats.outpatient}</p>
              <span className="text-[11px] text-emerald-600">
                {admissionStats.total > 0
                  ? ((admissionStats.outpatient / admissionStats.total) * 100).toFixed(1)
                  : 0}
                % of visits
              </span>
            </div>

            <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl text-center">
              <span className="text-xs font-semibold text-amber-700 uppercase">Inpatient Admitted</span>
              <p className="text-2xl font-bold text-amber-900 mt-1">{admissionStats.admitted}</p>
              <span className="text-[11px] text-amber-600">
                {admissionStats.total > 0
                  ? ((admissionStats.admitted / admissionStats.total) * 100).toFixed(1)
                  : 0}
                % of visits
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
