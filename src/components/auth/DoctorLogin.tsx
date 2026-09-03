import React, { useState, useRef, useEffect } from 'react';
import { Stethoscope, Lock, KeyRound, ArrowRight, ShieldCheck, CheckCircle2, ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface DoctorLoginProps {
  onSuccess: () => void;
}

export const DoctorLogin: React.FC<DoctorLoginProps> = ({ onSuccess }) => {
  const { loginWithPasscode, isLoading } = useAuth();
  const [showPasscodePrompt, setShowPasscodePrompt] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showPasscodePrompt && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showPasscodePrompt]);

  const handleStartLogin = () => {
    setError('');
    setShowPasscodePrompt(true);
  };

  const handleVerifyPasscode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!passcode.trim()) {
      setError('Please enter the clinical passcode.');
      return;
    }

    const success = loginWithPasscode(passcode);
    if (success) {
      onSuccess();
    } else {
      setError('Invalid clinical passcode. Please verify your credentials and try again.');
    }
  };

  const handleCancel = () => {
    setShowPasscodePrompt(false);
    setPasscode('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
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

        {/* Doctor Identity Card */}
        <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border border-blue-200/80 rounded-2xl p-4.5 text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-800 text-[10px] font-semibold mb-1">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            <span>Authorized Clinical Practitioner</span>
          </div>
          <h2 className="text-base font-bold text-blue-950">Dr. Fausto Tancongco, M.D.</h2>
          <p className="text-xs text-blue-700 font-medium">Internal Medicine & Pulmonology Practice</p>
          <p className="text-[11px] text-slate-500 pt-0.5">PRC License No. 0084729 • Senior Consultant</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {!showPasscodePrompt ? (
          /* Step 1: Initial Enter Clinical Workspace Trigger */
          <div className="space-y-3 pt-2">
            <button
              type="button"
              id="enter-clinical-workspace-btn"
              onClick={handleStartLogin}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <span>Enter Clinical Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-center text-[11px] text-slate-400">
              Click to initiate physician passcode authorization
            </p>
          </div>
        ) : (
          /* Step 2: Passcode Entry Form */
          <form onSubmit={handleVerifyPasscode} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label htmlFor="clinical-passcode" className="block text-xs font-bold text-slate-700">
                Clinical Passcode / Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  ref={inputRef}
                  id="clinical-passcode"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter clinical passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full text-sm pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition tracking-wide"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                  title={showPassword ? 'Hide passcode' : 'Show passcode'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 px-1 pt-0.5">
                Enter your authorized practitioner access passcode
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancel}
                className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 active:bg-slate-200 text-slate-600 text-xs font-medium transition flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                id="submit-passcode-btn"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-sm hover:shadow transition disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Verify & Access Workspace</span>
              </button>
            </div>
          </form>
        )}

        {/* Security / HIPAA badge */}
        <div className="pt-2 border-t border-slate-100 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted Clinical System & HIPAA-Compliant Access</span>
        </div>
      </div>
    </div>
  );
};
