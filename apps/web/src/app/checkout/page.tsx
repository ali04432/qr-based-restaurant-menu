'use client';

import React, {
    FormEvent,
    useMemo,
    useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
    ArrowLeft,
    ArrowRight,
    Banknote,
    CheckCircle2,
    CreditCard,
    Loader2,
    MapPin,
    ReceiptText,
    ShieldCheck,
    ShoppingCart,
    Smartphone,
    AlertCircle,
} from 'lucide-react';

import CustomerLayout from '../../components/customer/CustomerLayout';

import {
    useCart,
} from '../../context/CartContext';

import {
    useTableContext,
} from '../../context/TableContext';

import {
    orderService,
} from '../../services/order.service';

import type {
    CustomerOrderRequest,
    PaymentMethod,
} from '@qr-menu/shared';

interface PaymentOption {
    id: PaymentMethod;
    name: string;
    description: string;
    icon: React.ComponentType<{
        className?: string;
    }>;
}

const paymentOptions: PaymentOption[] = [
    {
        id: 'CASH',
        name: 'Pay at Counter',
        description:
            'Pay your bill at the restaurant counter.',
        icon: Banknote,
    },
    {
        id: 'CARD',
        name: 'Card Payment',
        description:
            'Use the existing secure card payment flow.',
        icon: CreditCard,
    },
    {
        id: 'ONLINE',
        name: 'Online Payment',
        description:
            'Continue through the existing online payment integration.',
        icon: Smartphone,
    },
];

interface CustomerInfo {
    name: string;
    phone: string;
}

