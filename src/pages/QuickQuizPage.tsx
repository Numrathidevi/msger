import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FolderGit2,
  Loader2,
  XCircle,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { QuizQuestion, User } from '../types';

interface IntakeEvaluationResult {
  score: number;
  correctCount: number;
  total: number;
  calibratedLevel: string;
  chosenCareer: string;
  strongAreas: string[];
  weakAreas: string[];
  feedback: string;
  planSummary?: {
    careerGoal: string;
    totalWeeks: number;
    calibratedLevel: string;
    week1Title: string;
    week1Topics: string[];
    firstTasks: Array<{
      id: number;
      title: string;
      taskType: string;
      estimatedMinutes: number;
    }>;
    miniProjectTitle: string;
  };
  user: User;
}

function extractLevelFromNotes(notes?: string): string {
  if (!notes) return '';
  const match = notes.match(/Starting Level:\s*([A-Za-z]+)/i);
  return match ? match[1] : '';
}

export function QuickQuizPage() {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const savedChoice = (() => {
    try {
      const raw = sessionStorage.getItem('skillpath_intake_choice');
      return raw ? (JSON.parse(raw) as { domain: string; level: string }) : null;
    } catch {
      return null;
    }
  })();

  const stateChoice = location.state as { domain?: string; level?: string } | null;
  const domain =
    stateChoice?.domain ||
    savedChoice?.domain ||
    (user?.profile?.unsureCareer ? 'Not sure yet' : user?.profile?.careerInterest) ||
    user?.profile?.selectedCareer ||
    'Full Stack Developer';
  const level =
    stateChoice?.level ||
    savedChoice?.level ||
    extractLevelFromNotes(user?.profile?.interestsNotes) ||
    'Beginner';

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<IntakeEvaluationResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiRequest<{ questions: QuizQuestion[] }>('/api/intake/quiz', {
      method: 'POST',
      body: JSON.stringify({ domain, level }),
    })
      .then((res) => {
        setQuestions(res.questions);
        setAnswers(new Array(res.questions.length).fill(-1));
      })
      .catch((err) => setError((err as Error).message || 'Could not load quiz'))
      .finally(() => setLoading(false));
  }, [domain, level]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await apiRequest<IntakeEvaluationResult>('/api/intake/complete-quiz', {
        method: 'POST',
        body: JSON.stringify({ domain, level, questions, answers }),
      });
      setUser(res.user);
      setResult(res);
    } catch (err) {
      setError((err as Error).message || 'Could not submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Mini Calibration Quiz"
      breadcrumb={`${domain} · ${level}`}
      primaryAction={
        <Link
          to="/onboarding"
          className="px-3.5 py-2 rounded-xl border border-[#DCE6DF] dark:border-slate-700 hover:bg-[#F3F8F5] dark:hover:bg-slate-800 text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
        >
          Full 10-Step Onboarding
        </Link>
      }
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Intro Banner */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#15803D] dark:text-emerald-400">
            <ClipboardCheck className="w-4 h-4" />
            <span>Welcome to SkillPath AI · Mini Calibration Quiz</span>
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Complete this short mini quiz for {domain} ({level})
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Answer these 4 quick questions first. Based on your mini quiz result, SkillPath AI will provide a personalized 8-week learning plan calibrated to your score so you can start your first lesson right away.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <Loader2 className="w-7 h-7 animate-spin text-[#15803D] dark:text-emerald-400 mx-auto" />
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Generating your {level} mini quiz for {domain}...
            </div>
          </div>
        ) : result ? (
          <div className="space-y-6">
            {/* Result Banner */}
            <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="p-5 rounded-xl bg-[#EAF5EE] dark:bg-emerald-950/40 border border-[#CBE4D3] dark:border-emerald-900 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Mini Quiz Result · {result.correctCount}/{result.total} Correct
                  </h3>
                  <span className="font-mono text-2xl font-bold text-[#15803D] dark:text-emerald-400 tabular-nums">
                    {result.score}%
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200">{result.feedback}</p>
                <div className="pt-2 text-xs text-slate-600 dark:text-slate-300 font-mono">
                  Target Career: {result.chosenCareer} · Calibrated Level: {result.calibratedLevel}
                </div>
              </div>

              {/* Based on Your Result — Provided Learning Plan */}
              {result.planSummary && (
                <div className="p-5 rounded-2xl border border-[#DCE6DF] dark:border-slate-700 bg-[#FAFDFB] dark:bg-slate-800/40 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-[#15803D] dark:text-emerald-400">
                        Based on your quiz result ({result.score}%), here is the plan provided
                      </div>
                      <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                        {result.planSummary.totalWeeks}-Week {result.planSummary.careerGoal} Plan · {result.planSummary.calibratedLevel}
                      </h4>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <BookOpen className="w-4 h-4 text-[#15803D] dark:text-emerald-400" />
                      <span>Week 1 Starting Focus: {result.planSummary.week1Title}</span>
                    </div>
                    {result.planSummary.week1Topics.length > 0 && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Topics covered: {result.planSummary.week1Topics.join(' · ')}
                      </p>
                    )}
                  </div>

                  {result.planSummary.firstTasks.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Your first lessons (each includes clear study notes + a post-lesson quiz):
                      </div>
                      <div className="divide-y divide-[#EBF2ED] dark:divide-slate-800 rounded-xl border border-[#E2EAE5] dark:border-slate-800 bg-white dark:bg-slate-900">
                        {result.planSummary.firstTasks.map((t, i) => (
                          <Link
                            key={t.id}
                            to={`/lesson/${t.id}`}
                            className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-[#F3F8F5] dark:hover:bg-slate-800/60 transition-colors"
                          >
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              Lesson {i + 1}: {t.title}
                            </span>
                            <span className="inline-flex items-center gap-1 font-mono text-[#15803D] dark:text-emerald-400 tabular-nums shrink-0">
                              <Clock className="w-3 h-3" />
                              {t.taskType} · {t.estimatedMinutes}m →
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.planSummary.miniProjectTitle && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <FolderGit2 className="w-4 h-4 text-[#15803D] dark:text-emerald-400 shrink-0" />
                      <span>
                        Week 1 Mini-Project: <strong className="text-slate-900 dark:text-slate-100">{result.planSummary.miniProjectTitle}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Question Breakdown */}
              <div className="space-y-3">
                {questions.map((q, idx) => {
                  const isCorrect = answers[idx] === q.correctIndex;
                  return (
                    <div key={q.id} className="p-4 rounded-xl border border-[#E5EDE8] dark:border-slate-800/80 space-y-1">
                      <div className="flex items-start gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                        )}
                        <span>{idx + 1}. {q.question}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 pl-6">
                        Answer: <strong className="text-slate-800 dark:text-slate-200">{q.options[q.correctIndex]}</strong> — {q.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const firstId = result.planSummary?.firstTasks?.[0]?.id;
                    navigate(firstId ? `/lesson/${firstId}` : '/roadmap');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                >
                  <span>Start First Lesson</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-5 py-2.5 rounded-xl border border-[#DCE6DF] dark:border-slate-700 hover:bg-[#F3F8F5] dark:hover:bg-slate-800 text-sm font-medium"
                >
                  Open My Dashboard
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-6">
            {questions.map((q, qIdx) => (
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
                        className={`text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                          selected
                            ? 'border-[#15803D] bg-[#EAF5EE] dark:bg-emerald-950/50 text-[#15803D] dark:text-emerald-300 font-medium'
                            : 'border-[#E5EDE8] dark:border-slate-800 hover:border-[#B6D4BF] dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-4 border-t border-[#E5EDE8] dark:border-slate-800/80">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                {answers.filter((a) => a >= 0).length} / {questions.length} answered
              </span>
              <button
                type="button"
                disabled={submitting || answers.some((a) => a < 0)}
                onClick={handleSubmit}
                className="px-5 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{submitting ? 'Building Your Plan...' : 'Submit Mini Quiz & Get My Plan'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
