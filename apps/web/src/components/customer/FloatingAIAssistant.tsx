'use client';

import React, {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Bot,
  ChevronDown,
  Loader2,
  Send,
  Sparkles,
  X,
} from 'lucide-react';

import { aiService } from '../../services/ai.service';
import { useTableContext } from '../../context/TableContext';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const QUICK_ACTIONS = [
  'Recommend something',
  'Best food under Rs. 1000',
  'Show spicy dishes',
  'What goes well with my order?',
  "What's popular today?",
];

const REQUEST_COOLDOWN = 2500;

function getFallbackResponse(
  message: string
): string {
  const text = message.toLowerCase();

  if (
    text.includes('under rs') ||
    text.includes('under 1000') ||
    text.includes('budget')
  ) {
    return 'For a budget-friendly choice, I recommend checking popular dishes around your price range. I can help narrow it down by category too.';
  }

  if (
    text.includes('spicy') ||
    text.includes('hot')
  ) {
    return 'For spicy food, check the dishes marked as spicy. Tell me whether you prefer chicken, BBQ, pizza, or something lighter.';
  }

  if (
    text.includes('pizza')
  ) {
    return 'For pizza, I recommend choosing one of the popular house pizzas and pairing it with a refreshing drink.';
  }

  if (
    text.includes('burger')
  ) {
    return 'A signature burger with fries is a great choice. I can also suggest something lighter if you prefer.';
  }

  if (
    text.includes('popular') ||
    text.includes('trending')
  ) {
    return 'The best place to start is the Trending section, where popular menu items can be discovered quickly.';
  }

  if (
    text.includes('pair') ||
    text.includes('goes well') ||
    text.includes('with my order')
  ) {
    return 'I can help pair your meal with sides, drinks, or desserts. Tell me what you have already added to your order.';
  }

  if (
    text.includes('offer') ||
    text.includes('discount') ||
    text.includes('deal')
  ) {
    return 'Check the Offers section for currently available promotions.';
  }

  if (
    text === 'hi' ||
    text === 'hello' ||
    text === 'hey'
  ) {
    return 'Hello. I am your Silver Sapoon AI Chef. Tell me your craving, budget, or spice preference.';
  }

  return 'I can help you choose food based on your taste, budget, spice preference, popular items, and meal pairings.';
}

