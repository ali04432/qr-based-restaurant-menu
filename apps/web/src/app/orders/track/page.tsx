'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    Loader2,
    MapPin,
    ReceiptText,
    RefreshCw,
    ShoppingBag,
    CircleAlert,
} from 'lucide-react';

import CustomerLayout from '../../../components/customer/CustomerLayout';
import { orderService } from '../../../services/order.service';
import { useSocket } from '../../../hooks/useSocket';
import { MessageSquare, Sparkles } from 'lucide-react';

import type {
    Order,
    OrderStatus,
} from '@qr-menu/shared';


const STATUS_STEPS: Array<{
    label: string;
    statuses: OrderStatus[];
    description: string;
}> = [
        {
            label: 'Received',
            statuses: ['PENDING', 'RECEIVED', 'NEW'],
            description: 'Your order has been received by the restaurant.',
        },
        {
            label: 'Preparing',
            statuses: ['IN_KITCHEN', 'COOKING', 'PREPARING'],
            description: 'The kitchen is preparing your order.',
        },
        {
            label: 'Ready',
            statuses: ['READY'],
            description: 'Your order is ready.',
        },
        {
            label: 'Served',
            statuses: ['SERVED', 'COMPLETED'],
            description: 'Your order has been served.',
        },
    ];

function getStepIndex(status: OrderStatus) {
    const index = STATUS_STEPS.findIndex((step) =>
        step.statuses.includes(status)
    );

    return index >= 0 ? index : 0;
}

function getStatusLabel(status: OrderStatus) {
    switch (status) {
        case 'IN_KITCHEN':
            return 'In Kitchen';
        case 'COOKING':
            return 'Cooking';
        case 'PREPARING':
            return 'Preparing';
        case 'COMPLETED':
            return 'Completed';
        case 'CANCELLED':
            return 'Cancelled';
        default:
            return status.replace(/_/g, ' ');
    }
}

