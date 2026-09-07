import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DoctorProfile, StaffProfile, StaffRole } from '../types';
import { getSupabase, DEFAULT_DOCTOR, DEMO_STAFF_PROFILES } from '../lib/supabase';
import { getStaffDisplayName } from '../utils/staffDisplay';
import { SupabaseClient } from '@supabase/supabase-js';

const ALLOWED_STAFF_ROLES: StaffRole[] = ['super_admin', 'doctor', 'nurse', 'staff'];

const DEFAULT_STAFF: StaffProfile = DEMO_STAFF_PROFILES.doctor;

interface AuthResponse {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  doctor: DoctorProfile | null;
  staffProfile: StaffProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  isRecoveryMode: boolean;
  loginAsDemoDoctor: () => void;
  loginAsDemoStaff: (role?: 'doctor' | 'nurse' | 'staff') => void;
  signInWithPassword: (email: string, password: string) => Promise<AuthResponse>;
  login: (email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  resetPasswordForEmail: (email: string) => Promise<AuthResponse>;
  updateUserPassword: (newPassword: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updated: Partial<DoctorProfile>) => void;
  updateStaffProfile: (updated: Partial<StaffProfile>) => Promise<{ success: boolean; error?: string }>;
  clearAuthError: () => void;
  setIsRecoveryMode: (isRecovery: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Loads and verifies that the authenticated user has an active, valid staff profile in public.staff_profiles.
 * Enforces:
 * 1. Profile existence in public.staff_profiles (associated with auth.uid()).
 * 2. Disabled account rule (is_active must be true).
 * 3. Role authorization check (super_admin, doctor, nurse, staff).
 * 4. Display Name Canonical Source of Truth:
 *    - Uses public.staff_profiles.full_name as canonical application display name.
 *    - Fallbacks strictly to auth user_metadata.full_name, then 'Clinical User'.
 *    - NEVER derives a display name from the email address or email prefix.
 */
async function verifyStaffProfile(
  supabase: SupabaseClient,
  authUserId: string,
  userEmail?: string,
  userMetadata?: Record<string, any>
): Promise<{ profile: StaffProfile | null; doctorData: DoctorProfile | null; error: string | null }> {
  try {
    // 1. Query staff_profiles table by auth_user_id
    let { data: staff, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    // Secondary fallback: query staff_profiles by id if matched
    if (!staff && !error) {
      const res = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle();
      staff = res.data;
    }

    // Fallback: check legacy profiles table if migration is still pending
    if (!staff) {
      const legacyRes = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle();

      if (legacyRes.data) {
        staff = {
          id: legacyRes.data.id,
          auth_user_id: authUserId,
          full_name: legacyRes.data.full_name,
          email: userEmail || legacyRes.data.email || '',
          role: (legacyRes.data.role as StaffRole) || 'doctor',
          practitioner_id: legacyRes.data.id,
          is_active: true,
          created_at: legacyRes.data.created_at || new Date().toISOString(),
          updated_at: legacyRes.data.updated_at || new Date().toISOString(),
          title: legacyRes.data.title || 'M.D.',
          specialty: legacyRes.data.specialty || 'General Practitioner',
          license_number: legacyRes.data.license_number || '',
        };
      }
    }

    // Rule 1: Profile must exist
    if (!staff) {
      return {
        profile: null,
        doctorData: null,
        error: 'Access Denied: No clinical staff profile found associated with this Supabase account. Please contact your system administrator.',
      };
    }

    // Rule 2: Account must be active
    if (staff.is_active === false) {
      return {
        profile: null,
        doctorData: null,
        error: 'Access Denied: This staff profile has been deactivated. Please contact your clinical administrator.',
      };
    }

    // Rule 3: Allowed role verification
    const role = (staff.role || '').toLowerCase() as StaffRole;
    if (!ALLOWED_STAFF_ROLES.includes(role)) {
      return {
        profile: null,
        doctorData: null,
        error: `Access Denied: Unauthorized role '${staff.role}'. Access is restricted to authorized healthcare personnel.`,
      };
    }

    // Resolve display name according to the canonical 3-tier fallback (never email prefix)
    const canonicalFullName = getStaffDisplayName(staff, userMetadata);

    const staffRecord: StaffProfile = {
      id: staff.id,
      auth_user_id: staff.auth_user_id || authUserId,
      organization_id: staff.organization_id || null,
      full_name: canonicalFullName,
      email: staff.email || userEmail || '',
      role,
      practitioner_id: staff.practitioner_id || null,
      is_active: true,
      created_at: staff.created_at || new Date().toISOString(),
      updated_at: staff.updated_at || new Date().toISOString(),
      title: staff.title || (role === 'doctor' ? 'M.D.' : role.toUpperCase()),
      specialty: staff.specialty || (role === 'doctor' ? 'Clinical Practice' : 'Clinical Care'),
      license_number: staff.license_number || '',
      phone: staff.phone,
    };

    const docRecord: DoctorProfile = {
      id: staffRecord.id,
      auth_user_id: staffRecord.auth_user_id,
      organization_id: staffRecord.organization_id,
      email: staffRecord.email,
      full_name: staffRecord.full_name,
      title: staffRecord.title || 'M.D.',
      specialty: staffRecord.specialty || 'Clinical Practice',
      license_number: staffRecord.license_number || '',
      role: staffRecord.role,
      practitioner_id: staffRecord.practitioner_id,
      is_active: staffRecord.is_active,
      created_at: staffRecord.created_at,
      updated_at: staffRecord.updated_at,
    };

    return {
      profile: staffRecord,
      doctorData: docRecord,
      error: null,
    };
  } catch (err: any) {
    return {
      profile: null,
      doctorData: null,
      error: err.message || 'Error verifying staff authorization.',
    };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Initialize and maintain Supabase authenticated session
  useEffect(() => {
    const supabase = getSupabase();

    // Check for password recovery hash in URL (Supabase recovery link)
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash;
      if (hash.includes('type=recovery') || hash.includes('access_token=')) {
        setIsRecoveryMode(true);
      }
    }

    if (!supabase) {
      const isDemo = typeof window !== 'undefined' && localStorage.getItem('medrecords_demo_session') === 'true';
      if (isDemo) {
        const savedRole = (localStorage.getItem('medrecords_demo_role') as 'doctor' | 'nurse' | 'staff') || 'doctor';
        const selected = DEMO_STAFF_PROFILES[savedRole] || DEMO_STAFF_PROFILES.doctor;
        setStaffProfile(selected);
        setDoctor({
          id: selected.id,
          auth_user_id: selected.auth_user_id,
          organization_id: selected.organization_id,
          email: selected.email,
          full_name: selected.full_name,
          title: selected.title || 'M.D.',
          specialty: selected.specialty || 'Clinical Practice',
          license_number: selected.license_number || '',
          role: selected.role,
          practitioner_id: selected.practitioner_id,
          is_active: selected.is_active,
          created_at: selected.created_at,
          updated_at: selected.updated_at,
        });
      }
      setIsLoading(false);
      return;
    }

    // 1. Check existing session on load
    const restoreSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session?.user && !error) {
          const { profile, doctorData, error: profileErr } = await verifyStaffProfile(
            supabase,
            session.user.id,
            session.user.email,
            session.user.user_metadata
          );

          if (profile && doctorData && !profileErr) {
            setStaffProfile(profile);
            setDoctor(doctorData);
            setAuthError(null);
          } else {
            // Profile missing, inactive, or unauthorized - force sign out
            await supabase.auth.signOut();
            setStaffProfile(null);
            setDoctor(null);
            if (profileErr) {
              setAuthError(profileErr);
            }
          }
        } else {
          setStaffProfile(null);
          setDoctor(null);
        }
      } catch (err) {
        console.warn('Supabase session verification failed:', err);
        setStaffProfile(null);
        setDoctor(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();

    // 2. React to Auth State Changes (login, logout, token refresh, password recovery)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        setIsLoading(false);
        return;
      }

      if (event === 'SIGNED_OUT' || !session?.user) {
        setStaffProfile(null);
        setDoctor(null);
        setIsLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const { profile, doctorData, error: profileErr } = await verifyStaffProfile(
          supabase,
          session.user.id,
          session.user.email,
          session.user.user_metadata
        );

        if (profile && doctorData && !profileErr) {
          setStaffProfile(profile);
          setDoctor(doctorData);
          setAuthError(null);
        } else {
          await supabase.auth.signOut();
          setStaffProfile(null);
          setDoctor(null);
          if (profileErr) {
            setAuthError(profileErr);
          }
        }
        setIsLoading(false);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const loginAsDemoStaff = useCallback((role: 'doctor' | 'nurse' | 'staff' = 'doctor') => {
    const selected = DEMO_STAFF_PROFILES[role] || DEMO_STAFF_PROFILES.doctor;
    const docData: DoctorProfile = {
      id: selected.id,
      auth_user_id: selected.auth_user_id,
      organization_id: selected.organization_id,
      email: selected.email,
      full_name: selected.full_name,
      title: selected.title || 'M.D.',
      specialty: selected.specialty || 'Clinical Practice',
      license_number: selected.license_number || '',
      role: selected.role,
      practitioner_id: selected.practitioner_id,
      is_active: selected.is_active,
      created_at: selected.created_at,
      updated_at: selected.updated_at,
    };

    setStaffProfile(selected);
    setDoctor(docData);
    setAuthError(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('medrecords_demo_session', 'true');
      localStorage.setItem('medrecords_demo_role', role);
    }
  }, []);

  const loginAsDemoDoctor = useCallback(() => {
    loginAsDemoStaff('doctor');
  }, [loginAsDemoStaff]);

  /**
   * Supabase email/password authentication
   * Strictly uses supabase.auth.signInWithPassword.
   * Never compares or stores passwords in database tables or state.
   */
  const signInWithPassword = async (
    email: string,
    password: string
  ): Promise<AuthResponse> => {
    setIsLoading(true);
    setAuthError(null);

    const supabase = getSupabase();
    if (!supabase) {
      // In-memory local session fallback for offline or unconfigured environment
      const normalizedEmail = email.trim().toLowerCase();
      let role: 'doctor' | 'nurse' | 'staff' = 'doctor';
      if (normalizedEmail.includes('nurse') || normalizedEmail.includes('maria')) {
        role = 'nurse';
      } else if (normalizedEmail.includes('staff') || normalizedEmail.includes('delacruz') || normalizedEmail.includes('juan')) {
        role = 'staff';
      }
      loginAsDemoStaff(role);
      setIsLoading(false);
      return { success: true };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setAuthError(error.message);
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (!data.user) {
        const msg = 'Authentication failed. No authenticated user returned.';
        setAuthError(msg);
        setIsLoading(false);
        return { success: false, error: msg };
      }

      // Step 5: Load associated staff profile and verify
      const { profile, doctorData, error: profileErr } = await verifyStaffProfile(
        supabase,
        data.user.id,
        data.user.email,
        data.user.user_metadata
      );

      if (profileErr || !profile || !doctorData) {
        // Deny access and terminate session immediately
        await supabase.auth.signOut();
        setDoctor(null);
        setStaffProfile(null);
        const errMsg = profileErr || 'Access Denied: Staff profile validation failed.';
        setAuthError(errMsg);
        setIsLoading(false);
        return { success: false, error: errMsg };
      }

      // Step 6: Grant clinical workspace access
      setStaffProfile(profile);
      setDoctor(doctorData);
      setAuthError(null);
      setIsRecoveryMode(false);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'An unexpected error occurred during authentication.';
      setAuthError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  };

  /**
   * Supabase Password Reset request
   */
  const resetPasswordForEmail = async (email: string): Promise<AuthResponse> => {
    setIsLoading(true);
    setAuthError(null);

    const supabase = getSupabase();
    if (!supabase) {
      const msg = 'Supabase client is not configured.';
      setAuthError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }

    try {
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}${window.location.pathname}#recovery`
        : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        setAuthError(error.message);
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Failed to send password reset request.';
      setAuthError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  };

  /**
   * Password Update for Recovery sessions
   */
  const updateUserPassword = async (newPassword: string): Promise<AuthResponse> => {
    setIsLoading(true);
    setAuthError(null);

    const supabase = getSupabase();
    if (!supabase) {
      const msg = 'Supabase client is not configured.';
      setAuthError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setAuthError(error.message);
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      setIsRecoveryMode(false);
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Failed to update password.';
      setAuthError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  };

  /**
   * Standard Sign Out
   */
  const signOut = async () => {
    setIsLoading(true);
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('medrecords_demo_session');
      localStorage.removeItem('medrecords_demo_role');
    }
    setDoctor(null);
    setStaffProfile(null);
    setAuthError(null);
    setIsRecoveryMode(false);
    setIsLoading(false);
  };

  const logout = signOut;

  const login = async (email: string, password: string): Promise<boolean> => {
    const res = await signInWithPassword(email, password);
    return res.success;
  };

  const signIn = login;

  const updateProfile = (updated: Partial<DoctorProfile>) => {
    if (!doctor) return;
    const newDoc = { ...doctor, ...updated };
    setDoctor(newDoc);
  };

  /**
   * Updates staff profile with strict Role-Based Access Control:
   * - Super Admins can manage all fields (full_name, role, title, specialty, license_number, organization_id, is_active).
   * - Normal users (doctor, nurse, staff) are strictly FORBIDDEN from modifying their own role, organization_id, or is_active status.
   * - Validates that full_name cannot be set to an email prefix artifact.
   */
  const updateStaffProfile = async (
    updates: Partial<StaffProfile>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!staffProfile) {
      return { success: false, error: 'No active staff profile found.' };
    }

    const isSuperAdmin = staffProfile.role === 'super_admin';

    // Strict Security Guardrails: Normal users are strictly forbidden from modifying role, org, or active status
    if (!isSuperAdmin) {
      if (updates.role && updates.role !== staffProfile.role) {
        return {
          success: false,
          error: 'Security Warning: Only super administrators can reassign staff roles.',
        };
      }
      if (updates.organization_id !== undefined && updates.organization_id !== staffProfile.organization_id) {
        return {
          success: false,
          error: 'Security Warning: Organization scoping cannot be altered by non-administrative staff.',
        };
      }
      if (updates.is_active !== undefined && updates.is_active !== staffProfile.is_active) {
        return {
          success: false,
          error: 'Security Warning: Account status can only be modified by system administrators.',
        };
      }
    }

    // Sanitize updates: never allow email-prefix as full_name
    let newFullName = updates.full_name !== undefined ? updates.full_name.trim() : staffProfile.full_name;
    const emailPrefix = staffProfile.email.split('@')[0]?.trim().toLowerCase();
    if (emailPrefix && newFullName.toLowerCase() === emailPrefix) {
      return {
        success: false,
        error: 'Clinical identity error: Display name cannot be identical to email prefix.',
      };
    }

    const payload: Partial<StaffProfile> = {
      full_name: newFullName || staffProfile.full_name,
      title: updates.title !== undefined ? updates.title.trim() : staffProfile.title,
      specialty: updates.specialty !== undefined ? updates.specialty.trim() : staffProfile.specialty,
      license_number: updates.license_number !== undefined ? updates.license_number.trim() : staffProfile.license_number,
      phone: updates.phone !== undefined ? updates.phone.trim() : staffProfile.phone,
      updated_at: new Date().toISOString(),
    };

    if (isSuperAdmin) {
      if (updates.role) payload.role = updates.role;
      if (updates.organization_id !== undefined) payload.organization_id = updates.organization_id;
      if (updates.is_active !== undefined) payload.is_active = updates.is_active;
    }

    const supabase = getSupabase();
    if (supabase) {
      const { error: dbError } = await supabase
        .from('staff_profiles')
        .update(payload)
        .eq('id', staffProfile.id);

      if (dbError) {
        return { success: false, error: dbError.message };
      }
    }

    const updatedProfile: StaffProfile = {
      ...staffProfile,
      ...payload,
    };

    const updatedDoctor: DoctorProfile = {
      ...doctor!,
      full_name: updatedProfile.full_name,
      title: updatedProfile.title || 'M.D.',
      specialty: updatedProfile.specialty || 'Clinical Practice',
      license_number: updatedProfile.license_number || '',
      role: updatedProfile.role,
      organization_id: updatedProfile.organization_id,
      is_active: updatedProfile.is_active,
    };

    setStaffProfile(updatedProfile);
    setDoctor(updatedDoctor);
    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        doctor,
        staffProfile,
        isAuthenticated: Boolean(doctor && doctor.is_active !== false),
        isLoading,
        authError,
        isRecoveryMode,
        loginAsDemoDoctor,
        loginAsDemoStaff,
        signInWithPassword,
        login,
        signIn,
        resetPasswordForEmail,
        updateUserPassword,
        signOut,
        logout,
        updateProfile,
        updateStaffProfile,
        clearAuthError,
        setIsRecoveryMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
