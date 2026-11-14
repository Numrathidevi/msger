import { Type } from '@google/genai';
import { db } from '../db.js';
import { CAREER_BENCHMARKS, findBenchmark } from './careerCatalog.js';
import { generateStructuredJSON, generateTextResponse } from './geminiClient.js';
import { findBestVerifiedResource, verifyOrReplaceUrl } from './resourceCatalog.js';

export interface LearnerContext {
  userId: number;
  fullName: string;
  email: string;
  educationLevel: string;
  institution: string;
  department: string;
  technicalSkills: string[];
  programmingLanguages: string[];
  certifications: string[];
  projects: string[];
  careerInterest: string;
  unsureCareer: boolean;
  interestsNotes: string;
  exploreOtherCareers: boolean;
  dailyStudyHours: number;
  learningStyle: string;
  selectedCareer: string;
  careerGoalConfirmed: boolean;
  learningStage: string;
  recentQuizScores: Array<{ title: string; score: number; weakAreas: string[] }>;
}

export function buildLearnerContext(userId: number): LearnerContext {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
  const profile = db.prepare('SELECT * FROM learner_profiles WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
  const quizzes = db.prepare('SELECT title, score, weak_areas FROM quiz_attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(userId) as Array<Record<string, unknown>>;

  const parseArr = (val: unknown): string[] => {
    if (typeof val !== 'string') return [];
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return {
    userId,
    fullName: String(user?.full_name || 'Student'),
    email: String(user?.email || ''),
    educationLevel: String(user?.education_level || 'Undergraduate'),
    institution: String(user?.institution || ''),
    department: String(profile?.department || ''),
    technicalSkills: parseArr(profile?.technical_skills),
    programmingLanguages: parseArr(profile?.programming_languages),
    certifications: parseArr(profile?.certifications),
    projects: parseArr(profile?.projects),
    careerInterest: String(profile?.career_interest || ''),
    unsureCareer: Boolean(profile?.unsure_career),
    interestsNotes: String(profile?.interests_notes || ''),
    exploreOtherCareers: Boolean(profile?.explore_other_careers),
    dailyStudyHours: Number(profile?.daily_study_hours || 2),
    learningStyle: String(profile?.learning_style || 'Hands-on Projects'),
    selectedCareer: String(profile?.selected_career || profile?.career_interest || 'Full Stack Developer'),
    careerGoalConfirmed: Boolean(profile?.career_goal_confirmed),
    learningStage: String(profile?.learning_stage || 'Week 1'),
    recentQuizScores: quizzes.map((q) => ({
      title: String(q.title),
      score: Number(q.score),
      weakAreas: parseArr(q.weak_areas),
    })),
  };
}

function logAgentRun(
  userId: number,
  agentName: string,
  taskSummary: string,
  contextSnapshot: Record<string, unknown>,
  outputSummary: string,
  usedGemini: boolean,
  durationMs: number
) {
  db.prepare(`
    INSERT INTO agent_logs (user_id, agent_name, task_summary, context_snapshot, output_summary, status, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    agentName,
    taskSummary,
    JSON.stringify(contextSnapshot),
    outputSummary,
    usedGemini ? 'completed' : 'fallback',
    durationMs
  );
}

/* ============================================================================
 * AGENT 1: SKILL PROFILING & GAP ANALYSIS AGENT
 * ========================================================================== */
export async function runSkillAnalysisAgent(userId: number, targetCareer?: string) {
  const start = Date.now();
  const ctx = buildLearnerContext(userId);
  const career = targetCareer || ctx.selectedCareer || ctx.careerInterest || 'Full Stack Developer';
  const benchmark = findBenchmark(career);

  const studentKnown = [...ctx.technicalSkills, ...ctx.programmingLanguages].map((s) => s.toLowerCase());

  const schema = {
    type: Type.OBJECT,
    properties: {
      skills: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            skillName: { type: Type.STRING },
            category: { type: Type.STRING },
            currentProficiency: { type: Type.INTEGER },
            requiredProficiency: { type: Type.INTEGER },
            priority: { type: Type.STRING },
          },
          required: ['skillName', 'category', 'currentProficiency', 'requiredProficiency', 'priority'],
        },
      },
      summary: { type: Type.STRING },
    },
    required: ['skills', 'summary'],
  };

  const aiRes = await generateStructuredJSON<{
    skills: Array<{ skillName: string; category: string; currentProficiency: number; requiredProficiency: number; priority: string }>;
    summary: string;
  }>({
    systemInstruction:
      'You are the Skill Profiling & Gap Analysis Agent in SkillPath AI. Compare a student’s reported skills, languages, projects, and certifications against industry competency requirements for their target career. Never assume reported skills are 100% mastered; estimate realistic starting proficiency (45-75 if listed, 0-20 if missing) until verified by quiz.',
    prompt: `Student Context:
- Education: ${ctx.educationLevel} (${ctx.department})
- Technical Skills: ${ctx.technicalSkills.join(', ') || 'None'}
- Programming Languages: ${ctx.programmingLanguages.join(', ') || 'None'}
- Certifications: ${ctx.certifications.join(', ') || 'None'}
- Projects: ${ctx.projects.join(', ') || 'None'}
- Target Career: ${career}
- Benchmark Skills: ${benchmark.requiredSkills.map((s) => `${s.name} (req ${s.requiredProficiency}%)`).join(', ')}

Return 7-8 calibrated skills for this target career.`,
    responseSchema: schema,
  });

  // Preserve verified skills if re-analyzing the same career
  const existingRows = db.prepare('SELECT skill_name, verified, current_proficiency, last_assessed_at FROM skill_assessments WHERE user_id = ?').all(userId) as Array<{
    skill_name: string;
    verified: number;
    current_proficiency: number;
    last_assessed_at: string;
  }>;
  const verifiedMap = new Map(existingRows.map((r) => [r.skill_name.toLowerCase(), r]));

  const evaluatedSkills = aiRes?.data?.skills?.length
    ? aiRes.data.skills.map((s) => {
        const prev = verifiedMap.get(s.skillName.toLowerCase());
        const cur = prev?.verified ? Math.max(prev.current_proficiency, s.currentProficiency) : Math.min(95, Math.max(5, s.currentProficiency));
        const req = Math.min(100, Math.max(60, s.requiredProficiency));
        const gap = Math.max(0, req - cur);
        const priority = ['High', 'Medium', 'Low'].includes(s.priority) ? s.priority : gap >= 45 ? 'High' : gap >= 20 ? 'Medium' : 'Low';
        return {
          skillName: s.skillName,
          category: s.category || 'Core',
          currentProficiency: cur,
          requiredProficiency: req,
          gap,
          priority,
          verified: prev?.verified || 0,
          lastAssessedAt: prev?.last_assessed_at || '',
        };
      })
    : benchmark.requiredSkills.map((reqSkill) => {
        const nameLower = reqSkill.name.toLowerCase();
        const isMatched = studentKnown.some((k) => nameLower.includes(k) || k.includes(nameLower.split(' ')[0]));
        const prev = verifiedMap.get(nameLower);
        const cur = prev?.verified
          ? prev.current_proficiency
          : isMatched
          ? 65
          : 15;
        const gap = Math.max(0, reqSkill.requiredProficiency - cur);
        const priority = gap >= 45 ? 'High' : gap >= 20 ? 'Medium' : 'Low';
        return {
          skillName: reqSkill.name,
          category: reqSkill.category,
          currentProficiency: cur,
          requiredProficiency: reqSkill.requiredProficiency,
          gap,
          priority,
          verified: prev?.verified || 0,
          lastAssessedAt: prev?.last_assessed_at || '',
        };
      });

  db.prepare('DELETE FROM skill_assessments WHERE user_id = ?').run(userId);
  const insert = db.prepare(`
    INSERT INTO skill_assessments (user_id, skill_name, category, current_proficiency, required_proficiency, gap, priority, verified, last_assessed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const sk of evaluatedSkills) {
    insert.run(userId, sk.skillName, sk.category, sk.currentProficiency, sk.requiredProficiency, sk.gap, sk.priority, sk.verified, sk.lastAssessedAt);
  }

  const outputSummary =
    aiRes?.data?.summary ||
    `Evaluated ${evaluatedSkills.length} competencies for ${career}; found ${evaluatedSkills.filter((s) => s.gap >= 30).length} high/medium skill gaps.`;

  logAgentRun(
    userId,
    'Skill Profiling & Gap Agent',
    `Compared learner baseline against ${career} competency benchmark`,
    { career, knownSkills: ctx.technicalSkills, languages: ctx.programmingLanguages },
    outputSummary,
    Boolean(aiRes?.usedGemini),
    Date.now() - start
  );

  return evaluatedSkills;
}

/* ============================================================================
 * AGENT 2: CAREER RECOMMENDATION AGENT
 * ========================================================================== */
export async function runCareerRecommendationAgent(userId: number) {
  const start = Date.now();
  const ctx = buildLearnerContext(userId);

  const schema = {
    type: Type.OBJECT,
    properties: {
      recommendations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            careerTitle: { type: Type.STRING },
            matchScore: { type: Type.INTEGER },
            rationale: { type: Type.STRING },
            missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            estimatedWeeks: { type: Type.INTEGER },
            salaryOutlook: { type: Type.STRING },
          },
          required: ['careerTitle', 'matchScore', 'rationale', 'missingSkills', 'requiredSkills', 'estimatedWeeks', 'salaryOutlook'],
        },
      },
    },
    required: ['recommendations'],
  };

  const aiRes = await generateStructuredJSON<{
    recommendations: Array<{
      careerTitle: string;
      matchScore: number;
      rationale: string;
      missingSkills: string[];
      requiredSkills: string[];
      estimatedWeeks: number;
      salaryOutlook: string;
    }>;
  }>({
    systemInstruction:
      'You are the Career Recommendation Agent in SkillPath AI. Analyze a student’s existing skills, academic department, projects, learning style, and interests (especially if they are unsure) to recommend 4 suitable tech careers with concrete explanations and missing skills.',
    prompt: `Student Profile:
- Education: ${ctx.educationLevel}, Department: ${ctx.department}
- Technical Skills: ${ctx.technicalSkills.join(', ') || 'Beginner'}
- Languages: ${ctx.programmingLanguages.join(', ') || 'None yet'}
- Certifications: ${ctx.certifications.join(', ') || 'None'}
- Projects: ${ctx.projects.join(', ') || 'None'}
- Stated Career Interest: ${ctx.unsureCareer ? 'Unsure — seeking guidance' : ctx.careerInterest}
- Interest Notes: ${ctx.interestsNotes || 'General technology & problem solving'}
- Study Commitment: ${ctx.dailyStudyHours} hrs/day, Style: ${ctx.learningStyle}

Recommend 4 ranked career paths (if they stated a concrete interest, include it among the top options unless unsuitable, plus 3 strong alternatives).`,
    responseSchema: schema,
  });

  let recs = aiRes?.data?.recommendations;

  if (!recs || recs.length === 0) {
    const knownLower = [...ctx.technicalSkills, ...ctx.programmingLanguages, ctx.interestsNotes, ctx.department]
      .join(' ')
      .toLowerCase();

    const scored = Object.values(CAREER_BENCHMARKS).map((b) => {
      let score = 62;
      if (!ctx.unsureCareer && ctx.careerInterest && b.title.toLowerCase() === ctx.careerInterest.toLowerCase()) {
        score += 22;
      }
      const matchedCount = b.requiredSkills.filter((rs) => {
        const token = rs.name.toLowerCase().split(' ')[0];
        return knownLower.includes(token);
      }).length;
      score += matchedCount * 5;
      if (knownLower.includes('data') && (b.title.includes('Data') || b.title.includes('AI'))) score += 8;
      if ((knownLower.includes('web') || knownLower.includes('html') || knownLower.includes('react')) && b.title.includes('Full Stack')) score += 8;
      if ((knownLower.includes('design') || knownLower.includes('figma')) && b.title.includes('UI/UX')) score += 12;
      if ((knownLower.includes('security') || knownLower.includes('network')) && b.title.includes('Cybersecurity')) score += 12;

      const missing = b.requiredSkills
        .filter((rs) => !knownLower.includes(rs.name.toLowerCase().split(' ')[0]))
        .map((rs) => rs.name);

      return {
        careerTitle: b.title,
        matchScore: Math.min(96, score),
        rationale: `${b.summary} Based on your ${ctx.department || 'academic'} foundation and ${ctx.programmingLanguages.join('/') || 'learning'} background, you already cover ${b.requiredSkills.length - missing.length} of ${b.requiredSkills.length} core competencies.`,
        missingSkills: missing.slice(0, 5),
        requiredSkills: b.requiredSkills.map((s) => s.name),
        estimatedWeeks: Math.max(6, Math.round(b.estimatedWeeks * (2.5 / Math.max(1, ctx.dailyStudyHours)))),
        salaryOutlook: b.salaryOutlook,
      };
    });

    recs = scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 4);
  }

  db.prepare('DELETE FROM career_recommendations WHERE user_id = ?').run(userId);
  const insert = db.prepare(`
    INSERT INTO career_recommendations (user_id, career_title, match_score, rationale, missing_skills, required_skills, estimated_weeks, salary_outlook, is_selected)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const r of recs) {
    const isSelected = ctx.careerGoalConfirmed && r.careerTitle.toLowerCase() === ctx.selectedCareer.toLowerCase() ? 1 : 0;
    insert.run(
      userId,
      r.careerTitle,
      Math.min(99, Math.max(40, r.matchScore)),
      r.rationale,
      JSON.stringify(r.missingSkills),
      JSON.stringify(r.requiredSkills),
      r.estimatedWeeks || 8,
      r.salaryOutlook || '$80k – $130k',
      isSelected
    );
  }

  logAgentRun(
    userId,
    'Career Recommendation Agent',
    'Evaluated student profile and ranked top 4 career matches',
    { unsure: ctx.unsureCareer, interest: ctx.careerInterest, skills: ctx.technicalSkills },
    `Top recommendation: ${recs[0]?.careerTitle} (${recs[0]?.matchScore}% match).`,
    Boolean(aiRes?.usedGemini),
    Date.now() - start
  );

  return recs;
}

/* ============================================================================
 * AGENT 3: ROADMAP ARCHITECT AGENT
 * ========================================================================== */
export async function runRoadmapGeneratorAgent(userId: number, careerGoal: string) {
  const start = Date.now();
  const ctx = buildLearnerContext(userId);
  const benchmark = findBenchmark(careerGoal);
  const skills = db.prepare('SELECT skill_name, gap, priority FROM skill_assessments WHERE user_id = ?').all(userId) as Array<{
    skill_name: string;
    gap: number;
    priority: string;
  }>;

  const missingList = skills.filter((s) => s.gap > 20).map((s) => s.skill_name);

  const schema = {
    type: Type.OBJECT,
    properties: {
      weeks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            weekNumber: { type: Type.INTEGER },
            title: { type: Type.STRING },
            learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
            topics: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedCourses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  provider: { type: Type.STRING },
                  url: { type: Type.STRING },
                  duration: { type: Type.STRING },
                },
                required: ['title', 'provider', 'url', 'duration'],
              },
            },
            tutorialLinks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  url: { type: Type.STRING },
                  type: { type: Type.STRING },
                },
                required: ['title', 'url', 'type'],
              },
            },
            practicalExercises: { type: Type.ARRAY, items: { type: Type.STRING } },
            miniProject: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                deliverables: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['title', 'description', 'deliverables'],
            },
            expectedHours: { type: Type.NUMBER },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  taskType: { type: Type.STRING },
                  estimatedMinutes: { type: Type.INTEGER },
                },
                required: ['title', 'taskType', 'estimatedMinutes'],
              },
            },
          },
          required: ['weekNumber', 'title', 'learningObjectives', 'topics', 'recommendedCourses', 'tutorialLinks', 'practicalExercises', 'miniProject', 'expectedHours', 'tasks'],
        },
      },
    },
    required: ['weeks'],
  };

  const aiRes = await generateStructuredJSON<{
    weeks: Array<{
      weekNumber: number;
      title: string;
      learningObjectives: string[];
      topics: string[];
      recommendedCourses: Array<{ title: string; provider: string; url: string; duration: string }>;
      tutorialLinks: Array<{ title: string; url: string; type: string }>;
      practicalExercises: string[];
      miniProject: { title: string; description: string; deliverables: string[] };
      expectedHours: number;
      tasks: Array<{ title: string; taskType: string; estimatedMinutes: number }>;
    }>;
  }>({
    systemInstruction:
      'You are the Roadmap Architect Agent in SkillPath AI. Build a practical, structured 8-week personalized learning roadmap tailored to the confirmed career goal, focusing heavily on missing skills. Use real, well-known official documentation/educational URLs (MDN, freeCodeCamp, React.dev, Python.org, Kaggle, AWS Skill Builder, OWASP, Figma Learn). Each week must include 4-6 actionable tasks.',
    prompt: `Confirmed Career Goal: ${careerGoal}
Student Existing Skills: ${ctx.technicalSkills.join(', ') || 'Beginner'}
Programming Languages: ${ctx.programmingLanguages.join(', ') || 'None'}
Priority Missing Skills: ${missingList.join(', ') || benchmark.requiredSkills.map((s) => s.name).join(', ')}
Daily Study Hours: ${ctx.dailyStudyHours} hrs/day (~${Math.round(ctx.dailyStudyHours * 5)} hrs/week)
Preferred Learning Style: ${ctx.learningStyle}

Generate an 8-week sequential roadmap (Week 1 to Week 8) culminating in a portfolio capstone project in Week 8.`,
    responseSchema: schema,
  });

  const rawWeeks = aiRes?.data?.weeks?.length === 8 ? aiRes.data.weeks : buildDeterministicRoadmap(careerGoal, ctx.dailyStudyHours);

  // Verify and sanitize every course & tutorial URL so zero 404 links ever reach the student
  const weeks = await Promise.all(
    rawWeeks.map(async (w) => {
      const topicHint = `${careerGoal} ${w.title} ${(w.topics || []).join(' ')}`;
      const recommendedCourses = await Promise.all(
        (w.recommendedCourses || []).map(async (c) => ({
          ...c,
          url: await verifyOrReplaceUrl(c.url, c.title, topicHint),
        }))
      );
      const tutorialLinks = await Promise.all(
        (w.tutorialLinks || []).map(async (t) => ({
          ...t,
          url: await verifyOrReplaceUrl(t.url, t.title, topicHint),
        }))
      );
      return { ...w, recommendedCourses, tutorialLinks };
    })
  );

  // Replace existing roadmap for user
  db.prepare('DELETE FROM roadmaps WHERE user_id = ?').run(userId);
  const rmRes = db.prepare('INSERT INTO roadmaps (user_id, career_goal, total_weeks) VALUES (?, ?, ?)').run(userId, careerGoal, weeks.length);
  const roadmapId = Number(rmRes.lastInsertRowid);

  const insertWeek = db.prepare(`
    INSERT INTO roadmap_weeks (
      roadmap_id, user_id, week_number, title, learning_objectives, topics,
      recommended_courses, tutorial_links, practical_exercises, mini_project, expected_hours
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTask = db.prepare(`
    INSERT INTO roadmap_tasks (week_id, user_id, title, task_type, estimated_minutes, completed, due_date)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `);

  db.prepare('DELETE FROM saved_resources WHERE user_id = ?').run(userId);
  const insertResource = db.prepare(`
    INSERT INTO saved_resources (user_id, title, category, provider, url, skill_tag, completed, bookmarked)
    VALUES (?, ?, ?, ?, ?, ?, 0, 1)
  `);

  for (const w of weeks) {
    const wRes = insertWeek.run(
      roadmapId,
      userId,
      w.weekNumber,
      w.title,
      JSON.stringify(w.learningObjectives),
      JSON.stringify(w.topics),
      JSON.stringify(w.recommendedCourses),
      JSON.stringify(w.tutorialLinks),
      JSON.stringify(w.practicalExercises),
      JSON.stringify(w.miniProject),
      w.expectedHours || Math.round(ctx.dailyStudyHours * 5)
    );
    const weekId = Number(wRes.lastInsertRowid);
    w.tasks.forEach((t, idx) => {
      const due = new Date(Date.now() + ((w.weekNumber - 1) * 7 + idx + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const safeType = ['lesson', 'exercise', 'project', 'revision'].includes(t.taskType) ? t.taskType : 'lesson';
      insertTask.run(weekId, userId, t.title, safeType, t.estimatedMinutes || 45, due);
    });
    for (const c of w.recommendedCourses.slice(0, 1)) {
      insertResource.run(userId, c.title, 'Course', c.provider, c.url, w.topics[0] || careerGoal);
    }
  }

  // Ensure Week 1 daily study logs exist cleanly
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const upsertLog = db.prepare(`
    INSERT OR IGNORE INTO daily_study_logs (user_id, week_number, day_name, hours_logged, tasks_done)
    VALUES (?, 1, ?, 0, 0)
  `);
  for (const d of days) upsertLog.run(userId, d);

  const targetDate = new Date(Date.now() + weeks.length * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  db.prepare(`
    UPDATE learner_profiles
    SET selected_career = ?, career_goal_confirmed = 1, target_completion_date = ?, learning_stage = ?, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(careerGoal, targetDate, `Week 1: ${weeks[0]?.title || 'Foundations'}`, userId);

  logAgentRun(
    userId,
    'Roadmap Architect Agent',
    `Constructed ${weeks.length}-week roadmap for ${careerGoal}`,
    { careerGoal, dailyStudyHours: ctx.dailyStudyHours, missingSkills: missingList },
    `Generated ${weeks.length} modules with curated courses, exercises, and capstone deliverables.`,
    Boolean(aiRes?.usedGemini),
    Date.now() - start
  );

  return { roadmapId, careerGoal, totalWeeks: weeks.length };
}

function buildDeterministicRoadmap(careerGoal: string, dailyHours: number) {
  const benchmark = findBenchmark(careerGoal);
  const weeklyHours = Math.max(6, Math.round(dailyHours * 5));
  const skills = benchmark.requiredSkills;

  const weekTemplates = [
    {
      title: `${careerGoal} Core Foundations`,
      skill: skills[0]?.name || 'Core Fundamentals',
    },
    {
      title: `${skills[1]?.name || 'Core Tooling'} & Structured Practice`,
      skill: skills[1]?.name || 'Core Tooling',
    },
    {
      title: `${skills[2]?.name || 'Applied Programming'} Deep Dive`,
      skill: skills[2]?.name || 'Applied Programming',
    },
    {
      title: `${skills[3]?.name || 'Architecture & Frameworks'}`,
      skill: skills[3]?.name || 'Frameworks',
    },
    {
      title: `${skills[4]?.name || 'Systems & Integration'}`,
      skill: skills[4]?.name || 'Systems Integration',
    },
    {
      title: `${skills[5]?.name || 'Data, Security & Reliability'}`,
      skill: skills[5]?.name || 'Data & Security',
    },
    {
      title: 'Applied Production Workflows & Testing',
      skill: 'Testing & Production Readiness',
    },
    {
      title: `${careerGoal} Capstone Project & Portfolio`,
      skill: 'End-to-End Delivery',
    },
  ];

  return weekTemplates.map((tpl, idx) => {
    const weekNumber = idx + 1;
    const primaryRes = findBestVerifiedResource(`${careerGoal} ${tpl.skill}`);
    const secondaryRes = findBestVerifiedResource(`${tpl.skill} tutorial guide`);
    return {
      weekNumber,
      title: tpl.title,
      learningObjectives: [
        `Master foundational concepts of ${tpl.skill}`,
        `Apply ${tpl.skill} through guided implementation exercises`,
        `Validate readiness with a practical deliverable and Week ${weekNumber} assessment`,
      ],
      topics: [tpl.skill, `${tpl.skill} Best Practices`, `Debugging & Troubleshooting ${tpl.skill}`],
      recommendedCourses: [
        { title: primaryRes.title, provider: primaryRes.provider, url: primaryRes.url, duration: `${Math.round(weeklyHours * 0.5)} hrs` },
      ],
      tutorialLinks: [
        { title: secondaryRes.url === primaryRes.url ? `${tpl.skill} Reference Guide` : secondaryRes.title, url: secondaryRes.url, type: 'Guide' },
      ],
      practicalExercises: [
        `Complete 3 hands-on drills covering ${tpl.skill}`,
        `Document edge cases and write clean code notes`,
      ],
      miniProject: {
        title: `Week ${weekNumber} Mini Project: ${tpl.skill} Lab`,
        description: `Build a focused, verifiable artifact demonstrating ${tpl.skill} in a ${careerGoal} workflow.`,
        deliverables: ['Working source module', 'Short technical README'],
      },
      expectedHours: weeklyHours,
      tasks: [
        { title: `Read & study core concepts: ${tpl.skill}`, taskType: 'lesson', estimatedMinutes: 50 },
        { title: `Follow guided walkthrough on ${tpl.skill}`, taskType: 'lesson', estimatedMinutes: 60 },
        { title: `Complete hands-on lab exercises (${tpl.skill})`, taskType: 'exercise', estimatedMinutes: 75 },
        { title: `Build Week ${weekNumber} Mini Project`, taskType: 'project', estimatedMinutes: 120 },
        { title: `Review notes & complete Week ${weekNumber} quiz`, taskType: 'revision', estimatedMinutes: 35 },
      ],
    };
  });
}

/* ============================================================================
 * AGENT 4: ADAPTIVE ASSESSMENT & LEARNING ENGINE AGENT
 * ========================================================================== */
export interface QuizQuestion {
  id: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export async function generateQuizForTopic(userId: number, quizType: 'weekly' | 'skill_verification', referenceId: string) {
  const start = Date.now();
  const ctx = buildLearnerContext(userId);
  let title = '';
  let topics: string[] = [];

  if (quizType === 'weekly') {
    const week = db.prepare('SELECT * FROM roadmap_weeks WHERE user_id = ? AND week_number = ?').get(userId, Number(referenceId)) as Record<string, unknown> | undefined;
    title = week ? `Week ${week.week_number}: ${week.title} Assessment` : `Week ${referenceId} Assessment`;
    topics = week ? JSON.parse(String(week.topics || '[]')) : [ctx.selectedCareer];
  } else {
    title = `${referenceId} Skill Verification`;
    topics = [referenceId];
  }

  const schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            topic: { type: Type.STRING },
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
          },
          required: ['id', 'topic', 'question', 'options', 'correctIndex', 'explanation'],
        },
      },
    },
    required: ['questions'],
  };

  const aiRes = await generateStructuredJSON<{ questions: QuizQuestion[] }>({
    systemInstruction:
      'You are the Adaptive Assessment Agent in SkillPath AI. Generate 5 clear, practical multiple-choice questions (4 options each, 0-based correctIndex) that test genuine conceptual understanding and applied problem-solving rather than trivia.',
    prompt: `Career Context: ${ctx.selectedCareer}
Quiz Title: ${title}
Topics to Assess: ${topics.join(', ')}
Generate exactly 5 multiple-choice questions with 4 options each.`,
    responseSchema: schema,
  });

  const questions: QuizQuestion[] =
    aiRes?.data?.questions?.length === 5
      ? aiRes.data.questions
      : buildDeterministicQuiz(title, topics);

  logAgentRun(
    userId,
    'Adaptive Assessment Agent',
    `Prepared 5-question assessment for ${title}`,
    { quizType, referenceId, topics },
    `Generated diagnostic quiz covering ${topics.slice(0, 3).join(', ')}.`,
    Boolean(aiRes?.usedGemini),
    Date.now() - start
  );

  return { title, topics, questions };
}

function buildDeterministicQuiz(title: string, topics: string[]): QuizQuestion[] {
  const mainTopic = topics[0] || title;
  const secondTopic = topics[1] || mainTopic;
  return [
    {
      id: 'q1',
      topic: mainTopic,
      question: `When designing a solution involving ${mainTopic}, what is the primary benefit of breaking logic into small, single-responsibility units?`,
      options: [
        'It improves testability, readability, and isolates bugs early',
        'It eliminates the need for error handling or validation',
        'It forces all code to run synchronously',
        'It removes the need for version control',
      ],
      correctIndex: 0,
      explanation: 'Modular, single-responsibility units are far easier to test, debug, and maintain as applications scale.',
    },
    {
      id: 'q2',
      topic: mainTopic,
      question: `Which practice best prevents regressions while learning and shipping features in ${mainTopic}?`,
      options: [
        'Skipping edge cases until production launch',
        'Validating inputs, checking boundary conditions, and testing incrementally',
        'Hardcoding configuration values inside UI components',
        'Ignoring warning logs during development',
      ],
      correctIndex: 1,
      explanation: 'Incremental verification and input boundary checks catch defects before they compound.',
    },
    {
      id: 'q3',
      topic: secondTopic,
      question: `In practical ${secondTopic} workflows, how should asynchronous or external data failures be handled?`,
      options: [
        'Silently swallow errors so the user sees nothing',
        'Crash the entire application process immediately',
        'Surface clear user feedback, preserve state, and log context for recovery',
        'Retry infinitely in a tight synchronous loop',
      ],
      correctIndex: 2,
      explanation: 'Graceful error handling keeps the user informed while providing actionable diagnostics.',
    },
    {
      id: 'q4',
      topic: secondTopic,
      question: `Why do engineering teams pair conceptual study of ${secondTopic} with a small scoped mini-project?`,
      options: [
        'Because reading documentation alone builds muscle memory',
        'Applied projects expose real integration edge cases and verify proficiency',
        'Mini-projects replace the need to understand fundamentals',
        'It reduces the number of skills needed for a career',
      ],
      correctIndex: 1,
      explanation: 'Building working deliverables reveals integration gaps that passive reading misses.',
    },
    {
      id: 'q5',
      topic: mainTopic,
      question: `Before advancing from ${title} to the next stage, what confirms readiness?`,
      options: [
        'Skimming video titles without practicing',
        'Completing hands-on exercises and scoring reliably on concept checks',
        'Copying boilerplate without understanding how state flows',
        'Avoiding feedback on weak topics',
      ],
      correctIndex: 1,
      explanation: 'Combining practical exercises with diagnostic verification ensures solid retention.',
    },
  ];
}

export async function evaluateQuizAndAdapt(params: {
  userId: number;
  quizType: 'weekly' | 'skill_verification';
  referenceId: string;
  title: string;
  questions: QuizQuestion[];
  answers: number[];
}) {
  const start = Date.now();
  const { userId, quizType, referenceId, title, questions, answers } = params;

  let correctCount = 0;
  const strongAreas = new Set<string>();
  const weakAreas = new Set<string>();

  questions.forEach((q, idx) => {
    if (answers[idx] === q.correctIndex) {
      correctCount += 1;
      strongAreas.add(q.topic);
    } else {
      weakAreas.add(q.topic);
    }
  });

  const score = Math.round((correctCount / Math.max(1, questions.length)) * 100);
  const weakList = Array.from(weakAreas);
  const strongList = Array.from(strongAreas).filter((s) => !weakAreas.has(s));

  let feedback = '';
  const actionsTaken: string[] = [];

  if (score < 40) {
    feedback = `Score ${score}% indicates foundational gaps in ${weakList.join(', ') || title}. The Adaptive Learning Engine has added beginner revision lessons, lowered immediate advanced load, and scheduled targeted practice exercises.`;
    actionsTaken.push(`Identified weak topics: ${weakList.join(', ') || title}`);
    actionsTaken.push('Added beginner revision lessons & foundational exercises to active roadmap week');
    actionsTaken.push('Reduced advanced task pace and recommended step-by-step guided walkthroughs');

    // Mutate roadmap week with adaptive remedial tasks if weekly or active week
    const targetWeekNum = quizType === 'weekly' ? Number(referenceId) : 1;
    const weekRow = db
      .prepare('SELECT id, week_number FROM roadmap_weeks WHERE user_id = ? AND week_number = ?')
      .get(userId, targetWeekNum) as { id: number; week_number: number } | undefined;

    if (weekRow) {
      db.prepare(`
        UPDATE roadmap_weeks
        SET is_adapted = 1,
            adaptation_note = ?
        WHERE id = ?
      `).run(
        `Adaptive Engine (<40% score): Added beginner revision exercises for ${weakList.join(', ') || title} and eased pace.`,
        weekRow.id
      );

      const due = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const insertRemedial = db.prepare(`
        INSERT INTO roadmap_tasks (week_id, user_id, title, task_type, estimated_minutes, completed, due_date, is_adaptive_remedial)
        VALUES (?, ?, ?, 'revision', 35, 0, ?, 1)
      `);
      const focusTopic = weakList[0] || title;
      insertRemedial.run(weekRow.id, userId, `[Adaptive Revision] Beginner walkthrough: ${focusTopic}`, due);
      insertRemedial.run(weekRow.id, userId, `[Adaptive Practice] Guided step-by-step drill: ${focusTopic}`, due);
    }
  } else if (score < 75) {
    feedback = `Score ${score}% shows solid progress in ${strongList.join(', ') || 'core fundamentals'}, with targeted reinforcement needed in ${weakList.join(', ') || 'edge cases'}. Added a focused revision task.`;
    actionsTaken.push(`Reinforced weak area: ${weakList.join(', ') || 'key concepts'}`);
    actionsTaken.push('Scheduled targeted practice check before advancing');

    const targetWeekNum = quizType === 'weekly' ? Number(referenceId) : 1;
    const weekRow = db
      .prepare('SELECT id FROM roadmap_weeks WHERE user_id = ? AND week_number = ?')
      .get(userId, targetWeekNum) as { id: number } | undefined;
    if (weekRow && weakList.length > 0) {
      const due = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      db.prepare(`
        INSERT INTO roadmap_tasks (week_id, user_id, title, task_type, estimated_minutes, completed, due_date, is_adaptive_remedial)
        VALUES (?, ?, ?, 'revision', 30, 0, ?, 1)
      `).run(weekRow.id, userId, `[Targeted Review] Revisit ${weakList[0]}`, due);
    }
  } else {
    feedback = `Strong performance (${score}%)! Your command of ${strongList.join(', ') || title} is verified. You are ready to move confidently into upcoming project milestones.`;
    actionsTaken.push('Verified concept mastery (>= 75%)');
    actionsTaken.push('Maintained accelerated roadmap pace');
  }

  // If skill verification quiz, update skill proficiency & verified status
  if (quizType === 'skill_verification') {
    const skillRow = db
      .prepare('SELECT * FROM skill_assessments WHERE user_id = ? AND skill_name = ?')
      .get(userId, referenceId) as Record<string, unknown> | undefined;

    if (skillRow) {
      const current = Number(skillRow.current_proficiency);
      const req = Number(skillRow.required_proficiency);
      const newProficiency = score >= 70 ? Math.max(current, Math.min(95, score + 5)) : Math.max(current, Math.round((current + score) / 2));
      const newGap = Math.max(0, req - newProficiency);
      const verified = score >= 70 ? 1 : Number(skillRow.verified);
      const priority = newGap >= 45 ? 'High' : newGap >= 20 ? 'Medium' : 'Low';

      db.prepare(`
        UPDATE skill_assessments
        SET current_proficiency = ?, gap = ?, priority = ?, verified = ?, last_assessed_at = datetime('now')
        WHERE id = ?
      `).run(newProficiency, newGap, priority, verified, skillRow.id);

      actionsTaken.push(`Updated ${referenceId} proficiency to ${newProficiency}%${verified ? ' (Verified)' : ''}`);
    }
  }

  // Save quiz attempt
  db.prepare(`
    INSERT INTO quiz_attempts (user_id, quiz_type, reference_id, title, questions_json, answers_json, score, strong_areas, weak_areas, ai_feedback)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    quizType,
    referenceId,
    title,
    JSON.stringify(questions),
    JSON.stringify(answers),
    score,
    JSON.stringify(strongList),
    JSON.stringify(weakList),
    feedback
  );

  // Record adaptive event
  db.prepare(`
    INSERT INTO adaptive_events (user_id, trigger_type, score, weak_topics, actions_taken, summary)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    quizType === 'weekly' ? `Week ${referenceId} Quiz` : `Skill Check: ${referenceId}`,
    score,
    JSON.stringify(weakList),
    JSON.stringify(actionsTaken),
    feedback
  );

  // If weekly quiz, refresh that week's report automatically
  if (quizType === 'weekly') {
    await generateWeeklyReportAgent(userId, Number(referenceId), score, strongList[0], weakList[0]);
  }

  logAgentRun(
    userId,
    'Adaptive Assessment Agent',
    `Graded ${title} (${score}%) and applied adaptive rules`,
    { quizType, referenceId, score, weakTopics: weakList },
    feedback,
    false,
    Date.now() - start
  );

  return { score, correctCount, total: questions.length, strongAreas: strongList, weakAreas: weakList, feedback, actionsTaken };
}

/* ============================================================================
 * AGENT 5: WEEKLY COACH & MENTOR AGENT
 * ========================================================================== */
export async function generateWeeklyReportAgent(
  userId: number,
  weekNumber: number,
  overrideQuizScore?: number,
  overrideStrong?: string,
  overrideWeak?: string
) {
  const start = Date.now();
  const ctx = buildLearnerContext(userId);
  const week = db.prepare('SELECT * FROM roadmap_weeks WHERE user_id = ? AND week_number = ?').get(userId, weekNumber) as Record<string, unknown> | undefined;
  if (!week) return null;

  const tasks = db.prepare('SELECT * FROM roadmap_tasks WHERE week_id = ?').all(week.id) as Array<Record<string, unknown>>;
  const totalTasks = tasks.length;
  const tasksCompleted = tasks.filter((t) => Number(t.completed) === 1).length;
  const progressPct = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

  const logs = db.prepare('SELECT SUM(hours_logged) as total FROM daily_study_logs WHERE user_id = ? AND week_number = ?').get(userId, weekNumber) as { total: number | null };
  const studyHours = Number((logs?.total ?? 0).toFixed(1));

  const latestQuiz = db
    .prepare("SELECT score, strong_areas, weak_areas FROM quiz_attempts WHERE user_id = ? AND quiz_type = 'weekly' AND reference_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(userId, String(weekNumber)) as { score: number; strong_areas: string; weak_areas: string } | undefined;

  const quizScore = overrideQuizScore ?? latestQuiz?.score ?? 0;
  const topics: string[] = JSON.parse(String(week.topics || '[]'));
  const strongArea =
    overrideStrong ||
    (latestQuiz ? JSON.parse(latestQuiz.strong_areas)[0] : undefined) ||
    topics[0] ||
    String(week.title);
  const improvementArea =
    overrideWeak ||
    (latestQuiz ? JSON.parse(latestQuiz.weak_areas)[0] : undefined) ||
    topics[topics.length - 1] ||
    'Practical Mini-Project Application';

  const aiRes = await generateTextResponse({
    systemInstruction:
      'You are the Weekly Coach & Mentor Agent in SkillPath AI. Write a concise, encouraging 2-3 sentence weekly coaching feedback paragraph grounded strictly in the student’s actual progress percentage, hours studied, quiz score, strong area, and improvement area.',
    prompt: `Student: ${ctx.fullName} (Career Goal: ${ctx.selectedCareer})
Week ${weekNumber} Goal: ${week.title}
Tasks Completed: ${tasksCompleted}/${totalTasks} (${progressPct}%)
Study Hours: ${studyHours} hours
Quiz Score: ${quizScore}%
Strong Area: ${strongArea}
Improvement Area: ${improvementArea}`,
  });

  const aiFeedback =
    aiRes?.text ||
    (progressPct >= 75
      ? `Great work! You completed ${progressPct}% of your Week ${weekNumber} goals (${tasksCompleted}/${totalTasks} tasks) across ${studyHours} study hours. Your ${strongArea} skills are progressing steadily. Spend extra focused time practicing ${improvementArea} next week.`
      : `You completed ${tasksCompleted}/${totalTasks} tasks (${progressPct}%) in Week ${weekNumber} with ${studyHours} study hours. Keep building momentum by dedicating 30–45 minute blocks to ${improvementArea} and reviewing ${strongArea} before your next quiz.`);

  db.prepare(`
    INSERT INTO weekly_reports (
      user_id, week_number, learning_goal, tasks_completed, total_tasks, progress_pct,
      study_hours, quiz_score, strong_area, improvement_area, ai_feedback, generated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, week_number) DO UPDATE SET
      learning_goal = excluded.learning_goal,
      tasks_completed = excluded.tasks_completed,
      total_tasks = excluded.total_tasks,
      progress_pct = excluded.progress_pct,
      study_hours = excluded.study_hours,
      quiz_score = excluded.quiz_score,
      strong_area = excluded.strong_area,
      improvement_area = excluded.improvement_area,
      ai_feedback = excluded.ai_feedback,
      generated_at = datetime('now')
  `).run(
    userId,
    weekNumber,
    String(week.title),
    tasksCompleted,
    totalTasks,
    progressPct,
    studyHours,
    quizScore,
    strongArea,
    improvementArea,
    aiFeedback
  );

  logAgentRun(
    userId,
    'Weekly Coach & Mentor Agent',
    `Generated Week ${weekNumber} progress report (${progressPct}% complete)`,
    { weekNumber, tasksCompleted, totalTasks, studyHours, quizScore },
    aiFeedback,
    Boolean(aiRes?.usedGemini),
    Date.now() - start
  );

  return db.prepare('SELECT * FROM weekly_reports WHERE user_id = ? AND week_number = ?').get(userId, weekNumber);
}

export async function runMentorChatAgent(userId: number, userMessage: string) {
  const start = Date.now();
  const ctx = buildLearnerContext(userId);
  const skills = db.prepare('SELECT skill_name, current_proficiency, required_proficiency, gap, verified FROM skill_assessments WHERE user_id = ?').all(userId) as Array<Record<string, unknown>>;
  const history = db.prepare('SELECT role, content FROM mentor_messages WHERE user_id = ? ORDER BY id DESC LIMIT 8').all(userId) as Array<{ role: string; content: string }>;

  db.prepare('INSERT INTO mentor_messages (user_id, role, content) VALUES (?, ?, ?)').run(userId, 'user', userMessage);

  const highGaps = skills.filter((s) => Number(s.gap) >= 35).map((s) => `${s.skill_name} (${s.current_proficiency}%/${s.required_proficiency}%)`);

  const aiRes = await generateTextResponse({
    systemInstruction: `You are SkillPath AI Mentor, a warm, pragmatic senior engineering & career coach.
Shared Learner Context:
- Student: ${ctx.fullName} (${ctx.educationLevel}, ${ctx.department})
- Target Career: ${ctx.selectedCareer}
- Known Skills & Languages: ${[...ctx.technicalSkills, ...ctx.programmingLanguages].join(', ') || 'Beginner'}
- Current Stage: ${ctx.learningStage}
- High Priority Skill Gaps: ${highGaps.join(', ') || 'None'}
- Recent Quiz Scores: ${ctx.recentQuizScores.map((q) => `${q.title}: ${q.score}%`).join('; ') || 'No quizzes yet'}
- Daily Study Target: ${ctx.dailyStudyHours} hrs/day (${ctx.learningStyle})

Give specific, actionable, encouraging guidance tied directly to their roadmap and skill gaps. Keep responses concise (2-4 short paragraphs or bullet points).`,
    prompt: `Recent Conversation:\n${history
      .reverse()
      .map((m) => `${m.role === 'user' ? 'Student' : 'Mentor'}: ${m.content}`)
      .join('\n')}\nStudent: ${userMessage}`,
  });

  const reply =
    aiRes?.text ||
    `For your ${ctx.selectedCareer} path (${ctx.learningStage}), focus your ${ctx.dailyStudyHours}h daily session on closing your top gap: ${highGaps[0] || 'your current weekly mini-project'}. Break today's work into one 45-minute concept block followed by a hands-on exercise, then mark your task complete in the Learning Roadmap so we can track your weekly progress accurately.`;

  db.prepare('INSERT INTO mentor_messages (user_id, role, content) VALUES (?, ?, ?)').run(userId, 'assistant', reply);

  logAgentRun(
    userId,
    'Weekly Coach & Mentor Agent',
    'Responded to student inquiry in AI Mentor chat',
    { career: ctx.selectedCareer, stage: ctx.learningStage },
    reply.slice(0, 140) + (reply.length > 140 ? '...' : ''),
    Boolean(aiRes?.usedGemini),
    Date.now() - start
  );

  return reply;
}

export async function generateIntakeQuiz(domain: string, level: string): Promise<{ questions: QuizQuestion[]; usedGemini: boolean }> {
  const benchmark = findBenchmark(domain === 'Not sure yet' ? 'Software Engineer' : domain);
  const topics = benchmark.requiredSkills.slice(0, 4).map((s) => s.name);

  const schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            topic: { type: Type.STRING },
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
          },
          required: ['id', 'topic', 'question', 'options', 'correctIndex', 'explanation'],
        },
      },
    },
    required: ['questions'],
  };

  const aiRes = await generateStructuredJSON<{ questions: QuizQuestion[] }>({
    systemInstruction:
      'You are the Adaptive Assessment Agent in SkillPath AI. Create a short 4-question multiple-choice diagnostic quiz (4 options each, 0-based correctIndex) tailored to the student’s chosen domain and self-reported level (Beginner, Intermediate, Advanced).',
    prompt: `Chosen Domain: ${domain}
Self-Reported Level: ${level}
Core Topics: ${topics.join(', ')}
Generate exactly 4 concise, practical diagnostic questions.`,
    responseSchema: schema,
  });

  if (aiRes?.data?.questions?.length === 4) {
    return { questions: aiRes.data.questions, usedGemini: true };
  }

  return {
    usedGemini: false,
    questions: buildIntakeFallbackQuiz(domain, level, topics),
  };
}

function buildIntakeFallbackQuiz(domain: string, level: string, topics: string[]): QuizQuestion[] {
  const d = domain === 'Not sure yet' ? 'Software & Computing' : domain;
  const lower = d.toLowerCase();

  if (lower.includes('full stack') || lower.includes('software')) {
    return [
      {
        id: 'iq1',
        topic: topics[0] || 'Web & Code Structure',
        question: `In a ${d} project (${level} level), why is separating UI presentation from backend business logic important?`,
        options: [
          'It allows independent scaling, clearer testing, and safer data validation',
          'It prevents browsers from rendering HTML',
          'It eliminates the need for a database',
          'It forces every request to reload the page',
        ],
        correctIndex: 0,
        explanation: 'Separating concerns keeps frontend components clean while centralizing security and persistence on the server.',
      },
      {
        id: 'iq2',
        topic: topics[1] || 'HTTP & APIs',
        question: 'Which HTTP status code properly indicates that a client sent invalid or malformed input data?',
        options: ['200 OK', '301 Moved Permanently', '400 Bad Request', '500 Internal Server Error'],
        correctIndex: 2,
        explanation: '400 Bad Request communicates a client-side input validation issue rather than a server crash.',
      },
      {
        id: 'iq3',
        topic: topics[2] || 'Databases',
        question: 'When storing user passwords in a database, what is the standard security practice?',
        options: [
          'Store plain text so support can read them',
          'Encode them with Base64',
          'Hash them using a slow salted algorithm like bcrypt or Argon2',
          'Store them inside browser cookies only',
        ],
        correctIndex: 2,
        explanation: 'Salted slow hashing protects user credentials even if database rows are exposed.',
      },
      {
        id: 'iq4',
        topic: topics[3] || 'State & Debugging',
        question: 'When an async API request fails in the frontend, what should the UI do?',
        options: [
          'Leave the loading spinner running forever',
          'Clear the loading state and show an actionable error message to the user',
          'Silently ignore the response',
          'Redirect the user to a blank page',
        ],
        correctIndex: 1,
        explanation: 'Proper async UX always clears loading indicators and gives users clear recovery feedback.',
      },
    ];
  }

  if (lower.includes('data') || lower.includes('ai') || lower.includes('ml')) {
    return [
      {
        id: 'iq1',
        topic: topics[0] || 'Data Cleaning',
        question: `Before training a model or building charts in ${d}, why do practitioners inspect missing values and outliers first?`,
        options: [
          'Corrupted or skewed inputs directly distort averages, correlations, and predictions',
          'Missing values make files smaller to email',
          'Databases reject tables with numbers',
          'Visualization libraries cannot render integers',
        ],
        correctIndex: 0,
        explanation: 'Data quality determines model accuracy and analytical validity.',
      },
      {
        id: 'iq2',
        topic: topics[1] || 'Evaluation',
        question: 'Why do we split data into training and test sets in machine learning?',
        options: [
          'To double the dataset size',
          'To measure how well the model generalizes to unseen data',
          'To remove the need for feature selection',
          'To speed up SQL queries',
        ],
        correctIndex: 1,
        explanation: 'Evaluating on held-out test data detects overfitting to memorized training examples.',
      },
      {
        id: 'iq3',
        topic: topics[2] || 'SQL & Aggregation',
        question: 'Which SQL clause filters grouped summary rows after a GROUP BY aggregation?',
        options: ['WHERE', 'ORDER BY', 'HAVING', 'DISTINCT'],
        correctIndex: 2,
        explanation: 'WHERE filters individual rows before grouping, while HAVING filters aggregated groups.',
      },
      {
        id: 'iq4',
        topic: topics[3] || 'Metrics',
        question: 'When predicting a rare event (such as 2% fraud cases), why is raw accuracy misleading?',
        options: [
          'A model predicting "no fraud" 100% of the time gets 98% accuracy while catching zero fraud',
          'Accuracy only works on text data',
          'Precision and recall cannot be computed on binary labels',
          'Accuracy is always lower than 50%',
        ],
        correctIndex: 0,
        explanation: 'Imbalanced datasets require precision, recall, and F1/PR-AUC rather than accuracy alone.',
      },
    ];
  }

  return [
    {
      id: 'iq1',
      topic: topics[0] || `${d} Fundamentals`,
      question: `At the ${level} stage in ${d}, what is the fastest way to verify you truly understand a new concept?`,
      options: [
        'Reading documentation without writing anything',
        'Applying the concept in a small hands-on exercise and testing edge cases',
        'Memorizing syntax without context',
        'Skipping foundational concepts',
      ],
      correctIndex: 1,
      explanation: 'Active implementation and edge-case testing cement conceptual understanding.',
    },
    {
      id: 'iq2',
      topic: topics[1] || 'Problem Solving',
      question: `When troubleshooting a complex error in ${d}, which approach is most reliable?`,
      options: [
        'Changing five unrelated things at once',
        'Reproducing the issue minimally, inspecting logs/state, and isolating one variable at a time',
        'Ignoring error messages',
        'Deleting the entire project immediately',
      ],
      correctIndex: 1,
      explanation: 'Minimal reproduction and isolated hypothesis testing pinpoint root causes reliably.',
    },
    {
      id: 'iq3',
      topic: topics[2] || 'Security & Reliability',
      question: 'Why should configuration secrets and API keys never be hardcoded in client-side source files?',
      options: [
        'Client-side bundles are publicly readable by anyone inspecting network or browser files',
        'JSON files do not support strings',
        'Browsers block variables named API_KEY',
        'It makes CSS load slower',
      ],
      correctIndex: 0,
      explanation: 'Any code shipped to the browser can be inspected; secrets belong strictly on the server.',
    },
    {
      id: 'iq4',
      topic: topics[3] || 'Continuous Learning',
      question: 'What makes a weekly learning roadmap effective over 8 weeks?',
      options: [
        'Consistent daily blocks combining theory, guided practice, and weekly diagnostic checks',
        'Cramming 15 hours on the final day only',
        'Studying unrelated topics every day',
        'Avoiding assessments so gaps stay hidden',
      ],
      correctIndex: 0,
      explanation: 'Steady cadence paired with regular quizzes lets adaptive adjustments close gaps early.',
    },
  ];
}
