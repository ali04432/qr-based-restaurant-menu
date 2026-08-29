'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  X,
  FileText,
  ChefHat,
  Flame,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { orderService } from '../../services/order.service';
import { useSocket } from '../../hooks/useSocket';
import { Order, OrderStatus } from '@qr-menu/shared';

interface OrderTrackingModalProps {
  orderId: string;
  onClose: () => void;
}

const STATUS_MAP: Record<string, number> = {
  PENDING: 1,
  RECEIVED: 1,
  NEW: 1,
  IN_KITCHEN: 2,
  COOKING: 3,
  PREPARING: 2,
  READY: 4,
  SERVED: 4,
  COMPLETED: 4,
  CANCELLED: 0,
};

export function OrderTrackingModal({ orderId, onClose }: OrderTrackingModalProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<OrderStatus>('NEW');
  const [loading, setLoading] = useState(true);

  const { socket } = useSocket({
    restaurantId: order?.restaurantId,
    enabled: true,
  });

  useEffect(() => {
    let isMounted = true;

    orderService.getOrder(orderId).then((data) => {
      if (isMounted && data) {
        setOrder(data);
        setStatus(data.status);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  // Listen for real-time order status updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleOrderUpdate = (updatedOrder: any) => {
      if (updatedOrder && (updatedOrder.id === orderId || updatedOrder.orderId === orderId)) {
        const nextStatus = updatedOrder.status || updatedOrder.orderStatus;
        if (nextStatus) {
          setStatus(nextStatus);
          setOrder((prev) => (prev ? { ...prev, status: nextStatus } : prev));
        }
      }
    };

    socket.on('order-updated', handleOrderUpdate);
    socket.on('order.statusChanged', handleOrderUpdate);
    socket.on('kitchen.orderUpdated', handleOrderUpdate);

    return () => {
      socket.off('order-updated', handleOrderUpdate);
      socket.off('order.statusChanged', handleOrderUpdate);
      socket.off('kitchen.orderUpdated', handleOrderUpdate);
    };
  }, [socket, orderId]);

  const stepNumber = STATUS_MAP[status] ?? 1;

  const steps = [
    { id: 1, label: 'Order Received', icon: FileText, desc: 'Sent to kitchen' },
    { id: 2, label: 'In Kitchen', icon: ChefHat, desc: 'Chef started prep' },
    { id: 3, label: 'Cooking', icon: Flame, desc: 'Sizzling hot on stove' },
    { id: 4, label: 'Ready & Served', icon: Sparkles, desc: 'Ready for you' },
  ];

  return (
    <div className="fixed inset-0 bg-[#0B0B0D]/95 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0B0B0D] border border-[#1D1F23] rounded-3xl w-full max-w-md p-6 relative text-center py-8 shadow-[0_20px_60px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close tracking"
          className="absolute top-4 right-4 p-1.5 rounded-xl text-[#71717A] hover:text-[#F8FAFC] hover:bg-[#1D1F23] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
          <Sparkles className="w-8 h-8 stroke-[2]" />
        </div>

        <h2 className="text-2xl font-display font-bold text-[#F8FAFC] mb-1">
          {status === 'CANCELLED' ? 'Order Cancelled' : status === 'SERVED' ? 'Order Served!' : 'Order Placed!'}
        </h2>
        <p className="text-xs text-[#A1A1AA] mb-6 font-mono">
          Order #{orderId.substring(0, 8).toUpperCase()} {order?.tableNumber ? `• Table ${order.tableNumber}` : ''}
        </p>

        {/* Progress Tracker with Real Status */}
        {status === 'CANCELLED' ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl mb-6 text-red-400 text-xs">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            This order was cancelled. Please reach out to our staff if you need assistance.
          </div>
        ) : (
          <div className="relative max-w-xs mx-auto mb-8 text-left">
            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-[#17181B] -z-10"></div>

            <div className="space-y-5">
              {steps.map((s) => {
                const isCompleted = stepNumber >= s.id;
                const isActive = stepNumber === s.id;
                const Icon = s.icon;

                return (
                  <div key={s.id} className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                        isCompleted
                          ? 'bg-[#F59E0B] text-[#0B0B0D] shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                          : 'bg-[#17181B] border border-[#1D1F23] text-[#71717A]'
                      }`}
                    >
                      {isCompleted ? <Icon className="w-5 h-5 stroke-[2.2]" /> : s.id}
                    </div>

                    <div className="flex-1">
                      <p
                        className={`text-xs font-bold transition-colors duration-500 ${
                          isCompleted ? 'text-[#F8FAFC]' : 'text-[#71717A]'
                        }`}
                      >
                        {s.label}
                      </p>
                      <p className="text-[10px] text-[#71717A]">{s.desc}</p>
                      {isActive && (
                        <p className="text-[10px] text-[#D6A84F] font-semibold animate-pulse mt-0.5">
                          ● Live Kitchen Status
                        </p>
                      )}
                    </div>

                    <div className="text-[#71717A]">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-[#F59E0B] animate-bounce' : 'opacity-30'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <Link
            href={`/orders/track?orderId=${encodeURIComponent(orderId)}`}
            onClick={onClose}
            className="w-full py-3 bg-[var(--accent-gold)] hover:brightness-110 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-lg"
          >
            <ExternalLink className="w-4 h-4" />
            Full Order Tracker
          </Link>

          <Link
            href={`/feedback?orderId=${encodeURIComponent(orderId)}`}
            onClick={onClose}
            className="w-full py-2.5 bg-[#17181B] hover:bg-[#1D1F23] border border-[#1D1F23] text-[#F8FAFC] font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition"
          >
            <MessageSquare className="w-4 h-4 text-[var(--accent-gold)]" />
            Leave Dining Feedback
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-[var(--text-muted)] hover:text-white text-xs transition"
          >
            Return to Menu
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderTrackingModal;