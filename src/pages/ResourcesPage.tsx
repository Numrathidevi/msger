import { useEffect, useState } from 'react';
import { ExternalLink, CheckCircle2, Circle, Bookmark, Search } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { apiRequest, toSafeExternalUrl } from '../lib/api';

interface SavedResource {
  id: number;
  title: string;
  category: string;
  provider: string;
  url: string;
  skill_tag: string;
  completed: number;
  bookmarked: number;
}

interface RoadmapResource {
  title: string;
  category: string;
  provider: string;
  url: string;
  duration: string;
  weekNumber: number;
  skillTag: string;
}

export function ResourcesPage() {
  const [saved, setSaved] = useState<SavedResource[]>([]);
  const [roadmapResources, setRoadmapResources] = useState<RoadmapResource[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'Course' | 'Tutorial' | 'completed'>('all');
  const [loading, setLoading] = useState(true);

  const loadResources = async () => {
    try {
      const res = await apiRequest<{ saved: SavedResource[]; roadmapResources: RoadmapResource[] }>('/api/resources');
      setSaved(res.saved);
      setRoadmapResources(res.roadmapResources);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const handleToggle = async (resItem: RoadmapResource, field: 'completed' | 'bookmarked') => {
    const data = await apiRequest<{ saved: SavedResource[] }>('/api/resources/toggle', {
      method: 'POST',
      body: JSON.stringify({
        title: resItem.title,
        category: resItem.category,
        provider: resItem.provider,
        url: resItem.url,
        skillTag: resItem.skillTag,
        field,
      }),
    });
    setSaved(data.saved);
  };

  const savedByTitle = new Map(saved.map((s) => [s.title, s]));

  const filtered = roadmapResources.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.skillTag.toLowerCase().includes(query.toLowerCase()) ||
      r.provider.toLowerCase().includes(query.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'Course') return r.category === 'Course';
    if (filter === 'Tutorial') return r.category !== 'Course';
    if (filter === 'completed') return savedByTitle.get(r.title)?.completed === 1;
    return true;
  });

  return (
    <AppShell title="Courses & Resources">
      {loading ? (
        <div className="h-96 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      ) : (
        <div className="space-y-6">
          {/* Search & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses, tutorials, or skills..."
                className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#F3F8F5] dark:bg-slate-800 rounded-xl">
              {(['all', 'Course', 'Tutorial', 'completed'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    filter === tab
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {tab === 'all' ? 'All Resources' : tab === 'completed' ? 'Completed' : `${tab}s`}
                </button>
              ))}
            </div>
          </div>

          {/* Resource Grid */}
          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-10 text-center text-sm text-slate-500">
              No resources match your current filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((item, idx) => {
                const state = savedByTitle.get(item.title);
                const isDone = state?.completed === 1;
                const isBookmarked = state?.bookmarked === 1;
                return (
                  <div
                    key={`${item.title}-${idx}`}
                    className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        Week {item.weekNumber} · {item.category} · {item.provider} · {item.duration}
                      </div>
                      <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </h3>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Skill focus: {item.skillTag}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggle(item, 'completed')}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            isDone ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                          <span>{isDone ? 'Completed' : 'Mark Done'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggle(item, 'bookmarked')}
                          className={`inline-flex items-center gap-1 text-xs font-medium ${
                            isBookmarked ? 'text-[#15803D] dark:text-emerald-400' : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>{isBookmarked ? 'Saved' : 'Save'}</span>
                        </button>
                      </div>

                      <a
                        href={toSafeExternalUrl(item.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#15803D] dark:text-emerald-400 hover:underline"
                      >
                        <span>Open Resource</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
