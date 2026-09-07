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
    <text x="40" y="68" font-family="sans-serif" font-size="10" fill="#64748b">Patient: Arceñas, Melanie | L-Thorax Evaluation</text>
    <text x="40" y="360" font-family="sans-serif" font-size="9" fill="#94a3b8">Tancongco Medical Clinic • Electronic Health Records</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
})();

// Initial seed patients including "Arceñas, Melanie" from the reference photo
export const SEED_PATIENTS: Patient[] = [
  {
    id: 'pat-arcenas-melanie-001',
    patient_number: 'P-00170',
    name: 'Arceñas, Melanie',
    age: 50,
    sex: 'F',
    status: 'Single',
    religion: 'RC',
    phone: '712872',
    address: 'Capistrano st, Cagayan de Oro City',
    personal_history: 'nonBA, TB tx > 1yr 1989, 1991 8 mos.',
    family_history: 'none reported',
    past_medical_history: 'seen 4x 1992 augmentin cxr BE, bulla L base, TB IV, sputum 3x -, 5x 1993, BEAE, cxr inc walls of bulla, treated again with antiTB, odinah, odetol, stable cxrs, advised surgery due to recurrent',
    is_archived: false,
    created_at: '2007-01-20T08:30:00.000Z',
    updated_at: '2026-03-11T14:20:00.000Z',
    created_by: 'doc-fausto-tancongco-01',
  },
  {
    id: 'pat-villanueva-carlos-002',
    patient_number: 'P-00171',
    name: 'Villanueva, Carlos M.',
    age: 62,
    sex: 'M',
    status: 'Married',
    religion: 'RC',
    phone: '(088) 856-4219',
    address: 'Velez St., Divisoria, Cagayan de Oro City',
    personal_history: 'Smoker 30 pack-years, stopped 2022. Moderate alcohol.',
    family_history: 'Hypertension (Father), COPD (Uncle)',
    past_medical_history: 'Known COPD GOLD Stage II, essential hypertension controlled with Amlodipine 10mg.',
    is_archived: false,
    created_at: '2026-01-14T09:15:00.000Z',
    updated_at: '2026-08-22T11:00:00.000Z',
    created_by: 'doc-fausto-tancongco-01',
  },
  {
    id: 'pat-santos-maria-003',
    patient_number: 'P-00172',
    name: 'Santos, Maria Clara T.',
    age: 34,
    sex: 'F',
    status: 'Married',
    religion: 'Christian',
    phone: '0917-555-8910',
    address: 'Nazareth Subd., 12th St., Cagayan de Oro',
    personal_history: 'Non-smoker, occasional wine, allergic rhinitis.',
    family_history: 'Atopy, bronchial asthma on maternal line.',
    past_medical_history: 'Adult-onset bronchial asthma since 2020.',
    is_archived: false,
    created_at: '2026-02-10T14:00:00.000Z',
    updated_at: '2026-08-30T16:45:00.000Z',
    created_by: 'doc-fausto-tancongco-01',
  },
  {
    id: 'pat-delacruz-roberto-004',
    patient_number: 'P-00173',
    name: 'De la Cruz, Roberto S.',
    age: 48,
    sex: 'M',
    status: 'Married',
    religion: 'RC',
    phone: '0922-841-2309',
    address: 'Kauswagan Highway, Cagayan de Oro City',
    personal_history: 'Heavy vehicle mechanic, occupational dust exposure.',
    family_history: 'Type 2 Diabetes (Mother)',
    past_medical_history: 'Chronic sinusitis, episodic bronchitis.',
    is_archived: false,
    created_at: '2026-03-01T10:30:00.000Z',
    updated_at: '2026-07-15T09:20:00.000Z',
    created_by: 'doc-fausto-tancongco-01',
  },
  {
    id: 'pat-alvarez-elena-005',
    patient_number: 'P-00174',
    name: 'Alvarez, Elena G.',
    age: 27,
    sex: 'F',
    status: 'Single',
    religion: 'RC',
    phone: '0918-329-8744',
    address: 'Carmen, Macanhan, Cagayan de Oro City',
    personal_history: 'Non-smoker, BPO call center agent, night shift.',
    family_history: 'Hypertension in father.',
    past_medical_history: 'Recurrent pharyngitis, GERD.',
    is_archived: false,
    created_at: '2026-04-18T13:20:00.000Z',
    updated_at: '2026-08-28T15:10:00.000Z',
    created_by: 'doc-fausto-tancongco-01',
  }
];

