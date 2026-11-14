import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { sanitizeUrlSync } from './agents/resourceCatalog.js';

const DB_PATH = path.resolve(process.cwd(), 'skillpath.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      education_level TEXT NOT NULL DEFAULT 'Undergraduate',
      institution TEXT NOT NULL DEFAULT '',
      avatar_url TEXT DEFAULT '',
      profile_completed INTEGER NOT NULL DEFAULT 0,
      theme_preference TEXT NOT NULL DEFAULT 'light',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learner_profiles (
      user_id INTEGER PRIMARY KEY,
      department TEXT NOT NULL DEFAULT '',
      technical_skills TEXT NOT NULL DEFAULT '[]',
      programming_languages TEXT NOT NULL DEFAULT '[]',
      certifications TEXT NOT NULL DEFAULT '[]',
      projects TEXT NOT NULL DEFAULT '[]',
      career_interest TEXT NOT NULL DEFAULT '',
      unsure_career INTEGER NOT NULL DEFAULT 0,
      interests_notes TEXT NOT NULL DEFAULT '',
      explore_other_careers INTEGER NOT NULL DEFAULT 1,
      daily_study_hours REAL NOT NULL DEFAULT 2,
      learning_style TEXT NOT NULL DEFAULT 'Hands-on Projects',
      selected_career TEXT NOT NULL DEFAULT '',
      career_goal_confirmed INTEGER NOT NULL DEFAULT 0,
      target_completion_date TEXT NOT NULL DEFAULT '',
      learning_stage TEXT NOT NULL DEFAULT 'Onboarding',
      learning_streak INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS skill_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      skill_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Core',
      current_proficiency INTEGER NOT NULL DEFAULT 0,
      required_proficiency INTEGER NOT NULL DEFAULT 80,
      gap INTEGER NOT NULL DEFAULT 80,
      priority TEXT NOT NULL DEFAULT 'High',
      verified INTEGER NOT NULL DEFAULT 0,
      last_assessed_at TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS career_recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      career_title TEXT NOT NULL,
      match_score INTEGER NOT NULL DEFAULT 75,
      rationale TEXT NOT NULL,
      missing_skills TEXT NOT NULL DEFAULT '[]',
      required_skills TEXT NOT NULL DEFAULT '[]',
      estimated_weeks INTEGER NOT NULL DEFAULT 8,
      salary_outlook TEXT NOT NULL DEFAULT '',
      is_selected INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS roadmaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      career_goal TEXT NOT NULL,
      total_weeks INTEGER NOT NULL DEFAULT 8,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS roadmap_weeks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roadmap_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      week_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      learning_objectives TEXT NOT NULL DEFAULT '[]',
      topics TEXT NOT NULL DEFAULT '[]',
      recommended_courses TEXT NOT NULL DEFAULT '[]',
      tutorial_links TEXT NOT NULL DEFAULT '[]',
      practical_exercises TEXT NOT NULL DEFAULT '[]',
      mini_project TEXT NOT NULL DEFAULT '{}',
      expected_hours REAL NOT NULL DEFAULT 10,
      is_adapted INTEGER NOT NULL DEFAULT 0,
      adaptation_note TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS roadmap_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      task_type TEXT NOT NULL DEFAULT 'lesson',
      estimated_minutes INTEGER NOT NULL DEFAULT 45,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT DEFAULT '',
      due_date TEXT DEFAULT '',
      is_adaptive_remedial INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (week_id) REFERENCES roadmap_weeks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_study_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      week_number INTEGER NOT NULL,
      day_name TEXT NOT NULL,
      hours_logged REAL NOT NULL DEFAULT 0,
      tasks_done INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, week_number, day_name),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      quiz_type TEXT NOT NULL,
      reference_id TEXT NOT NULL,
      title TEXT NOT NULL,
      questions_json TEXT NOT NULL,
      answers_json TEXT NOT NULL DEFAULT '[]',
      score INTEGER NOT NULL DEFAULT 0,
      strong_areas TEXT NOT NULL DEFAULT '[]',
      weak_areas TEXT NOT NULL DEFAULT '[]',
      ai_feedback TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS weekly_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      week_number INTEGER NOT NULL,
      learning_goal TEXT NOT NULL,
      tasks_completed INTEGER NOT NULL,
      total_tasks INTEGER NOT NULL,
      progress_pct INTEGER NOT NULL,
      study_hours REAL NOT NULL,
      quiz_score INTEGER NOT NULL DEFAULT 0,
      strong_area TEXT NOT NULL,
      improvement_area TEXT NOT NULL,
      ai_feedback TEXT NOT NULL,
      generated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, week_number),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS adaptive_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      trigger_type TEXT NOT NULL,
      score INTEGER NOT NULL,
      weak_topics TEXT NOT NULL DEFAULT '[]',
      actions_taken TEXT NOT NULL DEFAULT '[]',
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mentor_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agent_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      agent_name TEXT NOT NULL,
      task_summary TEXT NOT NULL,
      context_snapshot TEXT NOT NULL DEFAULT '{}',
      output_summary TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      duration_ms INTEGER NOT NULL DEFAULT 120,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS saved_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      provider TEXT NOT NULL,
      url TEXT NOT NULL,
      skill_tag TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      bookmarked INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lesson_contents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      career_track TEXT NOT NULL DEFAULT '',
      week_number INTEGER NOT NULL DEFAULT 1,
      lesson_title TEXT NOT NULL,
      summary TEXT NOT NULL,
      notes_json TEXT NOT NULL DEFAULT '[]',
      practice_prompt TEXT NOT NULL DEFAULT '',
      quiz_json TEXT NOT NULL DEFAULT '[]',
      quiz_passed INTEGER NOT NULL DEFAULT 0,
      last_quiz_score INTEGER DEFAULT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES roadmap_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  seedDemoAccounts();
  repairStoredResourceUrls();
}

