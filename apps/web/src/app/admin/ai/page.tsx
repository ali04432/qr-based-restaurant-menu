'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Clock,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { UserRole } from '@qr-menu/shared';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metricsSummary?: any;
}

const QUICK_PROMPTS = [
  { icon: DollarSign, label: "Today's sales", query: "What are today's total sales and revenue?" },
  { icon: TrendingUp, label: 'Best sellers', query: 'What are the top 5 best-selling items this week?' },
  { icon: Package, label: 'Low stock', query: 'Which items have low stock or are out of stock?' },
  { icon: Clock, label: 'Peak hours', query: "What are the restaurant's busiest hours today?" },
  { icon: Users, label: 'Staff activity', query: "Show me today's staff activity summary." },
  { icon: Sparkles, label: 'Profit margins', query: 'What are my most and least profitable menu items?' },
];

export default function AdminAIPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (query: string) => {
    if (!query.trim() || !token || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await adminService.queryAdminAI(restaurantId, query.trim(), token);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.reply || 'I could not generate a response. Please try again.',
        timestamp: response.timestamp || new Date().toISOString(),
        metricsSummary: response.metricsSummary,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠ Sorry, I encountered an error processing your request: ${err?.message || 'Unknown error'}. Please try again.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <AdminLayout
      title="AI Business Assistant"
      subtitle="Real-Time Intelligence from Your Restaurant Data"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]}
    >
      <div className="flex flex-col h-[calc(100vh-180px)] max-h-[800px]">
        {/* ── Chat Area ── */}
        <div className="flex-1 bg-white border border-slate-200 rounded-t-lg overflow-y-auto">
          {messages.length === 0 ? (
            /* ── Empty State ── */
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Restaurant AI Assistant
              </h3>
              <p className="text-xs text-slate-500 max-w-md mb-6">
                Ask questions about your restaurant performance, sales, inventory, staff activity,
                and profit margins. All answers are derived from your actual database.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-lg">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.label}
                    type="button"
                    onClick={() => sendMessage(prompt.query)}
                    className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium hover:bg-slate-100 hover:border-slate-300 transition text-left"
                  >
                    <prompt.icon className="w-4 h-4 text-amber-500 shrink-0" />
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Message List ── */
            <div className="p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 border border-slate-200 text-slate-800'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Bot className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-bold text-slate-500">AI Assistant</span>
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                    {/* Metrics Summary if provided */}
                    {msg.metricsSummary && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(msg.metricsSummary).map(([key, value]) => (
                            <div
                              key={key}
                              className="bg-white border border-slate-200 rounded px-2 py-1.5"
                            >
                              <p className="text-[10px] text-slate-400 uppercase font-semibold">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </p>
                              <p className="text-xs font-bold text-slate-800">
                                {typeof value === 'number'
                                  ? value.toLocaleString()
                                  : String(value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <p
                      className={`text-[10px] mt-2 ${
                        msg.role === 'user' ? 'text-slate-400' : 'text-slate-400'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      <span className="text-xs text-slate-500">Analyzing your data...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* ── Input Bar ── */}
        <div className="bg-white border border-t-0 border-slate-200 rounded-b-lg px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            {messages.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear chat
                </button>
                <span className="text-xs text-slate-300">
                  {messages.filter((m) => m.role === 'user').length} questions asked
                </span>
              </div>
            )}
            {messages.length > 0 && (
              <div className="flex items-center gap-1.5">
                {QUICK_PROMPTS.slice(0, 3).map((prompt) => (
                  <button
                    key={prompt.label}
                    type="button"
                    onClick={() => sendMessage(prompt.query)}
                    disabled={isLoading}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-500 font-medium hover:bg-slate-100 disabled:opacity-50 transition"
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about sales, inventory, profit margins, staff, or trends..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none disabled:opacity-50 transition"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
