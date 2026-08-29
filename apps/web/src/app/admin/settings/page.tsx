'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  Building2,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Percent,
  Clock,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { RestaurantSettings, UpdateSettingsInput, UserRole } from '@qr-menu/shared';

export default function AdminSettingsPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formLogo, setFormLogo] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCurrency, setFormCurrency] = useState('PKR');
  const [formTaxRate, setFormTaxRate] = useState<number>(0);
  const [formServiceCharge, setFormServiceCharge] = useState<number>(0);
  const [formIsOpen, setFormIsOpen] = useState(true);
  const [formOpeningHours, setFormOpeningHours] = useState('');

  const fetchSettings = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const data = await adminService.getSettings(restaurantId, token);
      setSettings(data);
      // Populate form
      setFormName(data.name || '');
      setFormLogo(data.logo || '');
      setFormAddress(data.address || '');
      setFormPhone(data.phone || '');
      setFormEmail(data.email || '');
      setFormCurrency(data.currency || 'PKR');
      setFormTaxRate(data.taxRate ?? 0);
      setFormServiceCharge(data.serviceCharge ?? 0);
      setFormIsOpen(data.isOpen ?? true);
      setFormOpeningHours(data.openingHours || '');
    } catch (err) {
      console.warn('[AdminSettings] Failed to fetch settings', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [restaurantId, token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const payload: UpdateSettingsInput = {
        name: formName,
        logo: formLogo || undefined,
        address: formAddress || undefined,
        phone: formPhone || undefined,
        email: formEmail || undefined,
        currency: formCurrency,
        taxRate: formTaxRate,
        serviceCharge: formServiceCharge,
        isOpen: formIsOpen,
        openingHours: formOpeningHours || undefined,
      };
      await adminService.updateSettings({ ...payload, restaurantId } as any, token);
      setSaveMessage({ type: 'success', text: 'Settings saved successfully.' });
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err?.message || 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout
      title="Restaurant Settings"
      subtitle="Profile, Operating Hours, Tax & Service Configuration"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}
      onRefresh={fetchSettings}
      isRefreshing={refreshing}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
          {/* ── Save Status ── */}
          {saveMessage && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-semibold border ${
                saveMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {saveMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {saveMessage.text}
            </div>
          )}

          {/* ── Restaurant Profile ── */}
          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Restaurant Profile</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Restaurant Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Logo URL</label>
                <input
                  type="text"
                  value={formLogo}
                  onChange={(e) => setFormLogo(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 mb-1">
                  <MapPin className="w-3 h-3" /> Address
                </label>
                <textarea
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 mb-1">
                    <Phone className="w-3 h-3" /> Phone
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+92-300-1234567"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 mb-1">
                    <Mail className="w-3 h-3" /> Email
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="info@restaurant.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Financial Configuration ── */}
          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Financial Configuration</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 mb-1">
                    <Globe className="w-3 h-3" /> Currency
                  </label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  >
                    <option value="PKR">PKR (₨)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="SAR">SAR (﷼)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 mb-1">
                    <Percent className="w-3 h-3" /> Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={formTaxRate}
                    onChange={(e) => setFormTaxRate(Number(e.target.value))}
                    min={0}
                    max={100}
                    step={0.5}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 mb-1">
                    <DollarSign className="w-3 h-3" /> Service Charge
                  </label>
                  <input
                    type="number"
                    value={formServiceCharge}
                    onChange={(e) => setFormServiceCharge(Number(e.target.value))}
                    min={0}
                    step={1}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Operating Status ── */}
          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Operating Status</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Restaurant Open/Closed</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formIsOpen
                      ? 'Restaurant is currently accepting orders.'
                      : 'Restaurant is closed. Customers cannot place new orders.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsOpen(!formIsOpen)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    formIsOpen ? 'bg-emerald-500' : 'bg-slate-300'
                  } relative`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                      formIsOpen ? 'left-6' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Opening Hours
                </label>
                <textarea
                  value={formOpeningHours}
                  onChange={(e) => setFormOpeningHours(e.target.value)}
                  rows={3}
                  placeholder={'Mon-Fri: 11:00 AM - 11:00 PM\nSat-Sun: 10:00 AM - 12:00 AM'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none resize-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* ── Metadata ── */}
          {settings && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-5 py-3">
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>
                  Slug: <strong className="text-slate-600 font-mono">{settings.slug}</strong>
                </span>
                <span>|</span>
                <span>
                  Created: {new Date(settings.createdAt).toLocaleDateString()}
                </span>
                <span>|</span>
                <span>
                  Updated: {new Date(settings.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* ── Save Button ── */}
          <div className="flex items-center justify-end gap-3 pb-4">
            <button
              type="button"
              onClick={fetchSettings}
              className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition"
            >
              Reset Changes
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 disabled:opacity-50 transition"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </AdminLayout>
  );
}
