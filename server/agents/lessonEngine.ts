import { Type } from '@google/genai';
import { db } from '../db.js';
import { generateStructuredJSON } from './geminiClient.js';

export interface LessonNoteSection {
  heading: string;
  keyPoints: string[];
  exampleLabel?: string;
  exampleCode?: string;
  takeaway: string;
}

export interface LessonQuizQuestion {
  id: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonContentData {
  taskId: number;
  lessonTitle: string;
  taskType: string;
  estimatedMinutes: number;
  completed: boolean;
  careerGoal: string;
  weekNumber: number;
  weekTitle: string;
  summary: string;
  notes: LessonNoteSection[];
  practicePrompt: string;
  quiz: LessonQuizQuestion[];
  quizPassed: boolean;
  lastQuizScore: number | null;
}

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function getOrCreateLessonContent(userId: number, taskId: number): Promise<{
  lesson: LessonContentData;
  trackContext: {
    careerGoal: string;
    weekNumber: number;
    weekTitle: string;
    lessonIndex: number;
    totalWeekLessons: number;
    weekProgressPct: number;
    prevTask: { id: number; title: string; completed: boolean } | null;
    nextTask: { id: number; title: string; completed: boolean } | null;
    weekTasks: Array<{
      id: number;
      title: string;
      taskType: string;
      estimatedMinutes: number;
      completed: boolean;
      quizPassed: boolean;
      lastQuizScore: number | null;
    }>;
  };
} | null> {
  const taskRow = db
    .prepare(`
      SELECT t.*, w.week_number, w.title as week_title, w.topics as week_topics,
             w.learning_objectives as week_objectives, r.career_goal
      FROM roadmap_tasks t
      JOIN roadmap_weeks w ON w.id = t.week_id
      JOIN roadmaps r ON r.id = w.roadmap_id
      WHERE t.id = ? AND t.user_id = ?
    `)
    .get(taskId, userId) as Record<string, unknown> | undefined;

  if (!taskRow) return null;

  const weekId = Number(taskRow.week_id);
  const weekNumber = Number(taskRow.week_number);
  const weekTitle = String(taskRow.week_title);
  const careerGoal = String(taskRow.career_goal);
  const lessonTitle = String(taskRow.title);
  const taskType = String(taskRow.task_type);
  const estimatedMinutes = Number(taskRow.estimated_minutes);
  const completed = Boolean(taskRow.completed);
  const weekTopics = safeJsonParse<string[]>(taskRow.week_topics, []);
  const weekObjectives = safeJsonParse<string[]>(taskRow.week_objectives, []);

  // Load or generate cached lesson content
  let cached = db
    .prepare('SELECT * FROM lesson_contents WHERE task_id = ? AND user_id = ?')
    .get(taskId, userId) as Record<string, unknown> | undefined;

  if (!cached) {
    const start = Date.now();
    const generated = await generateLessonNotesAndQuiz({
      careerGoal,
      weekNumber,
      weekTitle,
      lessonTitle,
      taskType,
      weekTopics,
      weekObjectives,
    });

    db.prepare(`
      INSERT INTO lesson_contents (
        task_id, user_id, career_track, week_number, lesson_title, summary, notes_json, practice_prompt, quiz_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      taskId,
      userId,
      careerGoal,
      weekNumber,
      lessonTitle,
      generated.summary,
      JSON.stringify(generated.notes),
      generated.practicePrompt,
      JSON.stringify(generated.quiz)
    );

    db.prepare(`
      INSERT INTO agent_logs (user_id, agent_name, task_summary, context_snapshot, output_summary, status, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      'Lesson Curriculum Agent',
      `Prepared structured notes & 4-question quiz for "${lessonTitle}"`,
      JSON.stringify({ careerGoal, weekNumber, taskId }),
      `Generated ${generated.notes.length} note modules and ${generated.quiz.length} post-lesson assessment questions.`,
      generated.usedGemini ? 'completed' : 'fallback',
      Date.now() - start
    );

    cached = db
      .prepare('SELECT * FROM lesson_contents WHERE task_id = ? AND user_id = ?')
      .get(taskId, userId) as Record<string, unknown>;
  }

  // Build ordered week track context
  const siblingTasks = db
    .prepare(`
      SELECT t.id, t.title, t.task_type, t.estimated_minutes, t.completed,
             COALESCE(lc.quiz_passed, 0) as quiz_passed,
             lc.last_quiz_score
      FROM roadmap_tasks t
      LEFT JOIN lesson_contents lc ON lc.task_id = t.id AND lc.user_id = t.user_id
      WHERE t.week_id = ? AND t.user_id = ?
      ORDER BY t.id ASC
    `)
    .all(weekId, userId) as Array<Record<string, unknown>>;

  const lessonIndex = Math.max(
    0,
    siblingTasks.findIndex((t) => Number(t.id) === taskId)
  );
  const completedCount = siblingTasks.filter((t) => Boolean(t.completed)).length;
  const weekProgressPct = siblingTasks.length > 0 ? Math.round((completedCount / siblingTasks.length) * 100) : 0;

  let prevTask: { id: number; title: string; completed: boolean } | null = null;
  let nextTask: { id: number; title: string; completed: boolean } | null = null;

  if (lessonIndex > 0) {
    const p = siblingTasks[lessonIndex - 1];
    prevTask = { id: Number(p.id), title: String(p.title), completed: Boolean(p.completed) };
  } else if (weekNumber > 1) {
    const prevWeekLast = db
      .prepare(`
        SELECT t.id, t.title, t.completed
        FROM roadmap_tasks t
        JOIN roadmap_weeks w ON w.id = t.week_id
        WHERE w.user_id = ? AND w.week_number = ?
        ORDER BY t.id DESC LIMIT 1
      `)
      .get(userId, weekNumber - 1) as Record<string, unknown> | undefined;
    if (prevWeekLast) {
      prevTask = {
        id: Number(prevWeekLast.id),
        title: `Week ${weekNumber - 1}: ${String(prevWeekLast.title)}`,
        completed: Boolean(prevWeekLast.completed),
      };
    }
  }

  if (lessonIndex < siblingTasks.length - 1) {
    const n = siblingTasks[lessonIndex + 1];
    nextTask = { id: Number(n.id), title: String(n.title), completed: Boolean(n.completed) };
  } else {
    const nextWeekFirst = db
      .prepare(`
        SELECT t.id, t.title, t.completed
        FROM roadmap_tasks t
        JOIN roadmap_weeks w ON w.id = t.week_id
        WHERE w.user_id = ? AND w.week_number = ?
        ORDER BY t.id ASC LIMIT 1
      `)
      .get(userId, weekNumber + 1) as Record<string, unknown> | undefined;
    if (nextWeekFirst) {
      nextTask = {
        id: Number(nextWeekFirst.id),
        title: `Week ${weekNumber + 1}: ${String(nextWeekFirst.title)}`,
        completed: Boolean(nextWeekFirst.completed),
      };
    }
  }

  const lesson: LessonContentData = {
    taskId,
    lessonTitle,
    taskType,
    estimatedMinutes,
    completed,
    careerGoal,
    weekNumber,
    weekTitle,
    summary: String(cached.summary),
    notes: safeJsonParse<LessonNoteSection[]>(cached.notes_json, []),
    practicePrompt: String(cached.practice_prompt),
    quiz: safeJsonParse<LessonQuizQuestion[]>(cached.quiz_json, []),
    quizPassed: Boolean(cached.quiz_passed),
    lastQuizScore: cached.last_quiz_score !== null && cached.last_quiz_score !== undefined ? Number(cached.last_quiz_score) : null,
  };

  return {
    lesson,
    trackContext: {
      careerGoal,
      weekNumber,
      weekTitle,
      lessonIndex: lessonIndex + 1,
      totalWeekLessons: siblingTasks.length,
      weekProgressPct,
      prevTask,
      nextTask,
      weekTasks: siblingTasks.map((t) => ({
        id: Number(t.id),
        title: String(t.title),
        taskType: String(t.task_type),
        estimatedMinutes: Number(t.estimated_minutes),
        completed: Boolean(t.completed),
        quizPassed: Boolean(t.quiz_passed),
        lastQuizScore: t.last_quiz_score !== null && t.last_quiz_score !== undefined ? Number(t.last_quiz_score) : null,
      })),
    },
  };
}

async function generateLessonNotesAndQuiz(params: {
  careerGoal: string;
  weekNumber: number;
  weekTitle: string;
  lessonTitle: string;
  taskType: string;
  weekTopics: string[];
  weekObjectives: string[];
}): Promise<{
  summary: string;
  notes: LessonNoteSection[];
  practicePrompt: string;
  quiz: LessonQuizQuestion[];
  usedGemini: boolean;
}> {
  const schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      notes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            heading: { type: Type.STRING },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            exampleLabel: { type: Type.STRING },
            exampleCode: { type: Type.STRING },
            takeaway: { type: Type.STRING },
          },
          required: ['heading', 'keyPoints', 'takeaway'],
        },
      },
      practicePrompt: { type: Type.STRING },
      quiz: {
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
    required: ['summary', 'notes', 'practicePrompt', 'quiz'],
  };

  const aiRes = await withTimeout(
    generateStructuredJSON<{
      summary: string;
      notes: LessonNoteSection[];
      practicePrompt: string;
      quiz: LessonQuizQuestion[];
    }>({
      systemInstruction:
        'You are the Curriculum & Assessment Author in SkillPath AI. Produce crystal-clear, structured study notes (3 concise sections with actionable bullet points, realistic short code/workflow examples where relevant, and a crisp key takeaway) followed by a 4-question multiple-choice quiz (4 options each, 0-based correctIndex) that strictly tests the exact concepts taught in those notes.',
      prompt: `Career Track: ${params.careerGoal}
Week ${params.weekNumber}: ${params.weekTitle}
Lesson Title: ${params.lessonTitle} (${params.taskType})
Week Topics: ${params.weekTopics.join(', ')}
Week Objectives: ${params.weekObjectives.join(' | ')}

Create:
1. A 2-sentence lesson summary tailored to the ${params.careerGoal} track.
2. Exactly 3 clear study note sections (each with heading, 3 concise keyPoints, optional exampleLabel + exampleCode snippet, and 1-sentence takeaway).
3. One concrete 10-minute practicePrompt for the student to apply the notes.
4. Exactly 4 multiple-choice quiz questions directly testing this lesson's notes.`,
      responseSchema: schema,
    }),
    9000
  );

  const aiData = aiRes?.data;
  if (
    aiData &&
    Array.isArray(aiData.notes) &&
    aiData.notes.length >= 2 &&
    Array.isArray(aiData.quiz) &&
    aiData.quiz.length >= 3
  ) {
    return {
      summary: aiData.summary,
      notes: aiData.notes,
      practicePrompt: aiData.practicePrompt,
      quiz: aiData.quiz,
      usedGemini: true,
    };
  }

  return {
    ...buildDeterministicLesson(params),
    usedGemini: false,
  };
}

