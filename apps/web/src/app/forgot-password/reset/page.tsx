'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Suspense } from 'react';
import Link from 'next/link';

const PASSWORD_REQUIREMENTS_ERROR = 'Password does not meet the minimum requirements.';
const PASSWORD_REQUIREMENTS = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One symbol', test: (value: string) => /[\W_]/.test(value) },
];
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
const isStrongPassword = (value: string) => passwordRegex.test(value);

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasTouchedPassword, setHasTouchedPassword] = useState(false);
  const [hasTouchedConfirmPassword, setHasTouchedConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const isConfirmPasswordEntered = confirmPassword.length > 0;
  const isConfirmPasswordValid = isConfirmPasswordEntered && confirmPassword === password;
  const shouldShowConfirmPasswordMismatch =
    hasTouchedConfirmPassword && isConfirmPasswordEntered && !isConfirmPasswordValid;

  useEffect(() => {
    // Only run on client side
    const token = sessionStorage.getItem('resetToken');
    if (!token || !email) {
      router.replace('/forgot-password');
    } else {
      setResetToken(token);
    }
  }, [email, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken) return;

    if (password !== confirmPassword) {
      setHasTouchedConfirmPassword(true);
      setError('Passwords do not match');
      return;
    }

    if (!isStrongPassword(password)) {
      setHasTouchedPassword(true);
      setError(PASSWORD_REQUIREMENTS_ERROR);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await authApi.resetPassword(resetToken, password);
      
      // Clear token and show success
      sessionStorage.removeItem('resetToken');
      setIsSuccess(true);
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. The token may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden text-center p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h2>
            <p className="text-gray-500 mb-8">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            <Link 
              href="/login"
              className="w-full py-3 bg-[#00002E] hover:bg-[#000050] text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center"
            >
              Back to Sign In
            </Link>
        </div>
      </div>
    );
  }

  // Avoid rendering form if token hasn't loaded
  if (!resetToken) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Set New Password</h1>
            <p className="text-gray-500 text-sm">
              Please enter your new password below for {email}.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
             {error && error !== PASSWORD_REQUIREMENTS_ERROR && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  onFocus={() => setHasTouchedPassword(true)}
                  placeholder="Create new password"
                  className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00002E]/20 focus:border-[#00002E] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {hasTouchedPassword && (
                <div className="mt-3 space-y-2">
                  {PASSWORD_REQUIREMENTS.map((requirement) => {
                    const passed = requirement.test(password);
                    return (
                      <div key={requirement.label} className="flex items-center gap-2 text-sm">
                        {passed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={passed ? 'text-green-600' : 'text-red-600'}>
                          {requirement.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                  onFocus={() => setHasTouchedConfirmPassword(true)}
                  placeholder="Confirm new password"
                  className={`w-full pl-12 pr-12 py-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                    shouldShowConfirmPasswordMismatch
                      ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                      : 'border-gray-200 focus:ring-[#00002E]/20 focus:border-[#00002E]'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {hasTouchedConfirmPassword && isConfirmPasswordEntered && (
                <div className={`mt-2 flex items-center gap-2 text-sm font-medium ${isConfirmPasswordValid ? 'text-green-600' : 'text-red-600'}`}>
                  {isConfirmPasswordValid ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>{isConfirmPasswordValid ? 'Passwords match' : 'Passwords do not match'}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="w-full py-3 mt-4 bg-[#00002E] hover:bg-[#000050] text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Reset Password
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
            <ResetPasswordContent />
        </Suspense>
    );
}
