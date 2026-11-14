import 'dotenv/config';
import express, { Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase } from './server/db.js';
import { authenticateToken, AuthedRequest, signToken } from './server/auth.js';
import {
  buildLearnerContext,
  evaluateQuizAndAdapt,
  generateIntakeQuiz,
  generateQuizForTopic,
  generateWeeklyReportAgent,
  runCareerRecommendationAgent,
  runMentorChatAgent,
  runRoadmapGeneratorAgent,
  runSkillAnalysisAgent,
} from './server/agents/orchestrator.js';
import { CAREER_BENCHMARKS } from './server/agents/careerCatalog.js';
import { sanitizeUrlSync } from './server/agents/resourceCatalog.js';
import { getOrCreateLessonContent, gradeLessonQuiz } from './server/agents/lessonEngine.js';

initDatabase();

const app = express();
app.use(express.json({ limit: '2mb' }));

function safeParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function formatUserResponse(userRow: Record<string, unknown>) {
  const profile = db.prepare('SELECT * FROM learner_profiles WHERE user_id = ?').get(userRow.id) as Record<string, unknown> | undefined;
  return {
    id: Number(userRow.id),
    fullName: String(userRow.full_name),
    email: String(userRow.email),
    educationLevel: String(userRow.education_level),
    institution: String(userRow.institution),
    avatarUrl: String(userRow.avatar_url || ''),
    profileCompleted: Boolean(userRow.profile_completed),
    themePreference: String(userRow.theme_preference || 'light'),
    profile: profile
      ? {
          department: String(profile.department || ''),
          technicalSkills: safeParse<string[]>(profile.technical_skills, []),
          programmingLanguages: safeParse<string[]>(profile.programming_languages, []),
          certifications: safeParse<string[]>(profile.certifications, []),
          projects: safeParse<string[]>(profile.projects, []),
          careerInterest: String(profile.career_interest || ''),
          unsureCareer: Boolean(profile.unsure_career),
          interestsNotes: String(profile.interests_notes || ''),
          exploreOtherCareers: Boolean(profile.explore_other_careers),
          dailyStudyHours: Number(profile.daily_study_hours || 2),
          learningStyle: String(profile.learning_style || 'Hands-on Projects'),
          selectedCareer: String(profile.selected_career || ''),
          careerGoalConfirmed: Boolean(profile.career_goal_confirmed),
          targetCompletionDate: String(profile.target_completion_date || ''),
          learningStage: String(profile.learning_stage || 'Onboarding'),
          learningStreak: Number(profile.learning_streak || 1),
        }
      : null,
  };
}

/* ============================================================================
 * PUBLIC AUTHENTICATION ROUTES
 * ========================================================================== */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    googleLoginConfigured: Boolean(process.env.GOOGLE_CLIENT_ID),
  });
});

app.post('/api/auth/register', (req, res: Response) => {
  const { fullName, email, password, confirmPassword, educationLevel, institution, domain, level } = req.body || {};

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'Full name, email, and password are required.' });
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const hash = bcrypt.hashSync(String(password), 10);
  const result = db
    .prepare(`
      INSERT INTO users (full_name, email, password_hash, education_level, institution, profile_completed)
      VALUES (?, ?, ?, ?, ?, 0)
    `)
    .run(
      String(fullName).trim(),
      normalizedEmail,
      hash,
      String(educationLevel || 'Undergraduate'),
      String(institution || '').trim()
    );

  const userId = Number(result.lastInsertRowid);
  const cleanDomain = domain ? String(domain).trim() : '';
  const cleanLevel = level ? String(level).trim() : '';
  const isUnsure = cleanDomain.toLowerCase().includes('not sure');

  if (cleanDomain) {
    const targetCareer = isUnsure ? '' : cleanDomain;
    db.prepare(`
      INSERT INTO learner_profiles (
        user_id, career_interest, unsure_career, interests_notes, selected_career, learning_stage
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      targetCareer,
      isUnsure ? 1 : 0,
      cleanLevel ? `Starting Level: ${cleanLevel}` : '',
      targetCareer || 'Full Stack Developer',
      cleanLevel ? `Diagnostic Quiz (${cleanLevel})` : 'Onboarding'
    );
  } else {
    db.prepare('INSERT INTO learner_profiles (user_id) VALUES (?)').run(userId);
  }

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
  const token = signToken({ userId, email: normalizedEmail }, true);

  return res.status(201).json({ token, user: formatUserResponse(userRow) });
});

app.post('/api/auth/login', (req, res: Response) => {
  const { email, password, rememberMe } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as Record<string, unknown> | undefined;
  if (!userRow || !bcrypt.compareSync(String(password), String(userRow.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = signToken({ userId: Number(userRow.id), email: normalizedEmail }, Boolean(rememberMe));
  return res.json({ token, user: formatUserResponse(userRow) });
});

app.post('/api/auth/forgot-password', (req, res: Response) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.prepare('SELECT id, full_name FROM users WHERE email = ?').get(normalizedEmail) as { id: number; full_name: string } | undefined;

  if (!user) {
    return res.json({
      message: 'If an account matches that email, a password reset code has been generated.',
    });
  }

  const code = crypto.randomBytes(3).toString('hex').toUpperCase();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, code, expiresAt);

  return res.json({
    message: 'Reset verification code issued. Enter the code below to set a new password.',
    resetCode: code,
  });
});

app.post('/api/auth/reset-password', (req, res: Response) => {
  const { email, resetCode, newPassword } = req.body || {};
  if (!email || !resetCode || !newPassword) {
    return res.status(400).json({ error: 'Email, reset code, and new password are required.' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail) as { id: number } | undefined;
  if (!user) {
    return res.status(400).json({ error: 'Invalid reset code or email.' });
  }

  const resetRow = db
    .prepare('SELECT * FROM password_resets WHERE user_id = ? AND token = ? AND used = 0 ORDER BY id DESC LIMIT 1')
    .get(user.id, String(resetCode).trim().toUpperCase()) as { id: number; expires_at: string } | undefined;

  if (!resetRow || new Date(resetRow.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired reset code.' });
  }

  const hash = bcrypt.hashSync(String(newPassword), 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRow.id);

  return res.json({ message: 'Password updated successfully. You may now log in.' });
});

/* ============================================================================
 * FIRST-PAGE INTAKE (DOMAIN + LEVEL) & POST-ENTRY SMALL QUIZ ROUTES
 * ========================================================================== */
app.post('/api/intake/enter', (req, res: Response) => {
  const { domain, level, fullName, email, password } = req.body || {};
  if (!domain || !level) {
    return res.status(400).json({ error: 'Please select both a domain and your current level.' });
  }

  const cleanDomain = String(domain).trim();
  const cleanLevel = String(level).trim();
  const isUnsure = cleanDomain.toLowerCase().includes('not sure');

  // If user provided email + password, create permanent account; otherwise provision instant learner session
  const normalizedEmail = email
    ? String(email).trim().toLowerCase()
    : `learner_${Date.now()}_${crypto.randomBytes(2).toString('hex')}@skillpath.local`;

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
  }

  const rawPassword = password && String(password).length >= 6 ? String(password) : crypto.randomBytes(12).toString('hex');
  const hash = bcrypt.hashSync(rawPassword, 10);
  const displayName = fullName && String(fullName).trim() ? String(fullName).trim() : 'Student Explorer';

  const result = db
    .prepare(`
      INSERT INTO users (full_name, email, password_hash, education_level, institution, profile_completed)
      VALUES (?, ?, ?, ?, ?, 0)
    `)
    .run(displayName, normalizedEmail, hash, cleanLevel, '');

  const userId = Number(result.lastInsertRowid);
  const targetCareer = isUnsure ? '' : cleanDomain;

  db.prepare(`
    INSERT INTO learner_profiles (
      user_id, career_interest, unsure_career, interests_notes, selected_career, learning_stage
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    targetCareer,
    isUnsure ? 1 : 0,
    `Starting Level: ${cleanLevel}`,
    targetCareer || 'Full Stack Developer',
    `Diagnostic Quiz (${cleanLevel})`
  );

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
  const token = signToken({ userId, email: normalizedEmail }, true);

  return res.status(201).json({ token, user: formatUserResponse(userRow), domain: cleanDomain, level: cleanLevel });
});