function buildDeterministicLesson(params: {
  careerGoal: string;
  weekNumber: number;
  weekTitle: string;
  lessonTitle: string;
  taskType: string;
  weekTopics: string[];
}): {
  summary: string;
  notes: LessonNoteSection[];
  practicePrompt: string;
  quiz: LessonQuizQuestion[];
} {
  const lower = `${params.lessonTitle} ${params.weekTitle}`.toLowerCase();

  if (lower.includes('html') || lower.includes('semantic') || lower.includes('accessibility') || lower.includes('form')) {
    return {
      summary: `In Week ${params.weekNumber} of your ${params.careerGoal} track, "${params.lessonTitle}" establishes clean document structure and accessibility semantics so browsers, screen readers, and search engines interpret every page region accurately.`,
      notes: [
        {
          heading: '1. Semantic Landmarks Over Generic Divs',
          keyPoints: [
            'Use <header>, <nav>, <main>, <section>, <article>, and <footer> to express page hierarchy clearly.',
            'Keep exactly one primary <main> landmark per view so keyboard and assistive-tech users can skip repetitive navigation.',
            'Structure headings sequentially (h1 -> h2 -> h3) without skipping levels for visual sizing.',
          ],
          exampleLabel: 'Semantic Page Skeleton',
          exampleCode: `<header><nav aria-label="Primary">...</nav></header>\n<main>\n  <article>\n    <h1>Accessible Components</h1>\n    <section><h2>Landmark Rules</h2></section>\n  </article>\n</main>\n<footer>...</footer>`,
          takeaway: 'Semantic tags give both accessibility tools and CSS layouts a predictable structure for free.',
        },
        {
          heading: '2. Accessible Forms, Labels & Validation',
          keyPoints: [
            'Always pair every <input> with a <label htmlFor="..."> matching its id attribute.',
            'Use native input types (email, url, number, password) and required/minLength constraints before custom JavaScript.',
            'Connect inline error messages using aria-describedby and role="alert" for immediate feedback.',
          ],
          exampleLabel: 'Accessible Form Control',
          exampleCode: `<label for="student-email">Email address</label>\n<input id="student-email" type="email" required aria-describedby="email-hint" />\n<p id="email-hint">Use your university or work email.</p>`,
          takeaway: 'Explicit label pairing increases clickable target area and prevents screen-reader ambiguity.',
        },
        {
          heading: '3. Keyboard Focus & Interactive Elements',
          keyPoints: [
            'Use native <button type="button"> for actions and <a href="..."> for navigation—never clickable <div> elements.',
            'Preserve visible :focus-visible outlines instead of removing focus rings globally.',
            'Provide descriptive alt text on informative images and empty alt="" on purely decorative assets.',
          ],
          takeaway: 'Choosing the right native HTML element gives you keyboard navigation and focus behavior out of the box.',
        },
      ],
      practicePrompt: 'Audit one existing form or landing section and replace generic <div> wrappers with <main>, <section>, <label>, and native <button> elements.',
      quiz: [
        {
          id: 'lq1',
          topic: 'Semantic Landmarks',
          question: 'Why should interactive actions use <button> rather than a clickable <div>?',
          options: [
            'Native buttons automatically support keyboard focus, Enter/Space activation, and screen-reader roles',
            '<div> elements cannot accept CSS class names',
            '<button> automatically connects to a SQL database',
            'Browsers refuse to render click handlers on <div> tags',
          ],
          correctIndex: 0,
          explanation: 'Native <button> elements ship with built-in keyboard accessibility, focusability, and ARIA semantics.',
        },
        {
          id: 'lq2',
          topic: 'Accessible Forms',
          question: 'How do you programmatically bind a <label> to an <input> element?',
          options: [
            'Give both elements the same CSS class',
            'Match the label "for" (htmlFor in React) attribute to the input "id"',
            'Place the label inside the footer',
            'Use placeholder text instead of a label',
          ],
          correctIndex: 1,
          explanation: 'Matching for/htmlFor to the input id links the label to the control for screen readers and click focus.',
        },
        {
          id: 'lq3',
          topic: 'Document Structure',
          question: 'How many primary <main> landmarks should typically exist on a single web view?',
          options: ['Zero', 'One visible <main> landmark wrapping core page content', 'One inside every card', 'At least five'],
          correctIndex: 1,
          explanation: 'A single <main> landmark gives assistive technology a direct jump target to the page’s primary content.',
        },
        {
          id: 'lq4',
          topic: 'Heading Hierarchy',
          question: 'What is the cleanest rule for HTML heading levels (h1–h6)?',
          options: [
            'Pick heading tags strictly by font size regardless of order',
            'Follow a logical nested outline without skipping levels',
            'Use <h1> for every button label',
            'Never use <h2> on pages with navigation',
          ],
          correctIndex: 1,
          explanation: 'Sequential headings preserve document outline clarity; visual sizes belong in CSS.',
        },
      ],
    };
  }

  if (lower.includes('css') || lower.includes('flexbox') || lower.includes('grid') || lower.includes('tailwind') || lower.includes('responsive')) {
    return {
      summary: `This lesson in your ${params.careerGoal} track focuses on "${params.lessonTitle}"—teaching predictable box sizing, Flexbox/Grid layout control, and mobile-first responsive breakpoints.`,
      notes: [
        {
          heading: '1. The CSS Box Model & Cascade Discipline',
          keyPoints: [
            'Every element consists of content, padding, border, and margin; box-sizing: border-box ensures padding and borders stay inside declared widths.',
            'Keep selector specificity low by styling classes rather than deeply nested element chains or !important overrides.',
            'Define reusable spacing and color tokens with CSS custom properties (:root variables) or utility scales.',
          ],
          exampleLabel: 'Border-Box & Spacing Rules',
          exampleCode: `*, *::before, *::after {\n  box-sizing: border-box;\n}\n.card {\n  padding: 1.5rem;\n  border: 1px solid #e2eae5;\n  border-radius: 1rem;\n}`,
          takeaway: 'border-box sizing eliminates unexpected horizontal overflow caused by padding and borders.',
        },
        {
          heading: '2. Flexbox (1D) vs. CSS Grid (2D)',
          keyPoints: [
            'Use Flexbox for single-axis alignment (navigation bars, button rows, header toolbars) via justify-content and align-items.',
            'Use CSS Grid for two-dimensional page structures and responsive card grids with repeat(auto-fit, minmax(260px, 1fr)).',
            'Use gap instead of uneven margin hacks to space sibling items cleanly.',
          ],
          exampleLabel: 'Responsive Auto-Fit Grid',
          exampleCode: `.grid-cards {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));\n  gap: 1.25rem;\n}`,
          takeaway: 'Flexbox owns single-row/column distribution; Grid owns multi-column alignment.',
        },
        {
          heading: '3. Mobile-First Responsive Breakpoints',
          keyPoints: [
            'Author base styles for narrow mobile screens first, then layer min-width breakpoints (sm, md, lg) to expand into multi-column layouts.',
            'Never give fixed pixel heights to containers holding variable text; allow natural vertical growth.',
            'Verify 375px mobile and 1440px desktop widths so no button text wraps awkwardly or clips.',
          ],
          takeaway: 'Mobile-first styling keeps CSS concise and prevents desktop assumptions from breaking small screens.',
        },
      ],
      practicePrompt: 'Build a 3-card feature row that stacks into 1 column on mobile (<640px) and expands cleanly into 3 equal columns on desktop using CSS Grid or Tailwind grid-cols-1 lg:grid-cols-3.',
      quiz: [
        {
          id: 'lq1',
          topic: 'Box Model',
          question: 'What problem does box-sizing: border-box solve?',
          options: [
            'It includes padding and border inside an element’s declared width and height',
            'It disables CSS margins completely',
            'It converts inline elements to tables',
            'It automatically centers all images',
          ],
          correctIndex: 0,
          explanation: 'With border-box, adding padding or borders shrinks the inner content box instead of inflating the total element width.',
        },
        {
          id: 'lq2',
          topic: 'Flexbox vs Grid',
          question: 'When is CSS Grid generally the better choice over Flexbox?',
          options: [
            'Aligning two buttons inside a single toolbar row',
            'Coordinating rows and columns simultaneously in a 2D dashboard or card layout',
            'Styling hover color transitions',
            'Adding rounded corners to inputs',
          ],
          correctIndex: 1,
          explanation: 'CSS Grid excels at 2-dimensional track control across both rows and columns.',
        },
        {
          id: 'lq3',
          topic: 'Responsive Design',
          question: 'What does "mobile-first" CSS mean?',
          options: [
            'Blocking desktop browsers from loading stylesheets',
            'Writing default styles for small viewports first, then progressively enhancing at larger min-width breakpoints',
            'Using fixed 1200px widths everywhere',
            'Hiding all navigation links on tablets',
          ],
          correctIndex: 1,
          explanation: 'Mobile-first stylesheets apply single-column defaults first and expand layout complexity via min-width media queries.',
        },
        {
          id: 'lq4',
          topic: 'Spacing',
          question: 'Why is the CSS gap property preferred over margins for spacing flex/grid children?',
          options: [
            'gap applies spacing strictly between items without extra outer edge margins',
            'gap works only on text nodes',
            'margin is deprecated in HTML5',
            'gap doubles font-size automatically',
          ],
          correctIndex: 0,
          explanation: 'gap inserts uniform gutters solely between adjacent tracks/items, keeping outer alignment crisp.',
        },
      ],
    };
  }

  if (lower.includes('javascript') || lower.includes('react') || lower.includes('typescript') || lower.includes('dom') || lower.includes('async') || lower.includes('hook') || lower.includes('router')) {
    return {
      summary: `In Week ${params.weekNumber} of your ${params.careerGoal} track, "${params.lessonTitle}" builds mastery over predictable JavaScript/React state flow, immutable transformations, and safe asynchronous requests.`,
      notes: [
        {
          heading: '1. Scope, Immutability & Pure Transformations',
          keyPoints: [
            'Prefer const by default and let only when reassignment is necessary; avoid var to prevent function-scope leaks.',
            'Transform arrays immutably with .map(), .filter(), and .reduce() rather than mutating shared arrays in place.',
            'In React/TypeScript, keep component state minimal and derive computed counts or totals during render.',
          ],
          exampleLabel: 'Immutable Filter + Summary',
          exampleCode: `const activeLessons = tasks.filter((t) => !t.completed);\nconst totalMinutes = activeLessons.reduce((sum, t) => sum + t.estimatedMinutes, 0);`,
          takeaway: 'Pure, immutable transformations prevent subtle UI desync bugs and make state updates predictable.',
        },
        {
          heading: '2. Asynchronous Execution & Safe Error Handling',
          keyPoints: [
            'Wrap async/await network calls in try / catch / finally so loading spinners always reset even on failure.',
            'Check response.ok on fetch() calls because HTTP 4xx/5xx responses do not automatically reject Promises.',
            'Use Promise.all() when independent requests can run concurrently rather than awaiting sequentially.',
          ],
          exampleLabel: 'Resilient Async Fetch Pattern',
          exampleCode: `try {\n  setLoading(true);\n  const res = await fetch('/api/roadmap');\n  if (!res.ok) throw new Error('Failed to load');\n  setData(await res.json());\n} catch (err) {\n  setError(err instanceof Error ? err.message : 'Error');\n} finally {\n  setLoading(false);\n}`,
          takeaway: 'Always guard response.ok and clear loading states inside finally.',
        },
        {
          heading: '3. Component Contracts & Type Safety',
          keyPoints: [
            'Define explicit TypeScript interfaces for props and API payloads so mismatched shapes fail at compile time.',
            'Keep side effects inside useEffect with accurate dependency arrays and cleanup functions where needed.',
            'Pass unique, stable keys (e.g., item.id) when rendering lists—never array indices if items reorder.',
          ],
          takeaway: 'Explicit types and stable component boundaries eliminate entire classes of runtime bugs.',
        },
      ],
      practicePrompt: 'Write a typed async loader function that fetches a JSON list, handles non-200 HTTP errors cleanly, and computes a summary metric with .reduce().',
      quiz: [
        {
          id: 'lq1',
          topic: 'Fetch API',
          question: 'Why should you explicitly check if (!res.ok) after awaiting fetch()?',
          options: [
            'fetch() resolves normally on HTTP 404 or 500 responses instead of throwing',
            'fetch() only returns XML unless res.ok is checked',
            'Checking res.ok automatically caches responses in SQLite',
            'res.ok converts GET requests into POST',
          ],
          correctIndex: 0,
          explanation: 'fetch() only rejects on network failures; HTTP error statuses like 404/500 resolve with res.ok === false.',
        },
        {
          id: 'lq2',
          topic: 'Array Methods',
          question: 'Which array method returns a brand-new array containing only elements matching a condition?',
          options: ['.push()', '.filter()', '.splice()', '.sort()'],
          correctIndex: 1,
          explanation: '.filter() returns a new array of matching elements without mutating the original array.',
        },
        {
          id: 'lq3',
          topic: 'Async UX',
          question: 'Where should setLoading(false) be placed in an async try/catch flow?',
          options: [
            'Only inside the catch block',
            'Inside a finally block so it runs on both success and failure',
            'Before calling fetch()',
            'Inside CSS keyframes',
          ],
          correctIndex: 1,
          explanation: 'Placing loading cleanup in finally ensures spinners never get stuck if an error is thrown.',
        },
        {
          id: 'lq4',
          topic: 'React Lists',
          question: 'What is the best value to use for a React list item key prop?',
          options: [
            'Math.random() on every render',
            'A stable, unique identifier from the data such as item.id',
            'Always the string "item"',
            'The current timestamp',
          ],
          correctIndex: 1,
          explanation: 'Stable unique IDs let React reconcile list additions, removals, and edits accurately.',
        },
      ],
    };
  }

  if (lower.includes('python') || lower.includes('ml') || lower.includes('ai') || lower.includes('data') || lower.includes('sql') || lower.includes('pandas') || lower.includes('model')) {
    return {
      summary: `In Week ${params.weekNumber} of your ${params.careerGoal} track, "${params.lessonTitle}" strengthens data transformation discipline, reproducible evaluation, and clean analytical reasoning.`,
      notes: [
        {
          heading: '1. Clean Data Pipelines & Reproducibility',
          keyPoints: [
            'Inspect schemas, null counts, and data types before running aggregations or training models.',
            'Isolate project dependencies in a virtual environment (venv / conda) and pin versions for reproducibility.',
            'Separate raw immutable source files from cleaned derived datasets.',
          ],
          exampleLabel: 'Python Virtual Env & Data Check',
          exampleCode: `python -m venv .venv && source .venv/bin/activate\n# Quick dataset sanity check\nprint(df.isna().sum())\nprint(df.dtypes)`,
          takeaway: 'Data bugs caught during schema inspection save hours of misleading downstream modeling.',
        },
        {
          heading: '2. Aggregation & Leakage-Free Evaluation',
          keyPoints: [
            'In SQL, filter raw rows with WHERE before grouping, and filter aggregated groups with HAVING.',
            'In machine learning, fit scalers, encoders, and imputers strictly on training splits—never on the full dataset.',
            'Use fixed random seeds and hold-out test/validation splits so metrics reflect real unseen generalization.',
          ],
          exampleLabel: 'Leakage-Free Train/Test Split',
          exampleCode: `from sklearn.model_selection import train_test_split\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.2, random_state=42, stratify=y\n)`,
          takeaway: 'Preventing data leakage keeps evaluation scores honest and prevents production surprises.',
        },
        {
          heading: '3. Choosing Meaningful Metrics',
          keyPoints: [
            'Never rely solely on accuracy for imbalanced datasets; evaluate Precision, Recall, F1, or PR-AUC.',
            'Pair summary averages with medians and quantiles when distributions are skewed.',
            'Document baseline performance before testing complex architectures.',
          ],
          takeaway: 'A simple, measurable baseline beats an unverified complex model.',
        },
      ],
      practicePrompt: 'Load a sample CSV table, check for missing values, compute a grouped summary (by category), and split records cleanly into 80% train / 20% validation.',
      quiz: [
        {
          id: 'lq1',
          topic: 'Data Leakage',
          question: 'When normalizing numeric features for ML, when should mean and standard deviation be computed?',
          options: [
            'On the combined training + test set together',
            'Strictly on the training split, then applied to validation/test splits',
            'Only on the test split',
            'Randomly per batch without saving parameters',
          ],
          correctIndex: 1,
          explanation: 'Computing statistics across test data leaks distribution knowledge into training and inflates test metrics.',
        },
        {
          id: 'lq2',
          topic: 'SQL Filtering',
          question: 'Which SQL clause filters groups after a GROUP BY aggregation?',
          options: ['WHERE', 'HAVING', 'LIMIT', 'OFFSET'],
          correctIndex: 1,
          explanation: 'WHERE filters rows prior to grouping; HAVING filters aggregated groups.',
        },
        {
          id: 'lq3',
          topic: 'Evaluation Metrics',
          question: 'Why is raw accuracy misleading when positive cases are only 2% of a dataset?',
          options: [
            'Predicting negative for every row achieves 98% accuracy while missing 100% of positive cases',
            'Accuracy cannot be calculated on binary labels',
            'Python integers overflow above 95%',
            'Precision is always equal to accuracy',
          ],
          correctIndex: 0,
          explanation: 'Class imbalance requires precision, recall, and F1 to measure actual minority-class detection.',
        },
        {
          id: 'lq4',
          topic: 'Reproducibility',
          question: 'Why do data practitioners use virtual environments and fixed random seeds?',
          options: [
            'To make training files larger',
            'To guarantee consistent library versions and repeatable experiment results',
            'To bypass database authentication',
            'To avoid writing functions',
          ],
          correctIndex: 1,
          explanation: 'Pinned environments and fixed seeds ensure teammates and CI runs reproduce identical results.',
        },
      ],
    };
  }

  if (lower.includes('node') || lower.includes('express') || lower.includes('api') || lower.includes('auth') || lower.includes('jwt') || lower.includes('security') || lower.includes('docker') || lower.includes('cloud')) {
    return {
      summary: `In Week ${params.weekNumber} of your ${params.careerGoal} track, "${params.lessonTitle}" focuses on reliable backend architecture, input validation, authentication boundaries, and safe deployment.`,
      notes: [
        {
          heading: '1. Clean Request Validation & Status Codes',
          keyPoints: [
            'Validate incoming request bodies and query parameters at the route boundary before touching database state.',
            'Return accurate HTTP status codes: 200/201 for success, 400 for validation errors, 401 for missing/invalid auth, 404 for missing records.',
            'Centralize unexpected errors in error-handling middleware without leaking stack traces or secrets to clients.',
          ],
          exampleLabel: 'Express Boundary Validation',
          exampleCode: `app.post('/api/items', authenticateToken, (req, res) => {\n  const { title } = req.body || {};\n  if (!title || !String(title).trim()) {\n    return res.status(400).json({ error: 'Title is required.' });\n  }\n  return res.status(201).json({ title: String(title).trim() });\n});`,
          takeaway: 'Consistent status codes and boundary checks make client integration straightforward and secure.',
        },
        {
          heading: '2. Credential & Token Hygiene',
          keyPoints: [
            'Hash passwords with salted slow algorithms (bcrypt or Argon2)—never store plaintext or reversible encodings.',
            'Keep API keys, JWT signing secrets, and database credentials strictly in server environment variables.',
            'Verify authorization ownership (WHERE id = ? AND user_id = ?) on every user-scoped mutation.',
          ],
          takeaway: 'Authentication checks who you are; ownership checks verify what data you are allowed to touch.',
        },
        {
          heading: '3. Container & Environment Portability',
          keyPoints: [
            'Separate configuration (ports, URLs, secrets) from application code so builds run identically across dev and prod.',
            'Use parameterized SQL queries (?) to eliminate SQL injection vulnerabilities completely.',
            'Add a lightweight /api/health endpoint for uptime checks and deployment verification.',
          ],
          takeaway: 'Parameterized queries and environment-driven config protect reliability in production.',
        },
      ],
      practicePrompt: 'Design a protected POST endpoint that validates required fields (returning 400 if empty), checks user ownership, and writes safely using parameterized queries.',
      quiz: [
        {
          id: 'lq1',
          topic: 'HTTP Semantics',
          question: 'Which HTTP status code best signals that an authenticated request failed input validation?',
          options: ['200 OK', '400 Bad Request', '302 Found', '503 Service Unavailable'],
          correctIndex: 1,
          explanation: '400 Bad Request informs the caller that their submitted payload failed validation.',
        },
        {
          id: 'lq2',
          topic: 'Password Security',
          question: 'Why must user passwords be hashed with bcrypt or Argon2 instead of Base64 or SHA-1?',
          options: [
            'Slow salted password hashes resist rainbow tables and brute-force GPU cracking',
            'Base64 encrypts passwords permanently',
            'SQLite only indexes bcrypt strings',
            'Bcrypt compresses passwords to 2 bytes',
          ],
          correctIndex: 0,
          explanation: 'Salted work-factor hashes make offline cracking orders of magnitude harder.',
        },
        {
          id: 'lq3',
          topic: 'Database Safety',
          question: 'What is the primary defense against SQL injection in backend queries?',
          options: [
            'String concatenation with template literals',
            'Parameterized queries / prepared statements with bound placeholders',
            'Hiding error messages in CSS',
            'Storing SQL queries in browser localStorage',
          ],
          correctIndex: 1,
          explanation: 'Prepared statements separate SQL syntax from user-supplied values at the driver level.',
        },
        {
          id: 'lq4',
          topic: 'Authorization',
          question: 'When updating a task by ID in a multi-user API, why include AND user_id = ? in the query?',
          options: [
            'It prevents one authenticated user from modifying another user’s record by guessing IDs',
            'It makes JSON parsing faster',
            'It disables JWT verification',
            'It is required for CORS headers',
          ],
          correctIndex: 0,
          explanation: 'Scoping queries by the authenticated user_id enforces object-level authorization.',
        },
      ],
    };
  }

  const primaryTopic = params.weekTopics[0] || params.weekTitle;
  const secondaryTopic = params.weekTopics[1] || params.careerGoal;
  return {
    summary: `This Week ${params.weekNumber} lesson ("${params.lessonTitle}") advances your ${params.careerGoal} roadmap by pairing core principles of ${primaryTopic} with verifiable hands-on execution.`,
    notes: [
      {
        heading: `1. Core Concepts of ${primaryTopic}`,
        keyPoints: [
          `Break ${params.lessonTitle} down into clear inputs, transformations, and expected outputs before writing code or artifacts.`,
          `Connect ${primaryTopic} directly to real ${params.careerGoal} deliverables rather than memorizing abstract definitions.`,
          `Identify common failure modes and boundary conditions early in your workflow.`,
        ],
        exampleLabel: `${params.careerGoal} Workflow Checklist`,
        exampleCode: `1. Define goal & constraints for ${primaryTopic}\n2. Build minimal working prototype\n3. Verify edge cases & document trade-offs`,
        takeaway: `Clear mental models around ${primaryTopic} accelerate every subsequent week in the ${params.careerGoal} track.`,
      },
      {
        heading: `2. Applying ${secondaryTopic} in Practice`,
        keyPoints: [
          'Work in tight build-test feedback loops (20–30 minute increments) so defects surface immediately.',
          'Keep interfaces modular so individual parts can be tested and refactored independently.',
          'Write brief notes explaining why a design choice works—this prepares you for technical interviews.',
        ],
        takeaway: 'Incremental validation beats trying to debug a large monolithic change at the end.',
      },
      {
        heading: '3. Readiness Check & Track Progression',
        keyPoints: [
          `Ensure your work satisfies Week ${params.weekNumber} objectives (${params.weekTitle}).`,
          'Complete the practice exercise below before taking the post-lesson quiz.',
          'Use quiz feedback to target any weak concepts immediately before advancing to the next lesson.',
        ],
        takeaway: 'Every completed lesson and quiz compounds your verified career readiness score.',
      },
    ],
    practicePrompt: `Spend 10–15 minutes applying "${params.lessonTitle}" in a small working example and note one edge case you tested.`,
    quiz: [
      {
        id: 'lq1',
        topic: primaryTopic,
        question: `When tackling "${params.lessonTitle}" in a ${params.careerGoal} workflow, what is the strongest first step?`,
        options: [
          'Define clear inputs, expected outputs, and boundary cases before building',
          'Skip planning and copy untested boilerplate',
          'Ignore error paths until final deployment',
          'Combine unrelated modules into one file',
        ],
        correctIndex: 0,
        explanation: 'Clarifying inputs, outputs, and edge cases up front prevents costly rework.',
      },
      {
        id: 'lq2',
        topic: secondaryTopic,
        question: `Why do ${params.careerGoal} engineers test changes in short, incremental loops?`,
        options: [
          'It isolates defects immediately and verifies each unit behaves as expected',
          'It eliminates the need for documentation',
          'It prevents version control commits',
          'It slows down learning intentionally',
        ],
        correctIndex: 0,
        explanation: 'Short feedback loops keep debugging focused and build confidence rapidly.',
      },
      {
        id: 'lq3',
        topic: params.weekTitle,
        question: `How does completing ${params.lessonTitle} support your Week ${params.weekNumber} mini-project?`,
        options: [
          'It builds reusable practical building blocks that plug directly into the weekly deliverable',
          'It replaces the mini-project requirement completely',
          'It only applies to unrelated career tracks',
          'It disables weekly progress tracking',
        ],
        correctIndex: 0,
        explanation: 'Each lesson scaffolds a concrete capability needed for that week’s mini-project.',
      },
      {
        id: 'lq4',
        topic: 'Mastery Habits',
        question: 'What is the best action if you miss a question on a post-lesson quiz?',
        options: [
          'Re-read the corresponding note section, inspect the explanation, and retry',
          'Skip the rest of the week',
          'Delete your completed notes',
          'Never verify the concept again',
        ],
        correctIndex: 0,
        explanation: 'Reviewing the exact concept immediately turns quiz misses into durable understanding.',
      },
    ],
  };
}

