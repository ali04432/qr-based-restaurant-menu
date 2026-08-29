'use client';

import React from 'react';
import Link from 'next/link';
import {
    Minus,
    Plus,
    ShoppingCart,
    Trash2,
    X,
    ArrowRight,
    ReceiptText,
} from 'lucide-react';

import { useCart } from '../../context/CartContext';

export default function CartDrawer() {
    const {
        cart,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
        tax,
        serviceCharge,
        grandTotal,
        isCartOpen,
        closeDrawer,
    } = useCart();

    if (!isCartOpen) {
        return null;
    }

    const itemCount = cart.reduce(
        (total, item) =>
            total + item.quantity,
        0
    );

    return (
        <>
            {/* Backdrop */}
            <button
                type="button"
                aria-label="Close cart"
                onClick={closeDrawer}
                className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
            />

            {/* Drawer */}
            <aside
                className="fixed right-0 top-0 z-[120] flex h-full w-full max-w-[460px] flex-col border-l border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl"
                aria-label="Shopping cart"
            >
                {/* Header */}
                <div className="flex h-[72px] items-center justify-between border-b border-[var(--border-color)] px-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]">
                            <ShoppingCart className="h-5 w-5" />
                        </div>

                        <div>
                            <h2 className="text-base font-black text-[var(--text-primary)]">
                                Your Cart
                            </h2>

                            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                                {itemCount}{' '}
                                {itemCount === 1
                                    ? 'item'
                                    : 'items'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={closeDrawer}
                        aria-label="Close cart"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Cart content */}
                <div className="flex-1 overflow-y-auto px-4 py-5 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="flex min-h-full items-center justify-center">
                            <div className="w-full max-w-sm text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)]">
                                    <ShoppingCart className="h-7 w-7" />
                                </div>

                                <h3 className="mt-5 text-lg font-black text-[var(--text-primary)]">
                                    Your cart is empty
                                </h3>

                                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                                    Add some delicious dishes from the menu to get started.
                                </p>

                                <Link
                                    href="/menu"
                                    onClick={closeDrawer}
                                    className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent-gold)] px-5 text-sm font-bold text-black transition hover:brightness-105"
                                >
                                    Explore Menu
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Clear cart */}
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                    Order Summary
                                </span>

                                <button
                                    type="button"
                                    onClick={clearCart}
                                    className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-red-400 transition hover:text-red-300"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Clear cart
                                </button>
                            </div>

                            {/* Items */}
                            {cart.map((item) => {
                                const menuItem =
                                    item.menuItem;

                                const lineTotal =
                                    menuItem.price *
                                    item.quantity;

                                return (
                                    <div
                                        key={menuItem.id}
                                        className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3"
                                    >
                                        <div className="flex gap-3">
                                            {/* Image */}
                                            <img
                                                src={menuItem.image}
                                                alt={menuItem.name}
                                                className="h-20 w-20 shrink-0 rounded-xl object-cover"
                                            />

                                            {/* Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">
                                                            {menuItem.name}
                                                        </h3>

                                                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                                            Rs.{' '}
                                                            {menuItem.price.toLocaleString(
                                                                'en-PK'
                                                            )}{' '}
                                                            each
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeFromCart(
                                                                menuItem.id
                                                            )
                                                        }
                                                        aria-label={`Remove ${menuItem.name} from cart`}
                                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-red-500/10 hover:text-red-400"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>

                                                <div className="mt-3 flex items-center justify-between">
                                                    {/* Quantity */}
                                                    <div className="flex items-center overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)]">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    menuItem.id,
                                                                    -1
                                                                )
                                                            }
                                                            aria-label={`Decrease ${menuItem.name} quantity`}
                                                            className="flex h-8 w-8 items-center justify-center text-[var(--text-secondary)] transition hover:text-[var(--accent-gold)]"
                                                        >
                                                            <Minus className="h-3.5 w-3.5" />
                                                        </button>

                                                        <span className="flex h-8 min-w-8 items-center justify-center border-x border-[var(--border-color)] px-2 text-xs font-bold text-[var(--text-primary)]">
                                                            {item.quantity}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    menuItem.id,
                                                                    1
                                                                )
                                                            }
                                                            aria-label={`Increase ${menuItem.name} quantity`}
                                                            className="flex h-8 w-8 items-center justify-center text-[var(--text-secondary)] transition hover:text-[var(--accent-gold)]"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>

                                                    {/* Line total */}
                                                    <div className="text-sm font-black text-[var(--accent-gold)]">
                                                        Rs.{' '}
                                                        {lineTotal.toLocaleString(
                                                            'en-PK'
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Special instructions */}
                                                {item.specialInstructions && (
                                                    <div className="mt-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2">
                                                        <p className="text-[10px] text-[var(--text-secondary)]">
                                                            <span className="font-bold text-[var(--text-primary)]">
                                                                Note:
                                                            </span>{' '}
                                                            {
                                                                item.specialInstructions
                                                            }
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {cart.length > 0 && (
                    <div className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-[var(--text-secondary)]">
                                        Subtotal
                                    </span>

                                    <span className="font-semibold text-[var(--text-primary)]">
                                        Rs.{' '}
                                        {subtotal.toLocaleString(
                                            'en-PK'
                                        )}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-[var(--text-secondary)]">
                                        Tax
                                    </span>

                                    <span className="font-semibold text-[var(--text-primary)]">
                                        Rs.{' '}
                                        {tax.toLocaleString(
                                            'en-PK'
                                        )}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-[var(--text-secondary)]">
                                        Service Charge
                                    </span>

                                    <span className="font-semibold text-[var(--text-primary)]">
                                        Rs.{' '}
                                        {serviceCharge.toLocaleString(
                                            'en-PK'
                                        )}
                                    </span>
                                </div>

                                <div className="my-3 border-t border-dashed border-[var(--border-color)]" />

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                                            Total
                                        </p>

                                        <p className="mt-1 text-xl font-black text-[var(--accent-gold)]">
                                            Rs.{' '}
                                            {grandTotal.toLocaleString(
                                                'en-PK'
                                            )}
                                        </p>
                                    </div>

                                    <ReceiptText className="h-5 w-5 text-[var(--text-muted)]" />
                                </div>
                            </div>

                            <Link
                                href="/checkout"
                                onClick={closeDrawer}
                                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-orange)] text-sm font-black text-black transition hover:brightness-105 active:scale-[0.99]"
                            >
                                Proceed to Checkout
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                )}
            </aside>
        </>
    );
}