import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Compass,
  Layers,
  CheckCircle2,
  ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SkillPathLogo } from '../components/Logo';

const EDUCATION_LEVELS = [
  'High School',
  'Undergraduate (B.Tech / B.E.)',
  'Undergraduate (B.Sc / B.A. / BCA)',
  'Postgraduate (M.Tech / M.Sc / MCA)',
  'Bootcamp / Self-Taught',
  'Working Professional Transitioning',
];

const DOMAINS = [
  { name: 'Full Stack Developer', desc: 'Frontend architecture, REST APIs, databases & deployment' },
  { name: 'AI/ML Engineer', desc: 'Machine learning systems, PyTorch & LLM pipelines' },
  { name: 'Data Scientist', desc: 'Statistical modeling, Python & experimentation' },
  { name: 'Data Analyst', desc: 'SQL analytics, BI dashboards & insight reporting' },
  { name: 'Cybersecurity Analyst', desc: 'Network defense, AppSec & threat detection' },
  { name: 'Cloud Engineer', desc: 'AWS/GCP infrastructure, Docker & CI/CD automation' },
  { name: 'UI/UX Designer', desc: 'User research, wireframes & scalable design systems' },
  { name: 'Software Engineer', desc: 'Algorithms, clean architecture & production testing' },
  { name: 'Not sure yet', desc: 'Take the mini quiz and let AI recommend a best-fit career track' },
];

const LEVELS = [
  {
    name: 'Beginner',
    desc: 'Starting from core syntax, foundations, and guided daily lessons.',
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

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [educationLevel, setEducationLevel] = useState(EDUCATION_LEVELS[1]);
  const [institution, setInstitution] = useState('');
  const [domain, setDomain] = useState('Full Stack Developer');
  const [level, setLevel] = useState('Beginner');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }
    if (!domain || !level) {
      setError('Please select both a domain and your current level.');
      return;
    }
    setSubmitting(true);
    try {
      await register({
        fullName,
        email,
        password,
        confirmPassword,
        educationLevel,
        institution,
        domain,
        level,
      });
      sessionStorage.setItem('skillpath_intake_choice', JSON.stringify({ domain, level }));
      navigate('/quick-quiz', { state: { domain, level } });
    } catch (err) {
      setError((err as Error).message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 bg-[#F0F5F2] dark:bg-slate-950">
      <div className="w-full max-w-4xl mx-auto bg-white/95 dark:bg-slate-900 border border-[#DCE6DF] dark:border-slate-800 rounded-[24px] shadow-[0_20px_50px_-24px_rgba(21,128,61,0.14)] p-6 sm:p-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5EDE8] dark:border-slate-800">
          <div className="space-y-2">
            <Link to="/login" className="inline-block">
              <SkillPathLogo />
            </Link>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white pt-1">
              Create your account
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Choose your domain and current level, then take a 4-question mini quiz to receive a personalized lesson plan based on your result.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#EEF4F0] dark:bg-slate-800 border border-[#DCE6DF] dark:border-slate-700 shrink-0 self-start">
            <Link
              to="/login"
              className="py-2 px-4 rounded-lg text-center text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#15803D] dark:hover:text-white transition-colors whitespace-nowrap"
            >
              Login
            </Link>
            <div className="py-2 px-4 rounded-lg bg-white dark:bg-slate-900 text-center text-xs font-semibold text-[#15803D] dark:text-emerald-400 shadow-xs whitespace-nowrap">
              Create Account
            </div>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Account Details */}
          <section className="space-y-4">
            <div className="text-xs font-semibold text-[#15803D] dark:text-emerald-400">
              Step 01 · Student Account Details
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Full name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Maya Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-[#FAFDFB] dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
                />
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maya@college.edu"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-[#FAFDFB] dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
                />
              </div>

              <div>
                <label htmlFor="reg-edu" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Education level
                </label>
                <select
                  id="reg-edu"
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-[#FAFDFB] dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
                >
                  {EDUCATION_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="reg-college" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  College or university
                </label>
                <input
                  id="reg-college"
                  type="text"
                  required
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="State University of Technology"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-[#FAFDFB] dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
                />
              </div>

              <div>
                <label htmlFor="reg-pw" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="reg-pw"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-[#FAFDFB] dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reg-pw2" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm password
                </label>
                <input
                  id="reg-pw2"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-[#FAFDFB] dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Which domain */}
          <section className="space-y-4 pt-6 border-t border-[#E5EDE8] dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EAF5EE] dark:bg-slate-800 flex items-center justify-center text-[#15803D] dark:text-emerald-400">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#15803D] dark:text-emerald-400">
                    Step 02 · Career Direction
                  </div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    Which domain do you need?
                  </h2>
                </div>
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

          {/* Section 3: Which level */}
          <section className="space-y-4 pt-6 border-t border-[#E5EDE8] dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EAF5EE] dark:bg-slate-800 flex items-center justify-center text-[#15803D] dark:text-emerald-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#15803D] dark:text-emerald-400">
                  Step 03 · Starting Tier
                </div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  Which level are you?
                </h2>
              </div>
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

          {/* Mini Quiz Preview Notice + Submit */}
          <div className="p-5 rounded-2xl bg-[#F4F8F5] dark:bg-slate-800/60 border border-[#DCE6DF] dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-[#DCE6DF] dark:border-slate-700 flex items-center justify-center text-[#15803D] dark:text-emerald-400 shrink-0 mt-0.5">
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Next: 4-Question Mini Quiz ({domain} · {level})
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Based on your mini quiz result, we provide your personalized 8-week learning plan so you can start your first lesson right away.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
            >
              <span>{submitting ? 'Creating account...' : 'Create Account & Start Mini Quiz'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#15803D] dark:text-emerald-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
