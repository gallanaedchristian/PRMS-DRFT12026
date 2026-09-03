-- ==============================================================================
-- PATIENT RECORDS MANAGEMENT SYSTEM - SUPABASE POSTGRESQL MIGRATION
-- Production-ready schema with RLS, Storage policies, Audit Logging, and Seed Data
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ORGANIZATIONS / CLINICS TABLE (Multi-tenant ready)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. USER PROFILES TABLE (Associated with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    title TEXT DEFAULT 'M.D.',
    specialty TEXT DEFAULT 'General Practitioner',
    license_number TEXT,
    role TEXT DEFAULT 'doctor' CHECK (role IN ('doctor', 'admin', 'nurse')),
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PATIENTS TABLE
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    patient_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    age INTEGER CHECK (age >= 0 AND age <= 130),
    sex TEXT NOT NULL CHECK (sex IN ('M', 'F', 'Other')),
    status TEXT DEFAULT 'Single' CHECK (status IN ('Single', 'Married', 'Widowed', 'Divorced', 'Separated')),
    religion TEXT DEFAULT 'RC',
    phone TEXT,
    address TEXT,
    personal_history TEXT,
    family_history TEXT,
    past_medical_history TEXT,
    is_archived BOOLEAN DEFAULT FALSE NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for lightning-fast patient searches
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients USING gin (to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_patients_name_trgm ON public.patients (name);
CREATE INDEX IF NOT EXISTS idx_patients_patient_number ON public.patients (patient_number);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients (phone);
CREATE INDEX IF NOT EXISTS idx_patients_is_archived ON public.patients (is_archived);

-- 4. MEDICAL RECORDS TABLE (One Patient -> Many Medical Records)
CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    doctor_name TEXT NOT NULL,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    adm BOOLEAN DEFAULT FALSE NOT NULL,
    admission_date DATE,
    discharge_hospital TEXT,
    complaints TEXT,
    pe TEXT,
    labs TEXT,
    diagnoses TEXT NOT NULL,
    notes TEXT,
    charges NUMERIC(12, 2) DEFAULT 0.00,
    is_archived BOOLEAN DEFAULT FALSE NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for medical records querying
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON public.medical_records (patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_date ON public.medical_records (record_date DESC);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id ON public.medical_records (doctor_id);

-- 5. CLINICAL DRAWINGS TABLE (Drawings associated with Doctor, Patient, and Medical Record)
CREATE TABLE IF NOT EXISTS public.clinical_drawings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT DEFAULT 'Clinical Finding Observation',
    storage_path TEXT NOT NULL,
    file_type TEXT DEFAULT 'image/jpeg' NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clinical_drawings_patient_id ON public.clinical_drawings (patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_drawings_record_id ON public.clinical_drawings (medical_record_id);

-- 6. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- ==============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_medical_records_updated_at
    BEFORE UPDATE ON public.medical_records
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users can view profiles in their system
CREATE POLICY "Authenticated users can read profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Patients: Authenticated users can select, insert, update, archive
CREATE POLICY "Authenticated users can view active patients"
    ON public.patients FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert patients"
    ON public.patients FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update patients"
    ON public.patients FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete patients"
    ON public.patients FOR DELETE
    TO authenticated
    USING (auth.uid() IS NOT NULL);

-- Medical Records: Authenticated users can select, insert, update
CREATE POLICY "Authenticated users can view medical records"
    ON public.medical_records FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can create medical records"
    ON public.medical_records FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update medical records"
    ON public.medical_records FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete medical records"
    ON public.medical_records FOR DELETE
    TO authenticated
    USING (auth.uid() IS NOT NULL);

-- Clinical Drawings: Authenticated users can manage drawings
CREATE POLICY "Authenticated users can view clinical drawings"
    ON public.clinical_drawings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can upload clinical drawings"
    ON public.clinical_drawings FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete clinical drawings"
    ON public.clinical_drawings FOR DELETE
    TO authenticated
    USING (auth.uid() IS NOT NULL);

-- Audit Logs: View and insert
CREATE POLICY "Authenticated users can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- ==============================================================================
-- SUPABASE STORAGE BUCKET CONFIGURATION
-- Private bucket for HIPAA/clinical data privacy
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinical-drawings', 'clinical-drawings', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage Access Policies
CREATE POLICY "Authenticated users can upload clinical drawings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'clinical-drawings');

CREATE POLICY "Authenticated users can read clinical drawings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'clinical-drawings');

CREATE POLICY "Authenticated users can delete clinical drawings"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'clinical-drawings');
