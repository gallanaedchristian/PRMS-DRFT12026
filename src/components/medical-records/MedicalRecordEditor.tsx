import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, 
  X, 
  Printer, 
  Trash2, 
  PenTool, 
  Calendar, 
  Building2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  DollarSign, 
  Stethoscope, 
  FileText, 
  Activity, 
  FlaskConical,
  CheckCircle2,
  HelpCircle,
  Eye
} from 'lucide-react';
import { MedicalRecord, Patient } from '../../types';
import { usePatients } from '../../context/PatientContext';
import { useAuth } from '../../context/AuthContext';
import { ClinicalDrawingCanvas } from '../drawing/ClinicalDrawingCanvas';

interface MedicalRecordEditorProps {
  patient: Patient;
  recordToEdit?: MedicalRecord | null;
  onCancel: () => void;
  onSaved: (record: MedicalRecord) => void;
  onPrint?: (record: MedicalRecord) => void;
}

export const MedicalRecordEditor: React.FC<MedicalRecordEditorProps> = ({
  patient,
  recordToEdit,
  onCancel,
  onSaved,
  onPrint,
}) => {
  const { doctor } = useAuth();
  const { createMedicalRecord, updateMedicalRecord, deleteMedicalRecord } = usePatients();

  // Form State
  const [recordDate, setRecordDate] = useState<string>(
    recordToEdit?.record_date || new Date().toISOString().split('T')[0]
  );
  const [adm, setAdm] = useState<boolean>(recordToEdit?.adm || false);
  const [admissionDate, setAdmissionDate] = useState<string>(recordToEdit?.admission_date || '');
  const [dischargeHospital, setDischargeHospital] = useState<string>(
    recordToEdit?.discharge_hospital || ''
  );
  const [complaints, setComplaints] = useState<string>(recordToEdit?.complaints || '');
  const [pe, setPe] = useState<string>(recordToEdit?.pe || '');
  const [labs, setLabs] = useState<string>(recordToEdit?.labs || '');
  const [diagnoses, setDiagnoses] = useState<string>(recordToEdit?.diagnoses || '');
  const [notes, setNotes] = useState<string>(recordToEdit?.notes || '');
  const [charges, setCharges] = useState<string>(
    recordToEdit?.charges !== undefined ? String(recordToEdit.charges) : '650.00'
  );

  // Drawing state
  const [activeDrawingDataUrl, setActiveDrawingDataUrl] = useState<string | null>(
    recordToEdit?.drawings && recordToEdit.drawings.length > 0
      ? recordToEdit.drawings[0].image_url
      : null
  );
  const [showDrawingCanvas, setShowDrawingCanvas] = useState<boolean>(false);

  // Unsaved changes tracker
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const isMountedRef = useRef<boolean>(false);

  // Mark dirty on changes after initial mount
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    setIsDirty(true);
  }, [recordDate, adm, admissionDate, dischargeHospital, complaints, pe, labs, diagnoses, notes, charges, activeDrawingDataUrl]);

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};
    if (!recordDate) errs.recordDate = 'Visit date is required.';
    if (!diagnoses.trim()) errs.diagnoses = 'Clinical diagnosis is required.';
    if (!complaints.trim()) errs.complaints = 'Chief complaints / symptoms are required.';
    if (adm && !admissionDate) errs.admissionDate = 'Admission date is required if patient was admitted.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const parsedCharges = parseFloat(charges) || 0;

      if (recordToEdit) {
        // Update existing record
        const updated = await updateMedicalRecord(
          recordToEdit.id,
          {
            patient_id: patient.id,
            record_date: recordDate,
            adm,
            admission_date: adm ? admissionDate : undefined,
            discharge_hospital: adm ? dischargeHospital : undefined,
            complaints: complaints.trim(),
            pe: pe.trim(),
            labs: labs.trim(),
            diagnoses: diagnoses.trim(),
            notes: notes.trim(),
            charges: parsedCharges,
          },
          activeDrawingDataUrl || undefined
        );
        setIsDirty(false);
        onSaved(updated);
      } else {
        // Create new record
        const created = await createMedicalRecord(
          {
            patient_id: patient.id,
            doctor_id: doctor?.id || 'doc-tancongco',
            doctor_name: doctor?.full_name || 'Dr. Fausto Tancongco',
            record_date: recordDate,
            adm,
            admission_date: adm ? admissionDate : undefined,
            discharge_hospital: adm ? dischargeHospital : undefined,
            complaints: complaints.trim(),
            pe: pe.trim(),
            labs: labs.trim(),
            diagnoses: diagnoses.trim(),
            notes: notes.trim(),
            charges: parsedCharges,
          },
          activeDrawingDataUrl || undefined
        );
        setIsDirty(false);
        onSaved(created);
      }
    } catch (err) {
      console.error('Save medical record error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      onCancel();
    }
  };

  const handleDelete = async () => {
    if (!recordToEdit) return;
    setIsSaving(true);
    try {
      await deleteMedicalRecord(recordToEdit.id);
      onCancel();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <Stethoscope className="w-4 h-4" />
            {recordToEdit ? 'Edit Medical Consultation Record' : 'New Clinical Consultation Record'}
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {patient.name}
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({patient.patient_number}) • {patient.age} y/o {patient.sex}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Attending Physician: {doctor?.full_name || 'Dr. Fausto Tancongco, M.D.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {recordToEdit && onPrint && (
            <button
              type="button"
              onClick={() => onPrint(recordToEdit)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              Print Copy
            </button>
          )}

          {recordToEdit && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Record
            </button>
          )}

          <button
            type="button"
            onClick={handleCancel}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-lg shadow-sm transition"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Record...' : 'Save Record'}
          </button>
        </div>
      </div>

      {/* Main Clinical Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Visit & Admission Information */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-blue-600" />
            Visit & Admission Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Consultation Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consultation Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className={`w-full text-sm rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  errors.recordDate ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                }`}
              />
              {errors.recordDate && <p className="text-[11px] text-rose-600 mt-1">{errors.recordDate}</p>}
            </div>

            {/* ADM (Hospital Admission) Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Admission (ADM)
              </label>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setAdm(false)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition ${
                    !adm
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  No (Outpatient)
                </button>
                <button
                  type="button"
                  onClick={() => setAdm(true)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition ${
                    adm
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Yes (Admitted)
                </button>
              </div>
            </div>

            {/* Date of Admission (Conditional) */}
            {adm && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admission Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={admissionDate}
                  onChange={(e) => setAdmissionDate(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {errors.admissionDate && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.admissionDate}</p>
                )}
              </div>
            )}

            {/* Discharge Hospital */}
            {adm && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hospital Facility / Ward
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maria Reyna Hospital, Room 304"
                  value={dischargeHospital}
                  onChange={(e) => setDischargeHospital(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            {/* Professional Charges */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consultation Charges (PHP / $)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                  ₱
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={charges}
                  onChange={(e) => setCharges(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 pl-7 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Clinical Information (Complaints, PE, Labs) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Activity className="w-4 h-4 text-blue-600" />
            Clinical Observations & Findings
          </h2>

          {/* Complaints */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>
                Chief Complaints & History of Present Illness <span className="text-rose-500">*</span>
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                Symptoms, onset, duration, character
              </span>
            </label>
            <textarea
              rows={3}
              value={complaints}
              onChange={(e) => setComplaints(e.target.value)}
              placeholder="e.g. 3 days cough, colds, fever, yellow brownish sputum with dyspnea on exertion..."
              className={`w-full text-sm rounded-lg border p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed ${
                errors.complaints ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
              }`}
            />
            {errors.complaints && <p className="text-[11px] text-rose-600 mt-1">{errors.complaints}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* PE (Physical Examination) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Physical Examination (PE)</span>
                <span className="text-[11px] font-normal text-slate-400">Lungs, vitals, auscultation</span>
              </label>
              <textarea
                rows={4}
                value={pe}
                onChange={(e) => setPe(e.target.value)}
                placeholder="e.g. tpce rales L base, decreased breath sounds lower third, SpO2 96% room air..."
                className="w-full text-sm rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
              />
            </div>

            {/* LABS (Laboratory & Imaging) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Laboratory & Diagnostic Imaging (LABS)</span>
                <span className="text-[11px] font-normal text-slate-400">CXR, sputum AFB, CBC, CT</span>
              </label>
              <textarea
                rows={4}
                value={labs}
                onChange={(e) => setLabs(e.target.value)}
                placeholder="e.g. cxr BE L base, sputum AFB negative x3, Gram stain shows mixed flora..."
                className="w-full text-sm rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Diagnoses & Management Notes */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
            <FlaskConical className="w-4 h-4 text-blue-600" />
            Diagnosis & Medical Management
          </h2>

          {/* Diagnoses */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>
                Clinical Diagnoses <span className="text-rose-500">*</span>
              </span>
              <span className="text-[11px] font-normal text-slate-400">Primary and differential diagnoses</span>
            </label>
            <input
              type="text"
              value={diagnoses}
              onChange={(e) => setDiagnoses(e.target.value)}
              placeholder="e.g. URTI, Bronchiectasis with acute infective exacerbation, BA"
              className={`w-full text-sm rounded-lg border px-3 py-2.5 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                errors.diagnoses ? 'border-rose-400 bg-rose-50/50 text-rose-900' : 'border-slate-300 text-slate-900'
              }`}
            />
            {errors.diagnoses && <p className="text-[11px] text-rose-600 mt-1">{errors.diagnoses}</p>}
          </div>

          {/* Management / Notes / Prescriptions */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Management, Prescriptions & Clinical Notes (Rx / Plan)</span>
              <span className="text-[11px] font-normal text-slate-400">Medications, dosages, precautions</span>
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Zinnat 500mg BID x 7 days, Nasathera nasal spray, Mucosolvan 30mg TID, postural drainage instructions..."
              className="w-full text-sm rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* Section 4: Clinical Findings Drawing (Canvas Feature) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-blue-600" />
                Clinical Findings Drawing & Diagrams
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Demonstrate anatomical markings, pulmonary lesions, wounds, or surgical sites directly.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowDrawingCanvas(!showDrawingCanvas)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
            >
              <PenTool className="w-3.5 h-3.5" />
              {showDrawingCanvas ? 'Collapse Canvas' : activeDrawingDataUrl ? 'Edit Drawing' : '+ Open Drawing Canvas'}
            </button>
          </div>

          {/* Drawing Preview or Canvas */}
          {showDrawingCanvas ? (
            <ClinicalDrawingCanvas
              initialImage={activeDrawingDataUrl || undefined}
              patientName={patient.name}
              onSave={(dataUrl) => {
                setActiveDrawingDataUrl(dataUrl);
                setShowDrawingCanvas(false);
              }}
              onClose={() => setShowDrawingCanvas(false)}
            />
          ) : activeDrawingDataUrl ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-28 h-20 bg-white border border-slate-300 rounded overflow-hidden shadow-xs flex items-center justify-center">
                  <img
                    src={activeDrawingDataUrl}
                    alt="Clinical Drawing Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Attached Clinical Diagram</h4>
                  <p className="text-[11px] text-slate-500">
                    High-resolution JPEG diagram ready to be saved and archived with this visit.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" /> Ready for record attachment
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDrawingCanvas(true)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                >
                  Edit Canvas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawingDataUrl(null)}
                  className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setShowDrawingCanvas(true)}
              className="border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 rounded-xl p-6 text-center cursor-pointer transition"
            >
              <PenTool className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">Click to Open Clinical Findings Drawing Canvas</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Illustrate bullae, infiltrates, crackle locations, incisions, or dermatological lesions.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-lg shadow-sm transition"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Record...' : 'Save Medical Record'}
          </button>
        </div>
      </form>

      {/* Discard / Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-100">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Discard Unsaved Changes?</h3>
                <p className="text-xs text-slate-500 font-mono">Patient: {patient.name}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              You have unsaved changes in this clinical encounter record. Are you sure you want to leave? Any unsaved edits will be discarded.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelConfirm(false);
                  onCancel();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-xs transition"
              >
                Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Medical Record?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this clinical record from <strong>{recordDate}</strong>? 
              This action will archive the record from the patient&apos;s active medical history in compliance with healthcare data audit rules.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