app.post('/api/intake/quiz', async (req, res: Response) => {
  const { domain, level } = req.body || {};
  if (!domain || !level) {
    return res.status(400).json({ error: 'Domain and level are required to generate the quiz.' });
  }
  const { questions, usedGemini } = await generateIntakeQuiz(String(domain), String(level));
  return res.json({ domain: String(domain), level: String(level), questions, usedGemini });
});

app.post('/api/intake/complete-quiz', authenticateToken, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { domain, level, questions, answers } = req.body || {};

  if (!domain || !level || !Array.isArray(questions) || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Invalid quiz completion payload.' });
  }

  let correctCount = 0;
  const strongAreas = new Set<string>();
  const weakAreas = new Set<string>();

  questions.forEach((q: { topic: string; correctIndex: number }, idx: number) => {
    if (answers[idx] === q.correctIndex) {
      correctCount += 1;
      strongAreas.add(q.topic);
    } else {
      weakAreas.add(q.topic);
    }
  });

  const score = Math.round((correctCount / Math.max(1, questions.length)) * 100);
  const strongList = Array.from(strongAreas).filter((s) => !weakAreas.has(s));
  const weakList = Array.from(weakAreas);

  let calibratedLevel = String(level);
  if (level === 'Beginner' && score >= 75) calibratedLevel = 'Intermediate';
  else if (level === 'Advanced' && score < 50) calibratedLevel = 'Intermediate';
  else if (level === 'Intermediate' && score < 40) calibratedLevel = 'Beginner';

  const isUnsure = String(domain).toLowerCase().includes('not sure');
  let chosenCareer = String(domain);
  if (isUnsure) {
    const recommendations = await runCareerRecommendationAgent(userId);
    chosenCareer = recommendations[0]?.careerTitle || 'Full Stack Developer';
  }

  await runSkillAnalysisAgent(userId, chosenCareer);

  // Calibrate initial baseline skill proficiencies based on diagnostic level + quiz score
  const baseScore = calibratedLevel === 'Advanced' ? 68 : calibratedLevel === 'Intermediate' ? 48 : 22;
  const adjustedBase = Math.min(85, Math.max(10, Math.round((baseScore + score * 0.4) / 1.2)));
  db.prepare(`
    UPDATE skill_assessments
    SET current_proficiency = CASE WHEN current_proficiency < ? THEN ? ELSE current_proficiency END,
        gap = MAX(0, required_proficiency - CASE WHEN current_proficiency < ? THEN ? ELSE current_proficiency END)
    WHERE user_id = ?
  `).run(adjustedBase, adjustedBase, adjustedBase, adjustedBase, userId);

  await runRoadmapGeneratorAgent(userId, chosenCareer);

  const feedback =
    score >= 75
      ? `Strong diagnostic result (${score}%)! Calibrated to ${calibratedLevel} in ${chosenCareer}. Your personalized 8-week roadmap is ready.`
      : score >= 40
      ? `Solid start (${score}%) at the ${calibratedLevel} level. We prioritized your gaps in ${weakList.join(', ') || 'core concepts'} in Week 1.`
      : `Scored ${score}% on the entry diagnostic—your roadmap has been calibrated to ${calibratedLevel} foundations with extra guided practice on ${weakList.join(', ') || 'core concepts'}.`;

  db.prepare(`
    INSERT INTO quiz_attempts (user_id, quiz_type, reference_id, title, questions_json, answers_json, score, strong_areas, weak_areas, ai_feedback)
    VALUES (?, 'diagnostic', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    chosenCareer,
    `Entry Diagnostic Quiz: ${domain} (${level})`,
    JSON.stringify(questions),
    JSON.stringify(answers),
    score,
    JSON.stringify(strongList),
    JSON.stringify(weakList),
    feedback
  );

  db.prepare(`
    INSERT INTO adaptive_events (user_id, trigger_type, score, weak_topics, actions_taken, summary)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    `Entry Diagnostic (${domain} · ${level})`,
    score,
    JSON.stringify(weakList),
    JSON.stringify([
      `Calibrated starting level to ${calibratedLevel}`,
      `Generated personalized 8-week ${chosenCareer} roadmap`,
    ]),
    feedback
  );

  db.prepare('UPDATE users SET profile_completed = 1 WHERE id = ?').run(userId);
  db.prepare('UPDATE learner_profiles SET selected_career = ?, career_goal_confirmed = 1, learning_stage = ?, interests_notes = ? WHERE user_id = ?').run(
    chosenCareer,
    `Week 1 · ${calibratedLevel}`,
    `Chosen Domain: ${domain} · Reported Level: ${level} · Calibrated Level: ${calibratedLevel}`,
    userId
  );

  const latestRoadmap = db.prepare('SELECT * FROM roadmaps WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(userId) as Record<string, unknown> | undefined;
  const week1 = latestRoadmap
    ? (db.prepare('SELECT * FROM roadmap_weeks WHERE roadmap_id = ? AND week_number = 1 LIMIT 1').get(latestRoadmap.id) as Record<string, unknown> | undefined)
    : undefined;
  const week1Tasks = week1
    ? (db.prepare('SELECT * FROM roadmap_tasks WHERE week_id = ? ORDER BY id ASC').all(week1.id) as Array<Record<string, unknown>>)
    : [];
  const miniProj = week1 ? safeParse<{ title?: string; description?: string }>(week1.mini_project, {}) : {};

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
  return res.json({
    score,
    correctCount,
    total: questions.length,
    calibratedLevel,
    chosenCareer,
    strongAreas: strongList,
    weakAreas: weakList,
    feedback,
    planSummary: {
      careerGoal: chosenCareer,
      totalWeeks: Number(latestRoadmap?.total_weeks || 8),
      calibratedLevel,
      week1Title: String(week1?.title || 'Foundations & Core Workflow'),
      week1Topics: week1 ? safeParse<string[]>(week1.topics, []) : [],
      firstTasks: week1Tasks.slice(0, 4).map((t) => ({
        id: Number(t.id),
        title: String(t.title),
        taskType: String(t.task_type),
        estimatedMinutes: Number(t.estimated_minutes),
      })),
      miniProjectTitle: String(miniProj.title || ''),
    },
    user: formatUserResponse(userRow),
  });
});

