import React, { useState } from 'react';
import { Sun, Moon, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setSaving(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/student/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setStatus({ type: 'success', text: res.message });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setStatus({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Settings">
      <div className="max-w-2xl space-y-6">
        {/* Appearance */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="font-display font-semibold text-slate-900 dark:text-slate-100">
              Appearance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Switch between light and dark workspace surfaces.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium inline-flex items-center justify-center gap-2 ${
                theme === 'light'
                  ? 'border-[#15803D] bg-[#EAF5EE] text-[#15803D]'
                  : 'border-[#DCE6DF] dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Light Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-medium inline-flex items-center justify-center gap-2 ${
                theme === 'dark'
                  ? 'border-emerald-600 bg-emerald-950/60 text-emerald-300'
                  : 'border-[#DCE6DF] dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Dark Mode</span>
            </button>
          </div>
        </div>

        {/* Security / Change Password */}
        <form onSubmit={handlePasswordChange} className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#15803D] dark:text-emerald-400" />
            <h2 className="font-display font-semibold text-slate-900 dark:text-slate-100">
              Account Security ({user?.email})
            </h2>
          </div>

          {status && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg text-xs border ${
                status.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
              }`}
            >
              {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{status.text}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Current password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              New password (minimum 6 characters)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold transition-colors"
          >
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
