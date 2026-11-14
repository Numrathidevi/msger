export interface CareerBenchmark {
  title: string;
  requiredSkills: Array<{ name: string; category: string; requiredProficiency: number; priority: 'High' | 'Medium' | 'Low' }>;
  estimatedWeeks: number;
  salaryOutlook: string;
  summary: string;
}

export const CAREER_BENCHMARKS: Record<string, CareerBenchmark> = {
  'Full Stack Developer': {
    title: 'Full Stack Developer',
    estimatedWeeks: 8,
    salaryOutlook: '$85k – $135k',
    summary: 'Designs and builds complete web applications spanning responsive UIs, REST/GraphQL APIs, databases, and authentication.',
    requiredSkills: [
      { name: 'HTML5 & Semantic Markup', category: 'Frontend', requiredProficiency: 85, priority: 'Low' },
      { name: 'CSS3, Flexbox & Tailwind', category: 'Frontend', requiredProficiency: 85, priority: 'Medium' },
      { name: 'JavaScript (ES6+ & DOM)', category: 'Frontend', requiredProficiency: 90, priority: 'High' },
      { name: 'React & State Architecture', category: 'Frontend', requiredProficiency: 85, priority: 'High' },
      { name: 'Node.js & Express APIs', category: 'Backend', requiredProficiency: 85, priority: 'High' },
      { name: 'SQL & Relational Modeling', category: 'Database', requiredProficiency: 80, priority: 'Medium' },
      { name: 'Authentication & Security', category: 'Backend', requiredProficiency: 80, priority: 'High' },
      { name: 'Git & Deployment Workflows', category: 'DevOps', requiredProficiency: 75, priority: 'Medium' },
    ],
  },
  'AI/ML Engineer': {
    title: 'AI/ML Engineer',
    estimatedWeeks: 10,
    salaryOutlook: '$110k – $175k',
    summary: 'Builds, evaluates, and deploys machine learning models, LLM pipelines, and vector retrieval systems.',
    requiredSkills: [
      { name: 'Python & Scientific Stack', category: 'Programming', requiredProficiency: 90, priority: 'High' },
      { name: 'Linear Algebra & Probability', category: 'Math', requiredProficiency: 80, priority: 'Medium' },
      { name: 'Scikit-Learn & Classical ML', category: 'ML', requiredProficiency: 85, priority: 'High' },
      { name: 'PyTorch & Deep Learning', category: 'ML', requiredProficiency: 85, priority: 'High' },
      { name: 'LLM Prompting & RAG Pipelines', category: 'GenAI', requiredProficiency: 85, priority: 'High' },
      { name: 'FastAPI / Model Serving', category: 'Backend', requiredProficiency: 75, priority: 'Medium' },
      { name: 'SQL & Vector Databases', category: 'Data', requiredProficiency: 75, priority: 'Medium' },
    ],
  },
  'Data Scientist': {
    title: 'Data Scientist',
    estimatedWeeks: 8,
    salaryOutlook: '$95k – $150k',
    summary: 'Extracts predictive insights from complex datasets using statistics, experimentation, and machine learning.',
    requiredSkills: [
      { name: 'Python (Pandas & NumPy)', category: 'Programming', requiredProficiency: 90, priority: 'High' },
      { name: 'SQL & Analytical Queries', category: 'Data', requiredProficiency: 85, priority: 'High' },
      { name: 'Statistics & A/B Testing', category: 'Math', requiredProficiency: 85, priority: 'High' },
      { name: 'Data Visualization', category: 'Analytics', requiredProficiency: 80, priority: 'Medium' },
      { name: 'Predictive Modeling (ML)', category: 'ML', requiredProficiency: 80, priority: 'High' },
      { name: 'Feature Engineering', category: 'ML', requiredProficiency: 75, priority: 'Medium' },
    ],
  },
  'Data Analyst': {
    title: 'Data Analyst',
    estimatedWeeks: 7,
    salaryOutlook: '$70k – $110k',
    summary: 'Transforms operational data into clear KPIs, executive dashboards, and actionable business recommendations.',
    requiredSkills: [
      { name: 'SQL & Window Functions', category: 'Data', requiredProficiency: 90, priority: 'High' },
      { name: 'Excel & Spreadsheet Modeling', category: 'Analytics', requiredProficiency: 85, priority: 'Medium' },
      { name: 'Python for Data Cleaning', category: 'Programming', requiredProficiency: 75, priority: 'Medium' },
      { name: 'BI Dashboards (Tableau/Power BI)', category: 'Visualization', requiredProficiency: 85, priority: 'High' },
      { name: 'Descriptive Statistics', category: 'Math', requiredProficiency: 80, priority: 'Medium' },
      { name: 'Executive Storytelling', category: 'Communication', requiredProficiency: 75, priority: 'Low' },
    ],
  },
  'Cybersecurity Analyst': {
    title: 'Cybersecurity Analyst',
    estimatedWeeks: 8,
    salaryOutlook: '$85k – $135k',
    summary: 'Monitors networks, investigates security alerts, hardens systems, and mitigates vulnerabilities.',
    requiredSkills: [
      { name: 'Networking & TCP/IP', category: 'Infrastructure', requiredProficiency: 85, priority: 'High' },
      { name: 'Linux Administration', category: 'Systems', requiredProficiency: 85, priority: 'High' },
      { name: 'Web Security & OWASP Top 10', category: 'AppSec', requiredProficiency: 85, priority: 'High' },
      { name: 'SIEM & Log Analysis', category: 'SecOps', requiredProficiency: 80, priority: 'High' },
      { name: 'Python / Bash Scripting', category: 'Automation', requiredProficiency: 75, priority: 'Medium' },
      { name: 'Threat Modeling & Incident Response', category: 'SecOps', requiredProficiency: 80, priority: 'Medium' },
    ],
  },
  'Cloud Engineer': {
    title: 'Cloud Engineer',
    estimatedWeeks: 8,
    salaryOutlook: '$95k – $150k',
    summary: 'Architects resilient cloud infrastructure, containerized workloads, and automated CI/CD delivery pipelines.',
    requiredSkills: [
      { name: 'Linux & Shell Scripting', category: 'Systems', requiredProficiency: 85, priority: 'High' },
      { name: 'Cloud Foundations (AWS/GCP)', category: 'Cloud', requiredProficiency: 85, priority: 'High' },
      { name: 'Docker & Containers', category: 'DevOps', requiredProficiency: 85, priority: 'High' },
      { name: 'Terraform / Infrastructure as Code', category: 'DevOps', requiredProficiency: 80, priority: 'High' },
      { name: 'CI/CD Pipelines', category: 'Automation', requiredProficiency: 80, priority: 'Medium' },
      { name: 'Cloud Networking & IAM', category: 'Security', requiredProficiency: 80, priority: 'Medium' },
    ],
  },
  'UI/UX Designer': {
    title: 'UI/UX Designer',
    estimatedWeeks: 7,
    salaryOutlook: '$75k – $125k',
    summary: 'Crafts intuitive user journeys, accessible design systems, wireframes, and interactive prototypes.',
    requiredSkills: [
      { name: 'User Research & Journey Mapping', category: 'UX', requiredProficiency: 85, priority: 'High' },
      { name: 'Wireframing & Information Architecture', category: 'UX', requiredProficiency: 85, priority: 'High' },
      { name: 'Figma & Component Systems', category: 'Design Tools', requiredProficiency: 90, priority: 'High' },
      { name: 'Visual Hierarchy & Typography', category: 'UI', requiredProficiency: 85, priority: 'High' },
      { name: 'WCAG Accessibility Standards', category: 'UI', requiredProficiency: 80, priority: 'Medium' },
      { name: 'HTML/CSS Prototyping Literacy', category: 'Frontend', requiredProficiency: 65, priority: 'Low' },
    ],
  },
  'Software Engineer': {
    title: 'Software Engineer',
    estimatedWeeks: 8,
    salaryOutlook: '$90k – $145k',
    summary: 'Engineers reliable software systems with strong algorithms, clean architecture, databases, and automated testing.',
    requiredSkills: [
      { name: 'Data Structures & Algorithms', category: 'CS Core', requiredProficiency: 85, priority: 'High' },
      { name: 'Object-Oriented & Functional Design', category: 'Programming', requiredProficiency: 85, priority: 'High' },
      { name: 'TypeScript / Python / Java', category: 'Programming', requiredProficiency: 85, priority: 'High' },
      { name: 'SQL & Database Indexing', category: 'Data', requiredProficiency: 80, priority: 'Medium' },
      { name: 'Automated Testing & Debugging', category: 'Quality', requiredProficiency: 80, priority: 'Medium' },
      { name: 'REST APIs & System Design', category: 'Architecture', requiredProficiency: 80, priority: 'High' },
    ],
  },
};

export function findBenchmark(careerTitle: string): CareerBenchmark {
  const exact = CAREER_BENCHMARKS[careerTitle];
  if (exact) return exact;
  const lower = careerTitle.toLowerCase();
  const matched = Object.values(CAREER_BENCHMARKS).find((b) =>
    lower.includes(b.title.toLowerCase()) || b.title.toLowerCase().includes(lower)
  );
  return matched || CAREER_BENCHMARKS['Software Engineer'];
}
