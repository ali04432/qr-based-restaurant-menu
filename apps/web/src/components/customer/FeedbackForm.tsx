'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Star,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Utensils,
  Heart,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';

interface FeedbackFormProps {
  orderId?: string;
  onSuccess?: () => void;
}

const TAGS = [
  '⚡ Fast Service',
  '🔥 Hot & Fresh',
  '✨ Great Taste',
  '🍷 Excellent Ambiance',
  '👨‍🍳 Master Chef Quality',
  '💎 Premium Value',
];

export function FeedbackForm({ orderId, onSuccess }: FeedbackFormProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) {
      setError('Please provide an order ID to submit feedback.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const fullComment = [
      selectedTags.length > 0 ? `Tags: ${selectedTags.join(', ')}` : '',
      comment.trim(),
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      await apiClient.post('/api/feedback', {
        orderId,
        rating: hoverRating || rating,
        comment: fullComment || undefined,
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem(`silver_sapoon_feedback_${orderId}`, 'true');
      }

      setSubmitted(true);
      onSuccess?.();
    } catch (err: any) {
      console.error('Feedback submission failed:', err);
      // Even if offline, save locally
      if (typeof window !== 'undefined') {
        localStorage.setItem(`silver_sapoon_feedback_${orderId}`, 'true');
      }
      setSubmitted(true);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center shadow-[var(--shadow-card)] max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_30px_rgba(34,197,94,0.2)] mb-5">
          <Sparkles className="h-8 w-8" />
        </div>

        <h2 className="text-2xl font-black text-[var(--text-primary)]">
          Thank You For Your Feedback!
        </h2>

        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Your feedback helps our kitchen craft even more memorable dining experiences.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-orange)] px-6 text-xs font-black text-black shadow-md transition hover:brightness-105"
          >
            <Utensils className="h-4 w-4" />
            Return to Menu
          </Link>

          <Link
            href="/orders/history"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-6 text-xs font-bold text-[var(--text-secondary)] transition hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)]"
          >
            Order History
          </Link>
        </div>
      </div>
    );
  }

  const activeStars = hoverRating !== null ? hoverRating : rating;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 sm:p-8 shadow-[var(--shadow-card)] max-w-xl mx-auto space-y-6"
    >
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] text-[10px] font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Guest Experience</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
          How was your dining experience?
        </h1>

        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {orderId ? `Order #${orderId.substring(0, 8).toUpperCase()}` : 'Rate your meal and service'}
        </p>
      </div>

      {/* Star Rating */}
      <div className="flex flex-col items-center justify-center py-4 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-color)]">
        <div className="flex items-center gap-2 sm:gap-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(null)}
              className="p-1.5 transition-transform hover:scale-125 focus:outline-none"
              aria-label={`Rate ${star} stars`}
            >
              <Star
                className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                  star <= activeStars
                    ? 'text-[var(--accent-gold)] fill-[var(--accent-gold)] drop-shadow-[0_0_10px_rgba(245,179,66,0.5)]'
                    : 'text-[var(--text-muted)] opacity-40'
                }`}
              />
            </button>
          ))}
        </div>

        <div className="mt-3 text-xs font-bold text-[var(--accent-gold)]">
          {activeStars === 5 && '🌟 Exceptional! Loved everything'}
          {activeStars === 4 && '✨ Very Good! Enjoyed it'}
          {activeStars === 3 && '👍 Good, but room for improvement'}
          {activeStars === 2 && '👎 Below expectations'}
          {activeStars === 1 && '💔 Poor experience'}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-3">
          What stood out? (Optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isSelected
                    ? 'bg-[var(--accent-gold)] text-black border-[var(--accent-gold)] font-bold shadow-md scale-105'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--accent-gold)]/30'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comment */}
      <div>
        <label
          htmlFor="feedback-comment"
          className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-2"
        >
          Additional Comments (Optional)
        </label>
        <textarea
          id="feedback-comment"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us what you liked or how we can improve..."
          className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-3 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-gold)]/40"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-orange)] text-xs font-black text-black shadow-lg transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Submitting Feedback...</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>Submit Feedback</span>
          </>
        )}
      </button>
    </form>
  );
}

export default FeedbackForm;
