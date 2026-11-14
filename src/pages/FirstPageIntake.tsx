import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Compass, Layers, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SkillPathLogo } from '../components/Logo';

const DOMAINS = [
  { name: 'Full Stack Developer', desc: 'Frontend architecture, REST APIs, databases & deployment' },
  { name: 'AI/ML Engineer', desc: 'Machine learning systems, PyTorch & LLM pipelines' },
  { name: 'Data Scientist', desc: 'Statistical modeling, Python & experimentation' },
  { name: 'Data Analyst', desc: 'SQL analytics, BI dashboards & insight reporting' },
  { name: 'Cybersecurity Analyst', desc: 'Network defense, AppSec & threat detection' },
  { name: 'Cloud Engineer', desc: 'AWS/GCP infrastructure, Docker & CI/CD automation' },
  { name: 'UI/UX Designer', desc: 'User research, wireframes & scalable design systems' },
  { name: 'Software Engineer', desc: 'Algorithms, clean architecture & production testing' },
  { name: 'Not sure yet', desc: 'Attend the short calibration quiz and let AI recommend a fit' },
];

const LEVELS = [
  {
    name: 'Beginner',
    desc: 'Starting from core syntax, foundations, and guided daily milestones.',
  },
  {
    name: 'Intermediate',
    desc: 'Comfortable building small projects; ready for system architecture.',
  },
  {
    name: 'Advanced',
    desc: 'Strong technical baseline; targeting mastery and interview readiness.',
  },
];

const ASCENT_MILESTONES = [
  {
    step: '01',
    title: 'Calibrate Your Real Baseline',
    body: 'Instead of assuming mastery from keywords, SkillPath AI begins with a 4-question diagnostic quiz tailored to your chosen domain and level.',
  },
  {
    step: '02',
    title: 'Multi-Agent Skill Gap Mapping',
    body: 'Five specialized AI agents evaluate your proficiency against industry career benchmarks and explain your strongest career matches.',
  },
  {
    step: '03',
    title: 'Personalized 8-Week Roadmap',
    body: 'Every week breaks down into actionable lessons, verified official courses, practical exercises, and a portfolio mini-project.',
  },
  {
    step: '04',
    title: 'Adaptive Weekly Mastery Loop',
    body: 'Log study hours Monday through Sunday, generate weekly AI coach reports, and automatically inject revision tasks whenever quiz scores dip.',
  },
];

