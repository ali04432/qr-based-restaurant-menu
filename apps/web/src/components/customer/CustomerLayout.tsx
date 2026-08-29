'use client';

import React from 'react';

import CustomerHeader from './CustomerHeader';
import CustomerSidebar from './CustomerSidebar';
import FloatingAIAssistant from './FloatingAIAssistant';
import CartDrawer from './CartDrawer';

interface CustomerLayoutProps {
    children: React.ReactNode;
    onSearch?: (query: string) => void;
}

export default function CustomerLayout({
    children,
    onSearch,
}: CustomerLayoutProps) {
    return (
        <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
            {/* Global customer sidebar */}
            <CustomerSidebar />

            {/* Main customer area */}
            <div className="min-h-screen lg:pl-[280px]">
                {/* Global header */}
                <CustomerHeader onSearch={onSearch} />

                {/* Page content */}
                <main className="min-h-[calc(100vh-72px)] w-full">
                    {children}
                </main>
            </div>

            {/* Global floating AI */}
            <FloatingAIAssistant />

            {/* Global cart drawer */}
            <CartDrawer />
        </div>
    );
}