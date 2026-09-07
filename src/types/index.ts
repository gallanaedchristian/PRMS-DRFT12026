export type Gender = 'F' | 'M' | 'Other';
export type CivilStatus = 'Single' | 'Married' | 'Widowed' | 'Divorced' | 'Separated';

export type StaffRole = 'super_admin' | 'doctor' | 'nurse' | 'staff';

export interface StaffProfile {
  id: string;
  auth_user_id: string;
  organization_id?: string | null;
  full_name: string;
  email: string;
  role: StaffRole;
  practitioner_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  title?: string;
  specialty?: string;
  license_number?: string;
  phone?: string;
}

export interface DoctorProfile {
  id: string;
  auth_user_id?: string;
  organization_id?: string | null;
  email: string;
  full_name: string;
  title: string;
  specialty: string;
  license_number: string;
  role: StaffRole | 'admin';
  practitioner_id?: string | null;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Patient {
  id: string;
  organization_id?: string | null;
  patient_number: string;
  name: string;
  age: number;
  date_of_birth?: string | null;
  sex: Gender;
  status: CivilStatus;
  religion: string;
  phone: string;
  email?: string | null;
  address: string;
  personal_history?: string;
  family_history?: string;
  past_medical_history?: string;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ClinicalDrawing {
  id: string;
  patient_id: string;
  medical_record_id?: string;
  doctor_id: string;
  title: string;
  storage_path: string;
  image_url: string;
  file_type: string;
  notes?: string;
  created_at: string;
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name: string;
  record_date: string;
  adm: boolean;
  admission_date?: string;
  discharge_hospital?: string;
  complaints: string;
  pe: string;
  labs: string;
  diagnoses: string;
  notes: string;
  charges: number;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
  drawings?: ClinicalDrawing[];
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: 
    | 'LOGIN'
    | 'LOGOUT'
    | 'PATIENT_CREATED'
    | 'PATIENT_UPDATED'
    | 'PATIENT_ARCHIVED'
    | 'PATIENT_DELETED'
    | 'RECORD_CREATED'
    | 'RECORD_UPDATED'
    | 'RECORD_DELETED'
    | 'DRAWING_SAVED'
    | 'DRAWING_DELETED'
    | 'PRINT_EXPORT'
    | 'PASSWORD_RESET_REQUESTED'
    | 'PASSWORD_UPDATED'
    | 'DUPLICATE_PATIENT_BLOCKED';
  table_name: string;
  record_id: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface DuplicateMatch {
  patient: Patient;
  matchType: 'STRONG_DOB' | 'STRONG_DEMOGRAPHICS' | 'WEAK_PHONE' | 'WEAK_EMAIL';
  confidence: 'strong' | 'weak';
  reason: string;
}

export interface DuplicateCheckResult {
  hasStrongDuplicate: boolean;
  hasWeakMatch: boolean;
  strongMatches: DuplicateMatch[];
  weakMatches: DuplicateMatch[];
}

export interface DuplicateCluster {
  clusterKey: string;
  count: number;
  patients: Patient[];
  reason: string;
}

export interface DuplicateErrorPayload {
  code: 'DUPLICATE_PATIENT';
  message: string;
  existing_patient_id: string;
  patient_number: string;
  name: string;
}

export interface ClinicInfo {
  name: string;
  doctor_name: string;
  doctor_title: string;
  specialty: string;
  license_number: string;
  address: string;
  phone: string;
  email: string;
  tagline?: string;
}

export type ActiveView = 
  | 'dashboard'
  | 'patients'
  | 'patient-profile'
  | 'new-patient'
  | 'new-record'
  | 'edit-record'
  | 'medical-records'
  | 'print-record'
  | 'reports'
  | 'settings';
