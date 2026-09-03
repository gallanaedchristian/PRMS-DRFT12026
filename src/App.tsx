import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PatientProvider, usePatients } from './context/PatientContext';
import { AppLayout } from './components/layout/AppLayout';
import { DoctorDashboard } from './components/dashboard/DoctorDashboard';
import { PatientList } from './components/patients/PatientList';
import { PatientProfile } from './components/patients/PatientProfile';
import { MedicalRecordEditor } from './components/medical-records/MedicalRecordEditor';
import { MedicalRecordsDirectory } from './components/medical-records/MedicalRecordsDirectory';
import { MedicalRecordPrintView } from './components/print/MedicalRecordPrintView';
import { AnalyticsReports } from './components/analytics/AnalyticsReports';
import { ClinicSettings } from './components/settings/ClinicSettings';
import { PatientFormModal } from './components/patients/PatientFormModal';
import { DoctorLogin } from './components/auth/DoctorLogin';
import { Patient, MedicalRecord } from './types';

const MainAppContent: React.FC = () => {
  const { doctor, isAuthenticated } = useAuth();
  const { 
    activeView, 
    setActiveView, 
    activePatient, 
    setActivePatient, 
    activeRecord, 
    setActiveRecord,
    patients,
  } = usePatients();

  // Patient Modal State
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);

  // If not authenticated, show modern doctor login
  if (!isAuthenticated || !doctor) {
    return <DoctorLogin onSuccess={() => {}} />;
  }

  // Action Handlers
  const handleOpenNewPatient = () => {
    setPatientToEdit(null);
    setIsPatientModalOpen(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setPatientToEdit(patient);
    setIsPatientModalOpen(true);
  };

  const handleSelectPatient = (patient: Patient) => {
    setActivePatient(patient);
    setActiveView('patient-profile');
  };

  const handleNewRecordForPatient = (patient: Patient) => {
    setActivePatient(patient);
    setActiveRecord(null);
    setActiveView('record-editor');
  };

  const handleGlobalNewRecord = () => {
    if (activePatient) {
      setActiveRecord(null);
      setActiveView('record-editor');
    } else if (patients.length > 0) {
      setActivePatient(patients[0]);
      setActiveRecord(null);
      setActiveView('record-editor');
    } else {
      handleOpenNewPatient();
    }
  };

  const handleEditRecord = (record: MedicalRecord, patient?: Patient) => {
    if (patient) setActivePatient(patient);
    setActiveRecord(record);
    setActiveView('record-editor');
  };

  const handlePrintRecord = (record: MedicalRecord, patient?: Patient) => {
    if (patient) setActivePatient(patient);
    setActiveRecord(record);
    setActiveView('record-print');
  };

  return (
    <AppLayout
      onOpenNewPatient={handleOpenNewPatient}
      onOpenNewRecord={handleGlobalNewRecord}
    >
      {/* View Switcher */}
      {activeView === 'dashboard' && (
        <DoctorDashboard
          onSelectPatient={handleSelectPatient}
          onOpenNewPatientModal={handleOpenNewPatient}
          onNewRecord={handleGlobalNewRecord}
          onViewRecord={(record, patient) => {
            setActivePatient(patient);
            setActiveRecord(record);
            setActiveView('record-editor');
          }}
        />
      )}

      {activeView === 'patients' && (
        <PatientList
          onSelectPatient={handleSelectPatient}
          onEditPatient={handleEditPatient}
          onNewRecordForPatient={handleNewRecordForPatient}
          onOpenNewPatientModal={handleOpenNewPatient}
        />
      )}

      {activeView === 'patient-profile' && activePatient && (
        <PatientProfile
          patient={activePatient}
          onEditPatient={() => handleEditPatient(activePatient)}
          onNewRecord={() => handleNewRecordForPatient(activePatient)}
          onEditRecord={(record) => handleEditRecord(record, activePatient)}
          onPrintRecord={(record) => handlePrintRecord(record, activePatient)}
        />
      )}

      {activeView === 'medical-records' && (
        <MedicalRecordsDirectory
          onSelectRecord={(record, patient) => handleEditRecord(record, patient)}
          onEditRecord={(record, patient) => handleEditRecord(record, patient)}
          onPrintRecord={(record, patient) => handlePrintRecord(record, patient)}
          onNewRecord={handleGlobalNewRecord}
        />
      )}

      {activeView === 'record-editor' && activePatient && (
        <MedicalRecordEditor
          patient={activePatient}
          recordToEdit={activeRecord}
          onCancel={() => {
            setActiveView('patient-profile');
          }}
          onSaved={(savedRecord) => {
            setActiveRecord(savedRecord);
            setActiveView('patient-profile');
          }}
          onPrint={(rec) => handlePrintRecord(rec, activePatient)}
        />
      )}

      {activeView === 'record-print' && activePatient && activeRecord && (
        <MedicalRecordPrintView
          record={activeRecord}
          patient={activePatient}
          onBack={() => {
            setActiveView('patient-profile');
          }}
        />
      )}

      {activeView === 'analytics' && <AnalyticsReports />}

      {activeView === 'settings' && <ClinicSettings />}

      {/* Patient Create/Edit Modal */}
      <PatientFormModal
        isOpen={isPatientModalOpen}
        patientToEdit={patientToEdit}
        onClose={() => setIsPatientModalOpen(false)}
        onSuccess={(patient) => {
          setActivePatient(patient);
          setActiveView('patient-profile');
        }}
      />
    </AppLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <PatientProvider>
        <MainAppContent />
      </PatientProvider>
    </AuthProvider>
  );
}
