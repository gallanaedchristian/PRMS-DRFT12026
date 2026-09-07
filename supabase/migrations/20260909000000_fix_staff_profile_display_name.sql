-- ==============================================================================
-- Migration: 20260909000000_fix_staff_profile_display_name.sql
-- Fix: Remove email-prefix derivation from public.staff_profiles
-- ==============================================================================

-- 1. Replace handle_new_staff_user() trigger function
-- Stop deriving display name from split_part(NEW.email, '@', 1).
-- Use raw_user_meta_data->>'full_name' if provided, otherwise default to 'Clinical User'.
CREATE OR REPLACE FUNCTION public.handle_new_staff_user()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name TEXT;
    v_role TEXT;
    v_title TEXT;
    v_specialty TEXT;
BEGIN
    -- Extract legitimate metadata values without email prefix fallbacks
    v_full_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), '');
    IF v_full_name IS NULL THEN
        v_full_name := 'Clinical User';
    END IF;

    v_role := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''), 'doctor');
    v_title := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'title'), ''), 'M.D.');
    v_specialty := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'specialty'), ''), 'Internal Medicine & Pulmonology');

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
        v_full_name,
        v_role,
        true,
        v_title,
        v_specialty
    )
    ON CONFLICT (auth_user_id) DO UPDATE
    SET 
        -- If existing record had an email-prefix artifact or empty name, update it
        full_name = CASE 
            WHEN public.staff_profiles.full_name IS NULL 
              OR TRIM(public.staff_profiles.full_name) = '' 
              OR public.staff_profiles.full_name = split_part(public.staff_profiles.email, '@', 1) 
            THEN EXCLUDED.full_name 
            ELSE public.staff_profiles.full_name 
        END,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Clean up any existing staff profiles where full_name was previously set to email-prefix
UPDATE public.staff_profiles sp
SET full_name = COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''), 'Clinical User'),
    updated_at = NOW()
FROM auth.users u
WHERE sp.auth_user_id = u.id
  AND (
    sp.full_name IS NULL 
    OR TRIM(sp.full_name) = '' 
    OR sp.full_name = split_part(sp.email, '@', 1)
  );
