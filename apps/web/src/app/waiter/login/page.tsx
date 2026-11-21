'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight, Loader2, Utensils } from 'lucide-react';
import { useAuthContext } from '../../../context/AuthContext';
import { UserRole } from '@qr-menu/shared';

// ============================================================
// Silver Sapoon — Dedicated Common Waiter Login Portal
// Palette: #0B0B0D bg, #151518 card, #D6A84F gold accent
// ============================================================

export default function WaiterLoginPage() {
  const router = useRouter();
  const { login } = useAuthContext();

  const [email, setEmail] = useState('waiter@silverspoon.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both your staff email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email, password });
      router.push('/waiter');
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed. Please verify your email and password.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center px-4 py-12"
      style={{ background: '#0B0B0D' }}
    >
      {/* Background radial glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none blur-3xl opacity-10"
        style={{ background: '#D6A84F' }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(214,168,79,0.2) 0%, rgba(214,168,79,0.05) 100%)',
              border: '1px solid rgba(214,168,79,0.3)',
            }}
          >
            <Utensils className="w-7 h-7" style={{ color: '#D6A84F' }} />
          </div>

          <h1
            className="text-2xl font-bold tracking-wide"
            style={{ color: '#D6A84F', fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            Silver Sapoon
          </h1>
          <p className="text-xs mt-1" style={{ color: '#A39F96' }}>
            Staff Access · Waiter & Service Operations
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-7 shadow-2xl backdrop-blur-xl"
          style={{ background: '#151518', border: '1px solid #26262B' }}
        >
          {error && (
            <div
              className="mb-5 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs animate-shake"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#F87171',
              }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Credential Helper for Testing / Evaluation */}
          <div className="mb-5 p-3 rounded-2xl" style={{ background: '#1D1D21', border: '1px solid #26262B' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#A39F96' }}>
              Test Staff Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('waiter@silverspoon.com');
                  setPassword('admin123');
                }}
                className="px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors hover:bg-[#26262B]"
                style={{
                  background: email === 'waiter@silverspoon.com' ? 'rgba(214,168,79,0.15)' : '#151518',
                  border: `1px solid ${email === 'waiter@silverspoon.com' ? '#D6A84F' : '#26262B'}`,
                  color: email === 'waiter@silverspoon.com' ? '#D6A84F' : '#F4EFE6',
                }}
              >
                <div className="font-semibold truncate">Lead Waiter</div>
                <div className="text-[10px] truncate" style={{ color: '#A39F96' }}>
                  waiter@silverspoon.com
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('admin@silverspoon.com');
                  setPassword('admin123');
                }}
                className="px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors hover:bg-[#26262B]"
                style={{
                  background: email === 'admin@silverspoon.com' ? 'rgba(214,168,79,0.15)' : '#151518',
                  border: `1px solid ${email === 'admin@silverspoon.com' ? '#D6A84F' : '#26262B'}`,
                  color: email === 'admin@silverspoon.com' ? '#D6A84F' : '#F4EFE6',
                }}
              >
                <div className="font-semibold truncate">Manager/Admin</div>
                <div className="text-[10px] truncate" style={{ color: '#A39F96' }}>
                  admin@silverspoon.com
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#F4EFE6' }}>
                Staff Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4" style={{ color: '#A39F96' }} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs transition-all focus:outline-none"
                  style={{
                    background: '#0B0B0D',
                    border: '1px solid #26262B',
                    color: '#F4EFE6',
                  }}
                  placeholder="waiter@restaurant.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#F4EFE6' }}>
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4" style={{ color: '#A39F96' }} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs transition-all focus:outline-none"
                  style={{
                    background: '#0B0B0D',
                    border: '1px solid #26262B',
                    color: '#F4EFE6',
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center"
                  style={{ color: '#A39F96' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 mt-2"
              style={{
                background: '#D6A84F',
                color: '#0B0B0D',
                boxShadow: '0 4px 20px rgba(214,168,79,0.25)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In to Waiter Panel</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-5 border-t border-[#26262B] text-center">
            <p className="text-[11px]" style={{ color: '#A39F96' }}>
              Single Centralized Backend · Authorized Multi-Waiter Accounts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
