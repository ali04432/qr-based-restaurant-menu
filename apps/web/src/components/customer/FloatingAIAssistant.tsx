'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { aiService } from '../../services/ai.service';
import { useTableContext } from '../../context/TableContext';

// Quick Auto-writing suggestions
const QUICK_SUGGESTIONS = [
  'What are the special offers?',
  'Recommend a good burger',
  'Show me drinks menu',
  'What is the prep time?'
];

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your AI Chef. How can I help you with your order today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { restaurantId, tableNumber } = useTableContext();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Typewriter Auto-Writing Effect
  const appendBotMessageWithTyping = (fullText: string) => {
    let currentText = '';
    let index = 0;

    setMessages((prev) => [...prev, { role: 'assistant', text: '' }]);

    const interval = setInterval(() => {
      if (index < fullText.length) {
        currentText += fullText.charAt(index);
        index++;
        setMessages((prev) => {
          const newArr = [...prev];
          newArr[newArr.length - 1] = { role: 'assistant', text: currentText };
          return newArr;
        });
      } else {
        clearInterval(interval);
      }
    }, 18);
  };

  const handleSend = async (customText?: string) => {
    const userText = (customText || input).trim();
    if (!userText || isLoading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      // Safe dynamic API call with fallback
      let replyText = '';
      const service = aiService as unknown as Record<string, Function>;

      if (typeof service.chatWithAI === 'function') {
        const res = await service.chatWithAI({
          message: userText,
          restaurantId: restaurantId ?? '1',
          tableNumber: tableNumber ?? 'takeaway'
        });
        replyText = res?.reply || res?.message || '';
      } else if (typeof service.chat === 'function') {
        const res = await service.chat(userText);
        replyText = res?.reply || res?.message || '';
      }

      setIsLoading(false);

      if (replyText) {
        appendBotMessageWithTyping(replyText);
      } else {
        const fallback = generateSmartResponse(userText);
        appendBotMessageWithTyping(fallback);
      }
    } catch {
      setIsLoading(false);
      const fallback = generateSmartResponse(userText);
      appendBotMessageWithTyping(fallback);
    }
  };

  const filteredSuggestions = input.trim()
    ? QUICK_SUGGESTIONS.filter((s) => s.toLowerCase().includes(input.toLowerCase()))
    : QUICK_SUGGESTIONS;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Popup Modal */}
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 h-[460px] bg-zinc-950/95 border border-amber-500/40 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-xl flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="p-4 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <Bot className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">AI Chef Assistant</h4>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl leading-relaxed ${m.role === 'user'
                      ? 'bg-amber-500 text-black font-semibold'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
                    }`}
                >
                  {m.text}
                  {m.role === 'assistant' && m.text === '' && (
                    <span className="animate-pulse">...</span>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl flex items-center gap-2 text-zinc-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>AI Chef is typing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Auto-suggestions chips */}
          <div className="px-3 py-2 border-t border-zinc-800/80 bg-zinc-950 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            {filteredSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(suggestion)}
                className="whitespace-nowrap px-2.5 py-1 bg-zinc-900 hover:bg-amber-500/20 border border-zinc-800 hover:border-amber-500/40 text-[11px] text-zinc-300 hover:text-amber-300 rounded-full transition-all shrink-0"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Input form */}
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 border-t border-zinc-800 bg-zinc-900/50 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about menu or offers..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="p-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black rounded-xl transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <div className="mb-2 px-3 py-1.5 bg-zinc-900/90 border border-amber-500/40 rounded-xl text-xs text-amber-300 font-semibold shadow-[0_0_15px_rgba(245,158,11,0.2)] backdrop-blur-md animate-bounce flex items-center gap-1.5">
          <span>Hi! Need help?</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-14 h-14 rounded-full bg-zinc-900 border-2 border-amber-500/50 p-1 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-110 active:scale-95 transition-all duration-300 group overflow-hidden"
      >
        <span className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping pointer-events-none" />

        {/* 3D Glowing AI Robot Vector */}
        <svg
          className="w-8 h-8 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)] relative z-10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="10" rx="2" fill="#451a03" />
          <circle cx="12" cy="5" r="2" fill="#f59e0b" />
          <path d="M12 7v4" />
          <line x1="8" y1="15" x2="8" y2="15.01" strokeWidth="3" stroke="#f59e0b" />
          <line x1="16" y1="15" x2="16" y2="15.01" strokeWidth="3" stroke="#f59e0b" />
          <path d="M9 18h6" stroke="#f59e0b" />
        </svg>

        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-zinc-950 z-20" />
      </button>
    </div>
  );
}

// Smart Intent Handler for Offline / Fallback Responses
function generateSmartResponse(input: string): string {
  const text = input.toLowerCase();

  if (text.includes('hi') || text.includes('hlo') || text.includes('hello') || text.includes('hey')) {
    return 'Hello! 👋 How can I assist you today? Are you looking for food recommendations, special offers, or drinks?';
  }
  if (text.includes('burger') || text.includes('fast food')) {
    return 'Our top burger is the Double Smoked Bacon Cheeseburger! Would you like to add fries or a drink with it?';
  }
  if (text.includes('steak') || text.includes('meat') || text.includes('wagyu')) {
    return 'I highly recommend our Pan-Seared Wagyu Steak served with truffle butter and roasted vegetables!';
  }
  if (text.includes('offer') || text.includes('discount') || text.includes('deal') || text.includes('special')) {
    return 'We currently have Happy Hour 2-for-1 cocktails from 5 PM - 7 PM, and 20% OFF on Wagyu Steak pairings!';
  }
  if (text.includes('drink') || text.includes('cocktail') || text.includes('beverage')) {
    return 'Check out our Signature Smoked Old Fashioned or Classic Mojito in the Drinks section!';
  }
  if (text.includes('prep time') || text.includes('time') || text.includes('kab tak')) {
    return 'Most dishes take around 15 to 20 minutes of preparation time.';
  }

  return `Thanks for asking! Regarding "${input}", I can help you find dishes based on your dietary preferences, spice levels, or budget. What type of food are you craving right now?`;
}

export default FloatingAIAssistant;