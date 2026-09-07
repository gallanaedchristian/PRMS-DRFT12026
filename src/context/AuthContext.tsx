import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DoctorProfile, StaffProfile, StaffRole } from '../types';
import { getSupabase } from '../lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

const ALLOWED_STAFF_ROLES: StaffRole[] = ['super_admin', 'doctor', 'nurse', 'staff'];

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
  signInWithPassword: (email: string, password: string) => Promise<AuthResponse>;
  login: (email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  resetPasswordForEmail: (email: string) => Promise<AuthResponse>;
  updateUserPassword: (newPassword: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updated: Partial<DoctorProfile>) => void;
  clearAuthError: () => void;
  setIsRecoveryMode: (isRecovery: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Loads and verifies that the authenticated user has an active, valid staff profile in public.staff_profiles.
 * Enforces:
 * 1. Profile existence.
 * 2. Disabled account rule (is_active must be true).
 * 3. Role authorization check (super_admin, doctor, nurse, staff).
 */
async function verifyStaffProfile(
  supabase: SupabaseClient,
  authUserId: string,
  userEmail?: string
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
          full_name: legacyRes.data.full_name || 'Medical Practitioner',
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

    const staffRecord: StaffProfile = {
      id: staff.id,
      auth_user_id: staff.auth_user_id || authUserId,
      organization_id: staff.organization_id || null,
      full_name: staff.full_name || 'Healthcare Practitioner',
      email: staff.email || userEmail || '',
      role,
      practitioner_id: staff.practitioner_id || null,
      is_active: true,
      created_at: staff.created_at || new Date().toISOString(),
      updated_at: staff.updated_at || new Date().toISOString(),
      title: staff.title || (role === 'doctor' ? 'M.D.' : role.toUpperCase()),
      specialty: staff.specialty || (role === 'doctor' ? 'Clinical Practice' : 'Clinical Support'),
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
            session.user.email
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
          session.user.email
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
      const msg = 'Supabase client is not configured. Please provide your Supabase URL and Anon Key.';
      setAuthError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
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
        data.user.email
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

  return (
    <AuthContext.Provider
      value={{
        doctor,
        staffProfile,
        isAuthenticated: Boolean(doctor && doctor.is_active !== false),
        isLoading,
        authError,
        isRecoveryMode,
        signInWithPassword,
        login,
        signIn,
        resetPasswordForEmail,
        updateUserPassword,
        signOut,
        logout,
        updateProfile,
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
