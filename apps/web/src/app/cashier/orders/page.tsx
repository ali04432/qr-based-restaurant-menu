'use client';

import React from 'react';
import CashierDashboardPage from '../page';

/**
 * PAGE 2 — BILLING (/cashier/orders)
 * Reuses the Cashier POS Register two-column layout:
 * - Orders/Bills queue on Left
 * - Itemized Order Summary, Totals, and Settlement on Right
 * - Preserves reprint receipt functionality
 */
export default function CashierBillingPage() {
  return <CashierDashboardPage />;
}