export default function OrderTrackingPage() {
    const searchParams = useSearchParams();

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const orderId =
        searchParams.get('orderId') ||
        (typeof window !== 'undefined'
            ? sessionStorage.getItem(
                'silver_sapoon_last_order_id'
            )
            : null);

    const loadOrder = useCallback(
        async (showRefreshState = false) => {
            if (!orderId) {
                setLoading(false);
                setError(
                    'No order was selected for tracking.'
                );
                return;
            }

            if (showRefreshState) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError('');

            try {
                const result =
                    await orderService.getOrder(
                        orderId
                    );

                if (!result) {
                    setError(
                        'We could not find this order. It may have expired or is no longer available.'
                    );
                    setOrder(null);
                    return;
                }

                setOrder(result);

                if (
                    typeof window !== 'undefined'
                ) {
                    sessionStorage.setItem(
                        'silver_sapoon_last_order_id',
                        result.id
                    );
                }
            } catch (requestError) {
                console.error(
                    '[OrderTracking] Failed to load order:',
                    requestError
                );

                setError(
                    'Unable to load the order right now. Please try again.'
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [orderId]
    );

    const { socket } = useSocket({
        restaurantId: order?.restaurantId,
        enabled: true,
    });

    useEffect(() => {
        if (!socket || !orderId) return;

        const handleOrderUpdate = (updatedOrder: any) => {
            if (
                updatedOrder &&
                (updatedOrder.id === orderId ||
                    updatedOrder.orderId === orderId)
            ) {
                const nextStatus =
                    updatedOrder.status || updatedOrder.orderStatus;
                if (nextStatus) {
                    setOrder((prev) =>
                        prev ? { ...prev, status: nextStatus } : prev
                    );
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

    if (loading) {

        return (
            <CustomerLayout>
                <div className="flex min-h-[70vh] items-center justify-center px-4">
                    <div className="text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                            <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-gold)]" />
                        </div>

                        <h1 className="mt-5 text-lg font-black text-[var(--text-primary)]">
                            Loading your order
                        </h1>

                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            Please wait while we fetch the latest status.
                        </p>
                    </div>
                </div>
            </CustomerLayout>
        );
    }

    if (error || !order) {
        return (
            <CustomerLayout>
                <div className="mx-auto flex min-h-[75vh] max-w-2xl items-center justify-center px-4 py-10">
                    <div className="w-full rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
                            <CircleAlert className="h-7 w-7 text-red-400" />
                        </div>

                        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                            Order Tracking
                        </p>

                        <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                            Unable to load order
                        </h1>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                            {error ||
                                'No order information is currently available.'}
                        </p>

                        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                            {orderId && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        void loadOrder()
                                    }
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent-gold)] px-5 text-sm font-bold text-black transition hover:brightness-105"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Try Again
                                </button>
                            )}

                            <Link
                                href="/menu"
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-5 text-sm font-bold text-[var(--text-secondary)] transition hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)]"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Menu
                            </Link>
                        </div>
                    </div>
                </div>
            </CustomerLayout>
        );
    }

    const currentStep = getStepIndex(
        order.status
    );

    const isCancelled =
        order.status === 'CANCELLED';

    return (
        <CustomerLayout>
            <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-5 sm:px-6 sm:pt-7 lg:px-8">
                {/* Header */}
                <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Link
                            href="/orders"
                            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--accent-gold)]"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Order History
                        </Link>

                        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                            Live Order Tracking
                        </p>

                        <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
                            Order #{order.id.slice(-8).toUpperCase()}
                        </h1>

                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            {isCancelled
                                ? 'This order has been cancelled.'
                                : 'Your order status updates automatically.'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            void loadOrder(true)
                        }
                        disabled={refreshing}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 text-xs font-bold text-[var(--text-secondary)] transition hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)] disabled:opacity-50"
                    >
                        <RefreshCw
                            className={[
                                'h-4 w-4',
                                refreshing
                                    ? 'animate-spin'
                                    : '',
                            ].join(' ')}
                        />
                        Refresh
                    </button>
                </div>

                {/* Status banner */}
                <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)] sm:p-7">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                Current Status
                            </div>

                            <div className="mt-2 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]">
                                    {isCancelled ? (
                                        <CircleAlert className="h-5 w-5" />
                                    ) : (
                                        <ShoppingBag className="h-5 w-5" />
                                    )}
                                </div>

                                <div>
                                    <h2 className="text-xl font-black text-[var(--text-primary)]">
                                        {getStatusLabel(
                                            order.status
                                        )}
                                    </h2>

                                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                        {isCancelled
                                            ? 'Please contact restaurant staff if you need assistance.'
                                            : STATUS_STEPS[
                                                currentStep
                                            ]?.description}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
                            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4">
                                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                                    <MapPin className="h-3.5 w-3.5" />
                                    Table
                                </div>

                                <div className="mt-2 text-sm font-black text-[var(--text-primary)]">
                                    {order.tableNumber}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4">
                                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                                    <ReceiptText className="h-3.5 w-3.5" />
                                    Total
                                </div>

                                <div className="mt-2 text-sm font-black text-[var(--accent-gold)]">
                                    Rs.{' '}
                                    {order.total.toLocaleString(
                                        'en-PK'
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Timeline */}
                <section className="mt-6 rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-7">
                    <div className="mb-7">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)]">
                            Progress
                        </p>

                        <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">
                            Order Timeline
                        </h2>
                    </div>

                    {isCancelled ? (
                        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-red-400">
                                <CircleAlert className="h-4 w-4" />
                                Order Cancelled
                            </div>

                            <p className="mt-1 text-xs text-red-300/80">
                                The restaurant marked this order as cancelled.
                            </p>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="absolute left-[22px] top-6 hidden h-[calc(100%-48px)] w-px bg-[var(--border-color)] md:block" />

                            <div className="space-y-5">
                                {STATUS_STEPS.map(
                                    (step, index) => {
                                        const complete =
                                            index <= currentStep;

                                        const current =
                                            index === currentStep;

                                        return (
                                            <div
                                                key={step.label}
                                                className="relative flex items-start gap-4"
                                            >
                                                <div
                                                    className={[
                                                        'relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border',
                                                        complete
                                                            ? 'border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]'
                                                            : 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-muted)]',
                                                    ].join(' ')}
                                                >
                                                    {complete ? (
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    ) : (
                                                        <Clock3 className="h-5 w-5" />
                                                    )}
                                                </div>

                                                <div className="flex-1 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4">
                                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                                        <h3
                                                            className={[
                                                                'text-sm font-black',
                                                                complete
                                                                    ? 'text-[var(--text-primary)]'
                                                                    : 'text-[var(--text-muted)]',
                                                            ].join(' ')}
                                                        >
                                                            {step.label}
                                                        </h3>

                                                        {current && (
                                                            <span className="w-fit rounded-full border border-[var(--accent-gold)]/20 bg-[var(--accent-gold)]/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--accent-gold)]">
                                                                Current
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                                                        {step.description}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        </div>
                    )}
                </section>

                {/* Order details */}
                <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
                    <div className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-7">
                        <div className="mb-5 flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5 text-[var(--accent-gold)]" />

                            <h2 className="text-xl font-black text-[var(--text-primary)]">
                                Items
                            </h2>
                        </div>

                        <div className="space-y-3">
                            {order.items.map(
                                (item, index) => (
                                    <div
                                        key={`${item.menuItemId}-${index}`}
                                        className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-[var(--text-primary)]">
                                                {item.name}
                                            </div>

                                            <div className="mt-1 text-xs text-[var(--text-secondary)]">
                                                Rs.{' '}
                                                {item.price.toLocaleString(
                                                    'en-PK'
                                                )}{' '}
                                                × {item.quantity}
                                            </div>

                                            {item.specialInstructions && (
                                                <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                                                    Note:{' '}
                                                    {
                                                        item.specialInstructions
                                                    }
                                                </div>
                                            )}
                                        </div>

                                        <div className="shrink-0 text-sm font-black text-[var(--accent-gold)]">
                                            Rs.{' '}
                                            {(
                                                item.price *
                                                item.quantity
                                            ).toLocaleString(
                                                'en-PK'
                                            )}
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="h-fit rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-7">
                        <div className="flex items-center gap-2">
                            <ReceiptText className="h-5 w-5 text-[var(--accent-gold)]" />

                            <h2 className="text-xl font-black text-[var(--text-primary)]">
                                Summary
                            </h2>
                        </div>

                        <div className="mt-5 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[var(--text-secondary)]">
                                    Subtotal
                                </span>

                                <span className="font-semibold text-[var(--text-primary)]">
                                    Rs.{' '}
                                    {order.subtotal.toLocaleString(
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
                                    {order.tax.toLocaleString(
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
                                    {order.serviceCharge.toLocaleString(
                                        'en-PK'
                                    )}
                                </span>
                            </div>

                            <div className="my-4 border-t border-dashed border-[var(--border-color)]" />

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-[var(--text-primary)]">
                                    Total
                                </span>

                                <span className="text-xl font-black text-[var(--accent-gold)]">
                                    Rs.{' '}
                                    {order.total.toLocaleString(
                                        'en-PK'
                                    )}
                                </span>
                            </div>
                        </div>

                        <div className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4">
                            <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                                Payment
                            </div>

                            <div className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                                {order.paymentMethod ||
                                    'Not specified'}
                            </div>

                            <div className="mt-1 text-[10px] text-[var(--text-secondary)]">
                                Payment status:{' '}
                                {order.paymentStatus}
                            </div>
                        </div>

                        <div className="mt-5">
                            <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                                Estimated Status
                            </div>

                            <div className="mt-1 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                                <Clock3 className="h-4 w-4 text-[var(--accent-gold)]" />

                                {isCancelled
                                    ? 'Order cancelled'
                                    : order.status === 'READY'
                                        ? 'Ready now'
                                        : order.status === 'SERVED'
                                            ? 'Served & Complete'
                                            : 'Kitchen is working on your order'}
                            </div>
                        </div>

                        {/* Customer Action CTAs */}
                        <div className="mt-6 space-y-2.5 pt-5 border-t border-[var(--border-color)]">
                            <Link
                                href={`/feedback?orderId=${encodeURIComponent(
                                    order.id
                                )}`}
                                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-orange)] text-xs font-black text-black shadow-lg transition hover:brightness-105"
                            >
                                <MessageSquare className="h-4 w-4" />
                                Leave Dining Feedback
                            </Link>

                            <Link
                                href="/orders/history"
                                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-xs font-bold text-[var(--text-secondary)] transition hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)]"
                            >
                                <Sparkles className="h-4 w-4" />
                                View Order History
                            </Link>

                            <Link
                                href="/"
                                className="flex h-10 w-full items-center justify-center text-xs text-[var(--text-muted)] transition hover:text-white"
                            >
                                Back to Menu
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </CustomerLayout>
    );

}