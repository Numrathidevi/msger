import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, RefreshCw, ShieldAlert, Loader2, ClipboardCheck } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { AppShell } from '../components/AppShell';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { SkillAssessment } from '../types';

export function SkillAnalysisPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [skills, setSkills] = useState<SkillAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const loadSkills = async () => {
    try {
      const data = await apiRequest<{ skills: SkillAssessment[] }>('/api/skills');
      setSkills(data.skills);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  const handleReanalyze = async () => {
    setAnalyzing(true);
    try {
      const data = await apiRequest<{ skills: SkillAssessment[] }>('/api/skills/analyze', {
        method: 'POST',
        body: JSON.stringify({ targetCareer: user?.profile?.selectedCareer }),
      });
      setSkills(data.skills);
    } finally {
      setAnalyzing(false);
    }
  };

  const chartData = skills.map((s) => ({
    name: s.skill_name.length > 18 ? s.skill_name.slice(0, 16) + '…' : s.skill_name,
    Current: s.current_proficiency,
    Required: s.required_proficiency,
  }));

  const verifiedCount = skills.filter((s) => s.verified === 1).length;
  const highGapCount = skills.filter((s) => s.priority === 'High' && s.gap > 15).length;

  return (
    <AppShell
      title="Skill Analysis"
      breadcrumb={user?.profile?.selectedCareer || 'Target Career'}
      primaryAction={
        <button
          type="button"
          onClick={handleReanalyze}
          disabled={analyzing}
          className="px-4 py-2 rounded-xl bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
        >
          {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>{analyzing ? 'Analyzing...' : 'Re-run AI Skill Analysis'}</span>
        </button>
      }
    >
      {loading ? (
        <div className="h-96 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : (
        <div className="space-y-6">
          {/* Summary Header */}
          <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                Competency Gap Analysis · {user?.profile?.selectedCareer || 'Target Career'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Self-reported skills start unverified. Pass an optional verification quiz to certify true proficiency.
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm shrink-0">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Verified Skills</div>
                <div className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {verifiedCount} / {skills.length}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">High-Priority Gaps</div>
                <div className="font-mono text-lg font-bold text-red-700 dark:text-red-400 tabular-nums">
                  {highGapCount}
                </div>
              </div>
            </div>
          </div>

          {/* Proficiency Bar Chart */}
          <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6">
            <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Current vs. Required Proficiency
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" height={55} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} unit="%" axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Current" fill="#16A34A" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Required" fill="#D1E7D8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Skill Table */}
          <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">
                Skill Breakdown &amp; Verification
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                    <th className="py-3 px-6 font-medium">Skill</th>
                    <th className="py-3 px-4 font-medium">Current / Required</th>
                    <th className="py-3 px-4 font-medium">Gap</th>
                    <th className="py-3 px-4 font-medium">Priority</th>
                    <th className="py-3 px-4 font-medium">Verification</th>
                    <th className="py-3 px-6 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {skills.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-6">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{s.skill_name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{s.category}</div>
                      </td>
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <div className="flex items-center justify-between text-xs font-mono tabular-nums mb-1">
                          <span>{s.current_proficiency}%</span>
                          <span className="text-slate-500">Target {s.required_proficiency}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full ${
                              s.gap <= 10 ? 'bg-[#16A34A]' : s.gap <= 35 ? 'bg-amber-500' : 'bg-[#15803D]'
                            }`}
                            style={{ width: `${s.current_proficiency}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {s.gap > 0 ? `-${s.gap}%` : '0%'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-medium ${
                            s.priority === 'High'
                              ? 'text-red-700 dark:text-red-400'
                              : s.priority === 'Medium'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {s.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {s.verified === 1 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Unverified</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/assessments?skill=${encodeURIComponent(s.skill_name)}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          <span>{s.verified === 1 ? 'Retake Quiz' : 'Verify Skill'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
