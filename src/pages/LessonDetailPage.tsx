import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Code2,
  Lightbulb,
  Loader2,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { apiRequest } from '../lib/api';
import { LessonContent, LessonQuizSubmitResult, LessonTrackContext } from '../types';

export function LessonDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const quizSectionRef = useRef<HTMLElement | null>(null);

  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [trackContext, setTrackContext] = useState<LessonTrackContext | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<LessonQuizSubmitResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!taskId) return;
    let active = true;
    setLoading(true);
    setError('');
    setQuizResult(null);

    apiRequest<{ lesson: LessonContent; trackContext: LessonTrackContext }>(`/api/lessons/${taskId}`)
      .then((res) => {
        if (!active) return;
        setLesson(res.lesson);
        setTrackContext(res.trackContext);
        setAnswers(new Array(res.lesson.quiz.length).fill(-1));
      })
      .catch((err) => {
        if (!active) return;
        setError((err as Error).message || 'Could not load lesson notes.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [taskId]);

  const handleSubmitQuiz = async () => {
    if (!lesson) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await apiRequest<LessonQuizSubmitResult>(`/api/lessons/${lesson.taskId}/quiz-submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
      setQuizResult(res);
      if (res.lesson) setLesson(res.lesson);
      if (res.trackContext) setTrackContext(res.trackContext);
    } catch (err) {
      setError((err as Error).message || 'Could not grade lesson quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetakeQuiz = () => {
    if (!lesson) return;
    setQuizResult(null);
    setAnswers(new Array(lesson.quiz.length).fill(-1));
  };

  const scrollToQuiz = () => {
    quizSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <AppShell
      title={lesson ? lesson.lessonTitle : 'Lesson & Quiz'}
      breadcrumb={
        trackContext
          ? `${trackContext.careerGoal} · Week ${trackContext.weekNumber} · Step ${trackContext.lessonIndex}/${trackContext.totalWeekLessons}`
          : 'Learning Track'
      }
      primaryAction={
        <Link
          to="/roadmap"
          className="px-3.5 py-2 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#F3F8F5] dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Full Roadmap</span>
        </Link>
      }
    >
      {loading ? (
        <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#15803D] dark:text-emerald-400 mx-auto" />
          <div className="font-display font-semibold text-slate-900 dark:text-slate-100">
            Preparing clear lesson notes &amp; post-lesson quiz...
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Aligning study materials to your current week and career track.
          </p>
        </div>
      ) : error && !lesson ? (
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-2xl p-8 text-center space-y-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <Link
            to="/roadmap"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#15803D] text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Learning Roadmap</span>
          </Link>
        </div>
      ) : lesson && trackContext ? (
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Week Track Position & Sequence Stepper */}
          <section className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-[#15803D] dark:text-emerald-400">
                  {trackContext.careerGoal} · Week {trackContext.weekNumber}: {trackContext.weekTitle}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                  Lesson {trackContext.lessonIndex} of {trackContext.totalWeekLessons} · {lesson.taskType} · {lesson.estimatedMinutes} min · Week {trackContext.weekProgressPct}% complete
                </div>
              </div>

              <button
                type="button"
                onClick={scrollToQuiz}
                className="px-3.5 py-2 rounded-xl bg-[#EAF5EE] dark:bg-emerald-950/60 hover:bg-[#DCEEE3] dark:hover:bg-emerald-900/60 text-[#15803D] dark:text-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Jump to Post-Lesson Quiz</span>
              </button>
            </div>

            {/* Ordered Track Steps for This Week */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-[#EBF2ED] dark:border-slate-800">
              {trackContext.weekTasks.map((wt, idx) => {
                const isCurrent = wt.id === lesson.taskId;
                return (
                  <button
                    key={wt.id}
                    type="button"
                    onClick={() => navigate(`/lesson/${wt.id}`)}
                    className={`text-left px-3 py-2.5 rounded-xl border transition-colors ${
                      isCurrent
                        ? 'border-[#15803D] bg-[#EAF5EE] dark:bg-emerald-950/50'
                        : 'border-[#E5EDE8] dark:border-slate-800 hover:border-[#B6D4BF] dark:hover:border-slate-700 bg-[#FAFDFB] dark:bg-slate-950/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums">
                      <span className={isCurrent ? 'font-bold text-[#15803D] dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}>
                        {String(idx + 1).padStart(2, '0')}. {wt.taskType}
                      </span>
                      {wt.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate mt-1">
                      {wt.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Section 1: Clear Lesson Notes */}
          <section className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="space-y-2 pb-5 border-b border-[#EBF2ED] dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#15803D] dark:text-emerald-400">
                <BookOpen className="w-4 h-4" />
                <span>Part 1 · Clear Lesson Study Notes</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white text-balance">
                {lesson.lessonTitle}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                {lesson.summary}
              </p>
            </div>

            <div className="space-y-6">
              {lesson.notes.map((section, sIdx) => (
                <article
                  key={sIdx}
                  className="p-5 sm:p-6 rounded-2xl border border-[#E5EDE8] dark:border-slate-800 bg-[#FAFDFB] dark:bg-slate-950/40 space-y-4"
                >
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    {section.heading}
                  </h3>

                  <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {section.keyPoints.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2.5">
                        <span className="font-mono text-xs font-semibold text-[#15803D] dark:text-emerald-400 mt-1 shrink-0">
                          •
                        </span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>

                  {section.exampleCode && (
                    <div className="rounded-xl border border-[#DCE6DF] dark:border-slate-800 bg-slate-900 text-slate-100 overflow-hidden">
                      <div className="px-4 py-2 border-b border-slate-800 flex items-center gap-2 text-xs font-mono text-slate-300">
                        <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{section.exampleLabel || 'Practical Example'}</span>
                      </div>
                      <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto text-emerald-100">
                        <code>{section.exampleCode}</code>
                      </pre>
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-[#EAF5EE]/75 dark:bg-emerald-950/35 border border-[#CBE4D3] dark:border-emerald-900/60 flex items-start gap-2.5 text-xs text-slate-800 dark:text-emerald-100">
                    <Lightbulb className="w-4 h-4 text-[#15803D] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Key Takeaway: </span>
                      <span>{section.takeaway}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Hands-on Practice Step */}
            {lesson.practicePrompt && (
              <div className="p-5 rounded-2xl bg-[#F4F8F5] dark:bg-slate-800/60 border border-[#DCE6DF] dark:border-slate-700 space-y-1.5">
                <div className="text-xs font-semibold text-[#15803D] dark:text-emerald-400">
                  Quick Hands-On Practice Before the Quiz
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {lesson.practicePrompt}
                </p>
              </div>
            )}
          </section>

          {/* Section 2: Post-Lesson Mastery Quiz */}
          <section
            ref={quizSectionRef}
            className="bg-white dark:bg-slate-900 border border-[#CBE4D3] dark:border-emerald-900/70 rounded-2xl p-6 sm:p-8 space-y-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#EBF2ED] dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#15803D] dark:text-emerald-400">
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Part 2 · Post-Lesson Knowledge Quiz</span>
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  Verify Your Understanding: {lesson.lessonTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Complete this {lesson.quiz.length}-question check after reading the notes above. Score 60%+ to mark this lesson complete on your track.
                  {lesson.lastQuizScore !== null && ` Last attempt: ${lesson.lastQuizScore}%${lesson.quizPassed ? ' (Passed)' : ''}.`}
                </p>
              </div>
            </div>

            {quizResult ? (
              <div className="space-y-5">
                <div
                  className={`p-5 rounded-xl border ${
                    quizResult.passed
                      ? 'bg-[#EAF5EE] dark:bg-emerald-950/40 border-[#CBE4D3] dark:border-emerald-900'
                      : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      {quizResult.passed ? 'Lesson Completed' : 'Review Recommended'} · {quizResult.correctCount}/{quizResult.total} Correct
                    </span>
                    <span className="font-mono text-2xl font-bold tabular-nums text-[#15803D] dark:text-emerald-400">
                      {quizResult.score}%
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{quizResult.feedback}</p>
                </div>

                {/* Per-question explanation */}
                <div className="space-y-3">
                  {quizResult.questionResults.map((qr, idx) => (
                    <div
                      key={qr.id}
                      className="p-4 rounded-xl border border-[#E5EDE8] dark:border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-start gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {qr.isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                        )}
                        <span>
                          {idx + 1}. {qr.question}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 pl-6">
                        Correct answer:{' '}
                        <strong className="text-slate-900 dark:text-slate-200">{qr.correctOption}</strong> · {qr.explanation}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Track Progression Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleRetakeQuiz}
                    className="px-4 py-2.5 rounded-xl border border-[#DCE6DF] dark:border-slate-700 hover:bg-[#F3F8F5] dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retake Lesson Quiz</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-3">
                    {trackContext.nextTask ? (
                      <Link
                        to={`/lesson/${trackContext.nextTask.id}`}
                        className="px-5 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-colors"
                      >
                        <span>Next Lesson: {trackContext.nextTask.title}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <Link
                        to={`/assessments?week=${trackContext.weekNumber}`}
                        className="px-5 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-colors"
                      >
                        <span>Take Week {trackContext.weekNumber} Final Assessment</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {lesson.quiz.map((q, qIdx) => (
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
                                ? 'border-[#15803D] bg-[#EAF5EE] dark:bg-emerald-950/50 text-[#15803D] dark:text-emerald-200 font-medium'
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

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#EBF2ED] dark:border-slate-800">
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                    {answers.filter((a) => a >= 0).length} / {lesson.quiz.length} answered
                  </span>

                  <button
                    type="button"
                    disabled={submitting || answers.some((a) => a < 0)}
                    onClick={handleSubmitQuiz}
                    className="px-5 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-colors"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{submitting ? 'Grading Quiz...' : 'Submit Lesson Quiz'}</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Sequential Track Footer Navigation */}
          <nav
            aria-label="Lesson track navigation"
            className="flex flex-wrap items-center justify-between gap-3 pt-2"
          >
            {trackContext.prevTask ? (
              <Link
                to={`/lesson/${trackContext.prevTask.id}`}
                className="px-4 py-2.5 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-[#F3F8F5] dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 max-w-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Prev: {trackContext.prevTask.title}</span>
              </Link>
            ) : (
              <div />
            )}

            {trackContext.nextTask ? (
              <Link
                to={`/lesson/${trackContext.nextTask.id}`}
                className="px-4 py-2.5 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-[#F3F8F5] dark:hover:bg-slate-800 text-xs font-semibold text-[#15803D] dark:text-emerald-400 inline-flex items-center gap-2 max-w-xs"
              >
                <span className="truncate">Next: {trackContext.nextTask.title}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            ) : (
              <Link
                to="/roadmap"
                className="px-4 py-2.5 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-[#F3F8F5] dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-2"
              >
                <span>Return to Roadmap Overview</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            )}
          </nav>
        </div>
      ) : null}
    </AppShell>
  );
}
