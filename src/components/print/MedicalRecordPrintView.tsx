import React from 'react';
import { Printer, ArrowLeft, Building2, Stethoscope, Phone, Mail, MapPin } from 'lucide-react';
import { MedicalRecord, Patient, ClinicInfo } from '../../types';
import { usePatients } from '../../context/PatientContext';

interface MedicalRecordPrintViewProps {
  record: MedicalRecord;
  patient: Patient;
  onBack: () => void;
}

export const MedicalRecordPrintView: React.FC<MedicalRecordPrintViewProps> = ({
  record,
  patient,
  onBack,
}) => {
  const { clinicInfo, logAuditAction } = usePatients();

  const handlePrint = () => {
    logAuditAction('PRINT_EXPORT', 'medical_records', record.id, {
      patient_id: patient.id,
      record_date: record.record_date,
    });
    window.print();
  };

  const hasDrawing = record.drawings && record.drawings.length > 0;
  const drawing = hasDrawing ? record.drawings![0] : null;

  return (
    <div className="max-w-4xl mx-auto pb-16">
      {/* Top Action Bar (Hidden during print via .no-print) */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-xs flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Clinical Record
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Print layout optimized for A4 / Letter format
          </span>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            Print Medical Record (Ctrl+P)
          </button>
        </div>
      </div>

      {/* Official Medical Record Print Document Canvas */}
      <div className="bg-white p-8 md:p-12 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 font-sans text-slate-900">
        {/* Clinic Letterhead */}
        <div className="border-b-2 border-slate-900 pb-5 mb-6 text-center relative">
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-slate-900 font-serif">
            {clinicInfo.name}
          </h1>
          <p className="text-sm font-semibold text-blue-900 mt-0.5">
            {clinicInfo.doctor_name}, {clinicInfo.doctor_title}
          </p>
          <p className="text-xs font-medium text-slate-600">
            {clinicInfo.specialty} • PRC License No. {clinicInfo.license_number}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-500 mt-1">
            <span>{clinicInfo.address}</span>
            <span>•</span>
            <span>Tel: {clinicInfo.phone}</span>
            <span>•</span>
            <span>Email: {clinicInfo.email}</span>
          </div>
        </div>

        {/* Document Title Banner */}
        <div className="bg-slate-100 print:bg-slate-100 px-4 py-1.5 rounded mb-6 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-800 border border-slate-300">
          <span>Official Clinical Consultation Summary</span>
          <span>Record ID: {record.id.substring(0, 12)}</span>
        </div>

        {/* Patient Demographics Box */}
        <div className="border border-slate-300 rounded-lg p-4 mb-6 bg-slate-50/50 print:bg-transparent text-xs space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Patient Name:</span>
              <span className="font-bold text-slate-900 text-sm">{patient.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Patient ID #:</span>
              <span className="font-mono font-bold text-slate-900">{patient.patient_number}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Age / Sex:</span>
              <span className="font-semibold text-slate-900">{patient.age} y/o • {patient.sex} ({patient.status})</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Contact Phone:</span>
              <span className="text-slate-800">{patient.phone || 'N/A'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-slate-200/80">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Address:</span>
              <span className="text-slate-800">{patient.address || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Religion / Status:</span>
              <span className="text-slate-800">{patient.religion || 'RC'} • {patient.status}</span>
            </div>
          </div>
        </div>

        {/* Visit & Admission Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-50 print:bg-slate-50 border border-slate-200 rounded-lg text-xs mb-6">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Consultation Date:</span>
            <span className="font-bold text-slate-900">{record.record_date}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Hospital Admission (ADM):</span>
            <span className="font-semibold text-slate-900">{record.adm ? 'YES (Admitted)' : 'NO (Outpatient)'}</span>
          </div>
          {record.adm && (
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Admission Date:</span>
              <span className="font-semibold text-slate-900">{record.admission_date || 'N/A'}</span>
            </div>
          )}
          {record.adm && (
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Discharge Facility:</span>
              <span className="font-semibold text-slate-900">{record.discharge_hospital || 'N/A'}</span>
            </div>
          )}
        </div>

        {/* Clinical Breakdown Sections */}
        <div className="space-y-4 text-xs">
          {/* Chief Complaints */}
          <div className="border border-slate-200 rounded-lg p-3.5">
            <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-700 mb-1 border-b border-slate-100 pb-1">
              1. Chief Complaints & History of Present Illness
            </h3>
            <p className="text-slate-800 whitespace-pre-line leading-relaxed">
              {record.complaints || 'No complaints documented.'}
            </p>
          </div>

          {/* Physical Examination & Labs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-lg p-3.5">
              <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-700 mb-1 border-b border-slate-100 pb-1">
                2. Physical Examination (PE)
              </h3>
              <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                {record.pe || 'Within normal limits.'}
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-3.5">
              <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-700 mb-1 border-b border-slate-100 pb-1">
                3. Laboratory & Diagnostic Imaging (LABS)
              </h3>
              <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                {record.labs || 'No laboratory reports pending.'}
              </p>
            </div>
          </div>

          {/* Diagnosis */}
          <div className="border-2 border-slate-900/40 rounded-lg p-3.5 bg-slate-50/50 print:bg-transparent">
            <h3 className="font-bold uppercase tracking-wider text-[11px] text-blue-900 mb-1 border-b border-slate-200 pb-1">
              4. Clinical Diagnosis
            </h3>
            <p className="text-sm font-bold text-slate-900">
              {record.diagnoses}
            </p>
          </div>

          {/* Clinical Drawing / Findings Diagram (If Present) */}
          {drawing && (
            <div className="border border-slate-200 rounded-lg p-4 page-break-inside-avoid">
              <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-700 mb-2 border-b border-slate-100 pb-1 flex items-center justify-between">
                <span>5. Clinical Findings & Anatomical Diagram</span>
                <span className="text-[10px] font-normal text-slate-500 font-mono">
                  {drawing.title}
                </span>
              </h3>
              <div className="flex justify-center bg-white p-2 border border-slate-200 rounded">
                <img
                  src={drawing.image_url}
                  alt={drawing.title}
                  className="max-h-80 max-w-full object-contain"
                />
              </div>
              {drawing.notes && (
                <p className="text-[11px] text-slate-600 mt-2 italic">
                  Observation notes: {drawing.notes}
                </p>
              )}
            </div>
          )}

          {/* Management / Notes / Prescriptions */}
          <div className="border border-slate-200 rounded-lg p-3.5">
            <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-700 mb-1 border-b border-slate-100 pb-1">
              6. Treatment Plan, Management & Prescriptions (Rx)
            </h3>
            <p className="text-slate-800 whitespace-pre-line leading-relaxed font-mono text-xs">
              {record.notes || 'Routine follow-up as directed.'}
            </p>
          </div>

          {/* Professional Charges & Physician Sign-off */}
          <div className="pt-4 border-t-2 border-slate-900 flex flex-col md:flex-row items-start md:items-end justify-between gap-6 page-break-inside-avoid">
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-semibold block">Professional Fee / Charges:</span>
              <span className="font-mono text-base font-bold text-slate-900">
                ₱{Number(record.charges || 0).toFixed(2)}
              </span>
              <p className="text-[10px] text-slate-400 mt-1">
                Printed on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
              </p>
            </div>

            <div className="text-center min-w-[240px]">
              <div className="h-10 border-b border-slate-900 mb-1 flex items-end justify-center">
                {/* Signature blank or stamp */}
                <span className="text-xs font-serif italic text-blue-900 pb-1 font-semibold">
                  {clinicInfo.doctor_name}, {clinicInfo.doctor_title}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 uppercase">
                {clinicInfo.doctor_name}
              </p>
              <p className="text-[11px] text-slate-500">
                Lic. No. {clinicInfo.license_number}
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                Attending Physician
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