/* ============================================================================
 * PROTECTED USER & PROFILE ROUTES
 * ========================================================================== */
app.get('/api/auth/me', authenticateToken, (req: AuthedRequest, res: Response) => {
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.userId) as Record<string, unknown> | undefined;
  if (!userRow) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: formatUserResponse(userRow) });
});

app.put('/api/student/profile', authenticateToken, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const {
    fullName,
    educationLevel,
    institution,
    department,
    technicalSkills,
    programmingLanguages,
    certifications,
    projects,
    dailyStudyHours,
    learningStyle,
    themePreference,
  } = req.body || {};

  if (fullName || educationLevel || institution !== undefined || themePreference) {
    const cur = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
    db.prepare(`
      UPDATE users SET full_name = ?, education_level = ?, institution = ?, theme_preference = ? WHERE id = ?
    `).run(
      fullName ?? cur.full_name,
      educationLevel ?? cur.education_level,
      institution ?? cur.institution,
      themePreference ?? cur.theme_preference,
      userId
    );
  }

  const curProf = db.prepare('SELECT * FROM learner_profiles WHERE user_id = ?').get(userId) as Record<string, unknown>;
  db.prepare(`
    UPDATE learner_profiles
    SET department = ?, technical_skills = ?, programming_languages = ?, certifications = ?, projects = ?,
        daily_study_hours = ?, learning_style = ?, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(
    department ?? curProf.department,
    technicalSkills ? JSON.stringify(technicalSkills) : curProf.technical_skills,
    programmingLanguages ? JSON.stringify(programmingLanguages) : curProf.programming_languages,
    certifications ? JSON.stringify(certifications) : curProf.certifications,
    projects ? JSON.stringify(projects) : curProf.projects,
    dailyStudyHours ?? curProf.daily_study_hours,
    learningStyle ?? curProf.learning_style,
    userId
  );

  // Re-evaluate skill gap cleanly if profile skills changed
  if (technicalSkills || programmingLanguages) {
    await runSkillAnalysisAgent(userId);
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
  return res.json({ user: formatUserResponse(updated) });
});

app.post('/api/student/change-password', authenticateToken, (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Current password and a new password (min 6 chars) are required.' });
  }
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as { password_hash: string };
  if (!bcrypt.compareSync(String(currentPassword), user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  const hash = bcrypt.hashSync(String(newPassword), 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
  return res.json({ message: 'Password updated successfully.' });
});

/* ============================================================================
 * ONBOARDING & CAREER CONFIRMATION ROUTES
 * ========================================================================== */
app.post('/api/onboarding/analyze', authenticateToken, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const {
    educationLevel,
    department,
    technicalSkills = [],
    programmingLanguages = [],
    certifications = [],
    projects = [],
    careerInterest = '',
    unsureCareer = false,
    interestsNotes = '',
    exploreOtherCareers = true,
    dailyStudyHours = 2,
    learningStyle = 'Hands-on Projects',
  } = req.body || {};

  if (educationLevel) {
    db.prepare('UPDATE users SET education_level = ? WHERE id = ?').run(String(educationLevel), userId);
  }

  db.prepare(`
    UPDATE learner_profiles
    SET department = ?, technical_skills = ?, programming_languages = ?, certifications = ?, projects = ?,
        career_interest = ?, unsure_career = ?, interests_notes = ?, explore_other_careers = ?,
        daily_study_hours = ?, learning_style = ?, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(
    String(department || ''),
    JSON.stringify(technicalSkills),
    JSON.stringify(programmingLanguages),
    JSON.stringify(certifications),
    JSON.stringify(projects),
    String(careerInterest || ''),
    unsureCareer ? 1 : 0,
    String(interestsNotes || ''),
    exploreOtherCareers ? 1 : 0,
    Number(dailyStudyHours || 2),
    String(learningStyle || 'Hands-on Projects'),
    userId
  );

  // Run Career Recommendation Agent first, then Skill Profiling against top match
  const recommendations = await runCareerRecommendationAgent(userId);
  const topCareer = (!unsureCareer && careerInterest) ? careerInterest : recommendations[0]?.careerTitle || 'Full Stack Developer';
  const skills = await runSkillAnalysisAgent(userId, topCareer);

  return res.json({
    recommendations,
    skills,
    suggestedCareer: topCareer,
    careerOptions: Object.keys(CAREER_BENCHMARKS),
  });
});

