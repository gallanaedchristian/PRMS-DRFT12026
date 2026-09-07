-- ==============================================================================
-- MIGRATION: 20260907000000_staff_profiles_and_auth.sql
-- Description: Complete Fresh-Database Schema with Hardened RBAC, RLS, Audit & Realtime
-- Dependency Order:
--   1. extensions (uuid-ossp, pgcrypto)
--   2. public.organizations
--   3. public.staff_profiles
--   4. public.profiles (legacy compatibility)
--   5. public.patients
--   6. public.medical_records
--   7. public.clinical_drawings
--   8. public.audit_logs
--   9. indexes & constraints
--   10. storage bucket (clinical-drawings)
--   11. authorization helper functions (SECURITY DEFINER with fixed search_path)
--   12. audit & security triggers
--   13. row level security (RLS) policies
--   14. realtime publication (patients, medical_records, clinical_drawings)
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. BASE TABLE: public.organizations (Multi-Tenant Clinic Boundary)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. BASE TABLE: public.staff_profiles (Auth Identity & Role Linkage)
-- Roles: super_admin, doctor, nurse, staff
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'doctor', 'nurse', 'staff')),
    practitioner_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    title TEXT DEFAULT 'M.D.',
    specialty TEXT DEFAULT 'Internal Medicine & Pulmonology',
    license_number TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 4. BASE TABLE: public.profiles (Legacy Compatibility Table)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    title TEXT DEFAULT 'M.D.',
    specialty TEXT DEFAULT 'General Practitioner',
    license_number TEXT,
    role TEXT DEFAULT 'doctor' CHECK (role IN ('super_admin', 'doctor', 'admin', 'nurse', 'staff')),
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 5. BASE TABLE: public.patients
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    patient_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    age INTEGER CHECK (age >= 0 AND age <= 130),
    date_of_birth DATE,
    sex TEXT NOT NULL CHECK (sex IN ('M', 'F', 'Other')),
    status TEXT DEFAULT 'Single' CHECK (status IN ('Single', 'Married', 'Widowed', 'Divorced', 'Separated')),
    religion TEXT DEFAULT 'RC',
    phone TEXT,
    email TEXT,
    address TEXT,
    personal_history TEXT,
    family_history TEXT,
    past_medical_history TEXT,
    is_archived BOOLEAN DEFAULT FALSE NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 6. BASE TABLE: public.medical_records
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ==============================================================================
-- 7. BASE TABLE: public.clinical_drawings
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clinical_drawings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ==============================================================================
-- 8. BASE TABLE: public.audit_logs
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 9. PERFORMANCE & QUERY INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_staff_profiles_auth_user_id ON public.staff_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_org_id ON public.staff_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_role ON public.staff_profiles(role);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_is_active ON public.staff_profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_patients_org_id ON public.patients(organization_id);
CREATE INDEX IF NOT EXISTS idx_patients_patient_number ON public.patients(patient_number);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients USING gin (to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_patients_name_raw ON public.patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_is_archived ON public.patients(is_archived);

CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id ON public.medical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_record_date ON public.medical_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_medical_records_is_archived ON public.medical_records(is_archived);

CREATE INDEX IF NOT EXISTS idx_clinical_drawings_patient_id ON public.clinical_drawings(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_drawings_record_id ON public.clinical_drawings(medical_record_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- 10. STORAGE BUCKET CONFIGURATION (Private Bucket)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinical-drawings', 'clinical-drawings', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ==============================================================================
-- 11. BASE TIMESTAMP TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_staff_profiles_updated_at ON public.staff_profiles;
CREATE TRIGGER update_staff_profiles_updated_at
    BEFORE UPDATE ON public.staff_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_patients_updated_at ON public.patients;
CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_medical_records_updated_at ON public.medical_records;
CREATE TRIGGER update_medical_records_updated_at
    BEFORE UPDATE ON public.medical_records
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 12. HARDENED AUTHORIZATION HELPER FUNCTIONS (SECURITY DEFINER)
-- Strict search_path = public, pg_temp to prevent schema hijacking
-- ==============================================================================

-- 12.1 Base active staff check
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.staff_profiles
        WHERE auth_user_id = auth.uid() AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.is_active_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_staff() TO authenticated;

-- 12.2 Current staff role retriever
CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM public.staff_profiles
    WHERE auth_user_id = auth.uid() AND is_active = TRUE;
    RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.current_staff_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_staff_role() TO authenticated;

-- 12.3 Current staff organization retriever
CREATE OR REPLACE FUNCTION public.current_staff_org_id()
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id
    FROM public.staff_profiles
    WHERE auth_user_id = auth.uid() AND is_active = TRUE;
    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.current_staff_org_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_staff_org_id() TO authenticated;

-- 12.4 Super admin check
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (public.current_staff_role() = 'super_admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- 12.5 Doctor check
CREATE OR REPLACE FUNCTION public.is_doctor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (public.current_staff_role() = 'doctor');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.is_doctor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_doctor() TO authenticated;

-- 12.6 Clinical staff check (super_admin, doctor, nurse)
CREATE OR REPLACE FUNCTION public.is_clinical_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (public.current_staff_role() IN ('super_admin', 'doctor', 'nurse'));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.is_clinical_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_clinical_staff() TO authenticated;

-- 12.7 Patient access check: Confirms active staff status and organization/clinic boundary
CREATE OR REPLACE FUNCTION public.can_access_patient(p_patient_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_org_id UUID;
    v_patient_org_id UUID;
BEGIN
    IF NOT public.is_active_staff() THEN
        RETURN FALSE;
    END IF;

    v_user_org_id := public.current_staff_org_id();
    -- Fail closed: staff without organization assignment cannot access patient records
    IF v_user_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT organization_id INTO v_patient_org_id
    FROM public.patients
    WHERE id = p_patient_id;

    -- Fail closed: patient not found or patient has no organization assignment
    IF NOT FOUND OR v_patient_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Enforce explicit matching non-null clinic/organization boundary
    RETURN (v_patient_org_id = v_user_org_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.can_access_patient(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_patient(UUID) TO authenticated;

-- ==============================================================================
-- 13. SECURITY & AUDIT TRIGGER FUNCTIONS
-- ==============================================================================

-- 13.1 Protect staff profile sensitive administrative fields from self-elevation
CREATE OR REPLACE FUNCTION public.protect_staff_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_super_admin() THEN
        IF NEW.role <> OLD.role THEN
            RAISE EXCEPTION 'Access Denied: Only super_admin may change staff roles.';
        END IF;
        IF NEW.is_active <> OLD.is_active THEN
            RAISE EXCEPTION 'Access Denied: Only super_admin may modify account active status.';
        END IF;
        IF NEW.auth_user_id <> OLD.auth_user_id THEN
            RAISE EXCEPTION 'Access Denied: auth_user_id cannot be changed.';
        END IF;
        IF NEW.practitioner_id IS DISTINCT FROM OLD.practitioner_id THEN
            RAISE EXCEPTION 'Access Denied: practitioner_id cannot be altered.';
        END IF;
        IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
            RAISE EXCEPTION 'Access Denied: organization_id cannot be altered.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS protect_staff_profile_fields_trigger ON public.staff_profiles;
CREATE TRIGGER protect_staff_profile_fields_trigger
    BEFORE UPDATE ON public.staff_profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_staff_profile_fields();

-- 13.2 Tamper-resistant RPC audit logger for client events
CREATE OR REPLACE FUNCTION public.record_audit_event(
    p_action TEXT,
    p_table_name TEXT,
    p_record_id TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_name TEXT;
    v_log_id UUID;
    v_sanitized_metadata JSONB;
BEGIN
    IF v_user_id IS NULL OR NOT public.is_active_staff() THEN
        RAISE EXCEPTION 'Access Denied: Inactive or unauthorized staff member';
    END IF;

    IF p_action NOT IN (
        'LOGIN',
        'LOGOUT',
        'PRINT_EXPORT',
        'DRAWING_SAVED',
        'PASSWORD_RESET_REQUESTED',
        'PASSWORD_UPDATED'
    ) THEN
        RAISE EXCEPTION 'Invalid audit action: % is not a permitted client audit action', p_action;
    END IF;

    IF p_table_name IS NOT NULL AND p_table_name NOT IN (
        'patients',
        'medical_records',
        'clinical_drawings',
        'auth.users'
    ) THEN
        RAISE EXCEPTION 'Invalid audit table_name: %', p_table_name;
    END IF;

    IF p_metadata IS NOT NULL AND jsonb_typeof(p_metadata) <> 'object' THEN
        RAISE EXCEPTION 'Invalid metadata: expected JSON object';
    END IF;

    v_sanitized_metadata := COALESCE(p_metadata, '{}'::jsonb);
    IF length(v_sanitized_metadata::text) > 4096 THEN
        RAISE EXCEPTION 'Audit metadata exceeds allowable payload limit (4KB)';
    END IF;

    SELECT full_name INTO v_user_name
    FROM public.staff_profiles
    WHERE auth_user_id = v_user_id;

    IF v_user_name IS NULL THEN
        v_user_name := 'Authorized Staff';
    END IF;

    INSERT INTO public.audit_logs (
        user_id,
        user_name,
        action,
        table_name,
        record_id,
        metadata,
        created_at
    )
    VALUES (
        v_user_id,
        v_user_name,
        p_action,
        p_table_name,
        p_record_id,
        v_sanitized_metadata,
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.record_audit_event FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_audit_event TO authenticated;

-- 13.3 Database triggers for automated table mutation auditing
CREATE OR REPLACE FUNCTION public.audit_table_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_name TEXT := 'System';
    v_action TEXT;
    v_record_id TEXT;
    v_metadata JSONB;
BEGIN
    IF v_user_id IS NOT NULL THEN
        SELECT full_name INTO v_user_name
        FROM public.staff_profiles
        WHERE auth_user_id = v_user_id;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_action := TG_TABLE_NAME || '_CREATED';
        v_record_id := NEW.id::text;
        v_metadata := jsonb_build_object('operation', 'INSERT');
    ELSIF TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'patients' AND OLD.is_archived = FALSE AND NEW.is_archived = TRUE THEN
            v_action := 'PATIENT_ARCHIVED';
        ELSIF TG_TABLE_NAME = 'medical_records' AND OLD.is_archived = FALSE AND NEW.is_archived = TRUE THEN
            v_action := 'RECORD_ARCHIVED';
        ELSE
            v_action := TG_TABLE_NAME || '_UPDATED';
        END IF;
        v_record_id := NEW.id::text;
        v_metadata := jsonb_build_object('operation', 'UPDATE');
    ELSIF TG_OP = 'DELETE' THEN
        v_action := TG_TABLE_NAME || '_DELETED';
        v_record_id := OLD.id::text;
        v_metadata := jsonb_build_object('operation', 'DELETE');
    END IF;

    INSERT INTO public.audit_logs (
        user_id,
        user_name,
        action,
        table_name,
        record_id,
        metadata,
        created_at
    )
    VALUES (
        v_user_id,
        COALESCE(v_user_name, 'Authorized Staff'),
        v_action,
        TG_TABLE_NAME,
        v_record_id,
        v_metadata,
        timezone('utc'::text, now())
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS audit_patients_trigger ON public.patients;
CREATE TRIGGER audit_patients_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

DROP TRIGGER IF EXISTS audit_medical_records_trigger ON public.medical_records;
CREATE TRIGGER audit_medical_records_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.medical_records
    FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- 13.4 Auto-provision profile trigger when an auth.users record is created
CREATE OR REPLACE FUNCTION public.handle_new_staff_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.staff_profiles (
        auth_user_id,
        email,
        full_name,
        role,
        is_active,
        title,
        specialty
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'doctor'),
        true,
        COALESCE(NEW.raw_user_meta_data->>'title', 'M.D.'),
        COALESCE(NEW.raw_user_meta_data->>'specialty', 'Internal Medicine & Pulmonology')
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created_staff ON auth.users;
CREATE TRIGGER on_auth_user_created_staff
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_staff_user();

-- ==============================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 14.1 ORGANIZATIONS RLS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "organizations_select_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_admin_insert_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_admin_update_policy" ON public.organizations;

CREATE POLICY "organizations_select_policy"
    ON public.organizations FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR (public.is_active_staff() AND id = public.current_staff_org_id())
    );

CREATE POLICY "organizations_admin_insert_policy"
    ON public.organizations FOR INSERT
    TO authenticated
    WITH CHECK (public.is_super_admin());

CREATE POLICY "organizations_admin_update_policy"
    ON public.organizations FOR UPDATE
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 14.2 STAFF PROFILES RLS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "staff_profiles_select_policy" ON public.staff_profiles;
DROP POLICY IF EXISTS "staff_profiles_self_update_policy" ON public.staff_profiles;
DROP POLICY IF EXISTS "staff_profiles_admin_update_policy" ON public.staff_profiles;
DROP POLICY IF EXISTS "staff_profiles_admin_insert_policy" ON public.staff_profiles;
DROP POLICY IF EXISTS "staff_profiles_admin_delete_policy" ON public.staff_profiles;

CREATE POLICY "staff_profiles_select_policy"
    ON public.staff_profiles FOR SELECT
    TO authenticated
    USING (
        auth.uid() = auth_user_id
        OR public.is_super_admin()
        OR (public.is_active_staff() AND is_active = TRUE)
    );

CREATE POLICY "staff_profiles_self_update_policy"
    ON public.staff_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = auth_user_id AND public.is_active_staff())
    WITH CHECK (
        auth.uid() = auth_user_id
        AND role = (SELECT s.role FROM public.staff_profiles s WHERE s.auth_user_id = auth.uid())
        AND auth_user_id = (SELECT s.auth_user_id FROM public.staff_profiles s WHERE s.auth_user_id = auth.uid())
        AND practitioner_id IS NOT DISTINCT FROM (SELECT s.practitioner_id FROM public.staff_profiles s WHERE s.auth_user_id = auth.uid())
        AND organization_id IS NOT DISTINCT FROM (SELECT s.organization_id FROM public.staff_profiles s WHERE s.auth_user_id = auth.uid())
        AND is_active = (SELECT s.is_active FROM public.staff_profiles s WHERE s.auth_user_id = auth.uid())
    );

CREATE POLICY "staff_profiles_admin_update_policy"
    ON public.staff_profiles FOR UPDATE
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "staff_profiles_admin_insert_policy"
    ON public.staff_profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 14.3 PROFILES (Legacy Compatibility) RLS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id
        OR public.is_super_admin()
        OR (public.is_active_staff() AND organization_id = public.current_staff_org_id())
    );

-- ------------------------------------------------------------------------------
-- 14.4 PATIENTS RLS
-- Scoped to clinic/organization boundary. Hard DELETE denied for all roles.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "patients_select_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_clinical_update_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_staff_demographic_update_policy" ON public.patients;

CREATE POLICY "patients_select_policy"
    ON public.patients FOR SELECT
    TO authenticated
    USING (
        public.is_active_staff()
        AND public.current_staff_org_id() IS NOT NULL
        AND organization_id IS NOT NULL
        AND organization_id = public.current_staff_org_id()
    );

CREATE POLICY "patients_insert_policy"
    ON public.patients FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_active_staff()
        AND public.current_staff_org_id() IS NOT NULL
        AND organization_id IS NOT NULL
        AND organization_id = public.current_staff_org_id()
    );

CREATE POLICY "patients_clinical_update_policy"
    ON public.patients FOR UPDATE
    TO authenticated
    USING (
        public.is_clinical_staff()
        AND public.current_staff_org_id() IS NOT NULL
        AND organization_id IS NOT NULL
        AND organization_id = public.current_staff_org_id()
    )
    WITH CHECK (
        public.is_clinical_staff()
        AND public.current_staff_org_id() IS NOT NULL
        AND organization_id IS NOT NULL
        AND organization_id = public.current_staff_org_id()
    );

CREATE POLICY "patients_staff_demographic_update_policy"
    ON public.patients FOR UPDATE
    TO authenticated
    USING (
        public.current_staff_role() = 'staff'
        AND public.current_staff_org_id() IS NOT NULL
        AND organization_id IS NOT NULL
        AND organization_id = public.current_staff_org_id()
    )
    WITH CHECK (
        public.current_staff_role() = 'staff'
        AND public.current_staff_org_id() IS NOT NULL
        AND organization_id IS NOT NULL
        AND organization_id = public.current_staff_org_id()
        AND personal_history IS NOT DISTINCT FROM (SELECT p.personal_history FROM public.patients p WHERE p.id = patients.id)
        AND family_history IS NOT DISTINCT FROM (SELECT p.family_history FROM public.patients p WHERE p.id = patients.id)
        AND past_medical_history IS NOT DISTINCT FROM (SELECT p.past_medical_history FROM public.patients p WHERE p.id = patients.id)
    );

-- HARD DELETE on public.patients is completely omitted/denied. Archiving via is_archived = true.

-- ------------------------------------------------------------------------------
-- 14.5 MEDICAL RECORDS RLS
-- Scoped via can_access_patient(patient_id). Hard DELETE denied for all roles.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "medical_records_select_policy" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_insert_policy" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_update_policy" ON public.medical_records;

CREATE POLICY "medical_records_select_policy"
    ON public.medical_records FOR SELECT
    TO authenticated
    USING (
        public.is_clinical_staff()
        AND public.can_access_patient(patient_id)
    );

CREATE POLICY "medical_records_insert_policy"
    ON public.medical_records FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_staff_role() IN ('super_admin', 'doctor')
        AND public.can_access_patient(patient_id)
    );

CREATE POLICY "medical_records_update_policy"
    ON public.medical_records FOR UPDATE
    TO authenticated
    USING (
        public.current_staff_role() IN ('super_admin', 'doctor')
        AND public.can_access_patient(patient_id)
    )
    WITH CHECK (
        public.current_staff_role() IN ('super_admin', 'doctor')
        AND public.can_access_patient(patient_id)
    );

-- HARD DELETE on public.medical_records is completely omitted/denied.

-- ------------------------------------------------------------------------------
-- 14.6 CLINICAL DRAWINGS RLS
-- Scoped via can_access_patient(patient_id). Hard DELETE denied for all roles.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "clinical_drawings_select_policy" ON public.clinical_drawings;
DROP POLICY IF EXISTS "clinical_drawings_insert_policy" ON public.clinical_drawings;
DROP POLICY IF EXISTS "clinical_drawings_update_policy" ON public.clinical_drawings;

CREATE POLICY "clinical_drawings_select_policy"
    ON public.clinical_drawings FOR SELECT
    TO authenticated
    USING (
        public.is_clinical_staff()
        AND public.can_access_patient(patient_id)
    );

CREATE POLICY "clinical_drawings_insert_policy"
    ON public.clinical_drawings FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_staff_role() IN ('super_admin', 'doctor')
        AND public.can_access_patient(patient_id)
    );

CREATE POLICY "clinical_drawings_update_policy"
    ON public.clinical_drawings FOR UPDATE
    TO authenticated
    USING (
        public.current_staff_role() IN ('super_admin', 'doctor')
        AND public.can_access_patient(patient_id)
    )
    WITH CHECK (
        public.current_staff_role() IN ('super_admin', 'doctor')
        AND public.can_access_patient(patient_id)
    );

-- HARD DELETE on public.clinical_drawings is completely omitted/denied.

-- ------------------------------------------------------------------------------
-- 14.7 AUDIT LOGS RLS
-- Read: super_admin (all) and doctors (own). Client INSERT/UPDATE/DELETE denied.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;

CREATE POLICY "audit_logs_select_policy"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR (public.is_doctor() AND user_id = auth.uid())
    );

-- ------------------------------------------------------------------------------
-- 14.8 STORAGE POLICIES FOR clinical-drawings BUCKET
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "clinical_drawings_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "clinical_drawings_storage_insert" ON storage.objects;

CREATE POLICY "clinical_drawings_storage_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'clinical-drawings' AND public.is_clinical_staff());

CREATE POLICY "clinical_drawings_storage_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'clinical-drawings' AND public.current_staff_role() IN ('super_admin', 'doctor'));

-- ==============================================================================
-- 15. REPLICA IDENTITY (Full Row Data for Realtime UPDATE Events)
-- ==============================================================================
ALTER TABLE public.patients REPLICA IDENTITY FULL;
ALTER TABLE public.medical_records REPLICA IDENTITY FULL;
ALTER TABLE public.clinical_drawings REPLICA IDENTITY FULL;

-- ==============================================================================
-- 16. REALTIME PUBLICATION CONFIGURATION
-- Configured AFTER base tables exist. Exposes ONLY patients, medical_records, clinical_drawings.
-- audit_logs, staff_profiles, auth.users are strictly excluded.
-- ==============================================================================
DO $$
BEGIN
    -- Ensure publication exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    -- Add required tables to publication if not already member
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'patients'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'medical_records'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_records;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'clinical_drawings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.clinical_drawings;
    END IF;
END $$;

COMMIT;
