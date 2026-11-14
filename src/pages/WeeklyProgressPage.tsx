import { useEffect, useState } from 'react';
import { RefreshCw, Loader2, Save, CheckCircle2 } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { AppShell } from '../components/AppShell';
import { apiRequest } from '../lib/api';
import { WeeklyReport } from '../types';

interface WeekStat {
  weekNumber: number;
  title: string;
  topics: string[];
  tasksCompleted: number;
  tasksRemaining: number;
  totalTasks: number;
  progressPct: number;
  studyHours: number;
  quizScore: number | null;
  dailyTracker: Array<{ day: string; hours: number; tasksDone: number }>;
}

interface ProgressResponse {
  currentWeekNumber: number;
  weekStats: WeekStat[];
  reports: WeeklyReport[];
  skillsImproved: Array<{ skill_name: string; current_proficiency: number; verified: number }>;
}

export function WeeklyProgressPage() {
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [dayHours, setDayHours] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const loadProgress = async (preserveWeek = true) => {
    try {
      const res = await apiRequest<ProgressResponse>('/api/progress');
      setData(res);
      const targetWeek = preserveWeek ? selectedWeek : res.currentWeekNumber;
      if (!preserveWeek) setSelectedWeek(targetWeek);
      const active = res.weekStats.find((w) => w.weekNumber === targetWeek) || res.weekStats[0];
      if (active) {
        const hrs: Record<string, number> = {};
        active.dailyTracker.forEach((d) => {
          hrs[d.day] = d.hours;
        });
        setDayHours(hrs);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgress(false);
  }, []);

  useEffect(() => {
    if (!data) return;
    const w = data.weekStats.find((x) => x.weekNumber === selectedWeek);
    if (w) {
      const hrs: Record<string, number> = {};
      w.dailyTracker.forEach((d) => {
        hrs[d.day] = d.hours;
      });
      setDayHours(hrs);
    }
  }, [selectedWeek, data]);

  const handleSaveDay = async (day: string) => {
    setSavingDay(day);
    try {
      await apiRequest('/api/progress/log-day', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: selectedWeek,
          dayName: day,
          hoursLogged: Number(dayHours[day] ?? 0),
        }),
      });
      await loadProgress(true);
    } finally {
      setSavingDay(null);
    }
  };

  const handleRegenerateReport = async () => {
    setGeneratingReport(true);
    try {
      await apiRequest('/api/progress/generate-report', {
        method: 'POST',
        body: JSON.stringify({ weekNumber: selectedWeek }),
      });
      await loadProgress(true);
    } finally {
      setGeneratingReport(false);
    }
  };

  const currentStat = data?.weekStats.find((w) => w.weekNumber === selectedWeek);
  const prevStat = data?.weekStats.find((w) => w.weekNumber === selectedWeek - 1);
  const activeReport = data?.reports.find((r) => r.week_number === selectedWeek);

  const comparisonChart = (data?.weekStats || []).map((w) => ({
    week: `W${w.weekNumber}`,
    Progress: w.progressPct,
    Hours: w.studyHours,
    Quiz: w.quizScore ?? 0,
  }));

  return (
    <AppShell
      title="Weekly Progress"
      primaryAction={
        <button
          type="button"
          onClick={handleRegenerateReport}
          disabled={generatingReport}
          className="px-4 py-2 rounded-xl bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
        >
          {generatingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>Generate Week {selectedWeek} AI Report</span>
        </button>
      }
    >
      {loading || !data || !currentStat ? (
        <div className="h-96 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : (
        <div className="space-y-6">
          {/* Week Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-4">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Viewing Report &amp; Tracker for</span>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                Week {currentStat.weekNumber} · {currentStat.title}
              </h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.weekStats.map((w) => (
                <button
                  key={w.weekNumber}
                  type="button"
                  onClick={() => setSelectedWeek(w.weekNumber)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                    selectedWeek === w.weekNumber
                      ? 'bg-[#15803D] text-white'
                      : 'bg-[#F3F8F5] dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#EAF5EE] dark:hover:bg-slate-700'
                  }`}
                >
                  W{w.weekNumber}
                </button>
              ))}
            </div>
          </div>

          {/* 5 Key Weekly Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Completion</div>
              <div className="font-mono text-2xl font-bold text-[#15803D] dark:text-emerald-400 tabular-nums mt-1">
                {currentStat.progressPct}%
              </div>
              {prevStat && (
                <div className="text-xs text-slate-500 tabular-nums mt-1">
                  Prev week: {prevStat.progressPct}%
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Study Hours</div>
              <div className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
                {currentStat.studyHours}h
              </div>
              {prevStat && (
                <div className="text-xs text-slate-500 tabular-nums mt-1">
                  Prev week: {prevStat.studyHours}h
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Tasks Completed</div>
              <div className="font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
                {currentStat.tasksCompleted}/{currentStat.totalTasks}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Tasks Remaining</div>
              <div className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
                {currentStat.tasksRemaining}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Quiz Performance</div>
              <div className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
                {currentStat.quizScore !== null ? `${currentStat.quizScore}%` : '—'}
              </div>
            </div>
          </div>

          {/* Monday-to-Sunday Activity Tracker + Weekly Comparison Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Mon-Sun Learning Activity Tracker */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">
                  Monday-to-Sunday Learning Activity Tracker
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Log your daily study hours for Week {selectedWeek} to update your weekly report.
                </p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {currentStat.dailyTracker.map((d) => (
                  <div key={d.day} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="w-16 text-sm font-medium text-slate-800 dark:text-slate-200">{d.day}</div>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={14}
                        step={0.5}
                        value={dayHours[d.day] ?? 0}
                        onChange={(e) => setDayHours((prev) => ({ ...prev, [d.day]: Number(e.target.value) }))}
                        className="w-24 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums"
                        aria-label={`${d.day} study hours`}
                      />
                      <span className="text-xs text-slate-500">hrs</span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono tabular-nums hidden sm:block">
                      {d.tasksDone} tasks
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSaveDay(d.day)}
                      disabled={savingDay === d.day}
                      className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium inline-flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      <span>{savingDay === d.day ? 'Saving...' : 'Save'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Week-over-Week Comparison Chart */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-5">
              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">
                  Week-over-Week Progress &amp; Hours
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Comparing completion percentage across your 8-week plan
                </p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonChart} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
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
                    <Line type="monotone" dataKey="Progress" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 3.5, fill: '#16A34A' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="h-36 w-full pt-2 border-t border-slate-100 dark:border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentStat.dailyTracker} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="h" />
                    <Bar dataKey="hours" name="Hours" fill="#059669" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Weekly Report & AI Weekly Feedback */}
          <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                WEEK {selectedWeek} REPORT
              </h3>
              <span className="text-xs font-mono text-slate-500">
                {activeReport ? `Generated ${activeReport.generated_at.slice(0, 16)}` : 'Live Snapshot'}
              </span>
            </div>

            {activeReport ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <div className="text-xs text-slate-500">Learning Goal</div>
                    <div className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">{activeReport.learning_goal}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <div className="text-xs text-slate-500">Tasks Completed</div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                      {activeReport.tasks_completed}/{activeReport.total_tasks} ({activeReport.progress_pct}%)
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <div className="text-xs text-slate-500">Study Hours</div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                      {activeReport.study_hours} hours
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <div className="text-xs text-slate-500">Quiz Score</div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                      {activeReport.quiz_score}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <div className="text-xs text-slate-500">Strong Area</div>
                    <div className="font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">{activeReport.strong_area}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <div className="text-xs text-slate-500">Improvement Area</div>
                    <div className="font-medium text-amber-700 dark:text-amber-400 mt-0.5">{activeReport.improvement_area}</div>
                  </div>
                </div>

                <div className="lg:col-span-7 flex flex-col justify-between p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-[#15803D] dark:text-emerald-400 mb-1.5">
                      AI Weekly Feedback
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {activeReport.ai_feedback}
                    </p>
                  </div>

                  {data.skillsImproved.length > 0 && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Skills progressing:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {data.skillsImproved.map((s) => `${s.skill_name} (${s.current_proficiency}%)`).join(' · ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Click &ldquo;Generate Week {selectedWeek} AI Report&rdquo; to compile your coaching summary.</p>
            )}
          </div>

          {/* Previous Weekly Reports Archive */}
          {data.reports.length > 1 && (
            <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-3">
              <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">
                All Generated Weekly Reports
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {data.reports.map((rep) => (
                  <div key={rep.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">WEEK {rep.week_number}</span>
                      <span className="text-slate-500 mx-2">·</span>
                      <span className="text-slate-700 dark:text-slate-300">{rep.learning_goal}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      <span>{rep.progress_pct}% done</span>
                      <span>{rep.study_hours}h</span>
                      <span>Quiz {rep.quiz_score}%</span>
                      <button
                        type="button"
                        onClick={() => setSelectedWeek(rep.week_number)}
                        className="text-[#15803D] dark:text-emerald-400 font-sans font-medium hover:underline"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
