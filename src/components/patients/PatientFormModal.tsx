import React, { useState } from 'react';
import { 
  User, 
  Phone, 
  MapPin, 
  Mail,
  Calendar,
  X, 
  Save, 
  AlertCircle,
  AlertTriangle,
  History,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Patient, Gender, CivilStatus } from '../../types';
import { usePatients } from '../../context/PatientContext';

interface PatientFormModalProps {
  patientToEdit?: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (patient: Patient) => void;
}

interface DuplicateWarningState {
  isOpen: boolean;
  type: 'strong' | 'weak';
  existingPatient: Patient;
  reason: string;
  candidateData?: any;
}

export const PatientFormModal: React.FC<PatientFormModalProps> = ({
  patientToEdit,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createPatient, updatePatient, checkDuplicates } = usePatients();

  const [name, setName] = useState<string>(patientToEdit?.name || '');
  const [patientNumber, setPatientNumber] = useState<string>(patientToEdit?.patient_number || '');
  const [dateOfBirth, setDateOfBirth] = useState<string>(patientToEdit?.date_of_birth || '');
  const [age, setAge] = useState<string>(patientToEdit?.age !== undefined ? String(patientToEdit.age) : '');
  const [sex, setSex] = useState<Gender>(patientToEdit?.sex || 'F');
  const [status, setStatus] = useState<CivilStatus>(patientToEdit?.status || 'Single');
  const [religion, setReligion] = useState<string>(patientToEdit?.religion || 'RC');
  const [phone, setPhone] = useState<string>(patientToEdit?.phone || '');
  const [email, setEmail] = useState<string>(patientToEdit?.email || '');
  const [address, setAddress] = useState<string>(patientToEdit?.address || '');
  const [personalHistory, setPersonalHistory] = useState<string>(patientToEdit?.personal_history || '');
  const [familyHistory, setFamilyHistory] = useState<string>(patientToEdit?.family_history || 'none');
  const [pastMedicalHistory, setPastMedicalHistory] = useState<string>(
    patientToEdit?.past_medical_history || ''
  );

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarningState | null>(null);

  if (!isOpen) return null;

  // Auto-calculate age when Date of Birth changes
  const handleDobChange = (newDob: string) => {
    setDateOfBirth(newDob);
    if (!newDob) return;

    const birth = new Date(newDob);
    if (!isNaN(birth.getTime())) {
      const today = new Date();
      let computedAge = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        computedAge--;
      }
      if (computedAge >= 0) {
        setAge(String(computedAge));
        setErrors((prev) => ({ ...prev, age: '' }));
      }
    }
  };

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) errs.name = 'Patient full name is required (e.g. Arceñas, Melanie)';
    if (!age || isNaN(Number(age)) || Number(age) < 0 || Number(age) > 130) {
      errs.age = 'Please enter a valid age between 0 and 130';
    }
    if (!phone.trim()) errs.phone = 'Contact phone number is required';
    if (!address.trim()) errs.address = 'Residential address is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const executeSave = async (candidatePayload: any) => {
    setIsSubmitting(true);
    try {
      if (patientToEdit) {
        const updated = await updatePatient(patientToEdit.id, candidatePayload);
        onSuccess(updated);
      } else {
        const created = await createPatient(candidatePayload);
        onSuccess(created);
      }
      setDuplicateWarning(null);
      onClose();
    } catch (err: any) {
      console.error('Patient save error:', err);
      if (err.code === 'DUPLICATE_PATIENT' && err.duplicate?.patient) {
        setDuplicateWarning({
          isOpen: true,
          type: 'strong',
          existingPatient: err.duplicate.patient,
          reason: err.duplicate.reason || 'A patient with the same name and demographic details already exists.',
          candidateData: candidatePayload,
        });
      } else {
        setErrors((prev) => ({
          ...prev,
          general: err.message || 'An error occurred while saving patient record.',
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const candidatePayload = {
      patient_number: patientNumber.trim() || (undefined as any),
      name: name.trim(),
      age: Number(age),
      date_of_birth: dateOfBirth ? dateOfBirth.trim() : null,
      sex,
      status,
      religion: religion.trim() || 'RC',
      phone: phone.trim(),
      email: email.trim() || null,
      address: address.trim(),
      personal_history: personalHistory.trim(),
      family_history: familyHistory.trim(),
      past_medical_history: pastMedicalHistory.trim(),
      is_archived: false,
    };

    // For new registrations, check duplicate matching
    if (!patientToEdit) {
      const dupCheck = checkDuplicates(candidatePayload);

      // 1. Strong duplicate: BLOCK creation immediately
      if (dupCheck.hasStrongDuplicate) {
        const strongMatch = dupCheck.strongMatches[0];
        setDuplicateWarning({
          isOpen: true,
          type: 'strong',
          existingPatient: strongMatch.patient,
          reason: strongMatch.reason,
          candidateData: candidatePayload,
        });
        return;
      }

      // 2. Weak contact match: show warning to allow review before continuing
      if (dupCheck.hasWeakMatch) {
        const weakMatch = dupCheck.weakMatches[0];
        setDuplicateWarning({
          isOpen: true,
          type: 'weak',
          existingPatient: weakMatch.patient,
          reason: weakMatch.reason,
          candidateData: candidatePayload,
        });
        return;
      }
    }

    // No duplicate detected - proceed with registration
    await executeSave(candidatePayload);
  };

  const handleConfirmWeakDuplicate = async () => {
    if (!duplicateWarning?.candidateData) return;
    await executeSave(duplicateWarning.candidateData);
  };

  const handleOpenExistingPatient = () => {
    if (duplicateWarning?.existingPatient) {
      onSuccess(duplicateWarning.existingPatient);
      setDuplicateWarning(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 relative">
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
                Enter demographic, contact, and longitudinal clinical details
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
          {errors.general && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errors.general}</span>
            </div>
          )}

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

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {/* Date of Birth */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Date of Birth (DOB)
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

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
            </div>

            {/* Religion & Contact Information */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  Contact Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 0917-555-8910 or (088) 856-4219"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full text-sm rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    errors.phone ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                  }`}
                />
                {errors.phone && <p className="text-[11px] text-rose-600 mt-1">{errors.phone}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="patient@example.com (Optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
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

        {/* ========================================================================= */}
        {/* DUPLICATE DETECTION WARNING / BLOCKING OVERLAY DIALOG                      */}
        {/* ========================================================================= */}
        {duplicateWarning?.isOpen && (
          <div className="absolute inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              {duplicateWarning.type === 'strong' ? (
                // STRONG DUPLICATE (BLOCK)
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Possible duplicate patient found.
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        A patient with matching demographics already exists in this clinic.
                      </p>
                    </div>
                  </div>

                  {/* Existing Patient Match Summary Card */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">
                        {duplicateWarning.existingPatient.name}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-50 text-blue-700 rounded border border-blue-200">
                        Patient ID: {duplicateWarning.existingPatient.patient_number}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1 pt-1">
                      <span>Age: <strong>{duplicateWarning.existingPatient.age}</strong></span>
                      <span>•</span>
                      <span>Sex: <strong>{duplicateWarning.existingPatient.sex === 'F' ? 'Female' : 'Male'}</strong></span>
                      {duplicateWarning.existingPatient.date_of_birth && (
                        <>
                          <span>•</span>
                          <span>DOB: <strong>{duplicateWarning.existingPatient.date_of_birth}</strong></span>
                        </>
                      )}
                      {duplicateWarning.existingPatient.phone && (
                        <>
                          <span>•</span>
                          <span>Phone: <strong>{duplicateWarning.existingPatient.phone}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {duplicateWarning.reason || 'A patient with the same name and date of birth already exists.'}
                    {' '}To maintain clinical data integrity and prevent fragmented records, duplicate registrations are blocked.
                  </p>

                  <div className="pt-2 flex flex-col sm:flex-row items-stretch gap-2.5">
                    <button
                      type="button"
                      onClick={handleOpenExistingPatient}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Existing Patient
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicateWarning(null)}
                      className="px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition border border-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                // WEAK CONTACT MATCH (WARNING ONLY)
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Another patient uses this contact information.
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Shared contact details detected within your clinic.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900">
                        {duplicateWarning.existingPatient.name}
                      </span>
                      <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-amber-100 text-amber-800 rounded">
                        {duplicateWarning.existingPatient.patient_number}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      {duplicateWarning.reason}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Family members or legal guardians may share phone numbers or email addresses. Please review before proceeding.
                  </p>

                  <div className="pt-2 flex flex-col sm:flex-row items-stretch gap-2.5">
                    <button
                      type="button"
                      onClick={handleConfirmWeakDuplicate}
                      disabled={isSubmitting}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-xl shadow-sm transition"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      {isSubmitting ? 'Saving...' : 'Continue & Register Patient'}
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenExistingPatient}
                      className="px-3.5 py-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                    >
                      View Existing Patient
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicateWarning(null)}
                      className="px-3.5 py-2.5 text-xs font-medium text-slate-500 hover:text-slate-700 rounded-xl transition"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
