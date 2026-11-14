import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  RefreshCw,
  Target,
  Clock,
  Award,
  Flame,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from 'recharts';
import { AppShell } from '../components/AppShell';
import { apiRequest } from '../lib/api';
import { User } from '../types';

interface DashboardData {
  user: User;
  careerGoal: {
    selectedCareer: string;
    readinessScore: number;
    targetCompletionDate: string;
    learningStage: string;
  };
  skillOverview: {
    totalSkills: number;
    verifiedSkills: number;
    skillsToImprove: number;
    missingSkills: number;
  };
  learningStats: {
    totalLearningHours: number;
    coursesCompleted: number;
    assessmentsCompleted: number;
    learningStreak: number;
  };
  weeklyProgress: {
    currentWeek: number;
    weekTitle: string;
    completionPct: number;
    tasksCompleted: number;
    pendingTasks: number;
    learningHours: number;
    chart: Array<{ day: string; hours: number; tasks: number }>;
  };
  upcomingTasks: Array<{
    id: number;
    title: string;
    taskType: string;
    estimatedMinutes: number;
    dueDate: string;
    isAdaptiveRemedial: boolean;
  }>;
  upcomingProjects: Array<{
    weekNumber: number;
    title: string;
    description: string;
  }>;
  adaptiveEvents: Array<{
    id: number;
    trigger_type: string;
    score: number;
    summary: string;
  }>;
}

