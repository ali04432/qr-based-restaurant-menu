import React, { useState } from 'react';
import { ShoppingBag, X, MapPin, UtensilsCrossed, Plus, Minus, Trash2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useCartContext } from '../../context/CartContext';
import { useTableContext } from '../../context/TableContext';
import { orderService } from '../../services/order.service';

export function CartDrawer() {
  const { isDrawerOpen, closeDrawer, items, updateQuantity, removeItem, clearCart, total } = useCartContext();
  const { restaurantId, tableNumber } = useTableContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isDrawerOpen) return null;

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payloadItems = items.map((cartItem: any) => {
        const item = cartItem.menuItem || cartItem;
        const itemId = item.id || cartItem.id || cartItem.menuItemId || 'item-1';
        const itemName = item.name || cartItem.name || 'Delicious Dish';
        const itemPrice = Number(item.price || cartItem.price || 0);
        return {
          menuItemId: String(itemId),
          name: itemName,
          price: itemPrice,
          quantity: Number(cartItem.quantity || 1),
          specialInstructions: cartItem.specialInstructions || undefined,
        };
      });

      const restId = restaurantId || '1';
      const tblId = tableNumber ? `t-${tableNumber}` : 't-07';

      await orderService.submitOrder({
        restaurantId: restId,
        tableId: tblId,
        items: payloadItems,
        paymentMethod: 'ONLINE',
      });

      setIsSubmitting(false);
      setOrderPlaced(true);
      setTimeout(() => {
        clearCart();
        setOrderPlaced(false);
        closeDrawer();
      }, 2000);
    } catch (err: any) {
      console.error('[CartDrawer] Error submitting order to backend API:', err);
      setErrorMessage(err?.message || 'Failed to place order. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={closeDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col relative z-[101]">

          {/* Header */}
          <div className="p-5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white tracking-wide">
                  Your Cart
                </h2>
                <p className="text-[10px] text-zinc-400">Review items before placing order</p>
              </div>
            </div>

            <button
              onClick={closeDrawer}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Location Banner */}
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-3.5 flex items-center gap-3">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-300">Ordering for Takeaway / Table</p>
            </div>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          {/* Cart View */}
          {orderPlaced ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-bounce" />
              <h3 className="text-xl font-bold text-white">Order Confirmed!</h3>
              <p className="text-xs text-zinc-400">Your order has been sent to the kitchen.</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner relative mb-4">
                <UtensilsCrossed className="w-10 h-10 text-amber-400/80" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-zinc-950" />
              </div>
              <h3 className="text-lg font-bold text-white">Your cart is empty</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                Select delicious food items from the menu to populate your order.
              </p>
              <button
                onClick={closeDrawer}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs transition-all shadow-md"
              >
                <span>Browse Menu</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
              {items.map((cartItem: any) => {
                const item = cartItem.menuItem || cartItem;
                const itemId = cartItem.id || item.id;
                const itemName = item.name || cartItem.name || 'Food Item';
                const itemImage = item.imageUrl || item.image || cartItem.image;
                const itemPrice = Number(item.price || cartItem.price || 0);
                const itemQty = Number(cartItem.quantity || 1);

                return (
                  <div
                    key={itemId}
                    className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 flex items-center gap-3.5 hover:border-zinc-700 transition-all"
                  >
                    {itemImage && (
                      <img
                        src={itemImage}
                        alt={itemName}
                        className="w-16 h-16 rounded-xl object-cover border border-zinc-800 shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{itemName}</h4>
                      <p className="text-xs font-extrabold text-amber-400 mt-0.5">
                        Rs. {(itemPrice * itemQty).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                      <button
                        onClick={() => itemQty === 1 ? removeItem(itemId) : updateQuantity(itemId, itemQty - 1)}
                        className="w-6 h-6 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-white w-4 text-center">{itemQty}</span>
                      <button
                        onClick={() => updateQuantity(itemId, itemQty + 1)}
                        className="w-6 h-6 rounded-lg bg-amber-500 hover:bg-amber-600 text-black flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Summary */}
          {items.length > 0 && !orderPlaced && (
            <div className="p-5 border-t border-zinc-800 bg-zinc-900/90 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span>Rs. {total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Tax & Service Fee</span>
                  <span>Included</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-zinc-800">
                  <span>Total Payable</span>
                  <span className="text-amber-400">Rs. {total.toLocaleString()}</span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
                  {errorMessage}
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-extrabold text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Placing Order...</span>
                ) : (
                  <>
                    <span>Confirm Order</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default CartDrawer;