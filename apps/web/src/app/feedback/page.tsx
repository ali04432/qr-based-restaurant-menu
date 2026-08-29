'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import CustomerLayout from '../../components/customer/CustomerLayout';
import FeedbackForm from '../../components/customer/FeedbackForm';

export default function FeedbackPage() {
  const searchParams = useSearchParams();
  const orderId =
    searchParams.get('orderId') ||
    (typeof window !== 'undefined'
      ? sessionStorage.getItem('silver_sapoon_last_order_id') || undefined
      : undefined);

  return (
    <CustomerLayout>
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href={orderId ? `/orders/track?orderId=${encodeURIComponent(orderId)}` : '/'}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {orderId ? 'Back to Order Tracker' : 'Back to Menu'}
          </Link>
        </div>

        <FeedbackForm orderId={orderId} />
      </div>
    </CustomerLayout>
  );
}