export function FirstPageIntake() {
  const { enterFromIntake } = useAuth();
  const navigate = useNavigate();

  const [domain, setDomain] = useState('Full Stack Developer');
  const [level, setLevel] = useState('Beginner');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleEnter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain || !level) {
      setError('Please select both a domain and your current level.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await enterFromIntake({ domain, level, fullName: fullName.trim() || undefined });
      sessionStorage.setItem('skillpath_intake_choice', JSON.stringify({ domain, level }));
      navigate('/quick-quiz', { state: { domain, level } });
    } catch (err) {
      setError((err as Error).message || 'Could not start your session.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F5F2] dark:bg-slate-950 text-slate-900 dark:text-slate-100 lg:p-4">
      <div className="max-w-[1380px] mx-auto bg-[#FAFDFB]/95 dark:bg-slate-900/95 backdrop-blur-xl lg:rounded-[24px] border border-[#DCE6DF] dark:border-slate-800 shadow-[0_20px_50px_-24px_rgba(21,128,61,0.14)] overflow-hidden flex flex-col">
        {/* Clean 3-Zone Top Bar */}
        <header className="bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border-b border-[#E5EDE8] dark:border-slate-800 px-6 lg:px-10 h-16 flex items-center justify-between gap-8">
          <Link to="/" className="whitespace-nowrap shrink-0">
            <SkillPathLogo />
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#domain-select" className="hover:text-[#15803D] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Domains
            </a>
            <a href="#level-select" className="hover:text-[#15803D] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Levels
            </a>
            <a href="#how-it-works" className="hover:text-[#15803D] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Pathway
            </a>
            <Link to="/login" className="hover:text-[#15803D] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Sign In
            </Link>
          </nav>

          <div className="shrink-0">
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#F3F8F5] dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0 transition-colors"
            >
              Student Login
            </Link>
          </div>
        </header>

        {/* Calm Hero Overview */}
        <section className="px-6 lg:px-10 pt-10 pb-8 bg-gradient-to-b from-white via-[#F6FAF7] to-[#F7FAF8] dark:from-slate-900 dark:to-slate-950/60 border-b border-[#E5EDE8] dark:border-slate-800">
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <p className="text-xs font-semibold text-[#15803D] dark:text-emerald-400">
                Guided by specialized AI career agents
              </p>

              <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white text-balance leading-[1.12]">
                Reach the Peaks of Your Potential
              </h1>

              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Turn ambitious career goals into clear daily steps. Choose the domain you need and your current level below, then attend a short quiz to calibrate your 8-week roadmap.
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-4">
                <a
                  href="#ascent-intake"
                  className="px-6 py-3 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-colors"
                >
                  <span>Choose Your Domain &amp; Level</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#15803D] underline underline-offset-4 decoration-slate-300 hover:decoration-[#15803D] transition-colors whitespace-nowrap"
                >
                  Access existing student account
                </Link>
              </div>
            </div>

            <div className="lg:w-[380px] shrink-0 rounded-2xl overflow-hidden border border-[#DCE6DF] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <img
                src="/src/assets/images/ascend_pathway_bento_1794632584960.jpg"
                alt="Calm focused learning workspace overlooking mountain horizons"
                referrerPolicy="no-referrer"
                className="w-full h-52 object-cover"
              />
              <div className="p-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-800 dark:text-slate-200">Personalized 8-Week Workspace</span>
                <span className="font-mono tabular-nums">4-question calibration</span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Grounded Intake Console */}
        <main id="ascent-intake" className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
          <form onSubmit={handleEnter} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#15803D] dark:text-emerald-400">
                  Step 01 · Base Camp Setup
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-0.5">
                  Where are you climbing from today?
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                Select your target field and skill tier, then enter SkillPath AI to complete the 4-question calibration quiz.
              </p>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Question 1: Domain */}
            <section id="domain-select" className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EAF5EE] dark:bg-slate-800 flex items-center justify-center text-[#15803D] dark:text-emerald-400">
                    <Compass className="w-4 h-4" />
                  </div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    1. What domain do you need?
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400 tabular-nums">9 tracks</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DOMAINS.map((d) => {
                  const selected = domain === d.name;
                  return (
                    <button
                      key={d.name}
                      type="button"
                      onClick={() => setDomain(d.name)}
                      className={`text-left p-4 rounded-xl border transition-colors ${
                        selected
                          ? 'border-[#15803D] bg-[#EAF5EE] dark:bg-emerald-950/40'
                          : 'border-[#E5EDE8] dark:border-slate-800 bg-[#FAFDFB] dark:bg-slate-950/40 hover:border-[#B6D4BF] dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {d.name}
                        </span>
                        {selected && <CheckCircle2 className="w-4 h-4 text-[#15803D] dark:text-emerald-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        {d.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Question 2: Level */}
            <section id="level-select" className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EAF5EE] dark:bg-slate-800 flex items-center justify-center text-[#15803D] dark:text-emerald-400">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  2. Which level are you?
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {LEVELS.map((lvl) => {
                  const selected = level === lvl.name;
                  return (
                    <button
                      key={lvl.name}
                      type="button"
                      onClick={() => setLevel(lvl.name)}
                      className={`text-left p-4 rounded-xl border transition-colors ${
                        selected
                          ? 'border-[#15803D] bg-[#EAF5EE] dark:bg-emerald-950/40'
                          : 'border-[#E5EDE8] dark:border-slate-800 bg-[#FAFDFB] dark:bg-slate-950/40 hover:border-[#B6D4BF] dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {lvl.name}
                        </span>
                        {selected && <CheckCircle2 className="w-4 h-4 text-[#15803D] dark:text-emerald-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        {lvl.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Enter Website & Attend Small Quiz */}
            <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex-1 max-w-sm">
                <label htmlFor="intake-name" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Your name (optional)
                </label>
                <input
                  id="intake-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-[#FAFDFB] dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
                />
              </div>

              <div className="flex flex-col sm:items-end gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>{submitting ? 'Entering SkillPath AI...' : 'Enter Website & Attend Small Quiz'}</span>
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Selected path: <strong className="text-slate-800 dark:text-slate-200">{domain}</strong> · <strong className="text-[#15803D] dark:text-emerald-400">{level}</strong>
                </span>
              </div>
            </div>
          </form>

          {/* How It Works Breakdown */}
          <section id="how-it-works" className="pt-8 border-t border-[#E2EAE5] dark:border-slate-800 space-y-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-[#15803D] dark:text-emerald-400">
                Step 02 · How the Ascent Works
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1 text-balance">
                Every week mapped, measured, and guided by specialized AI agents
              </h2>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl divide-y divide-[#EBF2ED] dark:divide-slate-800">
              {ASCENT_MILESTONES.map((item) => (
                <div key={item.step} className="p-5 sm:p-6 flex items-start gap-5">
                  <span className="font-mono text-xs font-semibold text-[#15803D] dark:text-emerald-400 pt-1 tabular-nums shrink-0">
                    {item.step}.
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* Quiet Footer */}
        <footer className="border-t border-[#E5EDE8] dark:border-slate-800 bg-white/75 dark:bg-slate-900/70">
          <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <SkillPathLogo />
              <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
              <span>Personalized Career &amp; Adaptive Learning</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#domain-select" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                Domains
              </a>
              <Link to="/login" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                Student Login
              </Link>
              <Link to="/register" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                Create Account
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
