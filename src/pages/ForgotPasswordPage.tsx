import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { SkillPathLogo } from '../components/Logo';

export function ForgotPasswordPage() {
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [issuedCodePreview, setIssuedCodePreview] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest<{ message: string; resetCode?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (data.resetCode) setIssuedCodePreview(data.resetCode);
      setStep('reset');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, resetCode, newPassword }),
      });
      setStep('done');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F0F5F2] dark:bg-slate-950">
      <div className="w-full max-w-md bg-white/95 dark:bg-slate-900 border border-[#DCE6DF] dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_-24px_rgba(21,128,61,0.14)] p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <SkillPathLogo />
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white pt-2">
            Reset your password
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {step === 'request' && 'Enter your registered email address to receive a verification code.'}
            {step === 'reset' && 'Enter your verification code and choose a new password.'}
            {step === 'done' && 'Your password has been updated securely.'}
          </p>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label htmlFor="fp-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                id="fp-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-[#FAFDFB] dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold transition-colors"
            >
              {loading ? 'Sending code...' : 'Send Reset Code'}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
            {issuedCodePreview && (
              <div className="p-3 rounded-xl bg-[#EAF5EE] dark:bg-emerald-950/40 border border-[#CBE4D3] dark:border-emerald-900 text-xs text-[#15803D] dark:text-emerald-200">
                Verification code issued: <span className="font-mono font-bold">{issuedCodePreview}</span>
              </div>
            )}
            <div>
              <label htmlFor="fp-code" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Verification code
              </label>
              <input
                id="fp-code"
                type="text"
                required
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="6-character code"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-[#FAFDFB] dark:bg-slate-950 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
              />
            </div>
            <div>
              <label htmlFor="fp-pw" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                New password
              </label>
              <input
                id="fp-pw"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-[#FAFDFB] dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold transition-colors"
            >
              {loading ? 'Updating...' : 'Confirm New Password'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Password updated. You can now log in with your new credentials.</span>
            </div>
            <Link
              to="/login"
              className="block w-full text-center py-2.5 px-4 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold transition-colors"
            >
              Return to Login
            </Link>
          </div>
        )}

        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to login</span>
        </Link>
      </div>
    </div>
  );
}
