import React, { useState, useMemo } from 'react';
import { 
  Search, 
  UserPlus, 
  Filter, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Edit, 
  FilePlus, 
  User, 
  Phone, 
  MapPin, 
  Calendar,
  Sparkles,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Patient, Gender } from '../../types';
import { usePatients } from '../../context/PatientContext';

interface PatientListProps {
  onSelectPatient: (patient: Patient) => void;
  onEditPatient: (patient: Patient) => void;
  onNewRecordForPatient: (patient: Patient) => void;
  onOpenNewPatientModal: () => void;
}

export const PatientList: React.FC<PatientListProps> = ({
  onSelectPatient,
  onEditPatient,
  onNewRecordForPatient,
  onOpenNewPatientModal,
}) => {
  const { patients, getPatientRecords, searchQuery, setSearchQuery, deletePatient } = usePatients();

  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'id' | 'age' | 'recent'>('recent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const itemsPerPage = 8;

  const handleConfirmDelete = async () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    try {
      await deletePatient(patientToDelete.id);
      setPatientToDelete(null);
    } catch (err) {
      console.error('Error deleting patient:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and search
  const filteredPatients = useMemo(() => {
    let result = patients.filter((p) => !p.is_archived);

    // Debounced or direct case-insensitive search by Name, Phone, or Patient ID
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.patient_number.toLowerCase().includes(q) ||
          (p.phone && p.phone.toLowerCase().includes(q)) ||
          (p.address && p.address.toLowerCase().includes(q))
      );
    }

    // Filter by Gender
    if (genderFilter !== 'all') {
      result = result.filter((p) => p.sex === genderFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'id') {
        comparison = a.patient_number.localeCompare(b.patient_number);
      } else if (sortBy === 'age') {
        comparison = a.age - b.age;
      } else {
        // recent
        comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [patients, searchQuery, genderFilter, sortBy, sortOrder]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage) || 1;
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPatients.slice(start, start + itemsPerPage);
  }, [filteredPatients, currentPage, itemsPerPage]);

  const toggleSort = (field: 'name' | 'id' | 'age' | 'recent') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Patient Records Directory</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage clinical charts, demographics, and longitudinal consultation records.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenNewPatientModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm transition shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Add New Patient
          </button>
        </div>

        {/* Search, Filter, Sort Toolbar */}
        <div className="pt-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder='Search by name (e.g. "melanie"), patient ID, or phone...'
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Sex:</span>
              <select
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">All Genders</option>
                <option value="F">Female (F)</option>
                <option value="M">Male (M)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Sort:</span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [f, o] = e.target.value.split('-');
                  setSortBy(f as any);
                  setSortOrder(o as any);
                }}
                className="text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="recent-desc">Newest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="id-asc">Patient ID (Asc)</option>
                <option value="age-asc">Age (Youngest)</option>
                <option value="age-desc">Age (Oldest)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Table (Desktop) / Cards (Mobile) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {paginatedPatients.length === 0 ? (
          <div className="p-12 text-center">
            <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No patients matched your search</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Try searching with another keyword, clearing the filters, or adding a new patient.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setGenderFilter('all');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Reset Search & Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-blue-600"
                    onClick={() => toggleSort('id')}
                  >
                    Patient ID
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-blue-600"
                    onClick={() => toggleSort('name')}
                  >
                    Patient Name
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-blue-600"
                    onClick={() => toggleSort('age')}
                  >
                    Age / Sex
                  </th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4">Records</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedPatients.map((patient) => {
                  const records = getPatientRecords(patient.id);
                  const lastVisit = records.length > 0 ? records[0].record_date : 'No visits';

                  return (
                    <tr
                      key={patient.id}
                      className="hover:bg-slate-50/80 transition group cursor-pointer"
                      onClick={() => onSelectPatient(patient)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {patient.patient_number}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs">
                            {patient.name.charAt(0)}
                          </div>
                          <span>{patient.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        {patient.age} yrs •{' '}
                        <span className="font-semibold">{patient.sex}</span>
                        <span className="text-[11px] text-slate-400 ml-1">({patient.status})</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {patient.phone || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate">
                        {patient.address || '—'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                          {records.length} {records.length === 1 ? 'record' : 'records'}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Last: {lastVisit}</div>
                      </td>
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap space-x-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectPatient(patient)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditPatient(patient)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Info"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onNewRecordForPatient(patient)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                          title="New Medical Record"
                        >
                          <FilePlus className="w-3.5 h-3.5" />
                          + Record
                        </button>
                        <button
                          type="button"
                          onClick={() => setPatientToDelete(patient)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Patient"
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
        {filteredPatients.length > itemsPerPage && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing{' '}
              <strong>
                {(currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, filteredPatients.length)}
              </strong>{' '}
              of <strong>{filteredPatients.length}</strong> patients
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

      {/* Delete Patient Confirmation Modal */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Patient Record?</h3>
                <p className="text-xs text-slate-500 font-mono">{patientToDelete.patient_number}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete the clinical record for <strong>{patientToDelete.name}</strong>? 
              This will permanently delete their demographic file and all associated medical consultation encounters.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPatientToDelete(null)}
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
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
