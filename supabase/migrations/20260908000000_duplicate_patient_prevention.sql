-- ==============================================================================
-- Migration: Duplicate Patient Prevention & Demographic Protection
-- Description:
--   1. Adds optional date_of_birth and email columns to public.patients
--   2. Adds performance & demographic lookup indexes
--   3. Adds check_patient_duplicates_safe RPC for pre-save duplicate screening
--   4. Adds register_patient_safe atomic RPC with pg_advisory_xact_lock
--      concurrency control, organization boundary isolation, and audit logging
-- ==============================================================================

-- 1. Schema Extensions for Demographics & Contacts
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Scoped Demographic and Functional Indexes
CREATE INDEX IF NOT EXISTS idx_patients_org_name_dob 
    ON public.patients (organization_id, lower(trim(name)), date_of_birth) 
    WHERE is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_patients_org_name_age_sex 
    ON public.patients (organization_id, lower(trim(name)), age, sex) 
    WHERE is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_patients_org_phone 
    ON public.patients (organization_id, phone) 
    WHERE is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_patients_org_email 
    ON public.patients (organization_id, email) 
    WHERE is_archived = FALSE;

-- 3. Update record_audit_event to permit DUPLICATE_PATIENT_BLOCKED
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
        'PASSWORD_UPDATED',
        'DUPLICATE_PATIENT_BLOCKED'
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

    INSERT INTO public.audit_logs (
        user_id,
        user_name,
        action,
        table_name,
        record_id,
        metadata,
        created_at
    ) VALUES (
        v_user_id,
        COALESCE(v_user_name, 'Staff User'),
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

REVOKE EXECUTE ON FUNCTION public.record_audit_event(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_audit_event(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- 4. Screen for potential duplicates within caller's organization
CREATE OR REPLACE FUNCTION public.check_patient_duplicates_safe(
    p_name TEXT,
    p_date_of_birth DATE DEFAULT NULL,
    p_age INTEGER DEFAULT NULL,
    p_sex TEXT DEFAULT 'F',
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_org_id UUID;
    v_norm_name TEXT;
    v_norm_phone TEXT;
    v_norm_email TEXT;
    v_strong_duplicates JSONB := '[]'::jsonb;
    v_weak_matches JSONB := '[]'::jsonb;
    v_rec RECORD;
BEGIN
    IF v_user_id IS NULL OR NOT public.is_active_staff() THEN
        RAISE EXCEPTION 'Access Denied: Inactive or unauthorized staff member';
    END IF;

    v_org_id := public.current_staff_org_id();
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: No active organization assignment';
    END IF;

    IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
        RETURN jsonb_build_object('strong_duplicates', '[]'::jsonb, 'weak_matches', '[]'::jsonb);
    END IF;

    v_norm_name := lower(regexp_replace(trim(p_name), '\s+', ' ', 'g'));
    v_norm_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
    IF starts_with(v_norm_phone, '63') AND length(v_norm_phone) = 12 AND substr(v_norm_phone, 3, 1) = '9' THEN
        v_norm_phone := '0' || substr(v_norm_phone, 3);
    ELSIF length(v_norm_phone) = 10 AND starts_with(v_norm_phone, '9') THEN
        v_norm_phone := '0' || v_norm_phone;
    END IF;

    v_norm_email := lower(trim(COALESCE(p_email, '')));

    -- Query existing active patients within THIS organization ONLY
    FOR v_rec IN 
        SELECT 
            id, 
            patient_number, 
            name, 
            age, 
            sex, 
            date_of_birth, 
            phone, 
            email
        FROM public.patients
        WHERE organization_id = v_org_id
          AND is_archived = FALSE
    LOOP
        DECLARE
            v_exist_norm_name TEXT := lower(regexp_replace(trim(v_rec.name), '\s+', ' ', 'g'));
            v_exist_clean_name TEXT := lower(regexp_replace(replace(trim(v_rec.name), ',', ' '), '\s+', ' ', 'g'));
            v_cand_clean_name TEXT := lower(regexp_replace(replace(trim(p_name), ',', ' '), '\s+', ' ', 'g'));
            v_names_match BOOLEAN := (v_exist_norm_name = v_norm_name OR v_exist_clean_name = v_cand_clean_name);
            v_exist_norm_phone TEXT;
            v_exist_norm_email TEXT := lower(trim(COALESCE(v_rec.email, '')));
            v_is_strong BOOLEAN := FALSE;
            v_strong_reason TEXT := '';
            v_is_weak BOOLEAN := FALSE;
            v_weak_reason TEXT := '';
            v_weak_type TEXT := '';
        BEGIN
            v_exist_norm_phone := regexp_replace(COALESCE(v_rec.phone, ''), '\D', '', 'g');
            IF starts_with(v_exist_norm_phone, '63') AND length(v_exist_norm_phone) = 12 AND substr(v_exist_norm_phone, 3, 1) = '9' THEN
                v_exist_norm_phone := '0' || substr(v_exist_norm_phone, 3);
            ELSIF length(v_exist_norm_phone) = 10 AND starts_with(v_exist_norm_phone, '9') THEN
                v_exist_norm_phone := '0' || v_exist_norm_phone;
            END IF;

            -- Check strong duplicate
            IF v_names_match THEN
                IF p_date_of_birth IS NOT NULL AND v_rec.date_of_birth IS NOT NULL THEN
                    IF p_date_of_birth = v_rec.date_of_birth THEN
                        v_is_strong := TRUE;
                        v_strong_reason := 'A patient with the same name and date of birth already exists.';
                    END IF;
                ELSE
                    -- Fallback when DOB missing on either record
                    IF v_rec.sex = p_sex AND p_age IS NOT NULL AND v_rec.age IS NOT NULL AND abs(v_rec.age - p_age) <= 1 THEN
                        v_is_strong := TRUE;
                        v_strong_reason := 'A patient with the same name, age, and sex already exists.';
                    ELSIF length(v_norm_phone) >= 7 AND v_norm_phone = v_exist_norm_phone THEN
                        v_is_strong := TRUE;
                        v_strong_reason := 'A patient with the same name and phone number already exists.';
                    END IF;
                END IF;
            END IF;

            IF v_is_strong THEN
                v_strong_duplicates := v_strong_duplicates || jsonb_build_object(
                    'existing_patient_id', v_rec.id,
                    'patient_number', v_rec.patient_number,
                    'name', v_rec.name,
                    'age', v_rec.age,
                    'sex', v_rec.sex,
                    'date_of_birth', v_rec.date_of_birth,
                    'reason', v_strong_reason
                );
            ELSE
                -- Check weak match
                IF length(v_norm_phone) >= 7 AND v_norm_phone = v_exist_norm_phone THEN
                    v_is_weak := TRUE;
                    v_weak_type := 'WEAK_PHONE';
                    v_weak_reason := 'Another patient uses this phone number. Family members may share contact details.';
                ELSIF length(v_norm_email) >= 5 AND v_norm_email = v_exist_norm_email THEN
                    v_is_weak := TRUE;
                    v_weak_type := 'WEAK_EMAIL';
                    v_weak_reason := 'Another patient uses this email address. Family members may share contact details.';
                END IF;

                IF v_is_weak THEN
                    v_weak_matches := v_weak_matches || jsonb_build_object(
                        'existing_patient_id', v_rec.id,
                        'patient_number', v_rec.patient_number,
                        'name', v_rec.name,
                        'match_type', v_weak_type,
                        'reason', v_weak_reason
                    );
                END IF;
            END IF;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'strong_duplicates', v_strong_duplicates,
        'weak_matches', v_weak_matches
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.check_patient_duplicates_safe FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_patient_duplicates_safe TO authenticated;

-- 5. Atomic Patient Registration with Transaction Advisory Locking & Server-side Validation
CREATE OR REPLACE FUNCTION public.register_patient_safe(
    p_patient_number TEXT DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_age INTEGER DEFAULT NULL,
    p_date_of_birth DATE DEFAULT NULL,
    p_sex TEXT DEFAULT 'F',
    p_status TEXT DEFAULT 'Single',
    p_religion TEXT DEFAULT 'RC',
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_personal_history TEXT DEFAULT NULL,
    p_family_history TEXT DEFAULT NULL,
    p_past_medical_history TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_org_id UUID;
    v_user_name TEXT;
    v_norm_name TEXT;
    v_existing_id UUID;
    v_existing_patient_number TEXT;
    v_existing_name TEXT;
    v_final_patient_number TEXT;
    v_next_val BIGINT;
    v_lock_key BIGINT;
    v_created_row public.patients%ROWTYPE;
BEGIN
    -- 1. Verify caller is authenticated active clinical staff
    IF v_user_id IS NULL OR NOT public.is_active_staff() THEN
        RAISE EXCEPTION 'Access Denied: Inactive or unauthorized staff member';
    END IF;

    -- 2. Derive trusted organization ID from staff profile (never trust client)
    v_org_id := public.current_staff_org_id();
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: User has no active organization assignment';
    END IF;

    -- 3. Input validation
    IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
        RAISE EXCEPTION 'Invalid Input: Patient name is required';
    END IF;

    -- 4. Normalization
    v_norm_name := lower(regexp_replace(trim(p_name), '\s+', ' ', 'g'));

    -- 5. Advisory Transaction Locking (Organization-Scoped)
    -- Prevents two concurrent requests from creating identical patients simultaneously
    v_lock_key := ('x' || substr(md5(v_org_id::text || ':' || v_norm_name || ':' || COALESCE(p_date_of_birth::text, p_age::text, '')), 1, 15))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 6. Check for strong duplicate in caller's organization
    SELECT id, patient_number, name
    INTO v_existing_id, v_existing_patient_number, v_existing_name
    FROM public.patients
    WHERE organization_id = v_org_id
      AND is_archived = FALSE
      AND (
          lower(regexp_replace(trim(name), '\s+', ' ', 'g')) = v_norm_name
          OR
          lower(regexp_replace(replace(trim(name), ',', ' '), '\s+', ' ', 'g')) = lower(regexp_replace(replace(trim(p_name), ',', ' '), '\s+', ' ', 'g'))
      )
      AND (
          (p_date_of_birth IS NOT NULL AND date_of_birth IS NOT NULL AND date_of_birth = p_date_of_birth)
          OR
          (
              (p_date_of_birth IS NULL OR date_of_birth IS NULL)
              AND sex = p_sex
              AND p_age IS NOT NULL
              AND age IS NOT NULL
              AND abs(age - p_age) <= 1
          )
      )
    LIMIT 1;

    -- 7. Block strong duplicates & record audit event
    IF v_existing_id IS NOT NULL THEN
        SELECT full_name INTO v_user_name FROM public.staff_profiles WHERE auth_user_id = v_user_id;

        INSERT INTO public.audit_logs (
            user_id,
            user_name,
            action,
            table_name,
            record_id,
            metadata,
            created_at
        ) VALUES (
            v_user_id,
            COALESCE(v_user_name, 'Staff Member'),
            'DUPLICATE_PATIENT_BLOCKED',
            'patients',
            v_existing_id::text,
            jsonb_build_object(
                'existing_patient_id', v_existing_id,
                'existing_patient_number', v_existing_patient_number,
                'attempted_name', p_name,
                'attempted_dob', p_date_of_birth,
                'attempted_age', p_age
            ),
            timezone('utc'::text, now())
        );

        -- Structured duplicate response (no confidential medical data exposed)
        RETURN jsonb_build_object(
            'success', false,
            'code', 'DUPLICATE_PATIENT',
            'message', 'A patient with the same name and demographic details already exists in this organization.',
            'existing_patient_id', v_existing_id,
            'patient_number', v_existing_patient_number,
            'name', v_existing_name
        );
    END IF;

    -- 8. Patient ID generation: preserve requested or generate sequentially
    IF p_patient_number IS NOT NULL AND length(trim(p_patient_number)) > 0 THEN
        v_final_patient_number := trim(p_patient_number);
    ELSE
        SELECT count(*) + 171 INTO v_next_val FROM public.patients WHERE organization_id = v_org_id;
        v_final_patient_number := 'P-' || lpad(v_next_val::text, 5, '0');
        WHILE EXISTS (SELECT 1 FROM public.patients WHERE patient_number = v_final_patient_number) LOOP
            v_next_val := v_next_val + 1;
            v_final_patient_number := 'P-' || lpad(v_next_val::text, 5, '0');
        END LOOP;
    END IF;

    -- 9. Insert new patient record
    INSERT INTO public.patients (
        organization_id,
        patient_number,
        name,
        age,
        date_of_birth,
        sex,
        status,
        religion,
        phone,
        email,
        address,
        personal_history,
        family_history,
        past_medical_history,
        is_archived,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        v_org_id,
        v_final_patient_number,
        trim(p_name),
        p_age,
        p_date_of_birth,
        p_sex,
        COALESCE(p_status, 'Single'),
        COALESCE(p_religion, 'RC'),
        trim(p_phone),
        lower(trim(p_email)),
        trim(p_address),
        trim(p_personal_history),
        trim(p_family_history),
        trim(p_past_medical_history),
        FALSE,
        v_user_id,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    RETURNING * INTO v_created_row;

    -- 10. Audit log for patient creation
    SELECT full_name INTO v_user_name FROM public.staff_profiles WHERE auth_user_id = v_user_id;
    INSERT INTO public.audit_logs (
        user_id,
        user_name,
        action,
        table_name,
        record_id,
        metadata,
        created_at
    ) VALUES (
        v_user_id,
        COALESCE(v_user_name, 'Staff Member'),
        'PATIENT_CREATED',
        'patients',
        v_created_row.id::text,
        jsonb_build_object(
            'patient_number', v_created_row.patient_number,
            'name', v_created_row.name
        ),
        timezone('utc'::text, now())
    );

    RETURN jsonb_build_object(
        'success', true,
        'patient', to_jsonb(v_created_row)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.register_patient_safe FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_patient_safe TO authenticated;
