# SkillPath AI — Personalized Career & Adaptive Learning Platform

SkillPath AI is a full-stack, multi-agent AI learning and career guidance platform. It evaluates each student's baseline skills, recommends aligned technology careers, constructs a personalized 8-week learning roadmap, tracks Monday–Sunday study progress, and adapts curriculum difficulty dynamically based on quiz performance.

## Judge Demo Accounts

Two pre-seeded demo accounts are available on `/login` (with one-click autofill buttons):

1. **Active Student Dashboard (Pre-onboarded)**
   - **Email:** `demo@skillpath.ai`
   - **Password:** `SkillPath2026!`
   - **Profile:** Aarav Mehta (B.Tech CSE, IIT Madras) — Full Stack Developer track with active Week 1 & Week 2 progress, logged Mon–Sun hours, Week 1 Report, and agent audit logs.

2. **First-Time Onboarding Flow (10-Step Assessment)**
   - **Email:** `fresh@skillpath.ai`
   - **Password:** `SkillPath2026!`
   - **Profile:** Priya Nair — Redirects straight to `/onboarding` to test the 10-question assessment, career recommendation review, and 3-way career goal confirmation (`Accept Recommendation`, `Explore Other Careers`, `Choose My Own Goal`).

## Multi-Agent AI Architecture

All AI capabilities run server-side using `@google/genai` (`gemini-4-hydrogen`) with a shared `LearnerContext` and resilient fallback scoring:

1. **Skill Profiling & Gap Agent** (`server/agents/orchestrator.ts`) — Evaluates student background against career benchmarks without assuming self-reported skills are verified.
2. **Career Recommendation Agent** — Ranks top career matches with rationales, salary outlook, estimated weeks, and missing skills.
3. **Roadmap Architect Agent** — Builds an 8-week curriculum with objectives, topics, courses, tutorials, exercises, mini-projects, and tasks.
4. **Adaptive Assessment Agent** — Generates 5-question weekly and skill-verification quizzes. Scores `< 40%` automatically inject beginner revision tasks and adjust weekly pace.
5. **Weekly Coach & Mentor Agent** — Generates structured `WEEK N REPORT` summaries and powers context-aware `/mentor` chat.

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, React Router, Recharts, Lucide React
- **Backend:** Express (`server.ts`), JWT authentication (`jsonwebtoken`), Password hashing (`bcryptjs`)
- **Database:** SQLite (`better-sqlite3` persisted in `skillpath.db`)
- **AI SDK:** Google Gemini API (`@google/genai`)

## Environment Variables

See `.env.example`:
- `GEMINI_API_KEY` — Google Gemini API key (server-side only)
- `JWT_SECRET` — Secret for signing JWT session tokens
- `GOOGLE_CLIENT_ID` — Optional Google OAuth client ID
