'use client';

import React, { useState } from 'react';
import { Sparkles, Send, X, Bot, ChevronRight, Loader2, Lightbulb } from 'lucide-react';
import { waiterService } from '../../services/waiter.service';
import { cashierService } from '../../services/cashier.service';

interface OperationalAiAssistantProps {
  role: 'WAITER' | 'CASHIER';
  token: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OperationalAiAssistant({ role, token, isOpen, onClose }: OperationalAiAssistantProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; suggestions?: string[] }>>([
    {
      sender: 'ai',
      text:
        role === 'WAITER'
          ? 'Hello Captain! I am your Waiter Floor Assistant. Ask me about table wait times, ready orders, or guest assistance calls.'
          : 'Hello! I am your Cashier Billing Assistant. Ask me about today’s revenue, cash in drawer, or pending balances.',
      suggestions:
        role === 'WAITER'
          ? [
              'Which tables are waiting longest?',
              'Which orders are ready?',
              'Show pending customer requests',
              'How many tables are available?',
            ]
          : [
              'How much did we sell today?',
              'What is the current cash total?',
              'How many payments are pending?',
              'Which payment method generated the most revenue?',
            ],
    },
  ]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || query).trim();
    if (!q || loading || !token) return;

    setMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setQuery('');
    setLoading(true);

    try {
      const response =
        role === 'WAITER'
          ? await waiterService.queryAi(q, token)
          : await cashierService.queryAi(q, token);

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: response.answer,
          suggestions: response.suggestions,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Could not retrieve live data: ${err.message || 'Server error'}. Please try again.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-16 right-6 z-50 w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <span>{role === 'WAITER' ? 'Waiter Operations AI' : 'Cashier Billing AI'}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                LIVE
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Factual PostgreSQL real-time assistant</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="p-4 max-h-[380px] overflow-y-auto space-y-3.5 text-xs">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-amber-500 text-slate-950 font-medium rounded-br-none shadow-md shadow-amber-500/10'
                  : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-bl-none'
              }`}
            >
              {m.text}
            </div>

            {/* Quick Action Suggestion Chips */}
            {m.suggestions && m.suggestions.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[95%]">
                {m.suggestions.map((sug, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => handleSend(sug)}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700/70 hover:border-amber-500/40 transition-all text-left"
                  >
                    <Lightbulb className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <span>{sug}</span>
                    <ChevronRight className="w-2.5 h-2.5 opacity-50" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-slate-800/50 border border-slate-700/40 w-fit px-3 py-2 rounded-xl">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Analyzing restaurant records...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-slate-950/70 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={role === 'WAITER' ? 'Ask about tables, ready orders...' : 'Ask about sales, drawer, pending...'}
          className="flex-1 bg-slate-900 border border-slate-750 text-slate-100 placeholder-slate-500 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500/70 transition-colors"
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-40 disabled:hover:bg-amber-500 font-semibold transition-all active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
