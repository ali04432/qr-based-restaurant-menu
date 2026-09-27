'use client';

import React, { useState } from 'react';
import { useCartContext } from '../../context/CartContext';
import { useTableContext } from '../../context/TableContext';
import { orderService } from '../../services/order.service';
import { OrderTrackingModal } from './OrderTrackingModal';
import { CreditCard, X, ShieldCheck, ArrowRight } from 'lucide-react';

interface CheckoutModalProps {
  onClose: () => void;
}

export function CheckoutModal({ onClose }: CheckoutModalProps) {
  const { items, total, clearCart, closeDrawer } = useCartContext();
  const { tableNumber, restaurantId } = useTableContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!restaurantId || !tableNumber) {
        throw new Error('Restaurant or Table information missing. Please re-scan QR code.');
      }

      const order = await orderService.submitOrder({
        restaurantId,
        tableId: `t-${tableNumber}`,
        items: items.map(i => ({
          menuItemId: i.menuItem.id,
          name: i.menuItem.name,
          price: i.menuItem.price,
          quantity: i.quantity,
          specialInstructions: i.specialInstructions
        })),
        paymentMethod: 'ONLINE'
      });

      setOrderId(order.id);
      clearCart();
    } catch (err: any) {
      console.error('Failed to submit order', err);
      const errorMessage = err?.response?.data?.error?.message
        || err?.message
        || 'Failed to submit order. Please try again.';
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  if (orderId) {
    return <OrderTrackingModal orderId={orderId} onClose={() => {
      onClose();
      closeDrawer();
    }} />;
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0B0B0D] border border-[#1D1F23] rounded-3xl w-full max-w-lg p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] relative animate-in zoom-in-95 duration-200">

        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-xl text-[#71717A] hover:text-[#F8FAFC] hover:bg-[#1D1F23] transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#D6A84F]/10 border border-[#D6A84F]/30 text-[#D6A84F] flex items-center justify-center mx-auto mb-4 text-2xl shadow-[0_0_20px_rgba(214,168,79,0.2)]">
            <CreditCard className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-bold text-[#F8FAFC]">Checkout</h2>
          <p className="text-xs text-[#A1A1AA] mt-1">Complete your order for {tableNumber ? `Table ${tableNumber}` : 'Takeaway'}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Name</label>
            <input
              type="text"
              required
              className="w-full bg-[#17181B] border border-[#1D1F23] rounded-2xl px-4 py-3 text-xs text-[#F8FAFC] placeholder-[#71717A] focus:border-[#F59E0B] outline-none transition-all"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Email (Optional for receipt)</label>
            <input
              type="email"
              className="w-full bg-[#17181B] border border-[#1D1F23] rounded-2xl px-4 py-3 text-xs text-[#F8FAFC] placeholder-[#71717A] focus:border-[#F59E0B] outline-none transition-all"
              placeholder="Email address"
            />
          </div>

          <div className="pt-4 border-t border-[#1D1F23] mt-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-base font-bold text-[#F8FAFC]">Total to pay</span>
              <span className="text-2xl font-display font-black text-[#D6A84F]">${total.toFixed(2)}</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#F59E0B] hover:bg-[#F97316] disabled:opacity-50 text-[#0B0B0D] font-black text-xs rounded-xl
                         shadow-[0_4px_0_0_#9A470B,0_0_20px_rgba(245,158,11,0.3)] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Pay Now & Place Order</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CheckoutModal;
