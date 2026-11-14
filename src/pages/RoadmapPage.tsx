import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  BookOpen,
  Code2,
  FolderGit2,
  ClipboardCheck,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { apiRequest, toSafeExternalUrl } from '../lib/api';
import { RoadmapWeek } from '../types';

interface RoadmapSummary {
  id: number;
  careerGoal: string;
  totalWeeks: number;
  overallProgressPct: number;
  completedTasks: number;
  totalTasks: number;
}

export function RoadmapPage() {
  const [roadmap, setRoadmap] = useState<RoadmapSummary | null>(null);
  const [weeks, setWeeks] = useState<RoadmapWeek[]>([]);
  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  const loadRoadmap = async (keepSelection = true) => {
    try {
      const data = await apiRequest<{ roadmap: RoadmapSummary | null; weeks: RoadmapWeek[] }>('/api/roadmap');
      setRoadmap(data.roadmap);
      setWeeks(data.weeks);
      if (!keepSelection && data.weeks.length > 0) {
        const active = data.weeks.find((w) => w.progressPct < 100) || data.weeks[0];
        setSelectedWeekNum(active.weekNumber);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoadmap(false);
  }, []);

  const handleToggleTask = async (taskId: number, currentCompleted: boolean) => {
    await apiRequest(`/api/roadmap/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !currentCompleted }),
    });
    await loadRoadmap(true);
  };

  const activeWeek = weeks.find((w) => w.weekNumber === selectedWeekNum) || weeks[0];

  return (
    <AppShell
      title="Learning Roadmap"
      breadcrumb={roadmap?.careerGoal || 'Curriculum'}
      primaryAction={
        activeWeek ? (
          <Link
            to={`/assessments?week=${activeWeek.weekNumber}`}
            className="px-4 py-2 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Take Week {activeWeek.weekNumber} Quiz</span>
          </Link>
        ) : undefined
      }
    >
      {loading ? (
        <div className="h-96 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : !roadmap || weeks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <h2 className="font-display text-lg font-semibold">No roadmap generated yet</h2>
          <p className="text-sm text-slate-500">Confirm a career goal to generate your personalized weekly roadmap.</p>
          <Link to="/careers" className="inline-block px-4 py-2 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-sm font-medium">
            Select Career Goal
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overall Plan Header */}
          <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {roadmap.totalWeeks}-Week Personalized Learning Plan
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {roadmap.careerGoal}
              </h2>
            </div>

            <div className="flex items-center gap-4 min-w-[240px]">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1 font-mono tabular-nums">
                  <span className="text-slate-600 dark:text-slate-400">
                    {roadmap.completedTasks}/{roadmap.totalTasks} tasks
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {roadmap.overallProgressPct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[#ECF3EE] dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#16A34A] rounded-full transition-all"
                    style={{ width: `${roadmap.overallProgressPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Week Selector Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {weeks.map((w) => {
              const selected = w.weekNumber === activeWeek?.weekNumber;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWeekNum(w.weekNumber)}
                  className={`text-left p-3 rounded-xl border transition-colors ${
                    selected
                      ? 'border-[#15803D] bg-[#EAF5EE] dark:bg-emerald-950/50'
                      : 'border-[#E2EAE5] dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#B6D4BF] dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">W{w.weekNumber}</span>
                    <span className={w.progressPct === 100 ? 'text-[#15803D] dark:text-emerald-400 font-semibold' : 'text-slate-500'}>
                      {w.progressPct}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 truncate mt-1">
                    {w.title}
                  </div>
                  <div className="w-full h-1 bg-[#ECF3EE] dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${w.progressPct === 100 ? 'bg-emerald-600' : 'bg-[#16A34A]'}`}
                      style={{ width: `${w.progressPct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Week Detailed View */}
          {activeWeek && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Tasks & Adaptive Notices */}
              <div className="lg:col-span-7 space-y-5">
                <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        Week {activeWeek.weekNumber} · Expected {activeWeek.expectedHours} hrs · {activeWeek.completedCount}/{activeWeek.totalCount} tasks done
                      </div>
                      <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {activeWeek.title}
                      </h3>
                    </div>
                    <div className="font-mono text-lg font-bold text-[#15803D] dark:text-emerald-400 tabular-nums">
                      {activeWeek.progressPct}%
                    </div>
                  </div>

                  {activeWeek.isAdapted && (
                    <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{activeWeek.adaptationNote}</span>
                    </div>
                  )}

                  {/* Learning Objectives */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Learning Objectives
                    </h4>
                    <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                      {activeWeek.learningObjectives.map((obj, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#15803D] dark:text-emerald-400 font-mono text-xs mt-1">•</span>
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Interactive Ordered Lessons & Tasks Track */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Week {activeWeek.weekNumber} Lesson Track (Notes + Post-Lesson Quiz)
                      </h4>
                      <span className="text-xs font-mono text-slate-400 tabular-nums">
                        {activeWeek.tasks.length} steps
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeWeek.tasks.map((task, idx) => (
                        <div
                          key={task.id}
                          className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 rounded-lg hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleTask(task.id, task.completed)}
                            className="flex items-center gap-3 min-w-0 flex-1 text-left group"
                          >
                            {task.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-[#15803D] shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div
                                className={`text-sm font-medium ${
                                  task.completed
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                <span className="font-mono text-xs text-slate-400 mr-2 tabular-nums">
                                  {String(idx + 1).padStart(2, '0')}.
                                </span>
                                {task.title}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                {task.taskType} · {task.estimatedMinutes} min
                                {task.lastQuizScore !== null && task.lastQuizScore !== undefined
                                  ? ` · Quiz ${task.lastQuizScore}%${task.quizPassed ? ' (Passed)' : ''}`
                                  : ' · Notes & Quiz ready'}
                                {task.isAdaptiveRemedial ? ' · Adaptive Revision' : ''}
                              </div>
                            </div>
                          </button>

                          <Link
                            to={`/lesson/${task.id}`}
                            className="px-3.5 py-1.5 rounded-xl border border-[#CBE4D3] dark:border-emerald-900 bg-[#EAF5EE] dark:bg-emerald-950/50 hover:bg-[#DCEEE3] dark:hover:bg-emerald-900/60 text-[#15803D] dark:text-emerald-300 text-xs font-semibold whitespace-nowrap shrink-0 self-start sm:self-center transition-colors"
                          >
                            {task.quizPassed ? 'Review Notes & Quiz' : 'Notes & Quiz'}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Topics, Courses, Tutorials, Exercises, Mini-Project */}
              <div className="lg:col-span-5 space-y-5">
                {/* Topics & Exercises */}
                <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-4">
                  <div>
                    <h4 className="font-display font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#15803D] dark:text-emerald-400" />
                      <span>Topics to Study</span>
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                      {activeWeek.topics.join(' · ')}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="font-display font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-[#15803D] dark:text-emerald-400" />
                      <span>Practical Exercises</span>
                    </h4>
                    <ul className="mt-2 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                      {activeWeek.practicalExercises.map((ex, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="font-mono text-xs text-slate-400 mt-0.5">{i + 1}.</span>
                          <span>{ex}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Courses & Tutorial Links */}
                <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-4">
                  <h4 className="font-display font-semibold text-slate-900 dark:text-slate-100">
                    Recommended Courses &amp; Tutorials
                  </h4>
                  <div className="space-y-2.5">
                    {activeWeek.recommendedCourses.map((c, i) => (
                      <a
                        key={i}
                        href={toSafeExternalUrl(c.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#E2EAE5] dark:border-slate-800 hover:border-[#15803D] transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {c.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {c.provider} · {c.duration}
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                      </a>
                    ))}

                    {activeWeek.tutorialLinks.map((t, i) => (
                      <a
                        key={i}
                        href={toSafeExternalUrl(t.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                            {t.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{t.type}</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Mini Project */}
                <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FolderGit2 className="w-4 h-4 text-emerald-600" />
                      <span>Mini Project</span>
                    </h4>
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-500 tabular-nums">
                      <Clock className="w-3.5 h-3.5" />
                      {activeWeek.expectedHours}h week
                    </span>
                  </div>
                  <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                    {activeWeek.miniProject?.title}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {activeWeek.miniProject?.description}
                  </p>
                  {activeWeek.miniProject?.deliverables?.length > 0 && (
                    <ul className="pt-1 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      {activeWeek.miniProject.deliverables.map((d, i) => (
                        <li key={i}>Deliverable {i + 1}: {d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