// Initial medical records matching the user's reference photograph for Melanie Arceñas
export const SEED_MEDICAL_RECORDS: MedicalRecord[] = [
  {
    id: 'rec-arcenas-01',
    patient_id: 'pat-arcenas-melanie-001',
    doctor_id: 'doc-fausto-tancongco-01',
    doctor_name: 'Dr. Fausto Tancongco',
    record_date: '2007-01-20',
    adm: false,
    admission_date: undefined,
    discharge_hospital: '',
    complaints: '3 days cough colds fever yellow brownish sputum',
    pe: 'tpce rales L base, decreased breath sounds lower third',
    labs: 'cxr BE L base, sputum AFB negative',
    diagnoses: 'URTI (Upper Respiratory Tract Infection) in patient with underlying Bronchiectasis',
    notes: 'zinnat 500mg BID x 7 days, nasathera spray, mucosolvan 30mg TID. Rest and hydration.',
    charges: 650.00,
    is_archived: false,
    created_at: '2007-01-20T09:00:00.000Z',
    updated_at: '2007-01-20T09:30:00.000Z',
    drawings: [
      {
        id: 'drw-arcenas-01',
        patient_id: 'pat-arcenas-melanie-001',
        medical_record_id: 'rec-arcenas-01',
        doctor_id: 'doc-fausto-tancongco-01',
        title: 'Left Lung Base Bulla & Infiltrate Markings',
        storage_path: 'patient/pat-arcenas-melanie-001/medical-record/rec-arcenas-01/drw-arcenas-01.jpg',
        image_url: SAMPLE_CHEST_DRAWING_DATA_URI,
        file_type: 'image/jpeg',
        notes: 'Demonstrates localized crackles and bullous changes at left posterior lung base.',
        created_at: '2007-01-20T09:25:00.000Z',
      }
    ]
  },
  {
    id: 'rec-arcenas-02',
    patient_id: 'pat-arcenas-melanie-001',
    doctor_id: 'doc-fausto-tancongco-01',
    doctor_name: 'Dr. Fausto Tancongco',
    record_date: '2007-12-27',
    adm: false,
    admission_date: undefined,
    discharge_hospital: '',
    complaints: 'Productive cough with yellowish phlegm, intermittent chest tightness during cold evenings',
    pe: 'Decreased breath sounds at Left base with localized fine crackles',
    labs: 'Sputum AFB negative x3, Gram stain: mixed oral flora',
    diagnoses: 'BE (Bronchiectasis) acute flare-up',
    notes: 'Cefuroxime 500mg BID x 7d, Salbutamol nebulization q8h PRN, postural drainage',
    charges: 750.00,
    is_archived: false,
    created_at: '2007-12-27T10:15:00.000Z',
    updated_at: '2007-12-27T10:45:00.000Z',
  },
  {
    id: 'rec-arcenas-03',
    patient_id: 'pat-arcenas-melanie-001',
    doctor_id: 'doc-fausto-tancongco-01',
    doctor_name: 'Dr. Fausto Tancongco',
    record_date: '2008-01-07',
    adm: false,
    admission_date: undefined,
    discharge_hospital: '',
    complaints: 'Exertional shortness of breath, improved sputum volume, nocturnal waking',
    pe: 'Minimally scattered rhonchi left base, no cyanosis, BP 120/80',
    labs: 'CBC: WBC 7.8, Hb 12.4, Platelets adequate',
    diagnoses: 'PND (Paroxysmal Nocturnal Dyspnea), BE resolving',
    notes: 'Elevate head of bed 30 degrees, continue postural drainage, incentive spirometry 10x hourly',
    charges: 600.00,
    is_archived: false,
    created_at: '2008-01-07T11:00:00.000Z',
    updated_at: '2008-01-07T11:20:00.000Z',
  },
  {
    id: 'rec-arcenas-04',
    patient_id: 'pat-arcenas-melanie-001',
    doctor_id: 'doc-fausto-tancongco-01',
    doctor_name: 'Dr. Fausto Tancongco',
    record_date: '2008-01-16',
    adm: false,
    admission_date: undefined,
    discharge_hospital: '',
    complaints: 'Routine follow-up, mild morning clearing only, no fever',
    pe: 'Lungs clear bilaterally, trace bibasilar ronchi clearing with coughing',
    labs: 'Routine CXR requested for comparative baseline',
    diagnoses: 'BE (Bronchiectasis) stable',
    notes: 'Maintenance Erdosteine 300mg BID, adequate fluid intake > 2 liters/day',
    charges: 500.00,
    is_archived: false,
    created_at: '2008-01-16T14:30:00.000Z',
    updated_at: '2008-01-16T14:50:00.000Z',
  },
  {
    id: 'rec-arcenas-05',
    patient_id: 'pat-arcenas-melanie-001',
    doctor_id: 'doc-fausto-tancongco-01',
    doctor_name: 'Dr. Fausto Tancongco',
    record_date: '2009-12-15',
    adm: false,
    admission_date: undefined,
    discharge_hospital: '',
    complaints: '5 days foul-smelling sputum, low grade fever (38.1 C), fatigue',
    pe: 'Wet coarse crackles left lower lung field, tachypneic at 22 cpm',
    labs: 'CXR PA/Lat: persistent cystic bronchiectasis left lower lobe with air-fluid level',
    diagnoses: 'BE (Bronchiectasis) with secondary bacterial infection',
    notes: 'Levofloxacin 500mg OD x 10d, Acetylcysteine 600mg effervescent tab OD, chest percussion',
    charges: 850.00,
    is_archived: false,
    created_at: '2009-12-15T09:10:00.000Z',
    updated_at: '2009-12-15T09:40:00.000Z',
  },
  {
    id: 'rec-arcenas-06',
    patient_id: 'pat-arcenas-melanie-001',
    doctor_id: 'doc-fausto-tancongco-01',
    doctor_name: 'Dr. Fausto Tancongco',
    record_date: '2010-01-04',
    adm: false,
    admission_date: undefined,
    discharge_hospital: '',
    complaints: 'Asymptomatic, sputum clear mucoid, appetite normal',
    pe: 'Stable left basal diminished sounds, no acute distress, SpO2 98%',
    labs: 'Repeat CXR: resolution of air-fluid levels, stable chronic bullous changes',
    diagnoses: 'BE (Bronchiectasis) post-treatment clearance',
    notes: 'Annual influenza vaccine administered today. Return in 6 months.',
    charges: 700.00,
    is_archived: false,
    created_at: '2010-01-04T15:00:00.000Z',
    updated_at: '2010-01-04T15:25:00.000Z',
  },
  {
    id: 'rec-arcenas-07',
    patient_id: 'pat-arcenas-melanie-001',
    doctor_id: 'doc-fausto-tancongco-01',
    doctor_name: 'Dr. Fausto Tancongco',
    record_date: '2010-02-01',
    adm: false,
    admission_date: undefined,
    discharge_hospital: '',
    complaints: 'Wheezing aggravated by cold weather, morning chest tightness',
    pe: 'Expiratory wheezes bilaterally, prolonged expiratory phase',
    labs: 'Peak expiratory flow: 280 L/min (predicted 380 L/min)',
    diagnoses: 'BA (Bronchial Asthma), TB Class IV (Inactive), BE',
    notes: 'Budesonide/Formoterol Turbuhaler 160/4.5 1 puff BID, Salbutamol MDI PRN',
    charges: 800.00,
    is_archived: false,
    created_at: '2010-02-01T10:00:00.000Z',
    updated_at: '2010-02-01T10:30:00.000Z',
  },
  {
    id: 'rec-arcenas-08',
    patient_id: 'pat-arcenas-melanie-001',
    doctor_id: 'doc-fausto-tancongco-01',
    doctor_name: 'Dr. Fausto Tancongco',
    record_date: '2011-02-02',
    adm: false,
    admission_date: undefined,
    discharge_hospital: '',
    complaints: 'Non-productive cough, mild pleuritic chest discomfort on left side',
    pe: 'Dullness to percussion at left posterior lower border, focal rales',
    labs: 'CXR: Round PA density at left base, differential: mucous plug vs atelectasis',
    diagnoses: 'Round PA Density? Left base, rule out coin lesion vs mucous plugging in BE',
    notes: 'High-Resolution Chest CT scan scheduled with contrast. Return with films.',
    charges: 950.00,
    is_archived: false,
    created_at: '2011-02-02T13:45:00.000Z',
    updated_at: '2011-02-02T14:15:00.000Z',
  },
  {
    id: 'rec-arcenas-09',
    patient_id: 'pat-arcenas-melanie-001',
    doctor_id: 'doc-fausto-tancongco-01',
    doctor_name: 'Dr. Fausto Tancongco',
    record_date: '2011-02-17',
    adm: false,
    admission_date: undefined,
    discharge_hospital: '',
    complaints: 'Review of HRCT films and pulmonary findings',
    pe: 'Left lower lobe cystic changes with mucous plugging, no active cavitation',
    labs: 'HRCT Chest: Confirms saccular bronchiectasis left lower lobe with impacted mucus. No malignancy.',
    diagnoses: 'BE with PA Density (resolved mucous impaction)',
    notes: 'Chest physiotherapy, postural drainage with Flutter valve. Avoid smoke and cold drafts.',
    charges: 750.00,
    is_archived: false,
    created_at: '2011-02-17T11:20:00.000Z',
    updated_at: '2011-02-17T11:50:00.000Z',
  },
  {
    id: 'rec-arcenas-10',
    patient_id: 'pat-arcenas-melanie-001',
    doctor_id: 'doc-fausto-tancongco-01',
    doctor_name: 'Dr. Fausto Tancongco',
    record_date: '2011-03-11',
    adm: false,
    admission_date: undefined,
    discharge_hospital: '',
    complaints: '2 days rhinorrhea, scratchy throat, dry ticklish cough',
    pe: 'Hyperemic posterior pharynx, lungs clear except baseline left basal crackles',
    labs: 'Routine vital signs: Temp 37.2 C, BP 118/76, HR 74, RR 18',
    diagnoses: 'BE with acute URTI',
    notes: 'Co-Amoxiclav 625mg TID x 7 days, Paracetamol 500mg PRN for headache/fever',
    charges: 650.00,
    is_archived: false,
    created_at: '2011-03-11T14:05:00.000Z',
    updated_at: '2011-03-11T14:30:00.000Z',
  },
  // Extra sample records for other patients
  {
    id: 'rec-villanueva-01',
    patient_id: 'pat-villanueva-carlos-002',
    doctor_id: 'doc-fausto-tancongco-01',
    doctor_name: 'Dr. Fausto Tancongco',
    record_date: '2026-08-22',
    adm: false,
    admission_date: undefined,
    discharge_hospital: '',
    complaints: 'Exertional dyspnea walking 1 flight of stairs, morning cough with whitish phlegm',
    pe: 'Barrel chest, decreased tactile fremitus, distant heart sounds, prolonged expiration',
    labs: 'Spirometry: FEV1/FVC 0.58, FEV1 62% predicted post-bronchodilator',
    diagnoses: 'COPD GOLD Stage II (Moderate, Group B), Essential Hypertension',
    notes: 'Tiotropium Respimat 2.5mcg 2 puffs OD, Formoterol/Budesonide PRN, Pulmonary Rehab referral',
    charges: 1200.00,
    is_archived: false,
    created_at: '2026-08-22T11:00:00.000Z',
    updated_at: '2026-08-22T11:30:00.000Z',
  },
  {
    id: 'rec-santos-01',
    patient_id: 'pat-santos-maria-003',
    doctor_id: 'doc-fausto-tancongco-01',
    doctor_name: 'Dr. Fausto Tancongco',
    record_date: '2026-08-30',
    adm: false,
    admission_date: undefined,
    discharge_hospital: '',
    complaints: 'Nocturnal cough and tightness triggered by house dust',
    pe: 'Scattered high-pitched expiratory wheezes across upper lung zones',
    labs: 'IgE total elevated (340 IU/mL)',
    diagnoses: 'Partially Controlled Allergic Asthma',
    notes: 'Fluticasone/Salmeterol Accuhaler 250/50 1 puff BID, Montelukast 10mg tab OD at bedtime',
    charges: 950.00,
    is_archived: false,
    created_at: '2026-08-30T16:45:00.000Z',
    updated_at: '2026-08-30T17:10:00.000Z',
  }
];

