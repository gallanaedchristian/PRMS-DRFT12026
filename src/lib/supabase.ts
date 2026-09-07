import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Patient, MedicalRecord, ClinicalDrawing, AuditLog, DoctorProfile, ClinicInfo } from '../types';

// Default clinic details from the vintage reference: "FAUSTO TANCONGCO, M.D."
export const DEFAULT_CLINIC: ClinicInfo = {
  name: 'Tancongco Medical & Specialty Clinic',
  doctor_name: 'Dr. Fausto Tancongco',
  doctor_title: 'M.D., FPCP, FPCCP',
  specialty: 'Internal Medicine & Pulmonary Diseases',
  license_number: 'PRC-0084921',
  address: 'Suite 402, Medical Arts Building, Capistrano St., Cagayan de Oro City',
  phone: '(088) 712-8720',
  email: 'dr.tancongco@medrecords.cloud',
  tagline: 'Comprehensive Pulmonary & Adult Medical Specialty Care',
};

export const DEFAULT_DOCTOR: DoctorProfile = {
  id: 'doc-fausto-tancongco-01',
  email: 'fausto.tancongco@medrecords.cloud',
  full_name: 'Dr. Fausto Tancongco',
  title: 'M.D., FPCP, FPCCP',
  specialty: 'Internal Medicine & Pulmonology',
  license_number: 'PRC-0084921',
  role: 'doctor',
  created_at: new Date('2024-01-01').toISOString(),
};

export const DEMO_STAFF_PROFILES = {
  doctor: {
    id: 'doc-fausto-tancongco-01',
    auth_user_id: 'auth-fausto-tancongco-01',
    organization_id: 'org-tancongco-clinic-01',
    full_name: 'Dr. Fausto Tancongco',
    email: 'fausto.tancongco@medrecords.cloud',
    role: 'doctor' as const,
    practitioner_id: 'doc-fausto-tancongco-01',
    is_active: true,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString(),
    title: 'M.D., FPCP, FPCCP',
    specialty: 'Internal Medicine & Pulmonology',
    license_number: 'PRC-0084921',
    phone: '(088) 712-8720',
  },
  nurse: {
    id: 'nurse-maria-santos-02',
    auth_user_id: 'auth-maria-santos-02',
    organization_id: 'org-tancongco-clinic-01',
    full_name: 'Maria Santos',
    email: 'maria.santos@medrecords.cloud',
    role: 'nurse' as const,
    practitioner_id: 'nurse-maria-santos-02',
    is_active: true,
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-02-01').toISOString(),
    title: 'R.N.',
    specialty: 'Triage & Clinical Care',
    license_number: 'PRC-RN-019384',
    phone: '(088) 712-8721',
  },
  staff: {
    id: 'staff-juan-delacruz-03',
    auth_user_id: 'auth-juan-delacruz-03',
    organization_id: 'org-tancongco-clinic-01',
    full_name: 'Juan Dela Cruz',
    email: 'juan.delacruz@medrecords.cloud',
    role: 'staff' as const,
    practitioner_id: 'staff-juan-delacruz-03',
    is_active: true,
    created_at: new Date('2024-03-01').toISOString(),
    updated_at: new Date('2024-03-01').toISOString(),
    title: 'Clinical Administrator',
    specialty: 'Records & Patient Admissions',
    license_number: 'STF-2026-004',
    phone: '(088) 712-8722',
  },
};

// SVG data URI for sample clinical finding drawing (anatomical chest marking)
export const SAMPLE_CHEST_DRAWING_DATA_URI = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <rect x="20" y="20" width="560" height="360" rx="8" fill="#fcfdfd" stroke="#e2e8f0" stroke-width="2"/>
    <!-- Grid pattern -->
    <defs>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="1"/>
      </pattern>
    </defs>
    <rect x="20" y="20" width="560" height="360" fill="url(#grid)"/>
    <!-- Anatomical outline schematic (Thorax) -->
    <path d="M 260 60 Q 300 50 340 60 Q 360 80 390 120 Q 420 180 410 270 Q 390 320 340 330 Q 300 335 260 330 Q 210 320 190 270 Q 180 180 210 120 Q 240 80 260 60 Z" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4 4"/>
    <!-- Trachea & Bronchi -->
    <path d="M 300 60 L 300 130 M 300 130 Q 330 160 360 180 M 300 130 Q 270 160 240 180" fill="none" stroke="#64748b" stroke-width="3"/>
    <!-- Right Lung Area -->
    <path d="M 235 120 Q 200 160 200 240 Q 210 300 250 310 Q 275 280 275 190 Q 260 140 235 120 Z" fill="#e0f2fe" fill-opacity="0.3" stroke="#38bdf8" stroke-width="2"/>
    <!-- Left Lung Area with Clinical Lesion Findings (Bulla Left Base) -->
    <path d="M 365 120 Q 400 160 400 240 Q 390 300 350 310 Q 325 280 325 190 Q 340 140 365 120 Z" fill="#fee2e2" fill-opacity="0.3" stroke="#f87171" stroke-width="2"/>
    <!-- Clinical Findings: Left Base Bulla & Infiltration Markings -->
    <ellipse cx="370" cy="275" rx="24" ry="18" fill="#fecaca" fill-opacity="0.7" stroke="#ef4444" stroke-width="2.5"/>
    <path d="M 355 265 L 385 285 M 355 285 L 385 265" stroke="#dc2626" stroke-width="2"/>
    <!-- Clinical Pointer & Text Annotation -->
    <path d="M 394 275 L 470 275 L 485 260" fill="none" stroke="#ef4444" stroke-width="2"/>
    <rect x="440" y="220" width="130" height="35" rx="4" fill="#ffffff" stroke="#ef4444" stroke-width="1.5"/>
    <text x="445" y="235" font-family="sans-serif" font-size="11" font-weight="bold" fill="#b91c1c">Bulla L. Base (CXR)</text>
    <text x="445" y="249" font-family="sans-serif" font-size="9.5" fill="#475569">Bronchiectasis focus</text>
    <!-- Clinical Header Watermark -->
    <text x="40" y="50" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0f172a">CLINICAL FINDINGS DRAWING</text>
    <text x="40" y="68" font-family="sans-serif" font-size="10" fill="#64748b">Clinical Thorax Evaluation Template</text>
    <text x="40" y="360" font-family="sans-serif" font-size="9" fill="#94a3b8">Tancongco Medical Clinic • Electronic Health Records</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
})();

