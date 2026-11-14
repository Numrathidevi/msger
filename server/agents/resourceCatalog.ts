export interface VerifiedResourceEntry {
  url: string;
  title: string;
  provider: string;
  keywords: string[];
}

export const VERIFIED_RESOURCES: VerifiedResourceEntry[] = [
  {
    url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/',
    title: 'Responsive Web Design Certification',
    provider: 'freeCodeCamp',
    keywords: ['html', 'html5', 'css', 'css3', 'responsive', 'web design', 'semantic', 'accessibility'],
  },
  {
    url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout',
    title: 'MDN CSS Layout Guides',
    provider: 'MDN Web Docs',
    keywords: ['css', 'layout', 'flexbox', 'grid', 'box model'],
  },
  {
    url: 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/',
    title: 'CSS Flexbox Interactive Guide',
    provider: 'CSS-Tricks',
    keywords: ['flexbox', 'flex', 'css layout'],
  },
  {
    url: 'https://tailwindcss.com/docs/styling-with-utility-classes',
    title: 'Tailwind CSS Core Concepts',
    provider: 'Tailwind CSS',
    keywords: ['tailwind', 'utility', 'styling'],
  },
  {
    url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/',
    title: 'JavaScript Algorithms and Data Structures',
    provider: 'freeCodeCamp',
    keywords: ['javascript', 'js', 'es6', 'algorithms', 'data structures', 'dsa'],
  },
  {
    url: 'https://javascript.info/',
    title: 'The Modern JavaScript Tutorial',
    provider: 'javascript.info',
    keywords: ['javascript', 'js', 'dom', 'es6', 'promises', 'functions'],
  },
  {
    url: 'https://javascript.info/closure',
    title: 'ES6 Variable Scope & Closures',
    provider: 'javascript.info',
    keywords: ['closure', 'scope', 'lexical'],
  },
  {
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array',
    title: 'MDN Working with Arrays',
    provider: 'MDN Web Docs',
    keywords: ['array', 'map', 'filter', 'reduce'],
  },
  {
    url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS',
    title: 'Asynchronous JavaScript Deep Dive',
    provider: 'MDN Web Docs',
    keywords: ['async', 'await', 'promise', 'asynchronous'],
  },
  {
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch',
    title: 'Using the Fetch API',
    provider: 'MDN Web Docs',
    keywords: ['fetch', 'rest', 'api', 'http'],
  },
  {
    url: 'https://react.dev/learn',
    title: 'Official React Learn Curriculum',
    provider: 'React.dev',
    keywords: ['react', 'jsx', 'hooks', 'usestate', 'useeffect', 'components'],
  },
  {
    url: 'https://react.dev/learn/thinking-in-react',
    title: 'Thinking in React',
    provider: 'React.dev',
    keywords: ['thinking in react', 'component architecture', 'state'],
  },
  {
    url: 'https://reactrouter.com/home',
    title: 'React Router Documentation',
    provider: 'React Router',
    keywords: ['router', 'routing', 'navigation', 'spa'],
  },
  {
    url: 'https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html',
    title: 'TypeScript Handbook',
    provider: 'TypeScript',
    keywords: ['typescript', 'ts', 'types', 'interfaces'],
  },
  {
    url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/Express_Nodejs',
    title: 'Express Web Framework Guide',
    provider: 'MDN Web Docs',
    keywords: ['node', 'nodejs', 'express', 'backend', 'server'],
  },
  {
    url: 'https://expressjs.com/en/guide/routing.html',
    title: 'Express Routing & Middleware Guide',
    provider: 'Express.js',
    keywords: ['express', 'routing', 'middleware', 'rest'],
  },
  {
    url: 'https://sqlbolt.com/',
    title: 'SQLBolt Interactive SQL Lessons',
    provider: 'SQLBolt',
    keywords: ['sql', 'database', 'postgres', 'sqlite', 'queries', 'joins', 'relational'],
  },
  {
    url: 'https://jwt.io/introduction',
    title: 'JWT Introduction & Auth Concepts',
    provider: 'JWT.io',
    keywords: ['jwt', 'auth', 'authentication', 'security', 'token', 'oauth'],
  },
  {
    url: 'https://fullstackopen.com/en/',
    title: 'Full Stack Open Curriculum',
    provider: 'University of Helsinki',
    keywords: ['full stack', 'fullstack', 'capstone', 'deployment'],
  },
  {
    url: 'https://vitejs.dev/guide/build.html',
    title: 'Building & Deploying Vite Apps',
    provider: 'Vite',
    keywords: ['deploy', 'build', 'vite', 'production'],
  },
  {
    url: 'https://docs.python.org/3/tutorial/',
    title: 'Official Python Tutorial',
    provider: 'Python.org',
    keywords: ['python', 'scripting', 'oop', 'programming'],
  },
  {
    url: 'https://pandas.pydata.org/docs/getting_started/index.html',
    title: 'Pandas Getting Started Tutorials',
    provider: 'Pandas',
    keywords: ['pandas', 'dataframe', 'data cleaning', 'eda'],
  },
  {
    url: 'https://numpy.org/learn/',
    title: 'NumPy Learn Guides',
    provider: 'NumPy',
    keywords: ['numpy', 'linear algebra', 'arrays', 'matrices'],
  },
  {
    url: 'https://scikit-learn.org/stable/user_guide.html',
    title: 'Scikit-Learn Machine Learning Guide',
    provider: 'Scikit-Learn',
    keywords: ['scikit', 'sklearn', 'machine learning', 'ml', 'classification', 'regression'],
  },
  {
    url: 'https://pytorch.org/tutorials/',
    title: 'PyTorch Official Tutorials',
    provider: 'PyTorch',
    keywords: ['pytorch', 'deep learning', 'neural', 'ai'],
  },
  {
    url: 'https://www.kaggle.com/learn',
    title: 'Kaggle Practical Data & ML Courses',
    provider: 'Kaggle',
    keywords: ['kaggle', 'data science', 'data analyst', 'visualization', 'statistics', 'feature engineering'],
  },
  {
    url: 'https://ai.google.dev/gemini-api/docs',
    title: 'Gemini API & LLM Developer Docs',
    provider: 'Google AI for Developers',
    keywords: ['llm', 'genai', 'gemini', 'rag', 'prompt', 'ai engineer'],
  },
  {
    url: 'https://owasp.org/www-project-top-ten/',
    title: 'OWASP Top Ten Web Security',
    provider: 'OWASP',
    keywords: ['owasp', 'cybersecurity', 'appsec', 'vulnerability', 'threat'],
  },
  {
    url: 'https://portswigger.net/web-security',
    title: 'Web Security Academy Labs',
    provider: 'PortSwigger',
    keywords: ['security', 'penetration', 'cyber', 'siem', 'incident'],
  },
  {
    url: 'https://docs.docker.com/get-started/',
    title: 'Docker Get Started Guide',
    provider: 'Docker',
    keywords: ['docker', 'container', 'devops', 'kubernetes'],
  },
  {
    url: 'https://aws.amazon.com/training/',
    title: 'AWS Cloud Training & Foundations',
    provider: 'AWS',
    keywords: ['aws', 'cloud', 'iam', 'ec2', 's3'],
  },
  {
    url: 'https://cloud.google.com/learn/training',
    title: 'Google Cloud Training & Skills',
    provider: 'Google Cloud',
    keywords: ['gcp', 'google cloud', 'cloud architecture'],
  },
  {
    url: 'https://developer.hashicorp.com/terraform/tutorials',
    title: 'Terraform Infrastructure as Code Tutorials',
    provider: 'HashiCorp',
    keywords: ['terraform', 'iac', 'infrastructure', 'ci/cd', 'pipeline'],
  },
  {
    url: 'https://help.figma.com/hc/en-us',
    title: 'Figma Design & Prototyping Help Center',
    provider: 'Figma',
    keywords: ['figma', 'ui', 'ux', 'wireframe', 'design', 'prototype', 'typography'],
  },
  {
    url: 'https://www.w3.org/WAI/fundamentals/accessibility-intro/',
    title: 'W3C Web Accessibility Fundamentals',
    provider: 'W3C',
    keywords: ['wcag', 'accessibility', 'a11y', 'user research'],
  },
  {
    url: 'https://neetcode.io/practice',
    title: 'NeetCode Algorithms & Problem Practice',
    provider: 'NeetCode',
    keywords: ['algorithms', 'leetcode', 'interview', 'coding', 'software engineer'],
  },
  {
    url: 'https://skills.github.com/',
    title: 'GitHub Skills Interactive Courses',
    provider: 'GitHub',
    keywords: ['git', 'github', 'version control', 'ci/cd', 'workflow'],
  },
  {
    url: 'https://roadmap.sh/',
    title: 'Developer Career Roadmaps & Guides',
    provider: 'roadmap.sh',
    keywords: ['roadmap', 'career', 'architecture', 'system design', 'testing'],
  },
  {
    url: 'https://www.freecodecamp.org/learn/',
    title: 'freeCodeCamp Full Curriculum',
    provider: 'freeCodeCamp',
    keywords: ['freecodecamp', 'coding', 'curriculum', 'programming'],
  },
  {
    url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development',
    title: 'MDN Learn Web Development',
    provider: 'MDN Web Docs',
    keywords: ['mdn', 'web', 'frontend', 'html', 'css', 'javascript'],
  },
];

