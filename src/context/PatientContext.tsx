import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Patient, 
  MedicalRecord, 
  ClinicalDrawing, 
  AuditLog, 
  ClinicInfo, 
  ActiveView,
  DuplicateCheckResult,
  DuplicateCluster 
} from '../types';
import { 
  getSupabase, 
  getSupabaseConfig,
  subscribeToPatientsChannel,
  subscribeToPatientClinicalChannel,
  DEFAULT_CLINIC 
} from '../lib/supabase';
import { useAuth } from './AuthContext';
import { checkDuplicatePatient, findExistingDuplicateClusters } from '../utils/duplicateDetection';

interface PatientContextType {
  patients: Patient[];
  medicalRecords: MedicalRecord[];
  auditLogs: AuditLog[];
  clinicInfo: ClinicInfo;
  selectedPatient: Patient | null;
  activePatient: Patient | null;
  activeRecord: MedicalRecord | null;
  activeView: ActiveView;
  searchQuery: string;
  isLoadingData: boolean;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  syncStatus: string;
  
  // Navigation & View controls
  setActiveView: (view: ActiveView) => void;
  setSelectedPatient: (patient: Patient | null) => void;
  setActivePatient: (patient: Patient | null) => void;
  setActiveRecord: (record: MedicalRecord | null) => void;
  setSearchQuery: (query: string) => void;
  clearNotification: () => void;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;

  // Duplicate Prevention & Screening
  checkDuplicates: (candidate: Partial<Patient>) => DuplicateCheckResult;
  scanExistingDuplicates: () => DuplicateCluster[];

