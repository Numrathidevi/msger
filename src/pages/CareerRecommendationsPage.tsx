import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, CheckCircle2, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { CareerRecommendation, User } from '../types';

interface AllCareerInfo {
  title: string;
  summary: string;
  estimatedWeeks: number;
  salaryOutlook: string;
  requiredSkills: string[];
}

export function CareerRecommendationsPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [recommendations, setRecommendations] = useState<CareerRecommendation[]>([]);
  const [allCareers, setAllCareers] = useState<AllCareerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [customGoal, setCustomGoal] = useState('');

  const loadCareers = async () => {
    try {
      const data = await apiRequest<{ recommendations: CareerRecommendation[]; allCareers: AllCareerInfo[] }>('/api/careers');
      setRecommendations(data.recommendations);
      setAllCareers(data.allCareers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCareers();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await apiRequest<{ recommendations: CareerRecommendation[] }>('/api/careers/refresh', {
        method: 'POST',
      });
      setRecommendations(data.recommendations);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectCareer = async (careerGoal: string) => {
    if (!careerGoal.trim()) return;
    setSwitchingTo(careerGoal);
    try {
      const data = await apiRequest<{ user: User }>('/api/careers/select', {
        method: 'POST',
        body: JSON.stringify({ careerGoal }),
      });
      setUser(data.user);
      await loadCareers();
      navigate('/roadmap');
    } finally {
      setSwitchingTo(null);
    }
  };

  return (
    <AppShell
      title="Career Recommendations"
      primaryAction={
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>Refresh AI Matches</span>
        </button>
      }
    >
      {loading ? (
        <div className="h-96 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : (
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Current Active Career Goal
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {user?.profile?.selectedCareer || 'Not selected'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Changing your career goal automatically recalculates your skill gaps and regenerates your personalized weekly roadmap.
              </p>
            </div>
          </div>

          {/* Ranked AI Recommendations */}
          <section className="space-y-4">
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              AI Career Agent Matches
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {recommendations.map((rec) => {
                const isCurrent = user?.profile?.selectedCareer?.toLowerCase() === rec.careerTitle.toLowerCase();
                return (
                  <div
                    key={rec.careerTitle}
                    className={`bg-white dark:bg-slate-900 border rounded-xl p-6 flex flex-col justify-between space-y-5 ${
                      isCurrent ? 'border-[#15803D] dark:border-emerald-500' : 'border-[#E2EAE5] dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Compass className="w-5 h-5 text-[#15803D] dark:text-emerald-400 shrink-0" />
                          <h4 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                            {rec.careerTitle}
                          </h4>
                        </div>
                        <span className="font-mono text-sm font-bold text-[#15803D] dark:text-emerald-400 tabular-nums shrink-0">
                          {rec.matchScore}% match
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        Est. {rec.estimatedWeeks} weeks · Typical range {rec.salaryOutlook}
                      </div>

                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {rec.rationale}
                      </p>

                      <div className="space-y-1.5 pt-2">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Missing skills for this path:
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {rec.missingSkills.length > 0 ? rec.missingSkills.join(' · ') : 'All baseline requirements covered'}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Active Goal</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Ready to switch</span>
                      )}

                      <button
                        type="button"
                        disabled={isCurrent || switchingTo !== null}
                        onClick={() => handleSelectCareer(rec.careerTitle)}
                        className={`px-4 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                          isCurrent
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'bg-[#15803D] hover:bg-[#166534] text-white'
                        }`}
                      >
                        {switchingTo === rec.careerTitle && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>{isCurrent ? 'Selected' : switchingTo === rec.careerTitle ? 'Regenerating Roadmap...' : 'Switch to This Goal'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Explore All Career Tracks or Enter Custom Goal */}
          <section className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                Explore Other Careers or Choose Your Own Goal
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Pick any career below or specify your own custom role to generate a new tailored roadmap.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                placeholder="Enter custom career goal (e.g., DevOps Engineer, Game Developer)"
                className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
              <button
                type="button"
                disabled={!customGoal.trim() || switchingTo !== null}
                onClick={() => handleSelectCareer(customGoal)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-[#15803D] hover:bg-slate-800 dark:hover:bg-[#166534] disabled:opacity-50 text-white text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {switchingTo === customGoal ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Generate Custom Roadmap</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {allCareers.map((c) => {
                const isCurrent = user?.profile?.selectedCareer?.toLowerCase() === c.title.toLowerCase();
                return (
                  <button
                    key={c.title}
                    type="button"
                    disabled={isCurrent || switchingTo !== null}
                    onClick={() => handleSelectCareer(c.title)}
                    className={`text-left p-3.5 rounded-lg border transition-colors ${
                      isCurrent
                        ? 'border-[#15803D] bg-[#EAF5EE]/70 dark:bg-emerald-950/40'
                        : 'border-[#E2EAE5] dark:border-slate-800 hover:border-[#B6D4BF]'
                    }`}
                  >
                    <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{c.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                      {c.estimatedWeeks}w · {c.salaryOutlook}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
