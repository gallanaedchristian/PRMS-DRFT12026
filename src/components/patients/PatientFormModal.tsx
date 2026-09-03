import React, { useState } from 'react';
import { 
  User, 
  Phone, 
  MapPin, 
  Heart, 
  FileSpreadsheet, 
  X, 
  Save, 
  AlertCircle,
  Activity,
  History
} from 'lucide-react';
import { Patient, Gender, CivilStatus } from '../../types';
import { usePatients } from '../../context/PatientContext';

interface PatientFormModalProps {
  patientToEdit?: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (patient: Patient) => void;
}

export const PatientFormModal: React.FC<PatientFormModalProps> = ({
  patientToEdit,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createPatient, updatePatient } = usePatients();

  const [name, setName] = useState<string>(patientToEdit?.name || '');
  const [patientNumber, setPatientNumber] = useState<string>(patientToEdit?.patient_number || '');
  const [age, setAge] = useState<string>(patientToEdit?.age ? String(patientToEdit.age) : '');
  const [sex, setSex] = useState<Gender>(patientToEdit?.sex || 'F');
  const [status, setStatus] = useState<CivilStatus>(patientToEdit?.status || 'Single');
  const [religion, setReligion] = useState<string>(patientToEdit?.religion || 'RC');
  const [phone, setPhone] = useState<string>(patientToEdit?.phone || '');
  const [address, setAddress] = useState<string>(patientToEdit?.address || '');
  const [personalHistory, setPersonalHistory] = useState<string>(patientToEdit?.personal_history || '');
  const [familyHistory, setFamilyHistory] = useState<string>(patientToEdit?.family_history || 'none');
  const [pastMedicalHistory, setPastMedicalHistory] = useState<string>(
    patientToEdit?.past_medical_history || ''
  );

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) errs.name = 'Patient full name is required (e.g., Arceñas, Melanie)';
    if (!age || isNaN(Number(age)) || Number(age) < 0 || Number(age) > 130) {
      errs.age = 'Please enter a valid age between 0 and 130';
    }
    if (!phone.trim()) errs.phone = 'Contact phone number is required';
    if (!address.trim()) errs.address = 'Residential address is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (patientToEdit) {
        const updated = await updatePatient(patientToEdit.id, {
          name: name.trim(),
          age: Number(age),
          sex,
          status,
          religion: religion.trim(),
          phone: phone.trim(),
          address: address.trim(),
          personal_history: personalHistory.trim(),
          family_history: familyHistory.trim(),
          past_medical_history: pastMedicalHistory.trim(),
        });
        onSuccess(updated);
      } else {
        const created = await createPatient({
          patient_number: patientNumber.trim() || undefined as any,
          name: name.trim(),
          age: Number(age),
          sex,
          status,
          religion: religion.trim() || 'RC',
          phone: phone.trim(),
          address: address.trim(),
          personal_history: personalHistory.trim(),
          family_history: familyHistory.trim(),
          past_medical_history: pastMedicalHistory.trim(),
          is_archived: false,
        });
        onSuccess(created);
      }
      onClose();
    } catch (err) {
      console.error('Patient save error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {patientToEdit ? 'Edit Patient Record' : 'Register New Patient'}
              </h2>
              <p className="text-xs text-slate-500">
                Enter demographic and clinical background information
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Section: Demographics */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-100 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              Patient Demographics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Name of Patient (Last Name, First Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Arceñas, Melanie"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full text-sm rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    errors.name ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                  }`}
                />
                {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name}</p>}
              </div>

              {/* Patient ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient ID #
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated (e.g. P-00175)"
                  value={patientNumber}
                  onChange={(e) => setPatientNumber(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Age */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Age <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="50"
                  min="0"
                  max="130"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className={`w-full text-sm rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    errors.age ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                  }`}
                />
                {errors.age && <p className="text-[11px] text-rose-600 mt-1">{errors.age}</p>}
              </div>

              {/* Sex */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sex <span className="text-rose-500">*</span>
                </label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as Gender)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="F">Female (F)</option>
                  <option value="M">Male (M)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Civil Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Civil Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CivilStatus)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Single">Single (S)</option>
                  <option value="Married">Married (M)</option>
                  <option value="Widowed">Widowed (W)</option>
                  <option value="Divorced">Divorced (D)</option>
                  <option value="Separated">Separated</option>
                </select>
              </div>

              {/* Religion */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Religion
                </label>
                <input
                  type="text"
                  placeholder="e.g. RC, Christian"
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  Contact Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 712872 or (088) 856-4219"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full text-sm rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    errors.phone ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                  }`}
                />
                {errors.phone && <p className="text-[11px] text-rose-600 mt-1">{errors.phone}</p>}
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Residential Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Capistrano st, Cagayan de Oro City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={`w-full text-sm rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    errors.address ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                  }`}
                />
                {errors.address && <p className="text-[11px] text-rose-600 mt-1">{errors.address}</p>}
              </div>
            </div>
          </div>

          {/* Section: Medical Background History */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-100 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-blue-600" />
              Patient Medical Background
            </h3>

            {/* Personal History */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Personal & Social History
              </label>
              <input
                type="text"
                placeholder="e.g. nonBA, TB tx > 1yr 1989, 1991 8 mos., non-smoker..."
                value={personalHistory}
                onChange={(e) => setPersonalHistory(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Family History */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Family Medical History
              </label>
              <input
                type="text"
                placeholder="e.g. none, Hypertension, Asthma..."
                value={familyHistory}
                onChange={(e) => setFamilyHistory(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Past Medical History */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Past Medical History (Longitudinal Details)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. seen 4x 1992 augmentin cxr BE, bulla L base, TB IV, sputum 3x -, 5x 1993, BEAE, cxr inc walls of bulla, treated again with antiTB..."
                value={pastMedicalHistory}
                onChange={(e) => setPastMedicalHistory(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-lg shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : patientToEdit ? 'Save Changes' : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