function repairStoredResourceUrls() {
  const weeks = db.prepare('SELECT id, title, topics, recommended_courses, tutorial_links FROM roadmap_weeks').all() as Array<{
    id: number;
    title: string;
    topics: string;
    recommended_courses: string;
    tutorial_links: string;
  }>;

  const updateWeek = db.prepare('UPDATE roadmap_weeks SET recommended_courses = ?, tutorial_links = ? WHERE id = ?');
  for (const w of weeks) {
    try {
      const courses = JSON.parse(w.recommended_courses || '[]') as Array<{ title: string; provider: string; url: string; duration: string }>;
      const tutorials = JSON.parse(w.tutorial_links || '[]') as Array<{ title: string; url: string; type: string }>;
      const hint = `${w.title} ${w.topics}`;

      let changed = false;
      const fixedCourses = courses.map((c) => {
        const nextUrl = sanitizeUrlSync(c.url, c.title, hint);
        if (nextUrl !== c.url) changed = true;
        return { ...c, url: nextUrl };
      });
      const fixedTutorials = tutorials.map((t) => {
        const nextUrl = sanitizeUrlSync(t.url, t.title, hint);
        if (nextUrl !== t.url) changed = true;
        return { ...t, url: nextUrl };
      });

      if (changed) {
        updateWeek.run(JSON.stringify(fixedCourses), JSON.stringify(fixedTutorials), w.id);
      }
    } catch {
      // ignore malformed JSON row
    }
  }

  const saved = db.prepare('SELECT id, title, skill_tag, url FROM saved_resources').all() as Array<{
    id: number;
    title: string;
    skill_tag: string;
    url: string;
  }>;
  const updateSaved = db.prepare('UPDATE saved_resources SET url = ? WHERE id = ?');
  for (const s of saved) {
    const nextUrl = sanitizeUrlSync(s.url, s.title, s.skill_tag);
    if (nextUrl !== s.url) {
      updateSaved.run(nextUrl, s.id);
    }
  }
}

