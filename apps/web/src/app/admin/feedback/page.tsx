'use client';

import React, { useState, useEffect } from 'react';
import {
  Star,
  MessageSquare,
  TrendingUp,
  Users,
  RefreshCw,
  Calendar,
  Hash,
  User,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { CustomerFeedback, FeedbackSummary, UserRole } from '@qr-menu/shared';

export default function AdminFeedbackPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [feedbackList, setFeedbackList] = useState<CustomerFeedback[]>([]);
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const fetchData = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const [feedbackData, summaryData] = await Promise.all([
        adminService.getFeedback(restaurantId, token),
        adminService.getFeedbackSummary(restaurantId, token),
      ]);
      setFeedbackList(feedbackData || []);
      setSummary(summaryData || null);
    } catch (err) {
      console.warn('[AdminFeedback] Failed to fetch feedback', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurantId, token]);

  const filteredFeedback = filterRating
    ? feedbackList.filter((f) => f.rating === filterRating)
    : feedbackList;

  const renderStars = (rating: number, size = 'w-4 h-4') => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`${size} ${
              s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (rating >= 3) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const getBarWidth = (count: number) => {
    if (!summary || !summary.totalReviews) return '0%';
    return `${(count / summary.totalReviews) * 100}%`;
  };

  return (
    <AdminLayout
      title="Customer Feedback"
      subtitle="Reviews, Ratings & Customer Sentiment Analysis"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]}
      onRefresh={fetchData}
      isRefreshing={refreshing}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Average Rating */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <Star className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Average Rating</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {summary?.averageRating?.toFixed(1) || '—'}
                  </p>
                </div>
              </div>
              {renderStars(Math.round(summary?.averageRating || 0), 'w-5 h-5')}
            </div>

            {/* Total Reviews */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Total Reviews</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {summary?.totalReviews || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Positive (4-5 stars) */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <ThumbsUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Positive (4-5★)</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {summary && summary.ratingBreakdown
                      ? (summary.ratingBreakdown[4] || 0) + (summary.ratingBreakdown[5] || 0)
                      : 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Negative (1-2 stars) */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center">
                  <ThumbsDown className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Negative (1-2★)</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {summary && summary.ratingBreakdown
                      ? (summary.ratingBreakdown[1] || 0) + (summary.ratingBreakdown[2] || 0)
                      : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Rating Breakdown Bar Chart ── */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Rating Distribution</h3>
            </div>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = (summary?.ratingBreakdown && summary.ratingBreakdown[star as any]) || 0;
                const isActive = filterRating === star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFilterRating(isActive ? null : star)}
                    className={`w-full flex items-center gap-3 group rounded-md px-2 py-1.5 transition-colors ${
                      isActive ? 'bg-amber-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-semibold text-slate-600 w-8 text-right">
                      {star}★
                    </span>
                    <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          star >= 4
                            ? 'bg-emerald-400'
                            : star === 3
                            ? 'bg-amber-400'
                            : 'bg-rose-400'
                        }`}
                        style={{ width: getBarWidth(count) }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-10 text-right">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            {filterRating && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFilterRating(null)}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
                >
                  ✕ Clear filter — showing {filterRating}★ reviews
                </button>
              </div>
            )}
          </div>

          {/* ── Feedback List ── */}
          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                Customer Reviews
                <span className="ml-2 text-xs font-normal text-slate-500">
                  ({filteredFeedback.length} reviews)
                </span>
              </h3>
            </div>

            {filteredFeedback.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No feedback found.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredFeedback.map((fb) => (
                  <div key={fb.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          {renderStars(fb.rating)}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${getRatingColor(
                              fb.rating
                            )}`}
                          >
                            {fb.rating}/5
                          </span>
                        </div>

                        {fb.comment && (
                          <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                            "{fb.comment}"
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                          {fb.customerName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {fb.customerName}
                            </span>
                          )}
                          {fb.orderNumber && (
                            <span className="flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              {fb.orderNumber}
                            </span>
                          )}
                          {fb.tableNumber && (
                            <span className="flex items-center gap-1">
                              Table {fb.tableNumber}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(fb.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
