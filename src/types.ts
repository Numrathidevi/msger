export interface LearnerProfile {
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
  targetCompletionDate: string;
  learningStage: string;
  learningStreak: number;
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  educationLevel: string;
  institution: string;
  avatarUrl: string;
  profileCompleted: boolean;
  themePreference: string;
  profile: LearnerProfile | null;
}

export interface SkillAssessment {
  id: number;
  skill_name: string;
  category: string;
  current_proficiency: number;
  required_proficiency: number;
  gap: number;
  priority: 'High' | 'Medium' | 'Low';
  verified: number;
  last_assessed_at: string;
}

export interface CareerRecommendation {
  id?: number;
  careerTitle: string;
  matchScore: number;
  rationale: string;
  missingSkills: string[];
  requiredSkills: string[];
  estimatedWeeks: number;
  salaryOutlook: string;
  isSelected?: boolean;
}

export interface RoadmapTask {
  id: number;
  title: string;
  taskType: 'lesson' | 'exercise' | 'project' | 'revision';
  estimatedMinutes: number;
  completed: boolean;
  completedAt: string;
  dueDate: string;
  isAdaptiveRemedial: boolean;
  quizPassed?: boolean;
  lastQuizScore?: number | null;
}

export interface RoadmapWeek {
  id: number;
  weekNumber: number;
  title: string;
  learningObjectives: string[];
  topics: string[];
  recommendedCourses: Array<{ title: string; provider: string; url: string; duration: string }>;
  tutorialLinks: Array<{ title: string; url: string; type: string }>;
  practicalExercises: string[];
  miniProject: { title: string; description: string; deliverables: string[] };
  expectedHours: number;
  isAdapted: boolean;
  adaptationNote: string;
  tasks: RoadmapTask[];
  completedCount: number;
  totalCount: number;
  progressPct: number;
}

export interface LessonNoteSection {
  heading: string;
  keyPoints: string[];
  exampleLabel?: string;
  exampleCode?: string;
  takeaway: string;
}

export interface LessonContent {
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
  quiz: QuizQuestion[];
  quizPassed: boolean;
  lastQuizScore: number | null;
}

export interface LessonTrackContext {
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
}

export interface LessonQuizSubmitResult {
  score: number;
  correctCount: number;
  total: number;
  passed: boolean;
  taskCompleted: boolean;
  feedback: string;
  strongAreas: string[];
  weakAreas: string[];
  questionResults: Array<{
    id: string;
    question: string;
    selectedIndex: number;
    correctIndex: number;
    correctOption: string;
    isCorrect: boolean;
    explanation: string;
  }>;
  lesson?: LessonContent;
  trackContext?: LessonTrackContext;
}

export interface WeeklyReport {
  id: number;
  week_number: number;
  learning_goal: string;
  tasks_completed: number;
  total_tasks: number;
  progress_pct: number;
  study_hours: number;
  quiz_score: number;
  strong_area: string;
  improvement_area: string;
  ai_feedback: string;
  generated_at: string;
}

export interface QuizQuestion {
  id: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface AgentLogEntry {
  id: number;
  agentName: string;
  taskSummary: string;
  contextSnapshot: Record<string, unknown>;
  outputSummary: string;
  status: string;
  durationMs: number;
  createdAt: string;
}