export function gradeLessonQuiz(params: {
  userId: number;
  taskId: number;
  answers: number[];
}) {
  const cached = db
    .prepare('SELECT * FROM lesson_contents WHERE task_id = ? AND user_id = ?')
    .get(params.taskId, params.userId) as Record<string, unknown> | undefined;

  if (!cached) return null;

  const quiz = safeJsonParse<LessonQuizQuestion[]>(cached.quiz_json, []);
  const lessonTitle = String(cached.lesson_title);
  const weekNumber = Number(cached.week_number);

  let correctCount = 0;
  const strongAreas = new Set<string>();
  const weakAreas = new Set<string>();

  const questionResults = quiz.map((q, idx) => {
    const selectedIndex = params.answers[idx] ?? -1;
    const isCorrect = selectedIndex === q.correctIndex;
    if (isCorrect) {
      correctCount += 1;
      strongAreas.add(q.topic);
    } else {
      weakAreas.add(q.topic);
    }
    return {
      id: q.id,
      question: q.question,
      selectedIndex,
      correctIndex: q.correctIndex,
      correctOption: q.options[q.correctIndex] || '',
      isCorrect,
      explanation: q.explanation,
    };
  });

  const score = Math.round((correctCount / Math.max(1, quiz.length)) * 100);
  const passed = score >= 60;
  const strongList = Array.from(strongAreas).filter((s) => !weakAreas.has(s));
  const weakList = Array.from(weakAreas);

  const feedback = passed
    ? `Lesson quiz passed (${score}% · ${correctCount}/${quiz.length})! "${lessonTitle}" is now marked complete on your Week ${weekNumber} track.`
    : `Scored ${score}% (${correctCount}/${quiz.length}). Review the highlighted notes on ${weakList.join(', ') || 'key concepts'} above and retake the quiz (60%+ completes this lesson).`;

  db.prepare(`
    UPDATE lesson_contents
    SET quiz_passed = CASE WHEN ? = 1 THEN 1 ELSE quiz_passed END,
        last_quiz_score = ?,
        updated_at = datetime('now')
    WHERE task_id = ? AND user_id = ?
  `).run(passed ? 1 : 0, score, params.taskId, params.userId);

  let taskCompleted = false;
  if (passed) {
    const existingTask = db.prepare('SELECT completed FROM roadmap_tasks WHERE id = ? AND user_id = ?').get(params.taskId, params.userId) as { completed: number } | undefined;
    const wasAlreadyDone = Boolean(existingTask?.completed);
    db.prepare('UPDATE roadmap_tasks SET completed = 1, completed_at = ? WHERE id = ? AND user_id = ?').run(
      new Date().toISOString(),
      params.taskId,
      params.userId
    );
    taskCompleted = true;

    if (!wasAlreadyDone) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const todayDay = dayNames[new Date().getDay()];
      db.prepare(`
        INSERT INTO daily_study_logs (user_id, week_number, day_name, hours_logged, tasks_done)
        VALUES (?, ?, ?, 0.5, 1)
        ON CONFLICT(user_id, week_number, day_name) DO UPDATE SET
          tasks_done = tasks_done + 1,
          hours_logged = CASE WHEN hours_logged = 0 THEN 0.5 ELSE hours_logged END,
          updated_at = datetime('now')
      `).run(params.userId, weekNumber, todayDay);
    }
  }

  db.prepare(`
    INSERT INTO quiz_attempts (user_id, quiz_type, reference_id, title, questions_json, answers_json, score, strong_areas, weak_areas, ai_feedback)
    VALUES (?, 'lesson', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    params.userId,
    String(params.taskId),
    `Lesson Quiz: ${lessonTitle}`,
    JSON.stringify(quiz),
    JSON.stringify(params.answers),
    score,
    JSON.stringify(strongList),
    JSON.stringify(weakList),
    feedback
  );

  db.prepare(`
    INSERT INTO agent_logs (user_id, agent_name, task_summary, context_snapshot, output_summary, status, duration_ms)
    VALUES (?, ?, ?, ?, ?, 'completed', ?)
  `).run(
    params.userId,
    'Adaptive Assessment Agent',
    `Graded post-lesson quiz for "${lessonTitle}" (${score}%)`,
    JSON.stringify({ taskId: params.taskId, weekNumber, score, passed }),
    feedback,
    95
  );

  return {
    score,
    correctCount,
    total: quiz.length,
    passed,
    taskCompleted,
    feedback,
    strongAreas: strongList,
    weakAreas: weakList,
    questionResults,
  };
}