app.post('/api/onboarding/confirm-goal', authenticateToken, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { careerGoal } = req.body || {};
  if (!careerGoal || !String(careerGoal).trim()) {
    return res.status(400).json({ error: 'Please select or enter a career goal.' });
  }

  const chosenCareer = String(careerGoal).trim();
  db.prepare(`
    UPDATE learner_profiles
    SET selected_career = ?, career_goal_confirmed = 1, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(chosenCareer, userId);

  db.prepare('UPDATE career_recommendations SET is_selected = CASE WHEN lower(career_title) = lower(?) THEN 1 ELSE 0 END WHERE user_id = ?').run(
    chosenCareer,
    userId
  );

  await runSkillAnalysisAgent(userId, chosenCareer);
  const roadmap = await runRoadmapGeneratorAgent(userId, chosenCareer);

  db.prepare('UPDATE users SET profile_completed = 1 WHERE id = ?').run(userId);

  // Seed initial mentor welcome message for newly onboarded student
  const msgCount = db.prepare('SELECT COUNT(*) as cnt FROM mentor_messages WHERE user_id = ?').get(userId) as { cnt: number };
  if (msgCount.cnt === 0) {
    const ctx = buildLearnerContext(userId);
    db.prepare('INSERT INTO mentor_messages (user_id, role, content) VALUES (?, ?, ?)').run(
      userId,
      'assistant',
      `Welcome to SkillPath AI, ${ctx.fullName}! Your ${chosenCareer} roadmap is ready with ${roadmap.totalWeeks} weekly milestones calibrated to ${ctx.dailyStudyHours} hours/day. Let me know anytime if you want study advice, project feedback, or help with a difficult topic.`
    );
  }

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
  return res.json({
    user: formatUserResponse(userRow),
    roadmap,
  });
});

/* ============================================================================
 * DASHBOARD AGGREGATED DATA (NO FIXED / FAKE PERCENTAGES)
 * ========================================================================== */
app.get('/api/dashboard', authenticateToken, (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
  const user = formatUserResponse(userRow);

  const skills = db.prepare('SELECT * FROM skill_assessments WHERE user_id = ? ORDER BY gap DESC').all(userId) as Array<Record<string, unknown>>;
  const totalSkills = skills.length;
  const verifiedSkills = skills.filter((s) => Number(s.verified) === 1).length;
  const missingSkills = skills.filter((s) => Number(s.current_proficiency) < 35).length;
  const skillsToImprove = skills.filter((s) => Number(s.current_proficiency) >= 35 && Number(s.gap) > 10).length;

  const readinessScore =
    totalSkills > 0
      ? Math.round(
          skills.reduce((acc, s) => {
            const ratio = Math.min(1, Number(s.current_proficiency) / Math.max(1, Number(s.required_proficiency)));
            return acc + ratio * 100;
          }, 0) / totalSkills
        )
      : 0;

  const weeks = db.prepare('SELECT * FROM roadmap_weeks WHERE user_id = ? ORDER BY week_number ASC').all(userId) as Array<Record<string, unknown>>;
  const allTasks = db.prepare('SELECT * FROM roadmap_tasks WHERE user_id = ? ORDER BY id ASC').all(userId) as Array<Record<string, unknown>>;

  const weekSummaries = weeks.map((w) => {
    const wTasks = allTasks.filter((t) => Number(t.week_id) === Number(w.id));
    const completed = wTasks.filter((t) => Number(t.completed) === 1).length;
    const total = wTasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      id: Number(w.id),
      weekNumber: Number(w.week_number),
      title: String(w.title),
      completedTasks: completed,
      totalTasks: total,
      progressPct: pct,
      isAdapted: Boolean(w.is_adapted),
      miniProject: safeParse(w.mini_project, { title: '', description: '', deliverables: [] }),
    };
  });

  // Active week = first week under 100%, or last week
  const activeWeek = weekSummaries.find((w) => w.progressPct < 100) || weekSummaries[weekSummaries.length - 1] || null;
  const activeWeekNum = activeWeek?.weekNumber || 1;

  const hoursSum = db.prepare('SELECT SUM(hours_logged) as total FROM daily_study_logs WHERE user_id = ?').get(userId) as { total: number | null };
  const activeWeekHours = db
    .prepare('SELECT SUM(hours_logged) as total FROM daily_study_logs WHERE user_id = ? AND week_number = ?')
    .get(userId, activeWeekNum) as { total: number | null };

  const dailyLogs = db
    .prepare('SELECT day_name, hours_logged, tasks_done FROM daily_study_logs WHERE user_id = ? AND week_number = ?')
    .all(userId, activeWeekNum) as Array<{ day_name: string; hours_logged: number; tasks_done: number }>;

  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const logMap = new Map(dailyLogs.map((l) => [l.day_name, l]));
  const weeklyChart = dayOrder.map((d) => ({
    day: d,
    hours: Number(logMap.get(d)?.hours_logged ?? 0),
    tasks: Number(logMap.get(d)?.tasks_done ?? 0),
  }));

  const quizAttempts = db.prepare('SELECT id, title, score, created_at FROM quiz_attempts WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const completedResources = db.prepare('SELECT COUNT(*) as cnt FROM saved_resources WHERE user_id = ? AND completed = 1').get(userId) as { cnt: number };

  const activeWeekTasks = activeWeek
    ? allTasks.filter((t) => Number(t.week_id) === activeWeek.id && Number(t.completed) === 0).slice(0, 5)
    : [];

  const adaptiveEvents = (
    db
      .prepare('SELECT * FROM adaptive_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 3')
      .all(userId) as Array<Record<string, unknown>>
  ).map((e) => ({
    ...e,
    weak_topics: safeParse(e.weak_topics, []),
    actions_taken: safeParse(e.actions_taken, []),
  }));

  const upcomingProjects = weeks
    .filter((w) => Number(w.week_number) >= activeWeekNum)
    .slice(0, 2)
    .map((w) => ({
      weekNumber: Number(w.week_number),
      ...safeParse<{ title: string; description: string }>(w.mini_project, { title: 'Mini Project', description: '' }),
    }));

  return res.json({
    user,
    careerGoal: {
      selectedCareer: user.profile?.selectedCareer || 'Not Selected',
      readinessScore,
      targetCompletionDate: user.profile?.targetCompletionDate || '',
      learningStage: activeWeek ? `Week ${activeWeek.weekNumber}: ${activeWeek.title}` : user.profile?.learningStage || 'Getting Started',
    },
    skillOverview: {
      totalSkills,
      verifiedSkills,
      skillsToImprove,
      missingSkills,
    },
    learningStats: {
      totalLearningHours: Number((hoursSum?.total ?? 0).toFixed(1)),
      coursesCompleted: completedResources.cnt,
      assessmentsCompleted: quizAttempts.length,
      learningStreak: user.profile?.learningStreak || 1,
    },
    weeklyProgress: {
      currentWeek: activeWeekNum,
      weekTitle: activeWeek?.title || 'Foundations',
      completionPct: activeWeek?.progressPct || 0,
      tasksCompleted: activeWeek?.completedTasks || 0,
      pendingTasks: activeWeek ? activeWeek.totalTasks - activeWeek.completedTasks : 0,
      learningHours: Number((activeWeekHours?.total ?? 0).toFixed(1)),
      chart: weeklyChart,
    },
    upcomingTasks: activeWeekTasks.map((t) => ({
      id: Number(t.id),
      title: String(t.title),
      taskType: String(t.task_type),
      estimatedMinutes: Number(t.estimated_minutes),
      dueDate: String(t.due_date || ''),
      isAdaptiveRemedial: Boolean(t.is_adaptive_remedial),
    })),
    upcomingProjects,
    adaptiveEvents,
    weekSummaries,
  });
});

/* ============================================================================
 * SKILL ANALYSIS & CAREER RECOMMENDATIONS ROUTES
 * ========================================================================== */
app.get('/api/skills', authenticateToken, (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const skills = db.prepare('SELECT * FROM skill_assessments WHERE user_id = ? ORDER BY gap DESC').all(userId);
  return res.json({ skills });
});

app.post('/api/skills/analyze', authenticateToken, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { targetCareer } = req.body || {};
  const skills = await runSkillAnalysisAgent(userId, targetCareer);
  const rows = db.prepare('SELECT * FROM skill_assessments WHERE user_id = ? ORDER BY gap DESC').all(userId);
  return res.json({ skills: rows, evaluated: skills });
});

app.get('/api/careers', authenticateToken, (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const rows = (
    db
      .prepare('SELECT * FROM career_recommendations WHERE user_id = ? ORDER BY match_score DESC')
      .all(userId) as Array<Record<string, unknown>>
  ).map((r) => ({
    id: Number(r.id),
    careerTitle: String(r.career_title),
    matchScore: Number(r.match_score),
    rationale: String(r.rationale),
    missingSkills: safeParse<string[]>(r.missing_skills, []),
    requiredSkills: safeParse<string[]>(r.required_skills, []),
    estimatedWeeks: Number(r.estimated_weeks),
    salaryOutlook: String(r.salary_outlook),
    isSelected: Boolean(r.is_selected),
  }));

  return res.json({
    recommendations: rows,
    allCareers: Object.values(CAREER_BENCHMARKS).map((b) => ({
      title: b.title,
      summary: b.summary,
      estimatedWeeks: b.estimatedWeeks,
      salaryOutlook: b.salaryOutlook,
      requiredSkills: b.requiredSkills.map((s) => s.name),
    })),
  });
});

app.post('/api/careers/refresh', authenticateToken, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  await runCareerRecommendationAgent(userId);
  const rows = (
    db
      .prepare('SELECT * FROM career_recommendations WHERE user_id = ? ORDER BY match_score DESC')
      .all(userId) as Array<Record<string, unknown>>
  ).map((r) => ({
    id: Number(r.id),
    careerTitle: String(r.career_title),
    matchScore: Number(r.match_score),
    rationale: String(r.rationale),
    missingSkills: safeParse<string[]>(r.missing_skills, []),
    requiredSkills: safeParse<string[]>(r.required_skills, []),
    estimatedWeeks: Number(r.estimated_weeks),
    salaryOutlook: String(r.salary_outlook),
    isSelected: Boolean(r.is_selected),
  }));
  return res.json({ recommendations: rows });
});

app.post('/api/careers/select', authenticateToken, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { careerGoal } = req.body || {};
  if (!careerGoal) return res.status(400).json({ error: 'careerGoal is required' });

  const chosen = String(careerGoal).trim();
  db.prepare('UPDATE career_recommendations SET is_selected = CASE WHEN lower(career_title) = lower(?) THEN 1 ELSE 0 END WHERE user_id = ?').run(chosen, userId);

  await runSkillAnalysisAgent(userId, chosen);
  const roadmap = await runRoadmapGeneratorAgent(userId, chosen);

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
  return res.json({ user: formatUserResponse(userRow), roadmap });
});

/* ============================================================================
 * LEARNING ROADMAP & TASK COMPLETION ROUTES
 * ========================================================================== */
app.get('/api/roadmap', authenticateToken, (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const roadmap = db.prepare('SELECT * FROM roadmaps WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(userId) as Record<string, unknown> | undefined;
  if (!roadmap) return res.json({ roadmap: null, weeks: [] });

  const weekRows = db.prepare('SELECT * FROM roadmap_weeks WHERE roadmap_id = ? ORDER BY week_number ASC').all(roadmap.id) as Array<Record<string, unknown>>;
  const taskRows = db
    .prepare(`
      SELECT t.*, COALESCE(lc.quiz_passed, 0) as quiz_passed, lc.last_quiz_score
      FROM roadmap_tasks t
      LEFT JOIN lesson_contents lc ON lc.task_id = t.id AND lc.user_id = t.user_id
      WHERE t.user_id = ?
      ORDER BY t.id ASC
    `)
    .all(userId) as Array<Record<string, unknown>>;

  const weeks = weekRows.map((w) => {
    const tasks = taskRows
      .filter((t) => Number(t.week_id) === Number(w.id))
      .map((t) => ({
        id: Number(t.id),
        title: String(t.title),
        taskType: String(t.task_type),
        estimatedMinutes: Number(t.estimated_minutes),
        completed: Boolean(t.completed),
        completedAt: String(t.completed_at || ''),
        dueDate: String(t.due_date || ''),
        isAdaptiveRemedial: Boolean(t.is_adaptive_remedial),
        quizPassed: Boolean(t.quiz_passed),
        lastQuizScore: t.last_quiz_score !== null && t.last_quiz_score !== undefined ? Number(t.last_quiz_score) : null,
      }));
    const completedCount = tasks.filter((t) => t.completed).length;
    const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    return {
      id: Number(w.id),
      weekNumber: Number(w.week_number),
      title: String(w.title),
      learningObjectives: safeParse<string[]>(w.learning_objectives, []),
      topics: safeParse<string[]>(w.topics, []),
      recommendedCourses: safeParse<Array<{ title: string; provider: string; url: string; duration: string }>>(w.recommended_courses, []).map((c) => ({
        ...c,
        url: sanitizeUrlSync(c.url, c.title, String(w.title)),
      })),
      tutorialLinks: safeParse<Array<{ title: string; url: string; type: string }>>(w.tutorial_links, []).map((t) => ({
        ...t,
        url: sanitizeUrlSync(t.url, t.title, String(w.title)),
      })),
      practicalExercises: safeParse<string[]>(w.practical_exercises, []),
      miniProject: safeParse(w.mini_project, { title: '', description: '', deliverables: [] }),
      expectedHours: Number(w.expected_hours),
      isAdapted: Boolean(w.is_adapted),
      adaptationNote: String(w.adaptation_note || ''),
      tasks,
      completedCount,
      totalCount: tasks.length,
      progressPct,
    };
  });

  const totalTasks = weeks.reduce((acc, w) => acc + w.totalCount, 0);
  const completedTasks = weeks.reduce((acc, w) => acc + w.completedCount, 0);
  const overallProgressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return res.json({
    roadmap: {
      id: Number(roadmap.id),
      careerGoal: String(roadmap.career_goal),
      totalWeeks: Number(roadmap.total_weeks),
      overallProgressPct,
      completedTasks,
      totalTasks,
    },
    weeks,
  });
});

app.patch('/api/roadmap/tasks/:taskId', authenticateToken, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const taskId = Number(req.params.taskId);
  const { completed } = req.body || {};

  const task = db
    .prepare('SELECT t.*, w.week_number, w.title as week_title FROM roadmap_tasks t JOIN roadmap_weeks w ON w.id = t.week_id WHERE t.id = ? AND t.user_id = ?')
    .get(taskId, userId) as { id: number; week_id: number; week_number: number; week_title: string; completed: number } | undefined;

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const newStatus = completed !== undefined ? (completed ? 1 : 0) : task.completed ? 0 : 1;
  db.prepare('UPDATE roadmap_tasks SET completed = ?, completed_at = ? WHERE id = ?').run(
    newStatus,
    newStatus ? new Date().toISOString() : '',
    taskId
  );

  // Sync today's study log task counter
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDay = dayNames[new Date().getDay()];
  const delta = newStatus === 1 ? 1 : -1;
  db.prepare(`
    INSERT INTO daily_study_logs (user_id, week_number, day_name, hours_logged, tasks_done)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, week_number, day_name) DO UPDATE SET
      tasks_done = MAX(0, tasks_done + ?),
      hours_logged = CASE WHEN ? > 0 AND hours_logged = 0 THEN 0.5 ELSE hours_logged END,
      updated_at = datetime('now')
  `).run(userId, task.week_number, todayDay, newStatus === 1 ? 0.5 : 0, Math.max(0, delta), delta, delta);

  // Update weekly report snapshot cleanly
  await generateWeeklyReportAgent(userId, task.week_number);

  const wTasks = db.prepare('SELECT completed FROM roadmap_tasks WHERE week_id = ?').all(task.week_id) as Array<{ completed: number }>;
  const doneCount = wTasks.filter((t) => t.completed === 1).length;
  const progressPct = wTasks.length > 0 ? Math.round((doneCount / wTasks.length) * 100) : 0;

  return res.json({
    taskId,
    completed: Boolean(newStatus),
    weekNumber: task.week_number,
    weekProgressPct: progressPct,
    doneCount,
    totalCount: wTasks.length,
  });
});

/* ============================================================================
 * PER-LESSON CLEAR NOTES & POST-LESSON QUIZ ROUTES
 * ========================================================================== */
app.get('/api/lessons/:taskId', authenticateToken, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const taskId = Number(req.params.taskId);
  if (!Number.isFinite(taskId)) {
    return res.status(400).json({ error: 'Invalid lesson id.' });
  }

  const payload = await getOrCreateLessonContent(userId, taskId);
  if (!payload) {
    return res.status(404).json({ error: 'Lesson not found in your learning track.' });
  }

  return res.json(payload);
});

app.post('/api/lessons/:taskId/quiz-submit', authenticateToken, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const taskId = Number(req.params.taskId);
  const { answers } = req.body || {};

  if (!Number.isFinite(taskId) || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Invalid lesson quiz submission.' });
  }

  const result = gradeLessonQuiz({ userId, taskId, answers });
  if (!result) {
    return res.status(404).json({ error: 'Lesson quiz not found.' });
  }

  const refreshed = await getOrCreateLessonContent(userId, taskId);
  if (result.passed && refreshed) {
    await generateWeeklyReportAgent(userId, refreshed.lesson.weekNumber);
  }

  return res.json({
    ...result,
    lesson: refreshed?.lesson,
    trackContext: refreshed?.trackContext,
  });
});

/* ============================================================================
 * WEEKLY PROGRESS & REPORTS ROUTES
 * ========================================================================== */
app.get('/api/progress', authenticateToken, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const weeks = db.prepare('SELECT * FROM roadmap_weeks WHERE user_id = ? ORDER BY week_number ASC').all(userId) as Array<Record<string, unknown>>;
  const tasks = db.prepare('SELECT * FROM roadmap_tasks WHERE user_id = ?').all(userId) as Array<Record<string, unknown>>;
  const logs = db.prepare('SELECT * FROM daily_study_logs WHERE user_id = ?').all(userId) as Array<{
    week_number: number;
    day_name: string;
    hours_logged: number;
    tasks_done: number;
  }>;
  const quizzes = db.prepare("SELECT * FROM quiz_attempts WHERE user_id = ? AND quiz_type = 'weekly' ORDER BY created_at DESC").all(userId) as Array<Record<string, unknown>>;
  let reports = db.prepare('SELECT * FROM weekly_reports WHERE user_id = ? ORDER BY week_number ASC').all(userId) as Array<Record<string, unknown>>;

  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekStats = weeks.map((w) => {
    const num = Number(w.week_number);
    const wTasks = tasks.filter((t) => Number(t.week_id) === Number(w.id));
    const completed = wTasks.filter((t) => Number(t.completed) === 1).length;
    const total = wTasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const wLogs = logs.filter((l) => l.week_number === num);
    const totalHours = Number(wLogs.reduce((a, b) => a + b.hours_logged, 0).toFixed(1));
    const q = quizzes.find((qz) => Number(qz.reference_id) === num);
    const dailyTracker = dayOrder.map((d) => {
      const found = wLogs.find((l) => l.day_name === d);
      return { day: d, hours: found?.hours_logged ?? 0, tasksDone: found?.tasks_done ?? 0 };
    });
    return {
      weekNumber: num,
      title: String(w.title),
      topics: safeParse<string[]>(w.topics, []),
      tasksCompleted: completed,
      tasksRemaining: total - completed,
      totalTasks: total,
      progressPct: pct,
      studyHours: totalHours,
      quizScore: q ? Number(q.score) : null,
      dailyTracker,
    };
  });

  // Determine current active week
  const activeWeek = weekStats.find((w) => w.progressPct < 100) || weekStats[weekStats.length - 1];
  if (activeWeek && !reports.some((r) => Number(r.week_number) === activeWeek.weekNumber)) {
    await generateWeeklyReportAgent(userId, activeWeek.weekNumber);
    reports = db.prepare('SELECT * FROM weekly_reports WHERE user_id = ? ORDER BY week_number ASC').all(userId) as Array<Record<string, unknown>>;
  }

  const skillsVerified = db.prepare('SELECT skill_name, current_proficiency, verified FROM skill_assessments WHERE user_id = ? AND (verified = 1 OR current_proficiency >= 60)').all(userId);

  return res.json({
    currentWeekNumber: activeWeek?.weekNumber || 1,
    weekStats,
    reports,
    skillsImproved: skillsVerified,
  });
});

app.post('/api/progress/log-day', authenticateToken, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { weekNumber, dayName, hoursLogged, tasksDone } = req.body || {};
  if (!weekNumber || !dayName) return res.status(400).json({ error: 'weekNumber and dayName are required' });

  db.prepare(`
    INSERT INTO daily_study_logs (user_id, week_number, day_name, hours_logged, tasks_done, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, week_number, day_name) DO UPDATE SET
      hours_logged = excluded.hours_logged,
      tasks_done = COALESCE(excluded.tasks_done, tasks_done),
      updated_at = datetime('now')
  `).run(userId, Number(weekNumber), String(dayName), Number(hoursLogged ?? 0), Number(tasksDone ?? 0));

  const report = await generateWeeklyReportAgent(userId, Number(weekNumber));
  return res.json({ success: true, report });
});

app.post('/api/progress/generate-report', authenticateToken, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { weekNumber } = req.body || {};
  const report = await generateWeeklyReportAgent(userId, Number(weekNumber || 1));
  return res.json({ report });
});

/* ============================================================================
 * ASSESSMENTS & ADAPTIVE LEARNING ENGINE ROUTES
 * ========================================================================== */
app.get('/api/assessments', authenticateToken, (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const attempts = (
    db
      .prepare('SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Array<Record<string, unknown>>
  ).map((a) => ({
    id: Number(a.id),
    quizType: String(a.quiz_type),
    referenceId: String(a.reference_id),
    title: String(a.title),
    score: Number(a.score),
    strongAreas: safeParse<string[]>(a.strong_areas, []),
    weakAreas: safeParse<string[]>(a.weak_areas, []),
    aiFeedback: String(a.ai_feedback),
    createdAt: String(a.created_at),
  }));

  const adaptiveEvents = (
    db
      .prepare('SELECT * FROM adaptive_events WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Array<Record<string, unknown>>
  ).map((e) => ({
    id: Number(e.id),
    triggerType: String(e.trigger_type),
    score: Number(e.score),
    weakTopics: safeParse<string[]>(e.weak_topics, []),
    actionsTaken: safeParse<string[]>(e.actions_taken, []),
    summary: String(e.summary),
    createdAt: String(e.created_at),
  }));

  const weeks = db.prepare('SELECT week_number, title FROM roadmap_weeks WHERE user_id = ? ORDER BY week_number ASC').all(userId);
  const skills = db.prepare('SELECT skill_name, current_proficiency, required_proficiency, verified FROM skill_assessments WHERE user_id = ?').all(userId);

  return res.json({ attempts, adaptiveEvents, weeks, skills });
});

app.post('/api/assessments/start', authenticateToken, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { quizType, referenceId } = req.body || {};
  if (!quizType || !referenceId) {
    return res.status(400).json({ error: 'quizType and referenceId are required' });
  }
  const quiz = await generateQuizForTopic(userId, quizType, String(referenceId));
  return res.json(quiz);
});

app.post('/api/assessments/submit', authenticateToken, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { quizType, referenceId, title, questions, answers } = req.body || {};
  if (!quizType || !referenceId || !Array.isArray(questions) || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Invalid quiz submission payload' });
  }

  const result = await evaluateQuizAndAdapt({
    userId,
    quizType,
    referenceId: String(referenceId),
    title: String(title || 'Assessment'),
    questions,
    answers,
  });

  return res.json(result);
});

/* ============================================================================
 * COURSES & RESOURCES ROUTES
 * ========================================================================== */
app.get('/api/resources', authenticateToken, (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const saved = (
    db.prepare('SELECT * FROM saved_resources WHERE user_id = ? ORDER BY id DESC').all(userId) as Array<Record<string, unknown>>
  ).map((s) => ({
    ...s,
    url: sanitizeUrlSync(s.url, String(s.title || ''), String(s.skill_tag || '')),
  }));
  const weeks = db.prepare('SELECT week_number, title, recommended_courses, tutorial_links, mini_project, topics FROM roadmap_weeks WHERE user_id = ? ORDER BY week_number ASC').all(userId) as Array<Record<string, unknown>>;

  const roadmapResources = weeks.flatMap((w) => {
    const weekTitle = String(w.title);
    const skillTag = safeParse<string[]>(w.topics, [])[0] || weekTitle;
    const courses = safeParse<Array<{ title: string; provider: string; url: string; duration: string }>>(w.recommended_courses, []).map((c) => ({
      title: c.title,
      category: 'Course',
      provider: c.provider,
      url: sanitizeUrlSync(c.url, c.title, `${weekTitle} ${skillTag}`),
      duration: c.duration,
      weekNumber: Number(w.week_number),
      skillTag,
    }));
    const tutorials = safeParse<Array<{ title: string; url: string; type: string }>>(w.tutorial_links, []).map((t) => ({
      title: t.title,
      category: t.type || 'Tutorial',
      provider: 'Reference Guide',
      url: sanitizeUrlSync(t.url, t.title, `${weekTitle} ${skillTag}`),
      duration: 'Self-paced',
      weekNumber: Number(w.week_number),
      skillTag,
    }));
    return [...courses, ...tutorials];
  });

  return res.json({ saved, roadmapResources });
});

app.post('/api/resources/toggle', authenticateToken, (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { title, category, provider, url, skillTag, field } = req.body || {};
  if (!title || !url) return res.status(400).json({ error: 'title and url required' });

  const safeUrl = sanitizeUrlSync(url, String(title), String(skillTag || ''));
  const existing = db.prepare('SELECT * FROM saved_resources WHERE user_id = ? AND title = ?').get(userId, String(title)) as Record<string, unknown> | undefined;
  if (!existing) {
    db.prepare(`
      INSERT INTO saved_resources (user_id, title, category, provider, url, skill_tag, completed, bookmarked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      String(title),
      String(category || 'Course'),
      String(provider || 'Web'),
      safeUrl,
      String(skillTag || 'General'),
      field === 'completed' ? 1 : 0,
      1
    );
  } else {
    const col = field === 'completed' ? 'completed' : 'bookmarked';
    const nextVal = Number(existing[col]) === 1 ? 0 : 1;
    db.prepare(`UPDATE saved_resources SET ${col} = ? WHERE id = ?`).run(nextVal, existing.id);
  }

  const saved = db.prepare('SELECT * FROM saved_resources WHERE user_id = ? ORDER BY id DESC').all(userId);
  return res.json({ saved });
});