// Production seed collections: strictly empty so mock data can never enter clinical data flows
export const SEED_PATIENTS: Patient[] = [];

export const SEED_MEDICAL_RECORDS: MedicalRecord[] = [];

export const SEED_AUDIT_LOGS: AuditLog[] = [];

// Helper to get active Supabase credentials
export function getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
  const envUrl = metaEnv.VITE_SUPABASE_URL || '';
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';
  const storedUrl = localStorage.getItem('medrecords_supabase_url') || '';
  const storedKey = localStorage.getItem('medrecords_supabase_anon_key') || '';

  const url = storedUrl || envUrl;
  const anonKey = storedKey || envKey;
  const isConfigured = Boolean(
    url && 
    url.trim() !== '' && 
    !url.includes('your-project') &&
    anonKey && 
    anonKey.trim() !== '' &&
    !anonKey.includes('your-anon-key')
  );

  return { url, anonKey, isConfigured };
}

// Global Supabase client instance (or null if not yet configured)
let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
}

/**
 * Scoped Realtime channel helper for patients.
 * Listens to INSERT, UPDATE, and DELETE.
 */
export function subscribeToPatientsChannel(
  onPatientChange: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => void
) {
  const supabase = getSupabase();
  if (!supabase) return null;

  return supabase
    .channel('realtime:patients')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'patients',
      },
      (payload) => onPatientChange({ eventType: 'INSERT', new: payload.new, old: payload.old })
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'patients',
      },
      (payload) => onPatientChange({ eventType: 'UPDATE', new: payload.new, old: payload.old })
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'patients',
      },
      (payload) => onPatientChange({ eventType: 'DELETE', new: payload.new, old: payload.old })
    )
    .subscribe();
}

/**
 * Scoped Realtime channel helper for a specific patient's clinical records and drawings.
 * Listens to INSERT, UPDATE, and DELETE.
 * Strictly scoped by patient_id filter.
 */
export function subscribeToPatientClinicalChannel(
  patientId: string,
  onRecordChange: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => void,
  onDrawingChange: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => void
) {
  const supabase = getSupabase();
  if (!supabase || !patientId) return null;

  return supabase
    .channel(`realtime:clinical-patient:${patientId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'medical_records',
        filter: `patient_id=eq.${patientId}`,
      },
      (payload) => onRecordChange({ eventType: 'INSERT', new: payload.new, old: payload.old })
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'medical_records',
        filter: `patient_id=eq.${patientId}`,
      },
      (payload) => onRecordChange({ eventType: 'UPDATE', new: payload.new, old: payload.old })
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'medical_records',
        filter: `patient_id=eq.${patientId}`,
      },
      (payload) => onRecordChange({ eventType: 'DELETE', new: payload.new, old: payload.old })
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'clinical_drawings',
        filter: `patient_id=eq.${patientId}`,
      },
      (payload) => onDrawingChange({ eventType: 'INSERT', new: payload.new, old: payload.old })
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'clinical_drawings',
        filter: `patient_id=eq.${patientId}`,
      },
      (payload) => onDrawingChange({ eventType: 'UPDATE', new: payload.new, old: payload.old })
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'clinical_drawings',
        filter: `patient_id=eq.${patientId}`,
      },
      (payload) => onDrawingChange({ eventType: 'DELETE', new: payload.new, old: payload.old })
    )
    .subscribe();
}

/**
 * Legacy alias for backwards compatibility
 */
export const subscribeToPatientRecordsChannel = (
  patientId: string,
  onRecordChange: (payload: any) => void
) => subscribeToPatientClinicalChannel(patientId, onRecordChange, () => {});

export function saveSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem('medrecords_supabase_url', url.trim());
  localStorage.setItem('medrecords_supabase_anon_key', anonKey.trim());
  supabaseInstance = null; // reset instance
}

export const setSupabaseConfig = saveSupabaseConfig;

export function clearSupabaseConfig() {
  localStorage.removeItem('medrecords_supabase_url');
  localStorage.removeItem('medrecords_supabase_anon_key');
  supabaseInstance = null;
}