function seedDemoAccounts() {
  const existingDemo = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@skillpath.ai') as { id: number } | undefined;
  const avatarPath = fs.existsSync(path.resolve(process.cwd(), 'src/assets/images/student_avatar_demo_1794630874086.jpg'))
    ? '/src/assets/images/student_avatar_demo_1794630874086.jpg'
    : '';

  if (!existingDemo) {
    const hash = bcrypt.hashSync('SkillPath2026!', 10);
    const res = db.prepare(`
      INSERT INTO users (full_name, email, password_hash, education_level, institution, avatar_url, profile_completed)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(
      'Aarav Mehta',
      'demo@skillpath.ai',
      hash,
      'Undergraduate (B.Tech / B.E.)',
      'IIT Madras',
      avatarPath
    );
    const userId = Number(res.lastInsertRowid);

    const targetDate = new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO learner_profiles (
        user_id, department, technical_skills, programming_languages, certifications, projects,
        career_interest, unsure_career, interests_notes, explore_other_careers,
        daily_study_hours, learning_style, selected_career, career_goal_confirmed,
        target_completion_date, learning_stage, learning_streak
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?, ?, ?, 1, ?, ?, ?)
    `).run(
      userId,
      'Computer Science & Engineering',
      JSON.stringify(['HTML', 'SQL', 'Git', 'REST Concepts', 'Linux Basics']),
      JSON.stringify(['Python', 'SQL', 'JavaScript']),
      JSON.stringify(['Python for Everybody (Coursera)', 'SQL Foundations']),
      JSON.stringify(['Campus Event Tracker CLI', 'Student Attendance SQLite App']),
      'Full Stack Developer',
      'Building responsive web products and scalable APIs',
      2.5,
      'Hands-on Projects & Interactive Challenges',
      'Full Stack Developer',
      targetDate,
      'Week 2: JavaScript & Asynchronous Web',
      6
    );

    const skills = [
      { name: 'HTML5 & Semantic Markup', cat: 'Frontend', cur: 78, req: 85, pri: 'Low', ver: 1 },
      { name: 'Python Fundamentals', cat: 'Programming', cur: 75, req: 70, pri: 'Low', ver: 1 },
      { name: 'SQL & Relational Modeling', cat: 'Database', cur: 72, req: 80, pri: 'Medium', ver: 1 },
      { name: 'CSS3, Flexbox & Tailwind', cat: 'Frontend', cur: 55, req: 85, pri: 'Medium', ver: 0 },
      { name: 'JavaScript (ES6+ & DOM)', cat: 'Frontend', cur: 45, req: 90, pri: 'High', ver: 0 },
      { name: 'React & State Architecture', cat: 'Frontend', cur: 15, req: 85, pri: 'High', ver: 0 },
      { name: 'Node.js & Express APIs', cat: 'Backend', cur: 10, req: 85, pri: 'High', ver: 0 },
      { name: 'Authentication & Security', cat: 'Backend', cur: 10, req: 80, pri: 'High', ver: 0 },
    ];
    const insertSkill = db.prepare(`
      INSERT INTO skill_assessments (user_id, skill_name, category, current_proficiency, required_proficiency, gap, priority, verified, last_assessed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const s of skills) {
      insertSkill.run(userId, s.name, s.cat, s.cur, s.req, Math.max(0, s.req - s.cur), s.pri, s.ver, s.ver ? new Date().toISOString() : '');
    }

    const careers = [
      {
        title: 'Full Stack Developer',
        match: 89,
        rationale: 'Your strong Python, SQL, and HTML baseline pairs well with your interest in building end-to-end web products. Mastering JavaScript, React, and Node.js will close your core readiness gaps in 8 weeks.',
        missing: ['CSS3 & Tailwind', 'JavaScript ES6+', 'React', 'Node.js & Express', 'REST APIs'],
        required: ['HTML5', 'CSS3', 'JavaScript', 'React', 'Node.js', 'SQL', 'Git', 'REST APIs'],
        weeks: 8,
        salary: '$85k – $135k',
        selected: 1,
      },
      {
        title: 'Software Engineer',
        match: 83,
        rationale: 'Solid programming fundamentals in Python and SQL give you an advantage in backend services and systems design. Expanding into data structures and TypeScript prepares you cleanly.',
        missing: ['Data Structures & Algorithms', 'TypeScript', 'System Design', 'Automated Testing'],
        required: ['Python', 'JavaScript/TypeScript', 'Data Structures', 'SQL', 'Git', 'Testing'],
        weeks: 10,
        salary: '$90k – $145k',
        selected: 0,
      },
      {
        title: 'Data Analyst',
        match: 78,
        rationale: 'Your SQL and Python background covers half of the core analytics stack. Adding Pandas, statistical visualization, and BI dashboards creates an immediate path to analytics roles.',
        missing: ['Pandas & NumPy', 'Data Visualization', 'Statistics', 'Dashboarding'],
        required: ['SQL', 'Python', 'Statistics', 'Tableau / Power BI', 'Data Cleaning'],
        weeks: 7,
        salary: '$70k – $110k',
        selected: 0,
      },
      {
        title: 'Cloud Engineer',
        match: 68,
        rationale: 'Linux basics and Python scripting are great building blocks for cloud infrastructure, though you will need dedicated practice in AWS/GCP, Docker, and CI/CD pipelines.',
        missing: ['Docker & Containers', 'Cloud Architecture', 'Terraform / IaC', 'CI/CD Pipelines'],
        required: ['Linux', 'Python/Bash', 'Networking', 'Docker', 'AWS/GCP', 'CI/CD'],
        weeks: 10,
        salary: '$95k – $150k',
        selected: 0,
      },
    ];
    const insertCareer = db.prepare(`
      INSERT INTO career_recommendations (user_id, career_title, match_score, rationale, missing_skills, required_skills, estimated_weeks, salary_outlook, is_selected)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of careers) {
      insertCareer.run(userId, c.title, c.match, c.rationale, JSON.stringify(c.missing), JSON.stringify(c.required), c.weeks, c.salary, c.selected);
    }

    const roadmapRes = db.prepare(`
      INSERT INTO roadmaps (user_id, career_goal, total_weeks) VALUES (?, ?, 8)
    `).run(userId, 'Full Stack Developer');
    const roadmapId = Number(roadmapRes.lastInsertRowid);

    const weeksData = [
      {
        num: 1,
        title: 'HTML5, Modern CSS & Responsive Design',
        objectives: ['Build accessible semantic HTML5 page structures', 'Master CSS Flexbox and CSS Grid layouts', 'Style responsive components with Tailwind CSS'],
        topics: ['Semantic HTML5', 'Box Model & Specificity', 'Flexbox & Grid', 'Responsive Breakpoints', 'Tailwind Utility Patterns'],
        courses: [
          { title: 'Responsive Web Design Certification', provider: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/', duration: '6 hrs' },
          { title: 'MDN CSS Layout Guides', provider: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout', duration: '3 hrs' },
        ],
        tutorials: [
          { title: 'CSS Flexbox Interactive Guide', url: 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/', type: 'Article' },
          { title: 'Tailwind CSS Core Concepts', url: 'https://tailwindcss.com/docs/styling-with-utility-classes', type: 'Documentation' },
        ],
        exercises: ['Refactor a div-heavy landing page into semantic HTML5', 'Build a 3-column responsive pricing grid using CSS Grid'],
        miniProject: { title: 'Developer Portfolio Layout', description: 'Design and code a responsive single-page portfolio with accessible navigation and project cards.', deliverables: ['Semantic HTML5 document', 'Mobile + desktop CSS Grid layout', 'Deployed static build'] },
        hours: 8,
        tasks: [
          { title: 'Semantic HTML5 & Accessibility Landmarks', type: 'lesson', mins: 45, done: 1 },
          { title: 'CSS Box Model, Cascade & Variables', type: 'lesson', mins: 45, done: 1 },
          { title: 'Flexbox Alignment Lab', type: 'exercise', mins: 60, done: 1 },
          { title: 'CSS Grid Dashboard Skeleton', type: 'exercise', mins: 60, done: 1 },
          { title: 'Responsive Breakpoints & Mobile-First Media Queries', type: 'lesson', mins: 45, done: 1 },
          { title: 'Tailwind CSS Rapid Styling Practice', type: 'exercise', mins: 50, done: 1 },
          { title: 'Form Validation & Accessible Labels', type: 'lesson', mins: 40, done: 1 },
          { title: 'Mini Project: Portfolio Wireframe & Header', type: 'project', mins: 90, done: 1 },
          { title: 'Mini Project: Responsive Project Showcase Grid', type: 'project', mins: 90, done: 0 },
          { title: 'Week 1 Mastery Review & Cleanup', type: 'revision', mins: 30, done: 0 },
        ],
      },
      {
        num: 2,
        title: 'JavaScript Fundamentals & Control Flow',
        objectives: ['Write clean ES6+ functions and scope-safe variables', 'Manipulate arrays and objects with map/filter/reduce', 'Handle asynchronous execution and Promises'],
        topics: ['Variables & Scope (let/const)', 'Functions & Closures', 'Arrays & Higher-Order Methods', 'Objects & Destructuring', 'Error Handling'],
        courses: [
          { title: 'JavaScript Algorithms and Data Structures', provider: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/', duration: '8 hrs' },
          { title: 'The Modern JavaScript Tutorial', provider: 'javascript.info', url: 'https://javascript.info/', duration: '6 hrs' },
        ],
        tutorials: [
          { title: 'MDN Working with Arrays', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array', type: 'Documentation' },
          { title: 'ES6 Arrow Functions & Closures', url: 'https://javascript.info/closure', type: 'Interactive Guide' },
        ],
        exercises: ['Implement cart subtotal calculator using array.reduce()', 'Build a debounced search filter function'],
        miniProject: { title: 'Interactive Expense Tracker CLI/Web Logic', description: 'Create a pure JavaScript state module supporting add, filter, category grouping, and monthly totals.', deliverables: ['Modular ES6 functions', 'Unit-tested calculation helpers'] },
        hours: 10,
        tasks: [
          { title: 'Execution Context, let/const & Lexical Scope', type: 'lesson', mins: 45, done: 1 },
          { title: 'Functions, Arrow Syntax & Callbacks', type: 'lesson', mins: 50, done: 1 },
          { title: 'Array Transformation Lab (map, filter, reduce)', type: 'exercise', mins: 60, done: 1 },
          { title: 'Object Destructuring & Spread Patterns', type: 'lesson', mins: 45, done: 0 },
          { title: 'Closures & Module Pattern Practice', type: 'exercise', mins: 55, done: 0 },
          { title: 'Mini Project: Expense State Engine', type: 'project', mins: 120, done: 0 },
        ],
      },
      {
        num: 3,
        title: 'Advanced JavaScript, DOM & Async APIs',
        objectives: ['Manipulate the DOM efficiently with event delegation', 'Consume REST APIs using Fetch and async/await', 'Persist client state in localStorage'],
        topics: ['DOM Tree & Event Delegation', 'Fetch API & HTTP Status Codes', 'Async/Await & Promise.all', 'Web Storage APIs', 'Client-side Validation'],
        courses: [
          { title: 'Asynchronous JavaScript Deep Dive', provider: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS', duration: '5 hrs' },
        ],
        tutorials: [
          { title: 'Using the Fetch API', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch', type: 'Documentation' },
        ],
        exercises: ['Build a live GitHub profile lookup widget with loading & error states'],
        miniProject: { title: 'Real-Time Weather & Task Board', description: 'Interactive browser app fetching live API data and persisting user notes.', deliverables: ['Event-delegated task list', 'Async API integration with error boundaries'] },
        hours: 10,
        tasks: [
          { title: 'DOM Queries & Event Bubbling/Delegation', type: 'lesson', mins: 50, done: 0 },
          { title: 'Promises, Async/Await & Try/Catch', type: 'lesson', mins: 60, done: 0 },
          { title: 'Fetch API & JSON Parsing Lab', type: 'exercise', mins: 60, done: 0 },
          { title: 'Mini Project: Live API Explorer', type: 'project', mins: 120, done: 0 },
        ],
      },
      {
        num: 4,
        title: 'React Fundamentals & Component Architecture',
        objectives: ['Think in declarative React components and props', 'Manage local UI state with useState and useEffect', 'Build reusable form and list patterns'],
        topics: ['JSX & Virtual DOM', 'Props & Composition', 'useState & Controlled Inputs', 'useEffect Lifecycle', 'Conditional Rendering & Keys'],
        courses: [
          { title: 'Official React Learn Curriculum', provider: 'React.dev', url: 'https://react.dev/learn', duration: '8 hrs' },
        ],
        tutorials: [
          { title: 'Thinking in React', url: 'https://react.dev/learn/thinking-in-react', type: 'Official Guide' },
        ],
        exercises: ['Build a filterable searchable product catalog in React'],
        miniProject: { title: 'Interactive Study Flashcard Deck', description: 'Create a React flashcard app with mastery tracking and category filters.', deliverables: ['Reusable Card & Deck components', 'Filtered state & mastery counter'] },
        hours: 12,
        tasks: [
          { title: 'JSX, Components & Props Composition', type: 'lesson', mins: 50, done: 0 },
          { title: 'State Management with useState', type: 'lesson', mins: 60, done: 0 },
          { title: 'Side Effects & Data Fetching with useEffect', type: 'exercise', mins: 60, done: 0 },
          { title: 'Mini Project: Study Flashcard App', type: 'project', mins: 140, done: 0 },
        ],
      },
      {
        num: 5,
        title: 'React Routing, TypeScript & API Integration',
        objectives: ['Type React props and API payloads with TypeScript', 'Implement multi-page navigation with React Router', 'Structure Context providers cleanly'],
        topics: ['TypeScript Interfaces & Generics', 'React Router v6/v7', 'Context API & Custom Hooks', 'Loading & Error UX States'],
        courses: [
          { title: 'TypeScript Handbook for JS Programmers', provider: 'TypeScriptlang.org', url: 'https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html', duration: '5 hrs' },
        ],
        tutorials: [
          { title: 'React Router Feature Overview', url: 'https://reactrouter.com/home', type: 'Documentation' },
        ],
        exercises: ['Convert a JavaScript React module to strict TypeScript'],
        miniProject: { title: 'Multi-View Issue Tracker Frontend', description: 'Typed React SPA with route params, filtering, and optimistic UI updates.', deliverables: ['Typed API client', 'Protected routes & detail view'] },
        hours: 12,
        tasks: [
          { title: 'TypeScript Basics & Component Props', type: 'lesson', mins: 60, done: 0 },
          { title: 'React Router Nested Layouts', type: 'lesson', mins: 50, done: 0 },
          { title: 'Custom Hooks & Context Lab', type: 'exercise', mins: 70, done: 0 },
          { title: 'Mini Project: Issue Tracker UI', type: 'project', mins: 140, done: 0 },
        ],
      },
      {
        num: 6,
        title: 'Node.js, Express & RESTful API Design',
        objectives: ['Build modular Express routers and middleware', 'Design clean REST endpoints with proper HTTP status codes', 'Validate request payloads'],
        topics: ['Node Event Loop & Modules', 'Express Routing & Middleware', 'REST Architecture & Validation', 'Error Handling Middleware'],
        courses: [
          { title: 'Express Web Framework Guide', provider: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/Express_Nodejs', duration: '7 hrs' },
        ],
        tutorials: [
          { title: 'Express Routing Best Practices', url: 'https://expressjs.com/en/guide/routing.html', type: 'Documentation' },
        ],
        exercises: ['Create a REST API for books & authors with Zod/manual validation'],
        miniProject: { title: 'Task Management REST Service', description: 'Production-structured Express backend with pagination, filtering, and error handlers.', deliverables: ['CRUD endpoints', 'Request logging & validation middleware'] },
        hours: 12,
        tasks: [
          { title: 'Node.js Runtime & Express Setup', type: 'lesson', mins: 50, done: 0 },
          { title: 'RESTful Endpoints & Middleware Pipeline', type: 'lesson', mins: 60, done: 0 },
          { title: 'Input Validation & Error Responses Lab', type: 'exercise', mins: 60, done: 0 },
          { title: 'Mini Project: Task Service API', type: 'project', mins: 130, done: 0 },
        ],
      },
      {
        num: 7,
        title: 'Databases, SQL Integration & JWT Authentication',
        objectives: ['Connect Node.js APIs to relational/document databases', 'Hash passwords securely with bcrypt', 'Protect routes with JWT authentication'],
        topics: ['Relational Joins & Indexes', 'Password Hashing (bcrypt)', 'JWT Signing & Verification', 'Role-Based Access Middleware'],
        courses: [
          { title: 'SQLBolt Interactive SQL Lessons', provider: 'SQLBolt', url: 'https://sqlbolt.com/', duration: '4 hrs' },
        ],
        tutorials: [
          { title: 'JWT Introduction & Security Best Practices', url: 'https://jwt.io/introduction', type: 'Guide' },
        ],
        exercises: ['Implement /register, /login, and protected /me routes'],
        miniProject: { title: 'Authenticated Notes & Snippets Vault', description: 'Full backend auth + database persistence for private user notes.', deliverables: ['Hashed user credentials', 'Protected CRUD endpoints'] },
        hours: 12,
        tasks: [
          { title: 'Database Schema Design & Foreign Keys', type: 'lesson', mins: 60, done: 0 },
          { title: 'Bcrypt Password Hashing & Auth Flow', type: 'lesson', mins: 55, done: 0 },
          { title: 'JWT Middleware & Protected Routes Lab', type: 'exercise', mins: 70, done: 0 },
          { title: 'Mini Project: Authenticated Vault API', type: 'project', mins: 140, done: 0 },
        ],
      },
      {
        num: 8,
        title: 'Full Stack Capstone & Deployment',
        objectives: ['Integrate React + TypeScript frontend with authenticated Express + DB backend', 'Write end-to-end smoke checks', 'Deploy production build cleanly'],
        topics: ['Full-Stack State Sync', 'Environment Variables & Security', 'Production Builds', 'Portfolio Documentation'],
        courses: [
          { title: 'Full Stack Open Overview', provider: 'University of Helsinki', url: 'https://fullstackopen.com/en/', duration: '8 hrs' },
        ],
        tutorials: [
          { title: 'Deploying Full-Stack Node Apps', url: 'https://vitejs.dev/guide/build.html', type: 'Documentation' },
        ],
        exercises: ['Configure production environment variables and build script'],
        miniProject: { title: 'Capstone: Team Project & Analytics Portal', description: 'End-to-end authenticated full-stack web application with dashboard charts and CRUD workflows.', deliverables: ['Live deployed full-stack app', 'Clean README & architecture notes'] },
        hours: 14,
        tasks: [
          { title: 'Frontend-Backend Integration & Auth Guarding', type: 'lesson', mins: 60, done: 0 },
          { title: 'Error Handling, Empty States & Polish', type: 'exercise', mins: 75, done: 0 },
          { title: 'Capstone Build & Verification', type: 'project', mins: 180, done: 0 },
          { title: 'Portfolio Case Study & Final Assessment', type: 'project', mins: 90, done: 0 },
        ],
      },
    ];

    const insertWeek = db.prepare(`
      INSERT INTO roadmap_weeks (
        roadmap_id, user_id, week_number, title, learning_objectives, topics,
        recommended_courses, tutorial_links, practical_exercises, mini_project, expected_hours
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertTask = db.prepare(`
      INSERT INTO roadmap_tasks (week_id, user_id, title, task_type, estimated_minutes, completed, completed_at, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const w of weeksData) {
      const wRes = insertWeek.run(
        roadmapId,
        userId,
        w.num,
        w.title,
        JSON.stringify(w.objectives),
        JSON.stringify(w.topics),
        JSON.stringify(w.courses),
        JSON.stringify(w.tutorials),
        JSON.stringify(w.exercises),
        JSON.stringify(w.miniProject),
        w.hours
      );
      const weekId = Number(wRes.lastInsertRowid);
      w.tasks.forEach((t, idx) => {
        const due = new Date(Date.now() + ((w.num - 2) * 7 + idx) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        insertTask.run(
          weekId,
          userId,
          t.title,
          t.type,
          t.mins,
          t.done,
          t.done ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() : '',
          due
        );
      });
    }

    // Seed Mon-Sun study logs for Week 1 (6.5 hrs) and Week 2 (3.5 hrs so far)
    const insertLog = db.prepare(`
      INSERT INTO daily_study_logs (user_id, week_number, day_name, hours_logged, tasks_done)
      VALUES (?, ?, ?, ?, ?)
    `);
    const w1Days = [
      ['Mon', 1.0, 2], ['Tue', 1.2, 2], ['Wed', 0.8, 1], ['Thu', 1.0, 1], ['Fri', 1.5, 2], ['Sat', 0.5, 0], ['Sun', 0.5, 0],
    ] as const;
    for (const [day, hrs, done] of w1Days) insertLog.run(userId, 1, day, hrs, done);

    const w2Days = [
      ['Mon', 1.5, 2], ['Tue', 1.0, 1], ['Wed', 1.0, 0], ['Thu', 0, 0], ['Fri', 0, 0], ['Sat', 0, 0], ['Sun', 0, 0],
    ] as const;
    for (const [day, hrs, done] of w2Days) insertLog.run(userId, 2, day, hrs, done);

    // Seed Week 1 Quiz Attempt & Weekly Report
    db.prepare(`
      INSERT INTO quiz_attempts (user_id, quiz_type, reference_id, title, questions_json, answers_json, score, strong_areas, weak_areas, ai_feedback)
      VALUES (?, 'weekly', '1', 'Week 1: HTML5 & Responsive CSS Quiz', '[]', '[]', 75, ?, ?, ?)
    `).run(
      userId,
      JSON.stringify(['Semantic HTML5 Landmarks', 'Flexbox Alignment']),
      JSON.stringify(['CSS Grid Auto-Fit Breakpoints']),
      'Solid grasp of semantic HTML5 and Flexbox container alignment. Review CSS Grid minmax() tracks before moving deeper into React layouts.'
    );

    db.prepare(`
      INSERT INTO weekly_reports (
        user_id, week_number, learning_goal, tasks_completed, total_tasks, progress_pct,
        study_hours, quiz_score, strong_area, improvement_area, ai_feedback
      ) VALUES (?, 1, ?, 8, 10, 80, 6.5, 75, ?, ?, ?)
    `).run(
      userId,
      'HTML5, Modern CSS & Responsive Design',
      'Semantic HTML5 & Flexbox Layouts',
      'CSS Grid Breakpoints & Portfolio Polishing',
      'Great work! You completed 80% of your Week 1 learning goals with 6.5 study hours. Your HTML5 and Flexbox fundamentals are strong. Spend 45 extra minutes practicing CSS Grid responsive tracks alongside Week 2 JavaScript.'
    );

    db.prepare(`
      INSERT INTO mentor_messages (user_id, role, content) VALUES
      (?, 'assistant', ?),
      (?, 'user', ?),
      (?, 'assistant', ?)
    `).run(
      userId,
      'Welcome to SkillPath AI, Aarav! I have reviewed your Python and SQL background and your 8-week Full Stack Developer roadmap. You finished 80% of Week 1—ready to tackle JavaScript array methods and closures in Week 2?',
      userId,
      'Yes! Which part of Week 2 should I prioritize first given my Python background?',
      userId,
      'Since you already know Python functions and list comprehensions, focus first on JavaScript lexical scope (`let`/`const`), closures, and `map`/`filter`/`reduce`. Those map directly to Python patterns you know, and mastering them now will make React state updates effortless in Week 4.'
    );

    const insertAgentLog = db.prepare(`
      INSERT INTO agent_logs (user_id, agent_name, task_summary, context_snapshot, output_summary, status, duration_ms)
      VALUES (?, ?, ?, ?, ?, 'completed', ?)
    `);
    insertAgentLog.run(
      userId,
      'Skill Profiling & Gap Agent',
      'Analyzed student baseline skills against Full Stack Developer competency benchmark',
      JSON.stringify({ skills: ['HTML', 'SQL', 'Python'], target: 'Full Stack Developer' }),
      'Identified 3 verified foundations (HTML5, Python, SQL) and 5 priority skill gaps including JavaScript ES6+, React, and Node.js.',
      410
    );
    insertAgentLog.run(
      userId,
      'Career Recommendation Agent',
      'Ranked career tracks from academic background, projects, and interests',
      JSON.stringify({ department: 'CSE', languages: ['Python', 'SQL', 'JavaScript'] }),
      'Recommended Full Stack Developer (89% match), Software Engineer (83% match), Data Analyst (78% match), and Cloud Engineer (68% match).',
      520
    );
    insertAgentLog.run(
      userId,
      'Roadmap Architect Agent',
      'Generated 8-week personalized learning plan calibrated to 2.5 hrs/day',
      JSON.stringify({ confirmedGoal: 'Full Stack Developer', dailyHours: 2.5 }),
      'Constructed 8 sequential weekly modules with 38 tasks, curated tutorials, exercises, and weekly mini-projects.',
      680
    );
    insertAgentLog.run(
      userId,
      'Weekly Coach & Mentor Agent',
      'Compiled Week 1 Report from completed tasks, study logs, and 75% quiz score',
      JSON.stringify({ week: 1, completed: 8, total: 10, quizScore: 75 }),
      'Generated Week 1 performance summary and targeted revision recommendation for CSS Grid responsive tracks.',
      340
    );

    const insertRes = db.prepare(`
      INSERT INTO saved_resources (user_id, title, category, provider, url, skill_tag, completed, bookmarked)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insertRes.run(userId, 'Responsive Web Design Certification', 'Course', 'freeCodeCamp', 'https://www.freecodecamp.org/learn/2022/responsive-web-design/', 'CSS3 & Tailwind', 1);
    insertRes.run(userId, 'The Modern JavaScript Tutorial', 'Interactive Guide', 'javascript.info', 'https://javascript.info/', 'JavaScript ES6+', 0);
    insertRes.run(userId, 'Official React Learn Curriculum', 'Documentation', 'React.dev', 'https://react.dev/learn', 'React', 0);
    insertRes.run(userId, 'Express Web Framework Guide', 'Course', 'MDN Web Docs', 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/Express_Nodejs', 'Node.js & Express', 0);
  }

  // Seed fresh onboarding student account for testing 10-step onboarding
  const existingFresh = db.prepare('SELECT id FROM users WHERE email = ?').get('fresh@skillpath.ai') as { id: number } | undefined;
  if (!existingFresh) {
    const hash = bcrypt.hashSync('SkillPath2026!', 10);
    const res = db.prepare(`
      INSERT INTO users (full_name, email, password_hash, education_level, institution, profile_completed)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(
      'Priya Nair',
      'fresh@skillpath.ai',
      hash,
      'Undergraduate (B.Sc / B.A.)',
      'University of Delhi'
    );
    db.prepare(`INSERT INTO learner_profiles (user_id) VALUES (?)`).run(Number(res.lastInsertRowid));
  }
}