export default function CheckoutPage() {
    const router = useRouter();

    const {
        cart,
        subtotal,
        tax,
        serviceCharge,
        grandTotal,
        clearCart,
    } = useCart();

    const {
        tableNumber,
        tableId,
        restaurantId,
    } = useTableContext();

    const [paymentMethod, setPaymentMethod] =
        useState<PaymentMethod>('CASH');

    const [customerInfo, setCustomerInfo] =
        useState<CustomerInfo>({
            name: '',
            phone: '',
        });

    const [orderNotes, setOrderNotes] =
        useState('');

    const [placingOrder, setPlacingOrder] =
        useState(false);

    const [error, setError] =
        useState('');

    const itemCount = useMemo(() => {
        return cart.reduce(
            (total, item) =>
                total + item.quantity,
            0
        );
    }, [cart]);

    const formattedTable =
        tableNumber &&
            String(tableNumber).length === 1
            ? `0${tableNumber}`
            : tableNumber || '--';

    const handleCustomerInfoChange = (
        field: keyof CustomerInfo,
        value: string
    ) => {
        setCustomerInfo((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const validateCheckout = () => {
        if (cart.length === 0) {
            return 'Your cart is empty. Please add items before placing an order.';
        }

        if (!restaurantId) {
            return 'Restaurant information is missing. Please re-scan the restaurant QR code.';
        }

        return null;
    };

    const buildOrderRequest =
        (): CustomerOrderRequest | null => {
            const validationError =
                validateCheckout();

            if (validationError) {
                setError(validationError);
                return null;
            }

            const request: CustomerOrderRequest = {
                restaurantId: String(
                    restaurantId || 'a0000000-0000-0000-0000-000000000001'
                ),

                tableId: String(
                    tableId || 'b0000001-0000-0000-0000-000000000001'
                ),

                customerPhone: customerInfo.phone ? customerInfo.phone.trim() : undefined,

                paymentMethod,

                items: cart.map(
                    (cartItem) => ({
                        menuItemId:
                            cartItem.menuItem.id,

                        name:
                            cartItem.menuItem.name,

                        price:
                            cartItem.menuItem.price,

                        quantity:
                            cartItem.quantity,

                        specialInstructions:
                            cartItem.specialInstructions || (orderNotes ? orderNotes : undefined),
                    })
                ),
            };

            return request;
        };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (placingOrder) {
            return;
        }

        setError('');

        const request =
            buildOrderRequest();

        if (!request) {
            return;
        }

        setPlacingOrder(true);

        try {
            const order =
                await orderService.submitOrder(
                    request
                );

            /*
             * Clear cart only after the backend
             * successfully accepts the order.
             */
            clearCart();

            if (
                typeof window !== 'undefined'
            ) {
                sessionStorage.setItem(
                    'silver_sapoon_last_order_id',
                    order.id
                );

                // Save to local order history
                try {
                    const existingHistory = JSON.parse(
                        localStorage.getItem('silver_sapoon_order_history') || '[]'
                    );
                    const historyEntry = {
                        id: order.id,
                        restaurantId: order.restaurantId,
                        tableNumber: order.tableNumber || tableNumber || '07',
                        total: order.total || grandTotal,
                        itemsCount: itemCount,
                        items: cart.map((i) => ({
                            name: i.menuItem.name,
                            quantity: i.quantity,
                            price: i.menuItem.price,
                            image: i.menuItem.image,
                        })),
                        status: order.status || 'NEW',
                        paymentMethod,
                        createdAt: new Date().toISOString(),
                    };
                    localStorage.setItem(
                        'silver_sapoon_order_history',
                        JSON.stringify([historyEntry, ...existingHistory])
                    );
                } catch (histErr) {
                    console.error('Failed to save order history:', histErr);
                }

                window.dispatchEvent(
                    new CustomEvent(
                        'customer:order-placed',
                        {
                            detail: order,
                        }
                    )
                );
            }

            router.push(
                `/orders/track?orderId=${encodeURIComponent(
                    order.id
                )}`
            );
        } catch (submissionError) {
            console.error(
                '[Checkout] Order submission failed:',
                submissionError
            );

            setError(
                'We could not place your order right now. Please check your connection and try again.'
            );
        } finally {
            setPlacingOrder(false);
        }
    };

    /*
     * Empty cart state
     */
    if (cart.length === 0) {
        return (
            <CustomerLayout>
                <div className="mx-auto flex min-h-[75vh] max-w-2xl items-center justify-center px-4 py-10 sm:px-6">
                    <div className="w-full rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center shadow-[var(--shadow-card)] sm:p-10">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)]">
                            <ShoppingCart className="h-7 w-7 text-[var(--text-muted)]" />
                        </div>

                        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                            Silver Sapoon
                        </p>

                        <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)] sm:text-3xl">
                            Your cart is empty
                        </h1>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                            Add some delicious dishes before continuing to checkout.
                        </p>

                        <Link
                            href="/menu"
                            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent-gold)] px-5 text-sm font-bold text-black transition hover:brightness-105"
                        >
                            Explore Menu
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </CustomerLayout>
        );
    }

    return (
        <CustomerLayout>
            <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-5 sm:px-6 sm:pt-7 lg:px-8">
                {/* Page header */}
                <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Link
                            href="/menu"
                            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--accent-gold)]"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Menu
                        </Link>

                        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                            Silver Sapoon
                        </p>

                        <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
                            Checkout
                        </h1>

                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            Review your order and send it to the restaurant.
                        </p>
                    </div>

                    {/* Table badge */}
                    <div className="flex w-fit items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3">
                        <MapPin className="h-4 w-4 text-[var(--accent-gold)]" />

                        <div>
                            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                                Your Table
                            </div>

                            <div className="mt-1 text-xs font-black text-[var(--text-primary)]">
                                Table {formattedTable}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div
                        role="alert"
                        className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4"
                    >
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

                        <div>
                            <div className="text-sm font-bold text-red-400">
                                Order could not be placed
                            </div>

                            <p className="mt-1 text-xs leading-5 text-red-300/80">
                                {error}
                            </p>
                        </div>
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="grid gap-6 lg:grid-cols-[1fr_420px]"
                >
                    {/* Main column */}
                    <div className="space-y-6">
                        {/* Customer details */}
                        <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-7">
                            <div className="mb-5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)]">
                                    01
                                </p>

                                <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">
                                    Customer Details
                                </h2>

                                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                    Contact information for this dining session.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="customer-name"
                                        className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]"
                                    >
                                        Name
                                    </label>

                                    <input
                                        id="customer-name"
                                        type="text"
                                        value={customerInfo.name}
                                        onChange={(event) =>
                                            handleCustomerInfoChange(
                                                'name',
                                                event.target.value
                                            )
                                        }
                                        placeholder="Your name"
                                        autoComplete="name"
                                        className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] transition focus:border-[var(--accent-gold)]/40 focus:ring-2 focus:ring-[var(--accent-gold)]/10"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="customer-phone"
                                        className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]"
                                    >
                                        Phone
                                    </label>

                                    <input
                                        id="customer-phone"
                                        type="tel"
                                        value={customerInfo.phone}
                                        onChange={(event) =>
                                            handleCustomerInfoChange(
                                                'phone',
                                                event.target.value
                                            )
                                        }
                                        placeholder="03XX XXXXXXX"
                                        autoComplete="tel"
                                        inputMode="tel"
                                        className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] transition focus:border-[var(--accent-gold)]/40 focus:ring-2 focus:ring-[var(--accent-gold)]/10"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label
                                    htmlFor="order-notes"
                                    className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]"
                                >
                                    Order Notes
                                </label>

                                <textarea
                                    id="order-notes"
                                    rows={4}
                                    value={orderNotes}
                                    onChange={(event) =>
                                        setOrderNotes(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Any general request for the kitchen..."
                                    className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] transition focus:border-[var(--accent-gold)]/40 focus:ring-2 focus:ring-[var(--accent-gold)]/10"
                                />
                            </div>
                        </section>

                        {/* Payment */}
                        <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-7">
                            <div className="mb-5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)]">
                                    02
                                </p>

                                <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">
                                    Payment Method
                                </h2>

                                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                    Select a method supported by the existing order system.
                                </p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                                {paymentOptions.map(
                                    (option) => {
                                        const Icon =
                                            option.icon;

                                        const selected =
                                            paymentMethod ===
                                            option.id;

                                        return (
                                            <button
                                                key={option.id}
                                                type="button"
                                                disabled={placingOrder}
                                                onClick={() =>
                                                    setPaymentMethod(
                                                        option.id
                                                    )
                                                }
                                                aria-pressed={
                                                    selected
                                                }
                                                className={[
                                                    'flex min-h-[145px] flex-col rounded-2xl border p-4 text-left transition-all',
                                                    selected
                                                        ? 'border-[var(--accent-gold)]/50 bg-[var(--accent-gold)]/10 shadow-[0_10px_30px_rgba(245,179,66,0.06)]'
                                                        : 'border-[var(--border-color)] bg-[var(--bg-elevated)] hover:border-[var(--accent-gold)]/25',
                                                    placingOrder
                                                        ? 'cursor-not-allowed opacity-60'
                                                        : '',
                                                ].join(' ')}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div
                                                        className={[
                                                            'flex h-10 w-10 items-center justify-center rounded-xl',
                                                            selected
                                                                ? 'bg-[var(--accent-gold)]/15 text-[var(--accent-gold)]'
                                                                : 'bg-[var(--bg-card)] text-[var(--text-muted)]',
                                                        ].join(' ')}
                                                    >
                                                        <Icon className="h-5 w-5" />
                                                    </div>

                                                    {selected && (
                                                        <CheckCircle2 className="h-5 w-5 text-[var(--accent-gold)]" />
                                                    )}
                                                </div>

                                                <div className="mt-4 text-sm font-bold text-[var(--text-primary)]">
                                                    {option.name}
                                                </div>

                                                <p className="mt-1 text-[10px] leading-5 text-[var(--text-secondary)]">
                                                    {option.description}
                                                </p>
                                            </button>
                                        );
                                    }
                                )}
                            </div>

                            <div className="mt-5 flex items-start gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4">
                                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />

                                <p className="text-[10px] leading-5 text-[var(--text-secondary)]">
                                    Card details are not collected or stored by this page. The existing payment integration is responsible for secure payment handling.
                                </p>
                            </div>
                        </section>

                        {/* Order items */}
                        <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-7">
                            <div className="mb-5 flex items-end justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)]">
                                        03
                                    </p>

                                    <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">
                                        Order Items
                                    </h2>
                                </div>

                                <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                                    {itemCount}{' '}
                                    {itemCount === 1
                                        ? 'item'
                                        : 'items'}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {cart.map((item) => {
                                    const menuItem =
                                        item.menuItem;

                                    const lineTotal =
                                        menuItem.price *
                                        item.quantity;

                                    return (
                                        <div
                                            key={menuItem.id}
                                            className="flex gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3"
                                        >
                                            <img
                                                src={menuItem.image}
                                                alt={menuItem.name}
                                                className="h-16 w-16 shrink-0 rounded-xl object-cover"
                                            />

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">
                                                            {menuItem.name}
                                                        </h3>

                                                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                                            Rs.{' '}
                                                            {menuItem.price.toLocaleString(
                                                                'en-PK'
                                                            )}{' '}
                                                            × {item.quantity}
                                                        </p>
                                                    </div>

                                                    <span className="shrink-0 text-sm font-black text-[var(--accent-gold)]">
                                                        Rs.{' '}
                                                        {lineTotal.toLocaleString(
                                                            'en-PK'
                                                        )}
                                                    </span>
                                                </div>

                                                {item.specialInstructions && (
                                                    <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                                                        Note:{' '}
                                                        {
                                                            item.specialInstructions
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    {/* Summary */}
                    <aside className="lg:sticky lg:top-[92px] lg:h-fit">
                        <div className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)] sm:p-6">
                            <div className="flex items-center gap-2">
                                <ReceiptText className="h-5 w-5 text-[var(--accent-gold)]" />

                                <h2 className="text-lg font-black text-[var(--text-primary)]">
                                    Order Summary
                                </h2>
                            </div>

                            <div className="mt-5 space-y-3">
                                <div className="flex items-center justify-between text-sm">
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

                                <div className="flex items-center justify-between text-sm">
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

                                <div className="flex items-center justify-between text-sm">
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

                                <div className="my-4 border-t border-dashed border-[var(--border-color)]" />

                                <div className="flex items-end justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                            Grand Total
                                        </p>

                                        <p className="mt-1 text-2xl font-black text-[var(--accent-gold)]">
                                            Rs.{' '}
                                            {grandTotal.toLocaleString(
                                                'en-PK'
                                            )}
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-[var(--accent-gold)]/10 px-3 py-2 text-center">
                                        <div className="text-[8px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                                            Table
                                        </div>

                                        <div className="mt-1 text-sm font-black text-[var(--text-primary)]">
                                            {formattedTable}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={placingOrder}
                                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-orange)] text-sm font-black text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {placingOrder ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Sending Order...
                                    </>
                                ) : (
                                    <>
                                        Place Order
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>

                            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] leading-5 text-[var(--text-muted)]">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Secure order submission
                            </p>
                        </div>
                    </aside>
                </form>
            </div>
        </CustomerLayout>
    );
}