import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Patient, MedicalRecord, ClinicalDrawing, AuditLog, ClinicInfo, ActiveView } from '../types';
import { 
  getSupabase, 
  getSupabaseConfig,
  SEED_PATIENTS, 
  SEED_MEDICAL_RECORDS, 
  SEED_AUDIT_LOGS, 
  DEFAULT_CLINIC 
} from '../lib/supabase';
import { useAuth } from './AuthContext';

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
  const { doctor } = useAuth();
  
  // Storage keys
  const PATIENTS_STORAGE_KEY = 'medrecords_patients_v1';
  const RECORDS_STORAGE_KEY = 'medrecords_records_v1';
  const AUDIT_STORAGE_KEY = 'medrecords_audit_v1';
  const CLINIC_STORAGE_KEY = 'medrecords_clinic_v1';

  // State initialization
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem(PATIENTS_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { return SEED_PATIENTS; }
    }
    return SEED_PATIENTS;
  });

  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(() => {
    const saved = localStorage.getItem(RECORDS_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { return SEED_MEDICAL_RECORDS; }
    }
    return SEED_MEDICAL_RECORDS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { return SEED_AUDIT_LOGS; }
    }
    return SEED_AUDIT_LOGS;
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

  // Set default selected patient to Melanie Arceñas if on first load
  useEffect(() => {
    if (!selectedPatient && patients.length > 0) {
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

    // Send to Supabase if connected
    const supabase = getSupabase();
    if (supabase) {
      supabase.from('audit_logs').insert({
        user_id: doctor?.id,
        user_name: doctor?.full_name || 'Dr. Fausto Tancongco',
        action,
        table_name: tableName,
        record_id: recordId,
        metadata,
      }).then(({ error }) => {
        if (error) console.warn('Supabase audit log insert note:', error.message);
      });
    }
  }, [doctor]);

  // Attempt to sync from Supabase if connected
  useEffect(() => {
    const fetchSupabaseData = async () => {
      const supabase = getSupabase();
      if (!supabase) return;

      try {
        setIsLoadingData(true);
        const [patientsRes, recordsRes] = await Promise.all([
          supabase.from('patients').select('*').order('created_at', { ascending: false }),
          supabase.from('medical_records').select('*, clinical_drawings(*)').order('record_date', { ascending: false }),
        ]);

        if (patientsRes.data && patientsRes.data.length > 0) {
          setPatients(patientsRes.data);
        }
        if (recordsRes.data && recordsRes.data.length > 0) {
          const formattedRecords = recordsRes.data.map((r: any) => ({
            ...r,
            drawings: r.clinical_drawings || [],
          }));
          setMedicalRecords(formattedRecords);
        }
      } catch (err) {
        console.warn('Supabase sync note:', err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchSupabaseData();
  }, []);

  // Filter medical records for a specific patient
  const getPatientRecords = useCallback((patientId: string): MedicalRecord[] => {
    return medicalRecords
      .filter((r) => r.patient_id === patientId && !r.is_archived)
      .sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());
  }, [medicalRecords]);

  // Create Patient
  const createPatient = async (data: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<Patient> => {
    const nextNum = (patients.length + 171).toString().padStart(5, '0');
    const patientNumber = data.patient_number || `P-${nextNum}`;

    const newPatient: Patient = {
      ...data,
      id: `pat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      patient_number: patientNumber,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: doctor?.id,
    };

    // Try Supabase insert
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: inserted, error } = await supabase
          .from('patients')
          .insert({
            patient_number: newPatient.patient_number,
            name: newPatient.name,
            age: newPatient.age,
            sex: newPatient.sex,
            status: newPatient.status,
            religion: newPatient.religion,
            phone: newPatient.phone,
            address: newPatient.address,
            personal_history: newPatient.personal_history,
            family_history: newPatient.family_history,
            past_medical_history: newPatient.past_medical_history,
            created_by: doctor?.id,
          })
          .select()
          .single();

        if (!error && inserted) {
          newPatient.id = inserted.id;
        }
      } catch (err) {
        console.warn('Supabase insert fallback:', err);
      }
    }

    setPatients((prev) => [newPatient, ...prev]);
    setSelectedPatient(newPatient);
    logAuditAction('PATIENT_CREATED', 'patients', newPatient.id, {
      name: newPatient.name,
      patient_number: newPatient.patient_number,
    });
    showNotification(`Patient "${newPatient.name}" created successfully.`, 'success');
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