  // Patient CRUD
  createPatient: (patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => Promise<Patient>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<Patient>;
  archivePatient: (id: string) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;

  // Medical Record CRUD
  createMedicalRecord: (record: Omit<MedicalRecord, 'id' | 'created_at' | 'updated_at'>, drawingImage?: string) => Promise<MedicalRecord>;
  updateMedicalRecord: (id: string, updates: Partial<MedicalRecord>, newDrawing?: string) => Promise<MedicalRecord>;
  deleteMedicalRecord: (id: string) => Promise<void>;
  getPatientRecords: (patientId: string) => MedicalRecord[];

  // Clinical Drawing
  saveDrawingToStorage: (patientId: string, recordId: string, dataUrl: string, title?: string) => Promise<ClinicalDrawing>;

  // Clinic Info
  updateClinicInfo: (info: Partial<ClinicInfo>) => void;

  // Audit Log
  logAuditAction: (action: AuditLog['action'], tableName: string, recordId: string, metadata?: Record<string, any>) => void;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { doctor, staffProfile, isAuthenticated } = useAuth();
  
  // Storage keys
  const PATIENTS_STORAGE_KEY = 'medrecords_patients_v1';
  const RECORDS_STORAGE_KEY = 'medrecords_records_v1';
  const AUDIT_STORAGE_KEY = 'medrecords_audit_v1';
  const CLINIC_STORAGE_KEY = 'medrecords_clinic_v1';

  // Demo patient tracking sets for cache sanitization
  const DEMO_PATIENT_NUMBERS = new Set(['P-00170', 'P-00171', 'P-00172', 'P-00173', 'P-00174']);
  const DEMO_PATIENT_IDS = new Set([
    'pat-arcenas-melanie-001',
    'pat-villanueva-carlos-002',
    'pat-santos-maria-003',
    'pat-delacruz-roberto-004',
    'pat-alvarez-elena-005',
  ]);

  const purgeDemoItems = <T extends { id?: string; patient_id?: string; patient_number?: string }>(items: T[]): T[] => {
    return items.filter((item) => {
      if (item.patient_number && DEMO_PATIENT_NUMBERS.has(item.patient_number.trim())) return false;
      if (item.id && DEMO_PATIENT_IDS.has(item.id.trim())) return false;
      if (item.patient_id && DEMO_PATIENT_IDS.has(item.patient_id.trim())) return false;
      return true;
    });
  };

  // State initialization: defaults to empty arrays when no verified user data exists
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem(PATIENTS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return purgeDemoItems(parsed);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(() => {
    const saved = localStorage.getItem(RECORDS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return purgeDemoItems(parsed);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return purgeDemoItems(parsed);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [clinicInfo, setClinicInfo] = useState<ClinicInfo>(() => {
    const saved = localStorage.getItem(CLINIC_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { return DEFAULT_CLINIC; }
    }
    return DEFAULT_CLINIC;
  });

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeRecord, setActiveRecord] = useState<MedicalRecord | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>(() => {
    return getSupabaseConfig().isConfigured ? 'cloud' : 'local';
  });

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(medicalRecords));
  }, [medicalRecords]);

  useEffect(() => {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(CLINIC_STORAGE_KEY, JSON.stringify(clinicInfo));
  }, [clinicInfo]);

  // Keep selected patient in sync with available patient list
  useEffect(() => {
    if (patients.length === 0) {
      if (selectedPatient !== null) {
        setSelectedPatient(null);
      }
    } else if (!selectedPatient || !patients.some((p) => p.id === selectedPatient.id)) {
      setSelectedPatient(patients[0]);
    }
  }, [patients, selectedPatient]);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const logAuditAction = useCallback((
    action: AuditLog['action'],
    tableName: string,
    recordId: string,
    metadata: Record<string, any> = {}
  ) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: doctor?.id || 'doc-anonymous',
      user_name: doctor?.full_name || 'Dr. Fausto Tancongco',
      action,
      table_name: tableName,
      record_id: recordId,
      metadata,
      created_at: new Date().toISOString(),
    };

    setAuditLogs((prev) => [newLog, ...prev]);

    // Send to Supabase via hardened RPC function ONLY for permitted client events.
    // Database triggers handle table mutations (INSERT/UPDATE/DELETE/ARCHIVE) authoritatively.
    const CLIENT_AUDIT_EVENTS: AuditLog['action'][] = [
      'LOGIN',
      'LOGOUT',
      'PRINT_EXPORT',
      'DRAWING_SAVED',
      'PASSWORD_RESET_REQUESTED',
      'PASSWORD_UPDATED',
    ];

    if (CLIENT_AUDIT_EVENTS.includes(action)) {
      const supabase = getSupabase();
      if (supabase) {
        supabase
          .rpc('record_audit_event', {
            p_action: action,
            p_table_name: tableName,
            p_record_id: recordId,
            p_metadata: metadata,
          })
          .then(({ error }) => {
            if (error) {
              console.warn('Audit log RPC event notice:', error.message);
            }
          });
      }
    }
  }, [doctor]);

  // Attempt to sync from Supabase if connected and authenticated
  useEffect(() => {
    const fetchSupabaseData = async () => {
      const supabase = getSupabase();
      if (!supabase || !isAuthenticated) return;

      try {
        setIsLoadingData(true);
        const [patientsRes, recordsRes, auditRes] = await Promise.all([
          supabase.from('patients').select('*').order('created_at', { ascending: false }),
          supabase.from('medical_records').select('*, clinical_drawings(*)').order('record_date', { ascending: false }),
          supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
        ]);

        // 1. Patients Handling: Treat successful query with 0 rows as valid empty state
        if (patientsRes.error) {
          console.error('Supabase query error for patients:', patientsRes.error);
          showNotification(`Database error loading patients: ${patientsRes.error.message}`, 'error');
        } else if (patientsRes.data !== null) {
          const remotePatients = patientsRes.data;
          setPatients(remotePatients);
          localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(remotePatients));
          if (remotePatients.length === 0) {
            setSelectedPatient(null);
          } else {
            setSelectedPatient((curr) => {
              if (curr && remotePatients.some((p) => p.id === curr.id)) {
                return remotePatients.find((p) => p.id === curr.id) || remotePatients[0];
              }
              return remotePatients[0];
            });
          }
        }

        // 2. Medical Records Handling: Treat successful query with 0 rows as valid empty state
        if (recordsRes.error) {
          console.error('Supabase query error for medical_records:', recordsRes.error);
          showNotification(`Database error loading medical records: ${recordsRes.error.message}`, 'error');
        } else if (recordsRes.data !== null) {
          const formattedRecords: MedicalRecord[] = recordsRes.data.map((r: any) => ({
            ...r,
            drawings: r.clinical_drawings || [],
          }));
          setMedicalRecords(formattedRecords);
          localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(formattedRecords));
        }

        // 3. Audit Logs Handling: Treat successful query with 0 rows as valid empty state
        if (auditRes.error) {
          console.warn('Supabase query note for audit_logs:', auditRes.error);
        } else if (auditRes.data !== null) {
          setAuditLogs(auditRes.data);
          localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(auditRes.data));
        }
      } catch (err: any) {
        console.error('Supabase sync note:', err);
        showNotification(`Failed to synchronize with database: ${err?.message || err}`, 'error');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchSupabaseData();
  }, [isAuthenticated, showNotification]);

  // Realtime Subscription A: Patients (INSERT, UPDATE, DELETE)
  // Ensures patient list and active patient details update without manual refresh
  useEffect(() => {
    if (!isAuthenticated) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = subscribeToPatientsChannel(async ({ eventType, new: newRecord, old: oldRecord }) => {
      // Handle remote deletion
      if (eventType === 'DELETE') {
        const deletedId = oldRecord?.id;
        if (deletedId) {
          setPatients((prev) => {
            const updated = prev.filter((p) => p.id !== deletedId);
            localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });
          setMedicalRecords((prev) => {
            const updated = prev.filter((r) => r.patient_id !== deletedId);
            localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });
          setSelectedPatient((prev) => (prev && prev.id === deletedId ? null : prev));
        }
        return;
      }

      if (!newRecord?.id) return;

      // Authorized row refetch: RLS enforces organization boundary check automatically
      const { data: verifiedPatient, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', newRecord.id)
        .maybeSingle();

      if (error || !verifiedPatient) return;

      setPatients((prev) => {
        const idx = prev.findIndex((p) => p.id === verifiedPatient.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = verifiedPatient;
          return updated;
        }
        return [verifiedPatient, ...prev];
      });

      setSelectedPatient((prev) => (prev && prev.id === verifiedPatient.id ? verifiedPatient : prev));
    });

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [isAuthenticated]);

  // Realtime Subscription B & C: Medical Records and Clinical Drawings (INSERT, UPDATE, DELETE)
  // Strictly scoped to the currently selected patient
  // Cleans up when selectedPatient changes, user logs out, or component unmounts
  useEffect(() => {
    if (!isAuthenticated || !selectedPatient?.id) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const patientId = selectedPatient.id;
    const channel = subscribeToPatientClinicalChannel(
      patientId,
      // onRecordChange:
      async ({ eventType, new: newRec, old: oldRec }) => {
        if (eventType === 'DELETE') {
          const deletedId = oldRec?.id;
          if (deletedId) {
            setMedicalRecords((prev) => {
              const updated = prev.filter((r) => r.id !== deletedId);
              localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(updated));
              return updated;
            });
            setActiveRecord((prev) => (prev && prev.id === deletedId ? null : prev));
          }
          return;
        }

        if (!newRec?.id) return;
        // Authorized row refetch: RLS enforces can_access_patient & clinical role
        const { data: verifiedRecord, error } = await supabase
          .from('medical_records')
          .select('*, clinical_drawings(*)')
          .eq('id', newRec.id)
          .maybeSingle();

        if (error || !verifiedRecord) return;

        const formattedRecord: MedicalRecord = {
          ...verifiedRecord,
          drawings: verifiedRecord.clinical_drawings || [],
        };

        setMedicalRecords((prev) => {
          const idx = prev.findIndex((r) => r.id === formattedRecord.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = formattedRecord;
            return updated;
          }
          return [formattedRecord, ...prev];
        });

        setActiveRecord((prev) => (prev && prev.id === formattedRecord.id ? formattedRecord : prev));
      },
      // onDrawingChange:
      async ({ eventType, new: newDraw, old: oldDraw }) => {
        if (eventType === 'DELETE') {
          const deletedId = oldDraw?.id;
          if (deletedId) {
            setMedicalRecords((prev) => {
              const updated = prev.map((rec) => ({
                ...rec,
                drawings: (rec.drawings || []).filter((d) => d.id !== deletedId),
              }));
              localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(updated));
              return updated;
            });
          }
          return;
        }

        if (!newDraw?.id) return;
        // Authorized row refetch: RLS enforces can_access_patient
        const { data: verifiedDrawing, error } = await supabase
          .from('clinical_drawings')
          .select('*')
          .eq('id', newDraw.id)
          .maybeSingle();

        if (error || !verifiedDrawing) return;

        setMedicalRecords((prev) =>
          prev.map((rec) => {
            if (rec.id === verifiedDrawing.medical_record_id || rec.patient_id === verifiedDrawing.patient_id) {
              const existingDrawings = rec.drawings || [];
              const dIdx = existingDrawings.findIndex((d) => d.id === verifiedDrawing.id);
              const nextDrawings = dIdx >= 0
                ? existingDrawings.map((d) => (d.id === verifiedDrawing.id ? verifiedDrawing : d))
                : [...existingDrawings, verifiedDrawing];
              return { ...rec, drawings: nextDrawings };
            }
            return rec;
          })
        );
      }
    );

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [isAuthenticated, selectedPatient?.id]);

  // Filter medical records for a specific patient
  const getPatientRecords = useCallback((patientId: string): MedicalRecord[] => {
    return medicalRecords
      .filter((r) => r.patient_id === patientId && !r.is_archived)
      .sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());
  }, [medicalRecords]);

  // Duplicate screening helpers
  const checkDuplicates = useCallback((candidate: Partial<Patient>): DuplicateCheckResult => {
    return checkDuplicatePatient(candidate, patients, staffProfile?.organization_id);
  }, [patients, staffProfile?.organization_id]);

  const scanExistingDuplicates = useCallback((): DuplicateCluster[] => {
    return findExistingDuplicateClusters(patients, staffProfile?.organization_id);
  }, [patients, staffProfile?.organization_id]);

  // Create Patient
  const createPatient = async (data: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<Patient> => {
    // 1. Client-side authoritative screening (organization-scoped)
    const dupCheck = checkDuplicates(data);
    if (dupCheck.hasStrongDuplicate) {
      const match = dupCheck.strongMatches[0];
      const err: any = new Error(
        `DUPLICATE_PATIENT: A patient with the same demographic details (${match.patient.name}, ${match.patient.patient_number}) already exists.`
      );
      err.code = 'DUPLICATE_PATIENT';
      err.duplicate = match;
      throw err;
    }

    const providedNumber = data.patient_number?.trim();
    const supabase = getSupabase();

    // When connected to Supabase, register_patient_safe RPC is strictly authoritative
    if (supabase) {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('register_patient_safe', {
        p_patient_number: providedNumber || null,
        p_name: data.name.trim(),
        p_age: data.age !== undefined && data.age !== null ? Number(data.age) : null,
        p_date_of_birth: data.date_of_birth ? data.date_of_birth.trim() : null,
        p_sex: data.sex || 'F',
        p_status: data.status || 'Single',
        p_religion: data.religion || 'RC',
        p_phone: data.phone ? data.phone.trim() : null,
        p_email: data.email ? data.email.trim() : null,
        p_address: data.address ? data.address.trim() : null,
        p_personal_history: data.personal_history || null,
        p_family_history: data.family_history || null,
        p_past_medical_history: data.past_medical_history || null,
      });

      if (rpcErr) {
        console.error('register_patient_safe RPC failed:', rpcErr);
        throw new Error(rpcErr.message || 'Database error occurred while registering patient.');
      }

      if (!rpcRes) {
        throw new Error('No response returned from registration service.');
      }

      if (rpcRes.code === 'DUPLICATE_PATIENT' || rpcRes.success === false) {
        const err: any = new Error(rpcRes.message || 'Duplicate patient detected.');
        err.code = rpcRes.code || 'DUPLICATE_PATIENT';
        if (rpcRes.existing_patient_id) {
          err.duplicate = {
            patient: {
              id: rpcRes.existing_patient_id,
              patient_number: rpcRes.patient_number,
              name: rpcRes.name,
            },
            matchType: 'STRONG_DEMOGRAPHICS',
            confidence: 'strong',
            reason: rpcRes.message || 'A patient with the same name and demographic details already exists in this clinic.',
          };
        }
        throw err;
      }

      if (!rpcRes.patient) {
        throw new Error('Database registration did not return a valid patient record.');
      }

      const createdPatient: Patient = rpcRes.patient;

      // Update state only upon confirmed database creation
      setPatients((prev) => [createdPatient, ...prev]);
      setSelectedPatient(createdPatient);
      logAuditAction('PATIENT_CREATED', 'patients', createdPatient.id, {
        name: createdPatient.name,
        patient_number: createdPatient.patient_number,
      });
      showNotification(`Patient "${createdPatient.name}" registered successfully.`, 'success');
      return createdPatient;
    }

    // Offline / unauthenticated fallback (only active when Supabase client is not available)
    const deriveNextPatientNumber = (list: Patient[]): string => {
      let maxNum = 0;
      for (const p of list) {
        if (p.patient_number) {
          const m = p.patient_number.match(/^P-(\d+)$/i);
          if (m) {
            const val = parseInt(m[1], 10);
            if (!isNaN(val) && val > maxNum) maxNum = val;
          }
        }
      }
      return `P-${(maxNum + 1).toString().padStart(5, '0')}`;
    };

    const candidateNumber = providedNumber || deriveNextPatientNumber(patients);
    const newPatient: Patient = {
      ...data,
      id: `pat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      patient_number: candidateNumber,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: doctor?.id,
      organization_id: staffProfile?.organization_id || undefined,
    };

    setPatients((prev) => [newPatient, ...prev]);
    setSelectedPatient(newPatient);
    logAuditAction('PATIENT_CREATED', 'patients', newPatient.id, {
      name: newPatient.name,
      patient_number: newPatient.patient_number,
    });
    showNotification(`Patient "${newPatient.name}" registered successfully.`, 'success');
    return newPatient;
  };

  // Update Patient
  const updatePatient = async (id: string, updates: Partial<Patient>): Promise<Patient> => {
    let updatedPatient: Patient | null = null;

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          updatedPatient = { ...p, ...updates, updated_at: new Date().toISOString() };
          return updatedPatient;
        }
        return p;
      })
    );

    if (selectedPatient?.id === id && updatedPatient) {
      setSelectedPatient(updatedPatient);
    }

    // Try Supabase update
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('patients')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase update note:', err);
      }
    }

    if (updatedPatient) {
      logAuditAction('PATIENT_UPDATED', 'patients', id, { updates });
      showNotification('Patient information updated successfully.', 'success');
      return updatedPatient;
    }
    throw new Error('Patient not found');
  };

  // Archive Patient
  const archivePatient = async (id: string) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_archived: true, updated_at: new Date().toISOString() } : p))
    );

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('patients').update({ is_archived: true }).eq('id', id);
      } catch (err) {
        console.warn('Supabase archive note:', err);
      }
    }

    logAuditAction('PATIENT_ARCHIVED', 'patients', id);
    showNotification('Patient archived successfully.', 'info');
  };

  // Delete Patient (and associated medical records)
  const deletePatient = async (id: string) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
    setMedicalRecords((prev) => prev.filter((r) => r.patient_id !== id));

    if (selectedPatient?.id === id) {
      setSelectedPatient(null);
      setActiveView('patients');
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('clinical_drawings').delete().eq('patient_id', id);
        await supabase.from('medical_records').delete().eq('patient_id', id);
        await supabase.from('patients').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete patient note:', err);
      }
    }

    logAuditAction('PATIENT_DELETED', 'patients', id);
    showNotification('Patient record and associated encounters deleted successfully.', 'info');
  };

  // Save Clinical Drawing to Storage
  const saveDrawingToStorage = async (
    patientId: string,
    recordId: string,
    dataUrl: string,
    title = 'Clinical Findings Observation'
  ): Promise<ClinicalDrawing> => {
    const drawingId = `drw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const storagePath = `patient/${patientId}/medical-record/${recordId}/${drawingId}.jpg`;
    let finalImageUrl = dataUrl;

    const supabase = getSupabase();
    if (supabase) {
      try {
        // Convert data URL to Blob for Supabase Storage
        const res = await fetch(dataUrl);
        const blob = await res.blob();

        const { error: uploadError } = await supabase.storage
          .from('clinical-drawings')
          .upload(storagePath, blob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (!uploadError) {
          // Generate secure signed URL with 24-hour expiration
          const { data: signedData, error: signError } = await supabase.storage
            .from('clinical-drawings')
            .createSignedUrl(storagePath, 86400);

          if (!signError && signedData?.signedUrl) {
            finalImageUrl = signedData.signedUrl;
          }
        }
      } catch (err) {
        console.warn('Supabase drawing storage fallback:', err);
      }
    }

    const drawing: ClinicalDrawing = {
      id: drawingId,
      patient_id: patientId,
      medical_record_id: recordId,
      doctor_id: doctor?.id || 'doc-tancongco',
      title,
      storage_path: storagePath,
      image_url: finalImageUrl,
      file_type: 'image/jpeg',
      created_at: new Date().toISOString(),
    };

    logAuditAction('DRAWING_SAVED', 'clinical_drawings', drawingId, {
      title,
      storage_path: storagePath,
      patient_id: patientId,
    });

    return drawing;
  };

  // Create Medical Record
  const createMedicalRecord = async (
    recordData: Omit<MedicalRecord, 'id' | 'created_at' | 'updated_at'>,
    drawingImage?: string
  ): Promise<MedicalRecord> => {
    const newRecordId = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const drawingsList: ClinicalDrawing[] = [];

    if (drawingImage) {
      const drawing = await saveDrawingToStorage(
        recordData.patient_id,
        newRecordId,
        drawingImage,
        `Clinical Findings - ${recordData.diagnoses || 'Examination'}`
      );
      drawingsList.push(drawing);
    }

    const newRecord: MedicalRecord = {
      ...recordData,
      id: newRecordId,
      doctor_name: recordData.doctor_name || doctor?.full_name || 'Dr. Fausto Tancongco',
      doctor_id: doctor?.id || 'doc-fausto-tancongco-01',
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      drawings: drawingsList,
    };

    // Try Supabase insert
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: insertedRecord, error } = await supabase
          .from('medical_records')
          .insert({
            patient_id: newRecord.patient_id,
            doctor_id: doctor?.id,
            doctor_name: newRecord.doctor_name,
            record_date: newRecord.record_date,
            adm: newRecord.adm,
            admission_date: newRecord.admission_date || null,
            discharge_hospital: newRecord.discharge_hospital || null,
            complaints: newRecord.complaints,
            pe: newRecord.pe,
            labs: newRecord.labs,
            diagnoses: newRecord.diagnoses,
            notes: newRecord.notes,
            charges: newRecord.charges,
          })
          .select()
          .single();

        if (!error && insertedRecord) {
          newRecord.id = insertedRecord.id;

          // Insert drawing metadata record if available
          if (drawingsList.length > 0) {
            await supabase.from('clinical_drawings').insert({
              patient_id: newRecord.patient_id,
              medical_record_id: newRecord.id,
              doctor_id: doctor?.id,
              title: drawingsList[0].title,
              storage_path: drawingsList[0].storage_path,
              file_type: 'image/jpeg',
            });
          }
        }
      } catch (err) {
        console.warn('Supabase medical record insert fallback:', err);
      }
    }

    setMedicalRecords((prev) => [newRecord, ...prev]);
    logAuditAction('RECORD_CREATED', 'medical_records', newRecord.id, {
      patient_id: newRecord.patient_id,
      diagnoses: newRecord.diagnoses,
      date: newRecord.record_date,
    });

    showNotification('Medical record saved successfully.', 'success');
    return newRecord;
  };

  // Update Medical Record
  const updateMedicalRecord = async (
    id: string,
    updates: Partial<MedicalRecord>,
    newDrawing?: string
  ): Promise<MedicalRecord> => {
    let updated: MedicalRecord | null = null;

    let drawingToAdd: ClinicalDrawing | null = null;
    if (newDrawing && updates.patient_id) {
      drawingToAdd = await saveDrawingToStorage(
        updates.patient_id,
        id,
        newDrawing,
        `Clinical Findings - ${updates.diagnoses || 'Updated Findings'}`
      );
    }

    setMedicalRecords((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const currentDrawings = r.drawings || [];
          const updatedDrawings = drawingToAdd ? [drawingToAdd, ...currentDrawings] : currentDrawings;
          updated = {
            ...r,
            ...updates,
            drawings: updatedDrawings,
            updated_at: new Date().toISOString(),
          };
          return updated;
        }
        return r;
      })
    );

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('medical_records')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase update record note:', err);
      }
    }

    if (updated) {
      logAuditAction('RECORD_UPDATED', 'medical_records', id, { diagnoses: updates.diagnoses });
      showNotification('Medical record updated successfully.', 'success');
      return updated;
    }
    throw new Error('Medical record not found');
  };

  // Delete/Archive Medical Record
  const deleteMedicalRecord = async (id: string) => {
    setMedicalRecords((prev) => prev.filter((r) => r.id !== id));

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('clinical_drawings').delete().eq('medical_record_id', id);
        await supabase.from('medical_records').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase record delete note:', err);
      }
    }

    logAuditAction('RECORD_DELETED', 'medical_records', id);
    showNotification('Medical record deleted successfully.', 'info');
  };

  // Update Clinic Info
  const updateClinicInfo = (info: Partial<ClinicInfo>) => {
    setClinicInfo((prev) => ({ ...prev, ...info }));
    showNotification('Clinic details updated.', 'success');
  };

  return (
    <PatientContext.Provider
      value={{
        patients,
        medicalRecords,
        auditLogs,
        clinicInfo,
        selectedPatient,
        activePatient: selectedPatient,
        activeRecord,
        activeView,
        searchQuery,
        isLoadingData,
        notification,
        syncStatus,
        setActiveView,
        setSelectedPatient,
        setActivePatient: setSelectedPatient,
        setActiveRecord,
        setSearchQuery,
        clearNotification,
        showNotification,
        checkDuplicates,
        scanExistingDuplicates,
        createPatient,
        updatePatient,
        archivePatient,
        deletePatient,
        createMedicalRecord,
        updateMedicalRecord,
        deleteMedicalRecord,
        getPatientRecords,
        saveDrawingToStorage,
        updateClinicInfo,
        logAuditAction,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
};

export const usePatients = () => {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatients must be used within a PatientProvider');
  }
  return context;
};