/* ============================================================================
 * AI MENTOR & AGENT ACTIVITY ROUTES
 * ========================================================================== */
app.get('/api/mentor', authenticateToken, (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const messages = db.prepare('SELECT * FROM mentor_messages WHERE user_id = ? ORDER BY id ASC').all(userId);
  return res.json({ messages });
});

app.post('/api/mentor/chat', authenticateToken, async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { message } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }
  const reply = await runMentorChatAgent(userId, String(message).trim());
  const messages = db.prepare('SELECT * FROM mentor_messages WHERE user_id = ? ORDER BY id ASC').all(userId);
  return res.json({ reply, messages });
});

app.get('/api/agents/activity', authenticateToken, (req: AuthedRequest, res: Response) => {
  const userId = req.user!.userId;
  const logs = (
    db
      .prepare('SELECT * FROM agent_logs WHERE user_id = ? ORDER BY id DESC LIMIT 50')
      .all(userId) as Array<Record<string, unknown>>
  ).map((l) => ({
    id: Number(l.id),
    agentName: String(l.agent_name),
    taskSummary: String(l.task_summary),
    contextSnapshot: safeParse(l.context_snapshot, {}),
    outputSummary: String(l.output_summary),
    status: String(l.status),
    durationMs: Number(l.duration_ms),
    createdAt: String(l.created_at),
  }));

  const context = buildLearnerContext(userId);
  return res.json({ logs, sharedContext: context });
});

/* ============================================================================
 * SERVER STARTUP (VITE MIDDLEWARE IN DEV, DIST IN PROD)
 * ========================================================================== */
async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SkillPath AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
