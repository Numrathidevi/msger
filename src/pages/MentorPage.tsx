import React, { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Bot, User as UserIcon } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { apiRequest } from '../lib/api';

interface MentorMsg {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const QUICK_PROMPTS = [
  'What should I prioritize in my study session today?',
  'How do I close my highest-priority skill gap faster?',
  'Give me tips for completing this week’s mini-project.',
  'How can I improve my quiz performance?',
];

export function MentorPage() {
  const [messages, setMessages] = useState<MentorMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiRequest<{ messages: MentorMsg[] }>('/api/mentor')
      .then((d) => setMessages(d.messages))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    setInput('');
    try {
      const res = await apiRequest<{ messages: MentorMsg[] }>('/api/mentor/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });
      setMessages(res.messages);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <AppShell title="AI Mentor">
      <div className="bg-white dark:bg-slate-900 border border-[#E2EAE5] dark:border-slate-800 rounded-2xl flex flex-col h-[calc(100vh-11rem)] min-h-[520px]">
        {/* Mentor Header */}
        <div className="px-6 py-4 border-b border-[#E5EDE8] dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAF5EE] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-300 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-slate-900 dark:text-slate-100">
                SkillPath AI Career &amp; Learning Mentor
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connected to your skill profile, active roadmap week, and recent quiz results
              </p>
            </div>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="text-sm text-slate-500">Loading conversation...</div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-md bg-[#EAF5EE] dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-[#15803D] dark:text-emerald-400" />
                  </div>
                )}
                <div
                  className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#15803D] text-white'
                      : 'bg-[#F7FAF8] dark:bg-slate-800/80 border border-[#E2EAE5] dark:border-slate-700 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {m.content}
                </div>
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-md bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}
          {sending && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>AI Mentor is reviewing your learner context...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick Prompts & Input */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={sending}
                onClick={() => sendMessage(q)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your roadmap, technical topics, or career preparation..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#DCE6DF] dark:border-slate-700 bg-[#FAFDFB] dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803D]/40"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-4 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
