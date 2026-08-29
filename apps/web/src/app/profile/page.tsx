'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Globe2,
  Heart,
  LogOut,
  Moon,
  ReceiptText,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react';

import CustomerLayout from '../../components/customer/CustomerLayout';
import { useThemeContext } from '../../context/ThemeContext';

type Language = 'en' | 'ur';

export default function ProfilePage() {
  const { theme, toggleTheme } = useThemeContext();

  const [language, setLanguage] = useState<Language>('en');
  const [notifications, setNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  const languageLabel = useMemo(() => {
    return language === 'en' ? 'English' : 'Urdu';
  }, [language]);

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('silver_sapoon_language', language);
      localStorage.setItem('silver_sapoon_notifications', String(notifications));
    }

    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 1800);
  };

  const handleLanguageChange = (value: Language) => {
    setLanguage(value);
  };

  return (
    <CustomerLayout>
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--accent-gold)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Menu
          </Link>

          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
              Silver Sapoon
            </p>

            <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
              Profile & Preferences
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Manage your customer preferences for a smoother dining experience.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Main */}
          <div className="space-y-6">
            {/* Profile card */}
            <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)] sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-[var(--accent-gold)]/25 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]">
                  <User className="h-9 w-9" />
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Customer
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-[var(--text-primary)]">
                    Silver Sapoon Guest
                  </h2>

                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Your dining preferences are kept locally on this device.
                  </p>
                </div>
              </div>
            </section>

            {/* Appearance */}
            <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)] sm:p-7">
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)]">
                  Appearance
                </p>

                <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">
                  Theme
                </h2>

                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Choose how Silver Sapoon looks on your device.
                </p>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 text-left transition hover:border-[var(--accent-gold)]/25"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]">
                    {theme === 'dark' ? (
                      <Moon className="h-5 w-5" />
                    ) : (
                      <Sun className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">
                      {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </div>

                    <div className="mt-1 text-xs text-[var(--text-secondary)]">
                      Tap to switch theme
                    </div>
                  </div>
                </div>

                <div className="rounded-full border border-[var(--accent-gold)]/20 bg-[var(--accent-gold)]/10 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--accent-gold)]">
                  Active
                </div>
              </button>
            </section>

            {/* Language */}
            <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)] sm:p-7">
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)]">
                  Language
                </p>

                <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">
                  Interface Language
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                    language === 'en'
                      ? 'border-[var(--accent-gold)]/45 bg-[var(--accent-gold)]/10'
                      : 'border-[var(--border-color)] bg-[var(--bg-elevated)] hover:border-[var(--accent-gold)]/25'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-card)]">
                      <Globe2 className="h-5 w-5 text-[var(--accent-gold)]" />
                    </div>

                    <div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        English
                      </div>

                      <div className="mt-1 text-xs text-[var(--text-secondary)]">
                        Default
                      </div>
                    </div>
                  </div>

                  {language === 'en' && (
                    <CheckCircle2 className="h-5 w-5 text-[var(--accent-gold)]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleLanguageChange('ur')}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                    language === 'ur'
                      ? 'border-[var(--accent-gold)]/45 bg-[var(--accent-gold)]/10'
                      : 'border-[var(--border-color)] bg-[var(--bg-elevated)] hover:border-[var(--accent-gold)]/25'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-card)]">
                      <Globe2 className="h-5 w-5 text-[var(--accent-gold)]" />
                    </div>

                    <div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        Urdu
                      </div>

                      <div className="mt-1 text-xs text-[var(--text-secondary)]">
                        Interface language
                      </div>
                    </div>
                  </div>

                  {language === 'ur' && (
                    <CheckCircle2 className="h-5 w-5 text-[var(--accent-gold)]" />
                  )}
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Globe2 className="h-4 w-4 text-[var(--accent-gold)]" />
                Current language:
                <span className="font-bold text-[var(--text-primary)]">
                  {languageLabel}
                </span>
              </div>
            </section>

            {/* Notifications */}
            <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)] sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]">
                    <Bell className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-base font-black text-[var(--text-primary)]">
                      Order Notifications
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                      Receive in-app notifications when your order status changes.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setNotifications((current) => !current)}
                  aria-pressed={notifications}
                  aria-label="Toggle order notifications"
                  className={`relative h-7 w-12 rounded-full border transition ${
                    notifications
                      ? 'border-[var(--accent-gold)]/50 bg-[var(--accent-gold)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-elevated)]'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </section>

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-orange)] text-sm font-black text-black shadow-lg transition hover:brightness-105 active:scale-[0.99]"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Preferences Saved
                </>
              ) : (
                <>
                  Save Preferences
                </>
              )}
            </button>
          </div>

          {/* Side */}
          <aside className="space-y-6">
            {/* Quick links */}
            <div className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]">
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)]">
                  Quick Access
                </p>

                <h2 className="mt-1 text-lg font-black text-[var(--text-primary)]">
                  Your Account
                </h2>
              </div>

              <div className="space-y-2">
                <Link
                  href="/orders/history"
                  className="flex items-center gap-3 rounded-xl border border-transparent bg-[var(--bg-elevated)] px-3.5 py-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-color)] hover:text-[var(--text-primary)]"
                >
                  <ReceiptText className="h-4 w-4 text-[var(--accent-gold)]" />
                  Order History
                </Link>

                <Link
                  href="/orders/track"
                  className="flex items-center gap-3 rounded-xl border border-transparent bg-[var(--bg-elevated)] px-3.5 py-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-color)] hover:text-[var(--text-primary)]"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Track Current Order
                </Link>

                <Link
                  href="/"
                  className="flex items-center gap-3 rounded-xl border border-transparent bg-[var(--bg-elevated)] px-3.5 py-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-color)] hover:text-[var(--text-primary)]"
                >
                  <Heart className="h-4 w-4 text-red-400" />
                  Browse Menu
                </Link>
              </div>
            </div>

            {/* Security/info */}
            <div className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />

                <h2 className="text-sm font-black text-[var(--text-primary)]">
                  Privacy
                </h2>
              </div>

              <p className="mt-3 text-xs leading-6 text-[var(--text-secondary)]">
                Preference settings are stored locally on this device. No raw payment information is stored in the customer profile.
              </p>
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('silver_sapoon_cart');
                  localStorage.removeItem('silver_sapoon_favorites');
                  window.location.href = '/';
                }
              }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-bold text-red-400 transition hover:bg-red-500/15"
            >
              <LogOut className="h-4 w-4" />
              Reset Guest Session
            </button>
          </aside>
        </div>
      </div>
    </CustomerLayout>
  );
}
