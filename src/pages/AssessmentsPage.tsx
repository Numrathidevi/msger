import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { apiRequest } from '../lib/api';
import { QuizQuestion } from '../types';

interface AssessmentsPayload {
  attempts: Array<{
    id: number;
    quizType: string;
    referenceId: string;
    title: string;
    score: number;
    strongAreas: string[];
    weakAreas: string[];
    aiFeedback: string;
    createdAt: string;
  }>;
  adaptiveEvents: Array<{
    id: number;
    triggerType: string;
    score: number;
    weakTopics: string[];
    actionsTaken: string[];
    summary: string;
    createdAt: string;
  }>;
  weeks: Array<{ week_number: number; title: string }>;
  skills: Array<{ skill_name: string; current_proficiency: number; required_proficiency: number; verified: number }>;
}

interface ActiveQuiz {
  quizType: 'weekly' | 'skill_verification';
  referenceId: string;
  title: string;
  questions: QuizQuestion[];
}

interface QuizResult {
  score: number;
  correctCount: number;
  total: number;
  strongAreas: string[];
  weakAreas: string[];
  feedback: string;
  actionsTaken: string[];
}

export function AssessmentsPage() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<AssessmentsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeQuiz, setActiveQuiz] = useState<ActiveQuiz | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  const loadAssessments = async () => {
    try {
      const res = await apiRequest<AssessmentsPayload>('/api/assessments');
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  const startQuiz = async (quizType: 'weekly' | 'skill_verification', referenceId: string) => {
    setStartingQuiz(true);
    setResult(null);
    try {
      const res = await apiRequest<{ title: string; questions: QuizQuestion[] }>('/api/assessments/start', {
        method: 'POST',
        body: JSON.stringify({ quizType, referenceId }),
      });
      setActiveQuiz({
        quizType,
        referenceId,
        title: res.title,
        questions: res.questions,
      });
      setAnswers(new Array(res.questions.length).fill(-1));
    } finally {
      setStartingQuiz(false);
    }
  };

  useEffect(() => {
    const weekParam = searchParams.get('week');
    const skillParam = searchParams.get('skill');
    if (weekParam && !activeQuiz && !startingQuiz) {
      startQuiz('weekly', weekParam);
    } else if (skillParam && !activeQuiz && !startingQuiz) {
      startQuiz('skill_verification', skillParam);
    }
  }, [searchParams]);

  const submitQuiz = async () => {
    if (!activeQuiz) return;
    setSubmittingQuiz(true);
    try {
      const res = await apiRequest<QuizResult>('/api/assessments/submit', {
        method: 'POST',
        body: JSON.stringify({
          quizType: activeQuiz.quizType,
          referenceId: activeQuiz.referenceId,
          title: activeQuiz.title,
          questions: activeQuiz.questions,
          answers,
        }),
      });
      setResult(res);
      await loadAssessments();
    } finally {
      setSubmittingQuiz(false);
    }
  };

  return (
    <AppShell title="Assessments & Adaptive Engine">
      {loading || !data ? (
        <div className="h-96 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : (
        <div className="space-y-6">
          {/* Active Quiz Runner */}
          {startingQuiz && (
            <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-[#15803D] mx-auto" />
              <div className="font-display font-semibold text-slate-900 dark:text-slate-100">
                Adaptive Assessment Agent is preparing your questions...
              </div>
            </div>
          )}

          {activeQuiz && !startingQuiz && (
            <div className="bg-white dark:bg-slate-900 border border-[#CBE4D3] dark:border-emerald-900 rounded-2xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs font-medium text-[#15803D] dark:text-emerald-400">
                    {activeQuiz.quizType === 'weekly' ? 'Weekly Mastery Assessment' : 'Skill Verification Quiz'}
                  </div>
                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {activeQuiz.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveQuiz(null);
                    setResult(null);
                  }}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Close Quiz
                </button>
              </div>

              {result ? (
                <div className="space-y-5">
                  <div
                    className={`p-5 rounded-xl border ${
                      result.score < 40
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
                        : result.score < 75
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
                        : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <span className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                        Assessment Complete · {result.correctCount}/{result.total} Correct
                      </span>
                      <span className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {result.score}%
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{result.feedback}</p>

                    {result.actionsTaken.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10 space-y-1.5">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          Adaptive Learning Engine Actions Applied:
                        </div>
                        <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                          {result.actionsTaken.map((act, idx) => (
                            <li key={idx}>• {act}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Per-Question Answer Key */}
                  <div className="space-y-3">
                    {activeQuiz.questions.map((q, idx) => {
                      const picked = answers[idx];
                      const correct = picked === q.correctIndex;
                      return (
                        <div key={q.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                          <div className="flex items-start gap-2">
                            {correct ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                            )}
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {idx + 1}. {q.question}
                            </div>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 pl-6">
                            Correct answer: <span className="font-medium text-slate-900 dark:text-slate-200">{q.options[q.correctIndex]}</span>
                            {' · '}
                            {q.explanation}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      to="/roadmap"
                      className="px-4 py-2 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      <span>View Updated Roadmap</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuiz(null);
                        setResult(null);
                      }}
                      className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium"
                    >
                      Back to Assessments
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeQuiz.questions.map((q, qIdx) => (
                    <div key={q.id} className="space-y-2.5">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {qIdx + 1}. {q.question}
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {q.options.map((opt, oIdx) => {
                          const selected = answers[qIdx] === oIdx;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => {
                                const next = [...answers];
                                next[qIdx] = oIdx;
                                setAnswers(next);
                              }}
                              className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                                selected
                                  ? 'border-[#15803D] bg-[#EAF5EE] dark:bg-emerald-950/50 text-[#15803D] dark:text-emerald-200 font-medium'
                                  : 'border-[#E2EAE5] dark:border-slate-800 hover:border-[#B6D4BF] text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-500 font-mono tabular-nums">
                      {answers.filter((a) => a >= 0).length} / {activeQuiz.questions.length} answered
                    </span>
                    <button
                      type="button"
                      disabled={submittingQuiz || answers.some((a) => a < 0)}
                      onClick={submitQuiz}
                      className="px-5 py-2.5 rounded-lg bg-[#15803D] hover:bg-[#166534] disabled:opacity-50 text-white text-sm font-medium inline-flex items-center gap-2"
                    >
                      {submittingQuiz && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{submittingQuiz ? 'Grading & Adapting...' : 'Submit Assessment'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Launchers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">
                Weekly Roadmap Quizzes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scoring below 40% triggers the Adaptive Engine to inject beginner revision exercises and adjust pace.
              </p>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.weeks.map((w) => (
                  <div key={w.week_number} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        Week {w.week_number}: {w.title}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => startQuiz('weekly', String(w.week_number))}
                      className="px-3 py-1.5 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-xs font-medium whitespace-nowrap shrink-0"
                    >
                      Start Quiz
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">
                Skill Verification Assessments
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pass with 70%+ to verify proficiency in your Skill Analysis profile.
              </p>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.skills.map((s) => (
                  <div key={s.skill_name} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {s.skill_name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums">
                        Current {s.current_proficiency}% · {s.verified ? 'Verified' : 'Unverified'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => startQuiz('skill_verification', s.skill_name)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium whitespace-nowrap shrink-0"
                    >
                      Verify Skill
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Adaptive Engine History & Past Attempts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Adaptive Learning Engine History</span>
              </h3>
              {data.adaptiveEvents.length === 0 ? (
                <p className="text-sm text-slate-500">Complete an assessment to see real-time adaptive roadmap adjustments.</p>
              ) : (
                <div className="space-y-3">
                  {data.adaptiveEvents.map((ev) => (
                    <div key={ev.id} className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-sm">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{ev.triggerType}</span>
                        <span className={ev.score < 40 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
                          Score: {ev.score}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{ev.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#15803D] dark:text-emerald-400" />
                <span>Recent Assessment Attempts</span>
              </h3>
              {data.attempts.length === 0 ? (
                <p className="text-sm text-slate-500">No quizzes attempted yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.attempts.map((a) => (
                    <div key={a.id} className="py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{a.title}</span>
                        <span className="font-mono font-bold tabular-nums text-[#15803D] dark:text-emerald-400">{a.score}%</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{a.aiFeedback}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
