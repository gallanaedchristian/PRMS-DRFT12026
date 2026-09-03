import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Printer, 
  PenTool, 
  Eye, 
  Edit3, 
  Calendar, 
  Hospital,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { usePatients } from '../../context/PatientContext';
import { MedicalRecord, Patient } from '../../types';

interface MedicalRecordsDirectoryProps {
  onSelectRecord: (record: MedicalRecord, patient: Patient) => void;
  onEditRecord: (record: MedicalRecord, patient: Patient) => void;
  onPrintRecord: (record: MedicalRecord, patient: Patient) => void;
  onNewRecord: () => void;
}

export const MedicalRecordsDirectory: React.FC<MedicalRecordsDirectoryProps> = ({
  onSelectRecord,
  onEditRecord,
  onPrintRecord,
  onNewRecord,
}) => {
  const { medicalRecords, patients, deleteMedicalRecord } = usePatients();

  const [search, setSearch] = useState<string>('');
  const [admissionFilter, setAdmissionFilter] = useState<'all' | 'admitted' | 'outpatient'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [recordToDelete, setRecordToDelete] = useState<{ record: MedicalRecord; patient?: Patient } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const itemsPerPage = 8;

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMedicalRecord(recordToDelete.record.id);
      setRecordToDelete(null);
    } catch (err) {
      console.error('Error deleting medical record:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach((p) => map.set(p.id, p));
    return map;
  }, [patients]);

  const filteredRecords = useMemo(() => {
    return medicalRecords
      .filter((r) => !r.is_archived)
      .filter((r) => {
        const patient = patientMap.get(r.patient_id);
        const q = search.toLowerCase().trim();

        const matchSearch =
          !q ||
          r.diagnoses.toLowerCase().includes(q) ||
          r.complaints.toLowerCase().includes(q) ||
          r.record_date.includes(q) ||
          (patient && patient.name.toLowerCase().includes(q)) ||
          (patient && patient.patient_number.toLowerCase().includes(q));

        const matchAdm =
          admissionFilter === 'all'
            ? true
            : admissionFilter === 'admitted'
            ? r.adm === true
            : r.adm === false;

        return matchSearch && matchAdm;
      })
      .sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());
  }, [medicalRecords, patientMap, search, admissionFilter]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Clinical Records Repository</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive registry of clinical encounters, physical examinations, and anatomical diagrams.
            </p>
          </div>
          <button
            type="button"
            onClick={onNewRecord}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            + New Clinical Record
          </button>
        </div>

        {/* Toolbar */}
        <div className="pt-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by diagnosis, complaints, date, or patient name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Status:</span>
              <select
                value={admissionFilter}
                onChange={(e) => {
                  setAdmissionFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">All Visits</option>
                <option value="outpatient">Outpatient (No ADM)</option>
                <option value="admitted">Admitted (ADM Yes)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {paginatedRecords.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No medical records found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Adjust your search keywords or admission status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Patient Name / ID</th>
                  <th className="py-3 px-4">ADM</th>
                  <th className="py-3 px-4">Clinical Diagnosis</th>
                  <th className="py-3 px-4">Attending Doctor</th>
                  <th className="py-3 px-4">Drawings</th>
                  <th className="py-3 px-4">Charges</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.map((record) => {
                  const patient = patientMap.get(record.patient_id);
                  const hasDrawings = record.drawings && record.drawings.length > 0;

                  return (
                    <tr
                      key={record.id}
                      onClick={() => {
                        if (patient) onSelectRecord(record, patient);
                      }}
                      className="hover:bg-slate-50/80 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {record.record_date}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {patient ? (
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">
                              {patient.name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {patient.patient_number}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Unknown Patient</span>
                        )}
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
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{record.diagnoses}</div>
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
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            <PenTool className="w-3 h-3" />
                            {record.drawings!.length}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">
                        ₱{Number(record.charges || 0).toFixed(2)}
                      </td>
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap space-x-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (patient) onSelectRecord(record, patient);
                          }}
                          className="px-2 py-1 text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (patient) onEditRecord(record, patient);
                          }}
                          className="px-2 py-1 text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (patient) onPrintRecord(record, patient);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          Print
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecordToDelete({ record, patient })}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
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

        {/* Pagination Footer */}
        {filteredRecords.length > itemsPerPage && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {(currentPage - 1) * itemsPerPage + 1} -{' '}
              {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of{' '}
              {filteredRecords.length} records
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-semibold text-slate-800">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

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
                <p className="text-xs text-slate-500 font-mono">Date: {recordToDelete.record.record_date}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this clinical encounter dated <strong>{recordToDelete.record.record_date}</strong> 
              {recordToDelete.patient && <span> for patient <strong>{recordToDelete.patient.name}</strong></span>}?
              {recordToDelete.record.diagnoses && (
                <span className="block mt-1 text-slate-500 font-medium">Diagnosis: {recordToDelete.record.diagnoses}</span>
              )}
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
                onClick={handleConfirmDelete}
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
