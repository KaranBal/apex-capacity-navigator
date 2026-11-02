import React, { useState } from 'react';
import { Sparkles, X, Send, Loader2, Bot } from 'lucide-react';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activePersonaEmail: string;
}

const SUGGESTED_PROMPTS = [
  'Which Allocation deals are currently above the 80-point council recommendation cut-line?',
  'Which rejected deals need the Mar 2027 / Jan 2027 timeline shift & RVP exception template?',
  'Which approved allocations are at risk of Use-It-or-Lose-It 14-day SLA reclamation?',
  'Recommend Cold Region DFE alternatives for NVIDIA B200 and NextGen-ASIC v7.',
];

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  activePersonaEmail,
}) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; model?: string }>>([
    {
      role: 'assistant',
      text: 'Hello! I am the Apex Capacity AI Copilot (powered by ModelHub AI Fast-Router LLM). I have access to your synthetic Allocation queue, Companion 2.0 cards, and 14-day SLA reclamation timers. How can I help you optimize capacity allocation today?',
      model: 'llm-fast-router',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const sendQuestion = async (q: string) => {
    if (!q.trim() || loading) return;
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Role-Persona': activePersonaEmail,
        },
        body: JSON.stringify({ question: q }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: data.answer, model: data.model || 'llm-fast-router' },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'Unable to reach ModelHub AI endpoint right now.' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-[#0c0c0f] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col">
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-600 text-white">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Ask Apex AI Assistant
            </h3>
            <p className="text-[11px] font-mono text-zinc-500">
              ModelHub AI Fast-Router LLM • Synthetic Queue &amp; SLA Context
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompts */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Suggested Capacity Prompts
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => sendQuestion(p)}
              className="text-left text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-3.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-blue-600 text-white ml-8'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 mr-4 border border-zinc-200/70 dark:border-zinc-800'
            }`}
          >
            {m.role === 'assistant' && m.model && (
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-mono text-blue-600 dark:text-blue-400">
                <span>Model: {m.model}</span>
              </div>
            )}
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 p-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span>Thinking with Fast-Router LLM (typically 5–15s)...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendQuestion(input);
        }}
        className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about Allocation scores, Companion CDRs, or DFE regions..."
          className="flex-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={loading}
          className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