const MOTIVATIONAL_QUOTES = [
  'Every expert was once a beginner. Keep learning!',
  'Small progress every day leads to big achievements.',
  'Your future career is built by what you learn today.',
  "Don't compare your journey with others. Focus on your progress.",
  'Consistency beats intensity—one focused study block today compounds into mastery.',
];

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoteIdx, setQuoteIdx] = useState(() => new Date().getDate() % MOTIVATIONAL_QUOTES.length);

  const loadDashboard = async () => {
    try {
      const res = await apiRequest<DashboardData>('/api/dashboard');
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleToggleTask = async (taskId: number) => {
    await apiRequest(`/api/roadmap/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: true }),
    });
    await loadDashboard();
  };

  return (
    <AppShell
      title="Dashboard"
      primaryAction={
        <Link
          to="/roadmap"
          className="px-4 py-2 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
        >
          <span>Continue Roadmap</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      }
    >
      {loading || !data ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-24 rounded-2xl bg-[#E7EFEA] dark:bg-slate-800" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-[#E7EFEA] dark:bg-slate-800" />
            ))}
          </div>
          <div className="h-72 rounded-2xl bg-[#E7EFEA] dark:bg-slate-800" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Welcome + Motivational Strip */}
          <section className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
                Welcome back, {data.user.fullName}!
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {data.careerGoal.learningStage} · Target Date: <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">{data.careerGoal.targetCompletionDate || 'Flexible'}</span>
              </p>
            </div>
            <div className="flex items-start sm:items-center gap-3 bg-[#F4F8F5] dark:bg-slate-800/70 border border-[#E2EAE5] dark:border-slate-700 rounded-xl px-4 py-3 max-w-xl">
              <p className="text-sm text-slate-700 dark:text-slate-200 italic flex-1">
                &ldquo;{MOTIVATIONAL_QUOTES[quoteIdx]}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => setQuoteIdx((i) => (i + 1) % MOTIVATIONAL_QUOTES.length)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-[#15803D] dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-700 shrink-0 transition-colors"
                title="Next motivational message"
                aria-label="Show next motivational message"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>

          {/* Top 4-Card Learning Statistics Overview */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Learning Hours</span>
                <div className="w-8 h-8 rounded-xl bg-[#EAF5EE] dark:bg-slate-800 flex items-center justify-center text-[#15803D] dark:text-emerald-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {data.learningStats.totalLearningHours}h
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Logged total</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Courses Done</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {data.learningStats.coursesCompleted}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Resources completed</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Assessments</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {data.learningStats.assessmentsCompleted}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Quizzes evaluated</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Study Streak</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-slate-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {data.learningStats.learningStreak}d
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Active days</div>
              </div>
            </div>
          </section>

          {/* Streamlined Single-Curve Weekly Progress + Career Goal Ring */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Streamlined Single-Curve Weekly Performance Chart */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">
                    Week {data.weeklyProgress.currentWeek} Progress · {data.weeklyProgress.weekTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                    {data.weeklyProgress.completionPct}% complete · {data.weeklyProgress.tasksCompleted} completed · {data.weeklyProgress.pendingTasks} pending · {data.weeklyProgress.learningHours} hrs logged
                  </p>
                </div>
                <Link to="/progress" className="text-xs font-semibold text-[#15803D] dark:text-emerald-400 hover:underline whitespace-nowrap">
                  Weekly reports
                </Link>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.weeklyProgress.chart} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="weeklyHoursGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#16A34A" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#16A34A" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      name="Study Hours"
                      stroke="#16A34A"
                      strokeWidth={2.5}
                      fill="url(#weeklyHoursGradient)"
                      dot={{ r: 3, fill: '#16A34A', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#15803D' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Active Career Goal Card with Circular Readiness Ring */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Active Career Goal
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {data.careerGoal.selectedCareer}
                  </h3>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#EAF5EE] dark:bg-slate-800 flex items-center justify-center text-[#15803D] dark:text-emerald-400 shrink-0">
                  <Target className="w-4 h-4" />
                </div>
              </div>

              {(() => {
                const score = Math.max(0, Math.min(100, data.careerGoal.readinessScore));
                const radius = 44;
                const circumference = 2 * Math.PI * radius;
                const offset = circumference - (score / 100) * circumference;
                return (
                  <div className="flex items-center gap-5 py-1">
                    <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 108 108" aria-hidden="true">
                        <circle
                          cx="54"
                          cy="54"
                          r={radius}
                          fill="none"
                          strokeWidth="9"
                          className="stroke-[#E7EFEA] dark:stroke-slate-800"
                        />
                        <circle
                          cx="54"
                          cy="54"
                          r={radius}
                          fill="none"
                          strokeWidth="9"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          className="stroke-[#16A34A] transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums leading-none">
                          {score}%
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Career readiness score
                        </div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                          {score >= 75 ? 'Interview Ready' : score >= 45 ? 'Building Momentum' : 'Foundation Stage'}
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-[#E7EFEA] dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#16A34A] rounded-full transition-all"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#EBF2ED] dark:border-slate-800 text-xs">
                <div>
                  <div className="text-slate-500 dark:text-slate-400">Current learning stage</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                    {data.careerGoal.learningStage}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400">Target completion</div>
                  <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                    {data.careerGoal.targetCompletionDate || '8 weeks'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Skill Overview Breakdown + Today's Learning Tasks */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Skill Overview with Scannable Progress Bars */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">
                  Skill Overview
                </h3>
                <Link to="/skills" className="text-xs font-semibold text-[#15803D] dark:text-emerald-400 hover:underline">
                  Full analysis
                </Link>
              </div>

              {(() => {
                const total = Math.max(1, data.skillOverview.totalSkills);
                const rows = [
                  {
                    label: 'Total career skills tracked',
                    value: data.skillOverview.totalSkills,
                    pct: 100,
                    barClass: 'bg-slate-400 dark:bg-slate-500',
                    textClass: 'text-slate-900 dark:text-slate-100',
                  },
                  {
                    label: 'Verified skills (quiz passed)',
                    value: data.skillOverview.verifiedSkills,
                    pct: Math.round((data.skillOverview.verifiedSkills / total) * 100),
                    barClass: 'bg-[#16A34A]',
                    textClass: 'text-[#15803D] dark:text-emerald-400',
                  },
                  {
                    label: 'Skills to improve',
                    value: data.skillOverview.skillsToImprove,
                    pct: Math.round((data.skillOverview.skillsToImprove / total) * 100),
                    barClass: 'bg-amber-500',
                    textClass: 'text-amber-700 dark:text-amber-400',
                  },
                  {
                    label: 'Missing skills',
                    value: data.skillOverview.missingSkills,
                    pct: Math.round((data.skillOverview.missingSkills / total) * 100),
                    barClass: 'bg-rose-500',
                    textClass: 'text-rose-700 dark:text-rose-400',
                  },
                ];
                return (
                  <div className="space-y-4">
                    {rows.map((r) => (
                      <div key={r.label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">{r.label}</span>
                          <span className={`font-mono font-semibold tabular-nums ${r.textClass}`}>
                            {r.value}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#ECF3EE] dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${r.barClass}`} style={{ width: `${r.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <Link
                to="/assessments"
                className="block w-full text-center py-2.5 px-4 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-[#F4F8F5] dark:bg-slate-800/60 hover:bg-[#EAF5EE] dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
              >
                Verify a Skill with Quiz
              </Link>
            </div>

            {/* Today's Learning Tasks */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">
                  Today&apos;s Learning Tasks
                </h3>
                <Link to="/roadmap" className="text-xs font-semibold text-[#15803D] dark:text-emerald-400 hover:underline">
                  View all tasks
                </Link>
              </div>

              {data.upcomingTasks.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  All tasks for Week {data.weeklyProgress.currentWeek} are complete! Take the weekly assessment to validate mastery.
                </div>
              ) : (
                <div className="divide-y divide-[#EBF2ED] dark:divide-slate-800">
                  {data.upcomingTasks.map((task) => (
                    <div key={task.id} className="py-3 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task.id)}
                        className="flex items-center gap-3 text-left group min-w-0 flex-1"
                      >
                        <Circle className="w-4 h-4 text-slate-400 group-hover:text-[#15803D] shrink-0 transition-colors" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-[#15803D] dark:group-hover:text-emerald-400 truncate transition-colors">
                            {task.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            {task.taskType} · {task.estimatedMinutes} min
                            {task.dueDate ? ` · Due ${task.dueDate}` : ''}
                            {task.isAdaptiveRemedial ? ' · Adaptive Reinforcement' : ''}
                          </div>
                        </div>
                      </button>

                      <Link
                        to={`/lesson/${task.id}`}
                        className="px-3 py-1.5 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-[#F4F8F5] dark:bg-slate-800/60 hover:bg-[#EAF5EE] dark:hover:bg-slate-800 text-xs font-semibold text-[#15803D] dark:text-emerald-400 whitespace-nowrap shrink-0 transition-colors"
                      >
                        Notes &amp; Quiz
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Upcoming Assessments & Project Deadlines */}
          <section className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">
              Upcoming Assessments &amp; Project Deadlines
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-[#F4F8F5] dark:bg-slate-800/60 border border-[#DCE6DF] dark:border-slate-700 flex flex-col justify-between gap-3">
                <div>
                  <div className="text-xs text-[#15803D] dark:text-emerald-400 font-medium">
                    Weekly Assessment
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-1">
                    Week {data.weeklyProgress.currentWeek} Mastery Assessment
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    5 questions · Triggers Adaptive Learning Engine
                  </div>
                </div>
                <Link
                  to={`/assessments?week=${data.weeklyProgress.currentWeek}`}
                  className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  Start Quiz
                </Link>
              </div>

              {data.upcomingProjects.map((proj) => (
                <div
                  key={proj.weekNumber}
                  className="p-4 rounded-xl border border-[#E2EAE5] dark:border-slate-800 bg-[#FAFDFB] dark:bg-slate-950/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Mini Project · Week {proj.weekNumber}</span>
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {proj.title}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {proj.description}
                  </p>
                </div>
              ))}
            </div>

            {data.adaptiveEvents.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Latest Adaptive Update: </span>
                  {data.adaptiveEvents[0].summary}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
