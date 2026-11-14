import React, { useState } from 'react';
import { Save, CheckCircle2, Loader2 } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { User } from '../types';

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [educationLevel, setEducationLevel] = useState(user?.educationLevel || '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [department, setDepartment] = useState(user?.profile?.department || '');
  const [technicalSkills, setTechnicalSkills] = useState((user?.profile?.technicalSkills || []).join(', '));
  const [programmingLanguages, setProgrammingLanguages] = useState((user?.profile?.programmingLanguages || []).join(', '));
  const [certifications, setCertifications] = useState((user?.profile?.certifications || []).join(', '));
  const [projects, setProjects] = useState((user?.profile?.projects || []).join('\n'));
  const [dailyStudyHours, setDailyStudyHours] = useState(user?.profile?.dailyStudyHours || 2);
  const [learningStyle, setLearningStyle] = useState(user?.profile?.learningStyle || 'Hands-on Projects');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      const splitComma = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
      const res = await apiRequest<{ user: User }>('/api/student/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName,
          educationLevel,
          institution,
          department,
          technicalSkills: splitComma(technicalSkills),
          programmingLanguages: splitComma(programmingLanguages),
          certifications: splitComma(certifications),
          projects: projects.split('\n').map((x) => x.trim()).filter(Boolean),
          dailyStudyHours: Number(dailyStudyHours),
          learningStyle,
        }),
      });
      setUser(res.user);
      setSavedMsg('Profile saved and skill gap analysis updated.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="My Profile">
      <form onSubmit={handleSave} className="max-w-3xl bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            Student Profile &amp; Background
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Updating your skills or languages automatically re-evaluates your skill gap profile.
          </p>
        </div>

        {savedMsg && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{savedMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-sm text-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Education level</label>
            <input
              type="text"
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">College / University</label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Department / Major</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Daily study target (hours)</label>
            <input
              type="number"
              min={0.5}
              max={12}
              step={0.5}
              value={dailyStudyHours}
              onChange={(e) => setDailyStudyHours(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Technical skills (comma-separated)
          </label>
          <input
            type="text"
            value={technicalSkills}
            onChange={(e) => setTechnicalSkills(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Programming languages (comma-separated)
          </label>
          <input
            type="text"
            value={programmingLanguages}
            onChange={(e) => setProgrammingLanguages(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Certifications (comma-separated)
          </label>
          <input
            type="text"
            value={certifications}
            onChange={(e) => setCertifications(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Projects developed (one per line)
          </label>
          <textarea
            rows={3}
            value={projects}
            onChange={(e) => setProjects(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Preferred learning style
          </label>
          <input
            type="text"
            value={learningStyle}
            onChange={(e) => setLearningStyle(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </form>
    </AppShell>
  );
}