const ALLOWLIST_SET = new Set(VERIFIED_RESOURCES.map((r) => r.url));

const KNOWN_REDIRECTS: Record<string, string> = {
  'https://github.com/skills': 'https://skills.github.com/',
  'https://tailwindcss.com/docs/utility-first': 'https://tailwindcss.com/docs/styling-with-utility-classes',
  'https://reactrouter.com/start/framework/routing': 'https://reactrouter.com/home',
  'https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout': 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout',
  'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous': 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS',
  'https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs': 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/Express_Nodejs',
};

export function findBestVerifiedResource(textHint: string): VerifiedResourceEntry {
  const lower = textHint.toLowerCase();
  let best = VERIFIED_RESOURCES[VERIFIED_RESOURCES.length - 2]; // default roadmap.sh
  let bestScore = 0;

  for (const entry of VERIFIED_RESOURCES) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        score += kw.length > 4 ? 3 : 2;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return best;
}

export function sanitizeUrlSync(rawUrl: unknown, title = '', topicHint = ''): string {
  const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (KNOWN_REDIRECTS[url]) return KNOWN_REDIRECTS[url];
  if (ALLOWLIST_SET.has(url)) return url;

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return findBestVerifiedResource(`${title} ${topicHint}`).url;
  }

  // Known domains where Gemini often hallucinates deep non-existent course slugs
  const unreliableDeepLinkHosts = ['coursera.org', 'udemy.com', 'edx.org', 'pluralsight.com', 'codecademy.com', 'youtube.com', 'medium.com', 'towardsdatascience.com'];
  try {
    const parsed = new URL(url);
    if (unreliableDeepLinkHosts.some((h) => parsed.hostname.includes(h))) {
      return findBestVerifiedResource(`${title} ${topicHint}`).url;
    }
  } catch {
    return findBestVerifiedResource(`${title} ${topicHint}`).url;
  }

  return url;
}

export async function verifyOrReplaceUrl(rawUrl: unknown, title = '', topicHint = ''): Promise<string> {
  const candidate = sanitizeUrlSync(rawUrl, title, topicHint);
  if (ALLOWLIST_SET.has(candidate)) {
    return candidate;
  }

  try {
    const res = await fetch(candidate, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok && res.status >= 200 && res.status < 400) {
      return candidate;
    }
  } catch {
    // Network error or timeout -> fall back to verified 200-OK resource
  }

  return findBestVerifiedResource(`${title} ${topicHint}`).url;
}
