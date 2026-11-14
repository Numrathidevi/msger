import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { SkillPathLogo } from '../components/Logo';
import { CareerRecommendation, User } from '../types';

const CAREER_OPTIONS = [
  'Full Stack Developer',
  'AI/ML Engineer',
  'Data Scientist',
  'Data Analyst',
  'Cybersecurity Analyst',
  'Cloud Engineer',
  'UI/UX Designer',
  'Software Engineer',
  'Other',
];

const TECHNICAL_SKILL_PRESETS = ['HTML', 'CSS', 'Git', 'SQL', 'Linux', 'Docker', 'REST APIs', 'Figma', 'Excel', 'Machine Learning', 'Cloud Basics', 'Cybersecurity Basics'];
const LANGUAGE_PRESETS = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'SQL', 'C#', 'Go', 'None yet'];
const LEARNING_STYLES = [
  'Hands-on Projects & Interactive Challenges',
  'Structured Video Courses & Guided Labs',
  'Reading Documentation & Concept Deep Dives',
  'Mixed Theory + Mini-Projects',
];

export function OnboardingPage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 10 Onboarding Questions State
  const [educationLevel, setEducationLevel] = useState(user?.educationLevel || 'Undergraduate (B.Tech / B.E.)');
  const [department, setDepartment] = useState('');
  const [technicalSkills, setTechnicalSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [programmingLanguages, setProgrammingLanguages] = useState<string[]>([]);
  const [certifications, setCertifications] = useState('');
  const [projects, setProjects] = useState('');
  const [careerInterest, setCareerInterest] = useState('Full Stack Developer');
  const [unsureCareer, setUnsureCareer] = useState(false);
  const [interestsNotes, setInterestsNotes] = useState('');
  const [exploreOtherCareers, setExploreOtherCareers] = useState(true);
  const [dailyStudyHours, setDailyStudyHours] = useState(2);
  const [learningStyle, setLearningStyle] = useState(LEARNING_STYLES[0]);

  // Step 5: AI Career Recommendations & Confirmation State
  const [recommendations, setRecommendations] = useState<CareerRecommendation[]>([]);
  const [suggestedCareer, setSuggestedCareer] = useState('');
  const [decisionMode, setDecisionMode] = useState<'accept' | 'explore' | 'custom'>('accept');
  const [selectedCareerGoal, setSelectedCareerGoal] = useState('');
  const [customCareerGoal, setCustomCareerGoal] = useState('');

  const toggleItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setList((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  };

  const handleAnalyze = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        educationLevel,
        department,
        technicalSkills: [
          ...technicalSkills,
          ...customSkill.split(',').map((s) => s.trim()).filter(Boolean),
        ],
        programmingLanguages: programmingLanguages.filter((l) => l !== 'None yet'),
        certifications: certifications.split(',').map((s) => s.trim()).filter(Boolean),
        projects: projects.split('\n').map((s) => s.trim()).filter(Boolean),
        careerInterest: unsureCareer ? '' : careerInterest,
        unsureCareer,
        interestsNotes,
        exploreOtherCareers,
        dailyStudyHours,
        learningStyle,
      };
      const data = await apiRequest<{
        recommendations: CareerRecommendation[];
        suggestedCareer: string;
      }>('/api/onboarding/analyze', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setRecommendations(data.recommendations);
      setSuggestedCareer(data.suggestedCareer);
      setSelectedCareerGoal(data.suggestedCareer);
      setStep(5);
    } catch (err) {
      setError((err as Error).message || 'Failed to analyze profile');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmGoal = async (goalToConfirm: string) => {
    if (!goalToConfirm.trim()) {
      setError('Please specify a career goal before generating your roadmap.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest<{ user: User }>('/api/onboarding/confirm-goal', {
        method: 'POST',
        body: JSON.stringify({ careerGoal: goalToConfirm.trim() }),
      });
      setUser(data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError((err as Error).message || 'Could not generate roadmap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F5F2] dark:bg-slate-950 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <SkillPathLogo />
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="tabular-nums font-medium">
              {step <= 4 ? `Questions · Step ${step} of 4` : 'Career Goal Confirmation'}
            </span>
            <button
              type="button"
              onClick={() => { logout(); navigate('/login'); }}
              className="text-slate-600 dark:text-slate-400 hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Clean Progress Bar */}
        <div className="w-full h-1.5 bg-[#DCE6DF] dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#15803D] transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        <div className="bg-white/95 dark:bg-slate-900 border border-[#DCE6DF] dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_-24px_rgba(21,128,61,0.12)] p-6 sm:p-8 space-y-6">
          {error && (
            <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Questions 1-2 */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Let&apos;s understand your academic background
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Before recommending any career or roadmap, we tailor everything around where you are starting from.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5">
                    1. What is your current education level?
                  </label>
                  <select
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    <option>High School</option>
                    <option>Undergraduate (B.Tech / B.E.)</option>
                    <option>Undergraduate (B.Sc / B.A. / BCA)</option>
                    <option>Postgraduate (M.Tech / M.Sc / MCA)</option>
                    <option>Bootcamp / Self-Taught</option>
                    <option>Working Professional Transitioning</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5">
                    2. What is your department or major?
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g., Computer Science, Information Technology, Electronics, Commerce"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-sm font-medium inline-flex items-center gap-2"
                >
                  <span>Next: Technical Skills</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Questions 3-6 */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Your existing skills, languages &amp; experience
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Select everything you have worked with so far. We will verify proficiency later through optional assessments.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">
                  3. What are your existing technical skills?
                </label>
                <div className="flex flex-wrap gap-2 mb-2.5">
                  {TECHNICAL_SKILL_PRESETS.map((sk) => {
                    const active = technicalSkills.includes(sk);
                    return (
                      <button
                        key={sk}
                        type="button"
                        onClick={() => toggleItem(technicalSkills, setTechnicalSkills, sk)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-[#15803D] text-white border-[#15803D]'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {sk}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  placeholder="Add any other skills (comma-separated, e.g., React, TensorFlow, AWS)"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">
                  4. What programming languages do you know?
                </label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_PRESETS.map((lang) => {
                    const active = programmingLanguages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleItem(programmingLanguages, setProgrammingLanguages, lang)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-[#15803D] text-white border-[#15803D]'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5">
                  5. What certifications have you completed?
                </label>
                <input
                  type="text"
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  placeholder="e.g., Google Data Analytics, AWS Cloud Practitioner (or leave blank)"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5">
                  6. What projects have you developed?
                </label>
                <textarea
                  rows={2}
                  value={projects}
                  onChange={(e) => setProjects(e.target.value)}
                  placeholder="List 1 project per line (e.g., Library Management System in Python)"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-sm font-medium inline-flex items-center gap-2"
                >
                  <span>Next: Career Interests</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Questions 7-8 */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Career direction &amp; exploration
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Tell us which role excites you—or let our Career Recommendation Agent guide you.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                  7. Which career are you interested in?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CAREER_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setUnsureCareer(false);
                        setCareerInterest(opt);
                      }}
                      className={`text-left px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        !unsureCareer && careerInterest === opt
                          ? 'border-[#15803D] bg-[#EAF5EE] dark:bg-emerald-950/50 text-[#15803D] dark:text-emerald-200'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setUnsureCareer(true)}
                    className={`sm:col-span-2 text-left px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      unsureCareer
                        ? 'border-[#15803D] bg-[#EAF5EE] dark:bg-emerald-950/50 text-[#15803D] dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    I am not sure about my career yet
                  </button>
                </div>
              </div>

              {unsureCareer && (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                    What subjects, activities, or problems do you enjoy working on?
                  </label>
                  <textarea
                    rows={3}
                    value={interestsNotes}
                    onChange={(e) => setInterestsNotes(e.target.value)}
                    placeholder="e.g., I enjoy analyzing patterns in datasets, solving logical puzzles, or designing clean visual interfaces."
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">
                  8. Are you interested in exploring other career options?
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setExploreOtherCareers(true)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                      exploreOtherCareers
                        ? 'border-[#15803D] bg-[#EAF5EE] dark:bg-emerald-950/50 text-[#15803D] dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Yes, show compatible alternatives
                  </button>
                  <button
                    type="button"
                    onClick={() => setExploreOtherCareers(false)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                      !exploreOtherCareers
                        ? 'border-[#15803D] bg-[#EAF5EE] dark:bg-emerald-950/50 text-[#15803D] dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    No, focus on my primary interest
                  </button>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-5 py-2.5 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-sm font-medium inline-flex items-center gap-2"
                >
                  <span>Next: Study Schedule</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Questions 9-10 */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Study pace &amp; learning preferences
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  We calibrate weekly task hours and tutorial formats around your schedule.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    9. How many hours can you study per day?
                  </label>
                  <span className="font-mono text-sm font-semibold text-[#15803D] dark:text-emerald-400 tabular-nums">
                    {dailyStudyHours} hrs/day
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={0.5}
                  value={dailyStudyHours}
                  onChange={(e) => setDailyStudyHours(Number(e.target.value))}
                  className="w-full accent-[#15803D]"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1 hr/day (Light)</span>
                  <span>3 hrs/day (Standard)</span>
                  <span>8 hrs/day (Intensive)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">
                  10. What is your preferred learning style?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LEARNING_STYLES.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setLearningStyle(style)}
                      className={`text-left px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        learningStyle === style
                          ? 'border-[#15803D] bg-[#EAF5EE] dark:bg-emerald-950/50 text-[#15803D] dark:text-emerald-200'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleAnalyze}
                  className="px-5 py-2.5 rounded-lg bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-medium inline-flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{loading ? 'Analyzing Profile...' : 'Analyze & Recommend Careers'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Career Recommendation Review & Goal Confirmation */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <div className="text-xs font-medium text-[#15803D] dark:text-emerald-400 mb-1">
                  Career Recommendation Agent Output
                </div>
                <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Your AI Recommended Career Options
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Would you like to follow this career recommendation, explore another career, or select your own career goal?
                </p>
              </div>

              {/* Recommended Career Cards */}
              <div className="space-y-3">
                {recommendations.map((rec, idx) => {
                  const isTop = idx === 0;
                  const active = selectedCareerGoal === rec.careerTitle && decisionMode !== 'custom';
                  return (
                    <div
                      key={rec.careerTitle}
                      onClick={() => {
                        setSelectedCareerGoal(rec.careerTitle);
                        setDecisionMode(isTop ? 'accept' : 'explore');
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                        active
                          ? 'border-[#15803D] bg-[#EAF5EE]/70 dark:bg-emerald-950/40'
                          : 'border-[#E2EAE5] dark:border-slate-800 hover:border-[#B6D4BF] dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <Compass className="w-4 h-4 text-[#15803D] dark:text-emerald-400" />
                          <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">
                            {rec.careerTitle}
                          </h3>
                          {isTop && (
                            <span className="text-xs font-medium text-[#15803D] dark:text-emerald-300">
                              · Top Match
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                          {rec.matchScore}% match · {rec.estimatedWeeks} weeks · {rec.salaryOutlook}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                        {rec.rationale}
                      </p>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Missing skills to learn: <span className="text-slate-800 dark:text-slate-200 font-medium">{rec.missingSkills.join(', ') || 'None'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Three Required Actions */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDecisionMode('accept');
                      setSelectedCareerGoal(suggestedCareer || recommendations[0]?.careerTitle || 'Full Stack Developer');
                    }}
                    className={`px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      decisionMode === 'accept'
                        ? 'bg-[#15803D] text-white border-[#15803D]'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Accept Recommendation
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecisionMode('explore')}
                    className={`px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      decisionMode === 'explore'
                        ? 'bg-[#15803D] text-white border-[#15803D]'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Explore Other Careers
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecisionMode('custom')}
                    className={`px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      decisionMode === 'custom'
                        ? 'bg-[#15803D] text-white border-[#15803D]'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Choose My Own Goal
                  </button>
                </div>

                {decisionMode === 'explore' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      Pick from any career track:
                    </label>
                    <select
                      value={selectedCareerGoal}
                      onChange={(e) => setSelectedCareerGoal(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    >
                      {CAREER_OPTIONS.filter((c) => c !== 'Other').map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}

                {decisionMode === 'custom' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      Enter your custom career goal:
                    </label>
                    <input
                      type="text"
                      value={customCareerGoal}
                      onChange={(e) => setCustomCareerGoal(e.target.value)}
                      placeholder="e.g., Robotics Software Engineer, Blockchain Developer"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Edit Answers</span>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      handleConfirmGoal(decisionMode === 'custom' ? customCareerGoal : selectedCareerGoal)
                    }
                    className="px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-medium inline-flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>
                      {loading
                        ? 'Building Personalized Roadmap...'
                        : `Confirm "${decisionMode === 'custom' ? (customCareerGoal || 'Goal') : selectedCareerGoal}" & Generate Roadmap`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
