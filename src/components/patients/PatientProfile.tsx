import React, { useState } from 'react';
import { 
  User, 
  Phone, 
  MapPin, 
  Mail,
  Calendar, 
  FileText, 
  Plus, 
  Edit3, 
  Printer, 
  PenTool, 
  Eye, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign,
  Activity,
  History,
  ShieldCheck,
  Hospital,
  Trash2
} from 'lucide-react';
import { Patient, MedicalRecord } from '../../types';
import { usePatients } from '../../context/PatientContext';

interface PatientProfileProps {
  patient: Patient;
  onEditPatient: () => void;
  onNewRecord: () => void;
  onEditRecord: (record: MedicalRecord) => void;
  onPrintRecord: (record: MedicalRecord) => void;
}

export const PatientProfile: React.FC<PatientProfileProps> = ({
  patient,
  onEditPatient,
  onNewRecord,
  onEditRecord,
  onPrintRecord,
}) => {
  const { getPatientRecords, setActiveRecord, setActiveView, deletePatient, deleteMedicalRecord } = usePatients();
  const records = getPatientRecords(patient.id);

  const [selectedDrawingPreview, setSelectedDrawingPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'records' | 'history'>('records');
  const [showDeletePatientModal, setShowDeletePatientModal] = useState<boolean>(false);
  const [recordToDelete, setRecordToDelete] = useState<MedicalRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleConfirmDeletePatient = async () => {
    setIsDeleting(true);
    try {
      await deletePatient(patient.id);
      setShowDeletePatientModal(false);
    } catch (err) {
      console.error('Failed to delete patient:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteRecord = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMedicalRecord(recordToDelete.id);
      setRecordToDelete(null);
    } catch (err) {
      console.error('Failed to delete record:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Collect all drawings from this patient's records
  const allDrawings = records.flatMap((r) =>
    (r.drawings || []).map((d) => ({ ...d, recordDate: r.record_date, diagnosis: r.diagnoses }))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Patient Profile Card (2026 Modern SaaS Header) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xl flex items-center justify-center shadow-md">
                {patient.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{patient.name}</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {patient.patient_number}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active Patient
                  </span>
                </div>

                {/* Demographics row */}
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 pt-1">
                  <span>
                    <strong className="text-slate-800">Age:</strong> {patient.age} yrs old
                  </span>
                  {patient.date_of_birth && (
                    <>
                      <span>•</span>
                      <span>
                        <strong className="text-slate-800">DOB:</strong> {patient.date_of_birth}
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span>
                    <strong className="text-slate-800">Sex:</strong> {patient.sex === 'F' ? 'Female' : patient.sex === 'M' ? 'Male' : 'Other'}
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-slate-800">Civil Status:</strong> {patient.status}
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-slate-800">Religion:</strong> {patient.religion || 'RC'}
                  </span>
                </div>

                {/* Contact row */}
                <div className="flex flex-wrap items-center gap-y-1 gap-x-5 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {patient.phone || 'No phone recorded'}
                  </span>
                  {patient.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {patient.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {patient.address || 'No address recorded'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Header Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onEditPatient}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                Edit Info
              </button>
              <button
                type="button"
                onClick={onNewRecord}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                + New Medical Record
              </button>
              <button
                type="button"
                onClick={() => setShowDeletePatientModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                title="Delete Patient Record"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Patient
              </button>
            </div>
          </div>

          {/* Clinical Background Subcard (From the vintage record: Personal, Family, Past Medical History) */}
          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <span className="font-semibold text-slate-700 block mb-1 text-[11px] uppercase tracking-wider">
                Personal / Social History
              </span>
              <p className="text-slate-600 leading-relaxed">
                {patient.personal_history || 'nonBA, TB tx > 1yr 1989, 1991 8 mos.'}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <span className="font-semibold text-slate-700 block mb-1 text-[11px] uppercase tracking-wider">
                Family History
              </span>
              <p className="text-slate-600 leading-relaxed">
                {patient.family_history || 'none reported'}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 md:col-span-1">
              <span className="font-semibold text-slate-700 block mb-1 text-[11px] uppercase tracking-wider">
                Past Medical History
              </span>
              <p className="text-slate-600 leading-relaxed line-clamp-3" title={patient.past_medical_history}>
                {patient.past_medical_history ||
                  'seen 4x 1992 augmentin cxr BE, bulla L base, TB IV, sputum 3x -, 5x 1993, BEAE, cxr inc walls of bulla, treated again with antiTB...'}
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="bg-slate-50/70 border-t border-slate-200 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('records')}
              className={`py-2 text-xs font-semibold border-b-2 transition ${
                activeTab === 'records'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Medical Record History ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              Clinical Drawings & Findings ({allDrawings.length})
            </button>
          </div>

          <span className="text-[11px] text-slate-500">
            Total Consultations: <strong className="text-slate-800">{records.length}</strong>
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'records' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Medical Records (One Patient → Many Records)
              </h2>
            </div>
            <button
              type="button"
              onClick={onNewRecord}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              + New Medical Record
            </button>
          </div>

          {records.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No medical records yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Begin documenting clinical consultations, findings, and diagrams for {patient.name}.
              </p>
              <button
                type="button"
                onClick={onNewRecord}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Create First Medical Record
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">ADM</th>
                    <th className="py-3 px-4">Diagnosis</th>
                    <th className="py-3 px-4">Doctor</th>
                    <th className="py-3 px-4">Drawings</th>
                    <th className="py-3 px-4">Fee</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((record) => {
                    const hasDrawings = record.drawings && record.drawings.length > 0;
                    return (
                      <tr key={record.id} className="hover:bg-slate-50/80 transition group">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                          {record.record_date}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {record.adm ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                              <Hospital className="w-3 h-3" /> YES
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                              No
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 max-w-xs">
                          <div className="font-semibold text-slate-900">{record.diagnoses}</div>
                          {record.complaints && (
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {record.complaints}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {record.doctor_name || 'Dr. Fausto Tancongco'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {hasDrawings ? (
                            <button
                              type="button"
                              onClick={() => setSelectedDrawingPreview(record.drawings![0].image_url)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200"
                            >
                              <PenTool className="w-3 h-3" />
                              View ({record.drawings!.length})
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                          ₱{Number(record.charges || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1">
                          <button
                            type="button"
                            onClick={() => onEditRecord(record)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onPrintRecord(record)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-500" />
                            Print
                          </button>
                          <button
                            type="button"
                            onClick={() => setRecordToDelete(record)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Delete Medical Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Clinical Findings Gallery Tab */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-blue-600" />
                Clinical Drawings & Anatomical Diagrams
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Diagrams, lesion evaluations, and pulmonary findings recorded for {patient.name}
              </p>
            </div>
            <button
              type="button"
              onClick={onNewRecord}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              New Record with Drawing
            </button>
          </div>

          {allDrawings.length === 0 ? (
            <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <PenTool className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">No clinical drawings created yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Drawings attached when creating or editing medical records will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allDrawings.map((drawing) => (
                <div
                  key={drawing.id}
                  className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition group flex flex-col"
                >
                  <div
                    onClick={() => setSelectedDrawingPreview(drawing.image_url)}
                    className="h-44 bg-white border-b border-slate-200 p-2 flex items-center justify-center cursor-pointer relative overflow-hidden"
                  >
                    <img
                      src={drawing.image_url}
                      alt={drawing.title}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-200"
                    />
                    <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="bg-white/90 text-slate-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm">
                        <Eye className="w-3.5 h-3.5" /> View Enlarged
                      </span>
                    </div>
                  </div>
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{drawing.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        Diagnosis: {drawing.diagnosis}
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Date: {drawing.recordDate}</span>
                      <span className="text-blue-600 font-medium">JPEG Format</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Enlarged Drawing Modal Viewer */}
      {selectedDrawingPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-4 shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Clinical Finding Observation</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDrawingPreview(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-medium px-2 py-1 rounded"
              >
                Close ✕
              </button>
            </div>
            <div className="p-4 bg-slate-100 flex items-center justify-center rounded-xl my-3">
              <img
                src={selectedDrawingPreview}
                alt="Enlarged Clinical Diagram"
                className="max-h-[65vh] max-w-full object-contain rounded shadow-xs bg-white"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <span>Patient: {patient.name} ({patient.patient_number})</span>
              <a
                href={selectedDrawingPreview}
                download={`clinical-finding-${patient.patient_number}.jpg`}
                className="text-blue-600 hover:underline font-medium"
              >
                Download Original JPEG
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Delete Patient Confirmation Modal */}
      {showDeletePatientModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Patient Record?</h3>
                <p className="text-xs text-slate-500 font-mono">{patient.patient_number}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete the clinical chart for <strong>{patient.name}</strong>? 
              This will permanently delete this patient and all {records.length} associated consultation encounters and drawings.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeletePatientModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePatient}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 rounded-lg shadow-xs transition"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete Patient'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Medical Record Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Medical Record?</h3>
                <p className="text-xs text-slate-500 font-mono">Encounter: {recordToDelete.record_date}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this clinical record from <strong>{recordToDelete.record_date}</strong> (Diagnosis: <em>{recordToDelete.diagnoses || 'General Consultation'}</em>)?
              This will remove this encounter note and any attached anatomical diagrams from the patient chart.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRecord}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 rounded-lg shadow-xs transition"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