export const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-001',
    user_id: 'doc-fausto-tancongco-01',
    user_name: 'Dr. Fausto Tancongco',
    action: 'LOGIN',
    table_name: 'auth.users',
    record_id: 'doc-fausto-tancongco-01',
    metadata: { ip: '127.0.0.1', user_agent: 'SaaS Medical Client 2026' },
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'aud-002',
    user_id: 'doc-fausto-tancongco-01',
    user_name: 'Dr. Fausto Tancongco',
    action: 'PATIENT_UPDATED',
    table_name: 'patients',
    record_id: 'pat-arcenas-melanie-001',
    metadata: { patient_name: 'Arceñas, Melanie', changes: 'Past medical history updated' },
    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
  {
    id: 'aud-003',
    user_id: 'doc-fausto-tancongco-01',
    user_name: 'Dr. Fausto Tancongco',
    action: 'DRAWING_SAVED',
    table_name: 'clinical_drawings',
    record_id: 'drw-arcenas-01',
    metadata: { title: 'Left Lung Base Bulla & Infiltrate Markings', file_type: 'image/jpeg' },
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'aud-004',
    user_id: 'doc-fausto-tancongco-01',
    user_name: 'Dr. Fausto Tancongco',
    action: 'RECORD_CREATED',
    table_name: 'medical_records',
    record_id: 'rec-santos-01',
    metadata: { patient_id: 'pat-santos-maria-003', diagnosis: 'Partially Controlled Allergic Asthma' },
    created_at: new Date(Date.now() - 1800000).toISOString(),
  }
];

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
 * Strictly listens to INSERT and UPDATE only (no DELETE).
 */
export function subscribeToPatientsChannel(
  onPatientChange: (payload: { eventType: 'INSERT' | 'UPDATE'; new: any; old: any }) => void
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
    .subscribe();
}

/**
 * Scoped Realtime channel helper for a specific patient's clinical records and drawings.
 * Strictly listens to INSERT and UPDATE only (no DELETE).
 * Strictly scoped by patient_id filter.
 */
export function subscribeToPatientClinicalChannel(
  patientId: string,
  onRecordChange: (payload: { eventType: 'INSERT' | 'UPDATE'; new: any; old: any }) => void,
  onDrawingChange: (payload: { eventType: 'INSERT' | 'UPDATE'; new: any; old: any }) => void
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
