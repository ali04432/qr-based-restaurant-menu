'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Bell, X, ChefHat } from 'lucide-react';

// ============================================================
// Silver Sapoon — Food Ready Alert System
// Plays audible chime + shows toast when order status = READY
// Deduplicates by orderId using a persistent ref Set
// ============================================================

export interface FoodReadyNotification {
  id: string; // orderId — dedup key
  orderId: string;
  orderNumber: string;
  tableNumber: string;
  items: { name: string; quantity: number }[];
  readyAt: Date;
}

interface FoodReadyAlertProps {
  notifications: FoodReadyNotification[];
  onDismiss: (orderId: string) => void;
  onView: (orderId: string) => void; // switches to ready section
  soundEnabled: boolean;
}

/** Synthesize a short 880 Hz bell tone via Web Audio API */
export function playBellSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
    // second harmonic for richness
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1320;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc2.start(ctx.currentTime + 0.05);
    osc2.stop(ctx.currentTime + 0.4);
  } catch {
    // Web Audio not available — silent fallback
  }
}

export function FoodReadyAlert({
  notifications,
  onDismiss,
  onView,
  soundEnabled,
}: FoodReadyAlertProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {notifications.slice(0, 4).map((n) => {
        const elapsed = Math.floor((Date.now() - n.readyAt.getTime()) / 60000);
        return (
          <div
            key={n.id}
            className="pointer-events-auto rounded-2xl p-4 shadow-2xl animate-slideUp"
            style={{
              background: '#151518',
              border: '1px solid #D6A84F',
              boxShadow: '0 8px 32px rgba(214,168,79,0.2)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(91,191,174,0.15)' }}
              >
                <ChefHat className="w-5 h-5" style={{ color: '#5BBFAE' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold" style={{ color: '#5BBFAE' }}>
                    FOOD READY
                  </span>
                  <span className="text-[10px]" style={{ color: '#A39F96' }}>
                    {elapsed === 0 ? 'just now' : `${elapsed}m ago`}
                  </span>
                </div>
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: '#F4EFE6', fontFamily: 'Playfair Display, Georgia, serif' }}
                >
                  Table {n.tableNumber} · #{n.orderNumber}
                </p>
                <p className="text-xs" style={{ color: '#A39F96' }}>
                  {n.items
                    .slice(0, 3)
                    .map((i) => `${i.name} ×${i.quantity}`)
                    .join(', ')}
                  {n.items.length > 3 && ` +${n.items.length - 3} more`}
                </p>
              </div>
              <button
                onClick={() => onDismiss(n.id)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-[#26262B] transition-colors"
                style={{ color: '#A39F96' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onView(n.orderId)}
                className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                style={{ background: '#D6A84F', color: '#0B0B0D' }}
              >
                View Order
              </button>
              <button
                onClick={() => onDismiss(n.id)}
                className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: '#26262B', color: '#A39F96' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Hook: manages food-ready notification state + deduplication */
export function useFoodReadyAlerts(soundEnabled: boolean) {
  const [notifications, setNotifications] = React.useState<FoodReadyNotification[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  const addAlert = useCallback(
    (n: Omit<FoodReadyNotification, 'readyAt'>) => {
      if (seenIds.current.has(n.id)) return; // deduplicate
      seenIds.current.add(n.id);
      setNotifications((prev) => [
        { ...n, readyAt: new Date() },
        ...prev.filter((x) => x.id !== n.id),
      ]);
      if (soundEnabled) {
        playBellSound();
        // Browser notification
        if (typeof window !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(`FOOD READY — Table ${n.tableNumber}`, {
              body: n.items.map((i) => `${i.name} ×${i.quantity}`).join('\n'),
              icon: '/favicon.ico',
              tag: n.orderId,
            });
          } catch {
            /* ignore */
          }
        }
      }
    },
    [soundEnabled]
  );

  const dismiss = useCallback((orderId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== orderId));
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const seedSeenIds = useCallback((ids: string[]) => {
    ids.forEach((id) => seenIds.current.add(id));
  }, []);

  return { notifications, addAlert, dismiss, dismissAll, seenIds, seedSeenIds };
}
