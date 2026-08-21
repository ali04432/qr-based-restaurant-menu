import React, { useState } from 'react';
import { useCartContext } from '../../context/CartContext';
import { useTableContext } from '../../context/TableContext';
import { orderService } from '../../services/order.service';
import { OrderTrackingModal } from './OrderTrackingModal';

interface CheckoutModalProps {
  onClose: () => void;
}

export function CheckoutModal({ onClose }: CheckoutModalProps) {
  const { items, total, clearCart, closeDrawer } = useCartContext();
  const { tableNumber, restaurantId } = useTableContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const order = await orderService.submitOrder({
        restaurantId: restaurantId || '1',
        tableId: tableNumber ? `t-${tableNumber}` : 't-07',
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
    } catch (error) {
      console.error('Failed to submit order', error);
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-lg bg-surface-elevated/95 border border-[var(--border-color)] animate-fade-in relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-white">✕</button>
        
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center mx-auto mb-4 text-2xl">
            💳
          </div>
          <h2 className="text-2xl font-display font-bold text-white">Checkout</h2>
          <p className="text-text-secondary mt-1">Complete your order for {tableNumber ? `Table ${tableNumber}` : 'Takeaway'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-white mb-2">Name</label>
            <input type="text" required className="w-full bg-bg-page border border-[var(--border-color)] rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 focus:outline-none" placeholder="Enter your name" />
          </div>

          <div>
            <label className="block text-sm font-bold text-white mb-2">Email (Optional for receipt)</label>
            <input type="email" className="w-full bg-bg-page border border-[var(--border-color)] rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 focus:outline-none" placeholder="Email address" />
          </div>

          <div className="pt-4 border-t border-[var(--border-color)] mt-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-bold text-white">Total to pay</span>
              <span className="text-2xl font-display font-bold text-brand-500">${total.toFixed(2)}</span>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Processing...
                </>
              ) : (
                <>Pay Now & Place Order</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
