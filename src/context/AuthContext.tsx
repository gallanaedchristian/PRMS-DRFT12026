import React, { createContext, useContext, useState, useEffect } from 'react';
import { DoctorProfile } from '../types';
import { getSupabase, DEFAULT_DOCTOR } from '../lib/supabase';

interface AuthContextType {
  doctor: DoctorProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  loginDemo: () => void;
  loginWithPasscode: (passcode: string) => boolean;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updated: Partial<DoctorProfile>) => void;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  useEffect(() => {
    // Check saved session
    const initAuth = async () => {
      setIsLoading(true);
      const supabase = getSupabase();

      if (supabase) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (session?.user && !error) {
            // Fetch profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              setDoctor({
                id: profile.id,
                email: session.user.email || profile.email || 'doctor@medrecords.cloud',
                full_name: profile.full_name || 'Dr. Physician',
                title: profile.title || 'M.D.',
                specialty: profile.specialty || 'General Practitioner',
                license_number: profile.license_number || '',
                role: profile.role || 'doctor',
                created_at: profile.created_at || new Date().toISOString(),
              });
              setIsDemoMode(false);
              setIsLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Supabase auth session fetch failed, checking local session:', err);
        }
      }

      // Check local storage for remembered session
      const savedDoc = localStorage.getItem('medrecords_active_doctor');
      if (savedDoc) {
        try {
          const parsed = JSON.parse(savedDoc);
          setDoctor(parsed);
          setIsDemoMode(true);
        } catch {
          setDoctor(null);
        }
      } else {
        setDoctor(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, remember: boolean = true): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const doc: DoctorProfile = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: profile?.full_name || email.split('@')[0] || 'Dr. Physician',
            title: profile?.title || 'M.D.',
            specialty: profile?.specialty || 'General Practitioner',
            license_number: profile?.license_number || 'PRC-VERIFIED',
            role: (profile?.role as any) || 'doctor',
            created_at: data.user.created_at || new Date().toISOString(),
          };

          setDoctor(doc);
          setIsDemoMode(false);
          if (remember) {
            localStorage.setItem('medrecords_active_doctor', JSON.stringify(doc));
          }
          setIsLoading(false);
          return true;
        }
      } catch (err: any) {
        // Fallback check if user wants demo doctor
        if (email.toLowerCase().includes('fausto') || email.toLowerCase().includes('demo') || password === 'demo123') {
          setDoctor(DEFAULT_DOCTOR);
          setIsDemoMode(true);
          if (remember) {
            localStorage.setItem('medrecords_active_doctor', JSON.stringify(DEFAULT_DOCTOR));
          }
          setIsLoading(false);
          return true;
        }

        setAuthError(err.message || 'Invalid email or password. Please verify credentials.');
        setIsLoading(false);
        return false;
      }
    }

    // Local / Demo authorization
    if (password.length < 4) {
      setAuthError('Password must be at least 4 characters long.');
      setIsLoading(false);
      return false;
    }

    const doc: DoctorProfile = {
      ...DEFAULT_DOCTOR,
      email: email.trim(),
      full_name: email.toLowerCase().includes('fausto') ? DEFAULT_DOCTOR.full_name : `Dr. ${email.split('@')[0]}`,
    };

    setDoctor(doc);
    setIsDemoMode(true);
    if (remember) {
      localStorage.setItem('medrecords_active_doctor', JSON.stringify(doc));
    }
    setIsLoading(false);
    return true;
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    return login(email, password, true);
  };

  const loginDemo = () => {
    setDoctor(DEFAULT_DOCTOR);
    localStorage.setItem('medrecords_active_doctor', JSON.stringify(DEFAULT_DOCTOR));
    setIsDemoMode(true);
  };

  const loginWithPasscode = (passcode: string): boolean => {
    if (passcode.trim().toUpperCase() === 'DRFT1') {
      setDoctor(DEFAULT_DOCTOR);
      localStorage.setItem('medrecords_active_doctor', JSON.stringify(DEFAULT_DOCTOR));
      setIsDemoMode(true);
      setAuthError(null);
      return true;
    }
    setAuthError('Invalid passcode. Please enter the authorized clinical passcode.');
    return false;
  };

  const logout = async () => {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    localStorage.removeItem('medrecords_active_doctor');
    setDoctor(null);
  };

  const signOut = logout;

  const updateProfile = (updated: Partial<DoctorProfile>) => {
    if (!doctor) return;
    const newDoc = { ...doctor, ...updated };
    setDoctor(newDoc);
    localStorage.setItem('medrecords_active_doctor', JSON.stringify(newDoc));
  };

  return (
    <AuthContext.Provider
      value={{
        doctor,
        isAuthenticated: Boolean(doctor),
        isLoading,
        authError,
        login,
        signIn,
        loginDemo,
        loginWithPasscode,
        logout,
        signOut,
        updateProfile,
        isDemoMode,
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
