'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  QrCode,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Utensils,
} from 'lucide-react';
import { useTableContext } from '../../context/TableContext';
import { menuService } from '../../services/menu.service';

export default function QrEnterPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setSession } = useTableContext();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [restaurantName, setRestaurantName] = useState('Silver Sapoon');
  const [tableNumber, setTableNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const restaurantId = searchParams.get('restaurant');
    const tableId = searchParams.get('table');

    if (!restaurantId || !tableId) {
      setStatus('error');
      setErrorMessage('Invalid QR code parameters. Please scan the QR code placed on your dining table.');
      return;
    }

    let isMounted = true;

    // Verify restaurant & table
    menuService
      .getMenu(restaurantId, tableId)
      .then((data) => {
        if (!isMounted) return;

        const resolvedName = data.restaurantName || 'Silver Sapoon';
        setRestaurantName(resolvedName);
        setTableNumber(tableId);

        // Store session
        setSession({
          restaurantId,
          tableId,
          tableNumber: tableId.replace(/^t-|^table-/, '').toUpperCase(),
          restaurantName: resolvedName,
        });

        setStatus('success');

        // Automatically redirect to menu after 1.5 seconds
        setTimeout(() => {
          router.push('/');
        }, 1500);
      })
      .catch((err) => {
        console.error('QR verification failed:', err);
        if (isMounted) {
          // Fallback to local session
          setSession({
            restaurantId,
            tableId,
            tableNumber: tableId,
            restaurantName: 'Silver Sapoon',
          });
          setStatus('success');
          setTimeout(() => {
            router.push('/');
          }, 1200);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams, setSession, router]);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-[var(--accent-gold)]/10 rounded-full blur-3xl pointer-events-none" />

        {status === 'verifying' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] shadow-[0_0_30px_rgba(245,179,66,0.2)]">
              <Loader2 className="h-10 w-10 animate-spin" />
            </div>

            <div>
              <h1 className="text-2xl font-black text-[var(--text-primary)]">
                Connecting to Table...
              </h1>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Verifying your dining session and loading the live menu.
              </p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-5 animate-in zoom-in-95 duration-300">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_30px_rgba(34,197,94,0.25)]">
              <Sparkles className="h-10 w-10" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Session Verified</span>
              </div>

              <h1 className="text-2xl font-black text-[var(--text-primary)]">
                Welcome to {restaurantName}
              </h1>

              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Table <span className="font-bold text-[var(--accent-gold)]">{tableNumber}</span> connected. Entering digital dining experience...
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-orange)] text-xs font-black text-black shadow-lg transition hover:brightness-105"
            >
              <span>Explore Menu Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-5 animate-in zoom-in-95 duration-300">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400">
              <AlertCircle className="h-10 w-10" />
            </div>

            <div>
              <h1 className="text-2xl font-black text-[var(--text-primary)]">
                QR Code Invalid
              </h1>
              <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                {errorMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)] transition"
            >
              <Utensils className="w-4 h-4" />
              <span>Browse Menu as Guest</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