export function FloatingAIAssistant() {
  const { restaurantId, tableNumber } =
    useTableContext();

  const [isOpen, setIsOpen] =
    useState(false);

  const [input, setInput] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [messages, setMessages] =
    useState<Message[]>([
      {
        role: 'assistant',
        text:
          'Hello. I am your Silver Sapoon AI Chef. How can I help you choose something delicious?',
      },
    ]);

  const [lastRequestTime, setLastRequestTime] =
    useState(0);

  const messagesContainerRef =
    useRef<HTMLDivElement>(null);

  /*
   * Open cart from header/sidebar.
   * CartDrawer can listen to this global event.
   */
  useEffect(() => {
    const handleOpenAI = () => {
      setIsOpen(true);
    };

    window.addEventListener(
      'customer:ai-open',
      handleOpenAI
    );

    return () => {
      window.removeEventListener(
        'customer:ai-open',
        handleOpenAI
      );
    };
  }, []);

  /*
   * Keep the latest message visible.
   */
  useEffect(() => {
    const container =
      messagesContainerRef.current;

    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, loading]);

  const sendMessage = async (
    messageOverride?: string
  ) => {
    const message = (
      messageOverride ?? input
    ).trim();

    if (!message || loading) {
      return;
    }

    const now = Date.now();

    if (
      now - lastRequestTime <
      REQUEST_COOLDOWN
    ) {
      return;
    }

    setLastRequestTime(now);
    setInput('');

    setMessages((current) => [
      ...current,
      {
        role: 'user',
        text: message,
      },
    ]);

    setLoading(true);

    try {
      /*
       * We intentionally support multiple service method
       * shapes so the assistant remains compatible with
       * the existing AI service implementation.
       */
      const service =
        aiService as unknown as Record<
          string,
          unknown
        >;

      let responseText = '';

      if (
        typeof service.getRecommendations ===
        'function'
      ) {
        const response =
          await (
            service.getRecommendations as (
              input: string
            ) => Promise<unknown>
          )(message);

        if (
          typeof response ===
          'string'
        ) {
          responseText = response;
        } else if (
          response &&
          typeof response === 'object'
        ) {
          const result =
            response as Record<
              string,
              unknown
            >;

          responseText = String(
            result.reply ??
            result.message ??
            result.text ??
            ''
          );
        }
      }

      if (
        !responseText &&
        typeof service.chat ===
        'function'
      ) {
        const response =
          await (
            service.chat as (
              message: string
            ) => Promise<unknown>
          )(message);

        if (
          typeof response ===
          'string'
        ) {
          responseText = response;
        } else if (
          response &&
          typeof response === 'object'
        ) {
          const result =
            response as Record<
              string,
              unknown
            >;

          responseText = String(
            result.reply ??
            result.message ??
            result.text ??
            ''
          );
        }
      }

      if (
        !responseText &&
        typeof service.chatWithAI ===
        'function'
      ) {
        const response =
          await (
            service.chatWithAI as (
              payload: {
                message: string;
                restaurantId: string;
                tableNumber: string;
              }
            ) => Promise<unknown>
          )({
            message,
            restaurantId:
              restaurantId
                ? String(
                  restaurantId
                )
                : '',
            tableNumber:
              tableNumber
                ? String(
                  tableNumber
                )
                : '',
          });

        if (
          typeof response ===
          'string'
        ) {
          responseText = response;
        } else if (
          response &&
          typeof response === 'object'
        ) {
          const result =
            response as Record<
              string,
              unknown
            >;

          responseText = String(
            result.reply ??
            result.message ??
            result.text ??
            ''
          );
        }
      }

      /*
       * Graceful fallback if AI service is unavailable
       * or returns no usable text.
       */
      if (!responseText) {
        responseText =
          getFallbackResponse(
            message
          );
      }

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: responseText,
        },
      ]);
    } catch (error) {
      console.error(
        '[AI Assistant] Request failed:',
        error
      );

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text:
            'I am having trouble connecting to the AI service right now, but I can still help with basic menu recommendations.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const submitMessage = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    void sendMessage();
  };

  return (
    <div className="fixed bottom-5 right-5 z-[100] sm:bottom-6 sm:right-6">
      {/* Chat panel */}
      {isOpen && (
        <div className="mb-4 flex h-[520px] w-[calc(100vw-32px)] max-w-[390px] flex-col overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/95 shadow-2xl backdrop-blur-2xl">
          {/* Chat header */}
          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent-purple)]/25 bg-[var(--accent-purple)]/10">
                <Sparkles className="h-5 w-5 text-[var(--accent-purple)]" />
              </div>

              <div>
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  AI Chef Assistant
                </div>

                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Ready to help
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setIsOpen(false)
              }
              aria-label="Close AI assistant"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4 custom-scrollbar"
          >
            {messages.map(
              (message, index) => {
                const isUser =
                  message.role ===
                  'user';

                return (
                  <div
                    key={`${message.role}-${index}`}
                    className={[
                      'flex',
                      isUser
                        ? 'justify-end'
                        : 'justify-start',
                    ].join(' ')}
                  >
                    <div
                      className={[
                        'max-w-[88%] rounded-2xl px-3.5 py-3 text-xs leading-relaxed',
                        isUser
                          ? 'bg-[var(--accent-gold)] font-semibold text-black'
                          : 'border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)]',
                      ].join(' ')}
                    >
                      {message.text}
                    </div>
                  </div>
                );
              }
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3.5 py-3 text-xs text-[var(--text-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-gold)]" />
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="border-t border-[var(--border-color)] px-3 py-3">
            <div className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <Sparkles className="h-3 w-3 text-[var(--accent-gold)]" />
              Quick actions
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {QUICK_ACTIONS.map(
                (action) => (
                  <button
                    key={action}
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      void sendMessage(
                        action
                      )
                    }
                    className="whitespace-nowrap rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-[10px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {action}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Input */}
          <form
            onSubmit={submitMessage}
            className="flex gap-2 border-t border-[var(--border-color)] p-3"
          >
            <input
              type="text"
              value={input}
              disabled={loading}
              onChange={(event) =>
                setInput(event.target.value)
              }
              placeholder="Ask about the menu..."
              aria-label="Ask AI about the menu"
              className="min-w-0 flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-gold)]/40"
            />

            <button
              type="submit"
              disabled={
                loading ||
                !input.trim()
              }
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-gold)] text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating trigger */}
      <button
        type="button"
        onClick={() =>
          setIsOpen(
            (current) => !current
          )
        }
        aria-label={
          isOpen
            ? 'Close AI assistant'
            : 'Open AI assistant'
        }
        className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-[var(--accent-purple)]/40 bg-[var(--bg-secondary)] text-[var(--accent-purple)] shadow-[0_0_28px_rgba(139,92,246,0.22)] transition-all duration-300 hover:scale-105 active:scale-95"
      >
        {isOpen ? (
          <ChevronDown className="h-6 w-6" />
        ) : (
          <Bot className="h-7 w-7" />
        )}

        <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--bg-secondary)] bg-emerald-500" />
      </button>
    </div>
  );
}

export default FloatingAIAssistant;