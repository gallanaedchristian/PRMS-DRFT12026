import React, { useState, useRef, useEffect } from 'react';
import { 
  Stethoscope, 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  AlertCircle,
  KeyRound,
  Database,
  RefreshCw,
  Activity,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getSupabaseConfig, setSupabaseConfig } from '../../lib/supabase';

interface DoctorLoginProps {
  onSuccess: () => void;
}

type AuthView = 'login' | 'forgot' | 'recovery';

export const DoctorLogin: React.FC<DoctorLoginProps> = ({ onSuccess }) => {
  const { 
    signInWithPassword, 
    loginAsDemoDoctor,
    loginAsDemoStaff,
    resetPasswordForEmail, 
    updateUserPassword, 
    isLoading, 
    authError, 
    clearAuthError,
    isRecoveryMode,
    setIsRecoveryMode 
  } = useAuth();

  const [showAuthForm, setShowAuthForm] = useState<boolean>(false);
  const [authView, setAuthView] = useState<AuthView>('login');
  
  // Credentials state (never stored in localStorage or database)
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Recovery passwords state
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);

  // Status & local messages
  const [localError, setLocalError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Supabase Connection Modal / Drawer
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const currentConfig = getSupabaseConfig();
  const [configUrl, setConfigUrl] = useState<string>(currentConfig.url);
  const [configAnonKey, setConfigAnonKey] = useState<string>(currentConfig.anonKey);
  const isSupabaseConfigured = currentConfig.isConfigured;

  const emailInputRef = useRef<HTMLInputElement>(null);

  // Sync recovery mode from AuthContext
  useEffect(() => {
    if (isRecoveryMode) {
      setAuthView('recovery');
      setShowAuthForm(true);
    }
  }, [isRecoveryMode]);

  useEffect(() => {
    if (showAuthForm && authView === 'login' && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [showAuthForm, authView]);

  const handleStartLogin = () => {
    clearAuthError();
    setLocalError('');
    setSuccessMessage('');
    setShowAuthForm(true);
  };

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearAuthError();
    setLocalError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setLocalError('Please enter your registered email address.');
      return;
    }

    if (!password) {
      setLocalError('Please enter your account password.');
      return;
    }

    const res = await signInWithPassword(email, password);
    if (res.success) {
      // Clear password from local component state immediately
      setPassword('');
      onSuccess();
    } else if (res.error) {
      setLocalError(res.error);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setLocalError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setLocalError('Please enter your email address to receive password reset instructions.');
      return;
    }

    const res = await resetPasswordForEmail(email);
    if (res.success) {
      setSuccessMessage('Password reset instructions have been sent to your email. Please check your inbox.');
    } else if (res.error) {
      setLocalError(res.error);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setLocalError('');
    setSuccessMessage('');

    if (newPassword.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match. Please re-enter.');
      return;
    }

    const res = await updateUserPassword(newPassword);
    if (res.success) {
      setSuccessMessage('Password updated successfully! You may now sign in.');
      setNewPassword('');
      setConfirmPassword('');
      setAuthView('login');
      setIsRecoveryMode(false);
    } else if (res.error) {
      setLocalError(res.error);
    }
  };

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configUrl.trim() || !configAnonKey.trim()) {
      setLocalError('Both Supabase URL and Anon Key are required.');
      return;
    }
    setSupabaseConfig(configUrl.trim(), configAnonKey.trim());
    setShowConfigModal(false);
    window.location.reload();
  };

  const activeErrorMessage = localError || authError;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 antialiased">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Stethoscope className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Records MS</h1>
          <p className="text-xs text-slate-500">
            Secure 2026 SaaS Clinical Records & Management System
          </p>
        </div>

        {/* Clinical Workspace Info Card */}
        <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border border-blue-200/80 rounded-2xl p-4.5 text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-800 text-[10px] font-semibold mb-1">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            <span>Authorized Clinical Practitioner Workspace</span>
          </div>
          <h2 className="text-base font-bold text-blue-950">Tancongco Medical & Specialty Clinic</h2>
          <p className="text-xs text-blue-700 font-medium">Internal Medicine & Clinical Records</p>
          <p className="text-[11px] text-slate-500 pt-0.5">Protected Health Information (PHI) • Role-Based Access Control</p>
        </div>

        {/* Cloud Connection Notice */}
        {!isSupabaseConfigured && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Supabase project URL & key required</span>
            </div>
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 underline underline-offset-2 shrink-0 cursor-pointer"
            >
              Configure
            </button>
          </div>
        )}

        {/* Status / Error Notifications */}
        {activeErrorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{activeErrorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* VIEW 1: Initial Entry Gate */}
        {!showAuthForm && (
          <div className="space-y-3 pt-2">
            <button
              type="button"
              id="enter-clinical-workspace-btn"
              onClick={handleStartLogin}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <span>Sign In with Email & Password</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold text-center mb-2">
                Instant Multi-Role Demo Testing
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  id="demo-doctor-login-btn"
                  onClick={() => {
                    loginAsDemoStaff('doctor');
                    onSuccess();
                  }}
                  className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                    <span>Dr. Fausto Tancongco</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">Doctor</span>
                </button>

                <button
                  type="button"
                  id="demo-nurse-login-btn"
                  onClick={() => {
                    loginAsDemoStaff('nurse');
                    onSuccess();
                  }}
                  className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Maria Santos</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">Nurse</span>
                </button>

                <button
                  type="button"
                  id="demo-staff-login-btn"
                  onClick={() => {
                    loginAsDemoStaff('staff');
                    onSuccess();
                  }}
                  className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Juan Dela Cruz</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">Staff</span>
                </button>
              </div>
            </div>

            <p className="text-center text-[11px] text-slate-400">
              Supabase Auth handles live logins. Select any demo persona above to verify role display.
            </p>
          </div>
        )}

        {/* VIEW 2: Email & Password Sign In Form */}
        {showAuthForm && authView === 'login' && (
          <form onSubmit={handleSignIn} className="space-y-4 pt-1">
            {/* Email Address */}
            <div className="space-y-1.5">
              <label htmlFor="staff-email" className="block text-xs font-bold text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  ref={emailInputRef}
                  id="staff-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="staff-password" className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  id="forgot-password-link"
                  onClick={() => {
                    setLocalError('');
                    setSuccessMessage('');
                    setAuthView('forgot');
                  }}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAuthForm(false);
                  setPassword('');
                  setLocalError('');
                  clearAuthError();
                }}
                className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 active:bg-slate-200 text-slate-600 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                id="sign-in-workspace-btn"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-sm hover:shadow transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Sign In to Clinical Workspace</span>
                  </>
                )}
              </button>
            </div>

            {!isSupabaseConfigured && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  id="view2-demo-doctor-btn"
                  onClick={() => {
                    loginAsDemoDoctor();
                    onSuccess();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Launch Demo Session (No Supabase setup needed)</span>
                </button>
              </div>
            )}
          </form>
        )}

        {/* VIEW 3: Forgot Password Reset Form */}
        {showAuthForm && authView === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4 pt-1">
            <div className="space-y-1 text-left">
              <h3 className="text-sm font-bold text-slate-900">Reset Clinical Password</h3>
              <p className="text-xs text-slate-500">
                Enter your registered practitioner or staff email. We will send a secure password recovery link.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reset-email" className="block text-xs font-bold text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reset-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setLocalError('');
                  setSuccessMessage('');
                  setAuthView('login');
                }}
                className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 active:bg-slate-200 text-slate-600 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>

              <button
                type="submit"
                id="send-reset-instructions-btn"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-sm hover:shadow transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Send Password Reset Instructions</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* VIEW 4: Recovery Session - Set New Password */}
        {showAuthForm && authView === 'recovery' && (
          <form onSubmit={handleUpdatePassword} className="space-y-4 pt-1">
            <div className="space-y-1 text-left">
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 mb-0.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Password Recovery Session</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">Set New Account Password</h3>
              <p className="text-xs text-slate-500">
                Enter your new secure password to restore workspace access.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="new-password" className="block text-xs font-bold text-slate-700">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password (min. 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-sm pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block text-xs font-bold text-slate-700">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirm-password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-sm hover:shadow transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Update Password & Access Workspace</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Security & Access Control badge */}
        <div className="pt-2 border-t border-slate-100 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted Clinical System & Role-Based Access</span>
        </div>
      </div>

      {/* Supabase Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Connect Supabase Project</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Enter your project URL and anonymous publishable API key from your Supabase Dashboard settings to enable live staff authentication.
            </p>

            <form onSubmit={handleSaveConnection} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={configUrl}
                  onChange={(e) => setConfigUrl(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supabase Anon / Public Key
                </label>
                <textarea
                  rows={3}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={configAnonKey}
                  onChange={(e) => setConfigAnonKey(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  Save & Reload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
