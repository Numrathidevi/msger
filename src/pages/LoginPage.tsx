import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SkillPathLogo } from '../components/Logo';

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [googleNotice, setGoogleNotice] = useState('');
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      const next = user.profileCompleted
        ? '/dashboard'
        : user.profile?.careerInterest || user.profile?.unsureCareer
        ? '/quick-quiz'
        : '/onboarding';
      navigate(next, { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setGoogleConfigured(Boolean(d.googleLoginConfigured)))
      .catch(() => setGoogleConfigured(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedIn = await login(email, password, rememberMe);
      const next = loggedIn.profileCompleted
        ? '/dashboard'
        : loggedIn.profile?.careerInterest || loggedIn.profile?.unsureCareer
        ? '/quick-quiz'
        : '/onboarding';
      navigate(next);
    } catch (err) {
      setError((err as Error).message || 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('SkillPath2026!');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F0F5F2] dark:bg-slate-950 lg:p-4 flex items-stretch">
      <div className="w-full max-w-[1380px] mx-auto bg-white/95 dark:bg-slate-900 lg:rounded-[24px] border border-[#DCE6DF] dark:border-slate-800 shadow-[0_20px_50px_-24px_rgba(21,128,61,0.14)] overflow-hidden grid lg:grid-cols-12">
      {/* Left Visual Column */}
      <div className="hidden lg:flex lg:col-span-5 relative overflow-hidden bg-[#14532D] text-white flex-col justify-between p-10">
        <img
          src="/src/assets/images/auth_learning_studio_1794630873731.jpg"
          alt="Calm focused learning workspace"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D3B23]/95 via-[#14532D]/75 to-[#14532D]/85" />

        <div className="relative z-10">
          <Link to="/">
            <SkillPathLogo inverted />
          </Link>
        </div>

        <div className="relative z-10 max-w-md space-y-5">
          <h2 className="font-editorial text-4xl font-semibold leading-tight text-balance">
            Chart your ascent from student foundations to career readiness.
          </h2>
          <p className="text-sm text-slate-200 leading-relaxed">
            Five specialized AI agents evaluate your real skill gaps, recommend aligned tech careers, build a tailored 8-week roadmap, and adapt weekly based on your quiz mastery.
          </p>
          <div className="pt-4 border-t border-white/15 space-y-2.5 text-sm text-slate-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#F4B860] shrink-0" />
              <span>Multi-agent skill gap &amp; career compatibility engine</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#F4B860] shrink-0" />
              <span>Live Monday–Sunday study tracker &amp; weekly reports</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#F4B860] shrink-0" />
              <span>Adaptive remediation when quiz scores fall below 40%</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-300">
          SkillPath AI · Personalized Career &amp; Learning Platform
        </div>
      </div>

      {/* Right Login & Create Account Column */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden mb-2">
            <SkillPathLogo />
          </div>

          {/* Front-Door Mode Bar: Login / Create Account */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#EEF4F0] dark:bg-slate-800 border border-[#DCE6DF] dark:border-slate-700">
            <div className="py-2 px-3 rounded-lg bg-white dark:bg-slate-900 text-center text-xs font-semibold text-[#15803D] dark:text-emerald-400 shadow-xs">
              Login
            </div>
            <Link
              to="/register"
              className="py-2 px-3 rounded-lg text-center text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#15803D] dark:hover:text-white transition-colors"
            >
              Create Account
            </Link>
          </div>

          <div className="space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sign in to your account
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Continue your weekly roadmap, or create an account to select your domain, level, and mini quiz.
            </p>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-[#FAFDFB] dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-medium text-[#15803D] dark:text-emerald-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-[#FAFDFB] dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-[#15803D] focus:ring-[#15803D]"
                />
                <span>Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <span>{submitting ? 'Signing in...' : 'Login'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                if (googleConfigured) {
                  setGoogleNotice('Redirecting to Google OAuth...');
                } else {
                  setGoogleNotice('Google OAuth is available when GOOGLE_CLIENT_ID is configured in environment secrets. Use email/password or a Demo Account below.');
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-[#F3F8F5] dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            {googleNotice && (
              <p className="text-xs text-slate-600 dark:text-slate-400 bg-[#F4F8F5] dark:bg-slate-900 border border-[#DCE6DF] dark:border-slate-800 rounded-xl p-3">
                {googleNotice}
              </p>
            )}
          </div>

          {/* Demo Accounts Panel for Evaluators */}
          <div className="p-4 rounded-2xl border border-[#E2EAE5] dark:border-slate-800 bg-[#F7FAF8] dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Judge &amp; Demo Accounts
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Password: SkillPath2026!</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('demo@skillpath.ai')}
                className="text-left px-3 py-2 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-[#EAF5EE] dark:hover:bg-slate-800 transition-colors"
              >
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Active Dashboard</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">demo@skillpath.ai</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('fresh@skillpath.ai')}
                className="text-left px-3 py-2 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-[#EAF5EE] dark:hover:bg-slate-800 transition-colors"
              >
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">10-Step Onboarding</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">fresh@skillpath.ai</div>
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-[#CBE4D3] dark:border-emerald-900/60 bg-[#EAF5EE]/70 dark:bg-emerald-950/30 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                New to SkillPath AI?
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Choose your domain &amp; level, take the mini quiz, and start your personalized lesson plan.
              </div>
            </div>
            <Link
              to="/register"
              className="px-4 py-2 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
