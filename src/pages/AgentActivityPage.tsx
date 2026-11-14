import { useEffect, useState } from 'react';
import { Bot, Layers } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { apiRequest } from '../lib/api';
import { AgentLogEntry } from '../types';

const SPECIALIZED_AGENTS = [
  {
    name: 'Skill Profiling & Gap Agent',
    role: 'Evaluates reported skills, projects, and certifications against career competency benchmarks.',
  },
  {
    name: 'Career Recommendation Agent',
    role: 'Matches student interests and existing foundations to high-fit career tracks.',
  },
  {
    name: 'Roadmap Architect Agent',
    role: 'Generates calibrated 8-week learning plans with courses, tutorials, exercises, and projects.',
  },
  {
    name: 'Adaptive Assessment Agent',
    role: 'Creates diagnostic quizzes and dynamically injects remedial lessons when scores drop below 40%.',
  },
  {
    name: 'Weekly Coach & Mentor Agent',
    role: 'Compiles weekly progress reports and delivers personalized coaching inside AI Mentor.',
  },
];

export function AgentActivityPage() {
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [sharedContext, setSharedContext] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ logs: AgentLogEntry[]; sharedContext: Record<string, unknown> }>('/api/agents/activity')
      .then((res) => {
        setLogs(res.logs);
        setSharedContext(res.sharedContext);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Agent Activity">
      {loading ? (
        <div className="h-96 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : (
        <div className="space-y-6">
          {/* Multi-Agent Roster */}
          <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#15803D] dark:text-emerald-400" />
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                Multi-Agent Orchestration Architecture
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SPECIALIZED_AGENTS.map((ag) => (
                <div key={ag.name} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#15803D] dark:text-emerald-400 shrink-0" />
                    <span>{ag.name}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {ag.role}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Shared Learner Context */}
          {sharedContext && (
            <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-3">
              <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">
                Shared Learner Context (Injected Across All Agents)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-slate-500">Confirmed Goal</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {String(sharedContext.selectedCareer || 'Unconfirmed')}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Current Stage</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {String(sharedContext.learningStage || '—')}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Daily Capacity</div>
                  <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                    {String(sharedContext.dailyStudyHours || 2)} hrs/day
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Known Languages</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                    {Array.isArray(sharedContext.programmingLanguages) && sharedContext.programmingLanguages.length > 0
                      ? (sharedContext.programmingLanguages as string[]).join(', ')
                      : 'None listed'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chronological Agent Execution Log */}
          <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">
                Agent Execution Audit Log
              </h3>
            </div>
            {logs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No agent activity recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <div key={log.id} className="p-5 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {log.agentName}
                        <span className="text-slate-400 font-normal mx-2">·</span>
                        <span className="font-normal text-slate-600 dark:text-slate-400">{log.taskSummary}</span>
                      </div>
                      <div className="text-xs font-mono text-slate-500 tabular-nums">
                        {log.durationMs}ms · {log.createdAt.slice(0, 16)}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {log.outputSummary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
