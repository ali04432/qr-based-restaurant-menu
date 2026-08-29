'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plug,
  MessageSquare,
  Smartphone,
  Mail,
  Printer,
  FileSpreadsheet,
  Truck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Download,
  Sliders,
  Eye,
  Shield,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import {
  IntegrationConfig,
  IntegrationTestResult,
  ProviderType,
  UserRole,
} from '@qr-menu/shared';

interface ProviderCardProps {
  id: ProviderType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultName: string;
  fields: Array<{ key: string; label: string; type: 'text' | 'password' | 'select' | 'number'; options?: string[]; placeholder?: string }>;
}

const PROVIDERS: ProviderCardProps[] = [
  {
    id: 'WHATSAPP',
    title: 'WhatsApp Cloud API',
    description: 'Automated order confirmation, live preparation updates, digital bills & loyalty alerts via Meta Graph API.',
    icon: MessageSquare,
    defaultName: 'Meta WhatsApp Cloud',
    fields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', placeholder: 'e.g. 104829104819' },
      { key: 'apiKey', label: 'Permanent Access Token', type: 'password', placeholder: 'EAAB...' },
      { key: 'wabaId', label: 'WhatsApp Business Account ID', type: 'text', placeholder: 'e.g. 29482019482' },
    ],
  },
  {
    id: 'SMS',
    title: 'SMS Gateway Provider',
    description: 'Immediate SMS notifications for table assignments, OTP verification and kitchen status changes.',
    icon: Smartphone,
    defaultName: 'Telco SMS Gateway',
    fields: [
      { key: 'senderId', label: 'Brand Sender Mask', type: 'text', placeholder: 'e.g. SAPOON' },
      { key: 'providerUrl', label: 'Gateway Endpoint URL', type: 'text', placeholder: 'https://api.sms-gateway.com/v1/send' },
      { key: 'apiKey', label: 'API Key / Secret', type: 'password', placeholder: 'sk_live_...' },
    ],
  },
  {
    id: 'EMAIL',
    title: 'Transactional Email (SMTP)',
    description: 'Formatted HTML dining invoices, daily manager shift summaries & automated weekly profit reports.',
    icon: Mail,
    defaultName: 'SMTP Mail Server',
    fields: [
      { key: 'smtpHost', label: 'SMTP Host', type: 'text', placeholder: 'smtp.sendgrid.net or smtp.gmail.com' },
      { key: 'smtpPort', label: 'SMTP Port', type: 'number', placeholder: '587' },
      { key: 'smtpUser', label: 'SMTP Username', type: 'text', placeholder: 'apikey or receipts@silversapoon.com' },
      { key: 'smtpPass', label: 'SMTP Password / API Key', type: 'password', placeholder: '••••••••' },
      { key: 'fromEmail', label: 'Sender From Address', type: 'text', placeholder: 'receipts@silversapoon.com' },
    ],
  },
  {
    id: 'THERMAL_PRINTER',
    title: 'ESC/POS Thermal Printers',
    description: 'Network IP & USB thermal receipt printer dispatcher for kitchen order tickets (KOT) & customer billing.',
    icon: Printer,
    defaultName: 'Epson / Star ESC/POS',
    fields: [
      { key: 'ipAddress', label: 'Printer IP Address', type: 'text', placeholder: '192.168.1.200 (or 127.0.0.1 for USB)' },
      { key: 'port', label: 'Raw TCP Port', type: 'number', placeholder: '9100' },
      { key: 'paperWidth', label: 'Paper Roll Width', type: 'select', options: ['80mm', '58mm'] },
    ],
  },
  {
    id: 'ACCOUNTING',
    title: 'Accounting & General Ledger',
    description: 'Automatic double-entry journal balance sync and CSV exports formatted for QuickBooks, Xero & ERPs.',
    icon: FileSpreadsheet,
    defaultName: 'QuickBooks / Standard GL',
    fields: [
      { key: 'provider', label: 'Accounting Platform', type: 'select', options: ['EXCEL_CSV', 'QUICKBOOKS', 'XERO'] },
      { key: 'companyId', label: 'Company / Realm ID', type: 'text', placeholder: 'e.g. 9130350294829' },
      { key: 'apiKey', label: 'OAuth API Key', type: 'password', placeholder: 'sk_acc_...' },
    ],
  },
  {
    id: 'DELIVERY',
    title: 'Delivery & Rider Dispatch',
    description: 'Third-party courier and in-house fleet dispatcher with live tracking links and customer ETA calculations.',
    icon: Truck,
    defaultName: 'In-House Fleet / Delivery API',
    fields: [
      { key: 'fleetType', label: 'Fleet Integration', type: 'select', options: ['IN_HOUSE_RIDERS', 'DELIVERY_HERO_API', 'UBER_DIRECT'] },
      { key: 'apiKey', label: 'Merchant API Key', type: 'password', placeholder: 'sk_del_...' },
    ],
  },
];

export default function AdminIntegrationsPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [configs, setConfigs] = useState<Record<string, IntegrationConfig>>({});
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // Test Result Modal
  const [testResult, setTestResult] = useState<IntegrationTestResult | null>(null);
  const [testRecipient, setTestRecipient] = useState('+92 300 1234567');

  const fetchConfigs = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const list = await adminService.getIntegrations(restaurantId, token);
      const configMap: Record<string, IntegrationConfig> = {};
      const initialForm: Record<string, Record<string, any>> = {};

      list.forEach((c) => {
        configMap[c.providerType] = c;
        try {
          initialForm[c.providerType] = JSON.parse(c.configJson);
        } catch {
          initialForm[c.providerType] = {};
        }
      });

      setConfigs(configMap);
      setFormData(initialForm);
    } catch (err) {
      console.warn('[AdminIntegrations] Failed to load integration configs', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, token]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleFieldChange = (providerId: string, key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [providerId]: {
        ...(prev[providerId] || {}),
        [key]: value,
      },
    }));
  };

  const handleSaveConfig = async (providerId: ProviderType, defaultName: string) => {
    if (!token) return;
    setSavingProvider(providerId);
    try {
      const isEnabled = configs[providerId]?.isEnabled !== undefined ? configs[providerId].isEnabled : true;
      const jsonStr = JSON.stringify(formData[providerId] || {});

      await adminService.saveIntegration(
        {
          restaurantId,
          providerType: providerId,
          providerName: configs[providerId]?.providerName || defaultName,
          isEnabled,
          configJson: jsonStr,
        },
        token
      );
      fetchConfigs();
    } catch (err: any) {
      alert(err.message || 'Failed to save integration config');
    } finally {
      setSavingProvider(null);
    }
  };

  const handleToggleEnabled = async (providerId: ProviderType, defaultName: string) => {
    if (!token) return;
    const current = configs[providerId];
    const newStatus = current ? !current.isEnabled : true;

    try {
      await adminService.saveIntegration(
        {
          restaurantId,
          providerType: providerId,
          providerName: current?.providerName || defaultName,
          isEnabled: newStatus,
          configJson: JSON.stringify(formData[providerId] || {}),
        },
        token
      );
      fetchConfigs();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleTestProvider = async (providerId: ProviderType) => {
    if (!token) return;
    setTestingProvider(providerId);
    try {
      const res = await adminService.testIntegration(restaurantId, providerId, testRecipient, token);
      setTestResult(res);
      fetchConfigs();
    } catch (err: any) {
      setTestResult({
        success: false,
        provider: providerId,
        message: err.message || 'Test dispatch failed',
      });
    } finally {
      setTestingProvider(null);
    }
  };

  const handleDownloadLedger = () => {
    const url = `/api/admin/integrations/accounting/export?restaurantId=${restaurantId}`;
    window.open(url, '_blank');
  };

  return (
    <AdminLayout
      title="Hardware & Multi-Provider Integrations"
      subtitle="WhatsApp, SMS, SMTP Email, ESC/POS Thermal Printing, Accounting Sync & Delivery"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}
      onRefresh={fetchConfigs}
      isRefreshing={refreshing}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Operational Status Banner */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-md bg-slate-900 text-white shrink-0">
                <Plug className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Enterprise Integration Hub
                </h2>
                <p className="text-xs text-slate-500">
                  Every provider operates with real external APIs, ESC/POS raw TCP network sockets, or live sandbox emulation.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadLedger}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Export General Ledger CSV
              </button>
            </div>
          </div>

          {/* Provider Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {PROVIDERS.map((provider) => {
              const Icon = provider.icon;
              const configRecord = configs[provider.id];
              const isEnabled = configRecord ? configRecord.isEnabled : false;
              const lastStatus = configRecord?.lastStatus;
              const values = formData[provider.id] || {};

              return (
                <div
                  key={provider.id}
                  className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
                >
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-slate-100 text-slate-800 shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{provider.title}</h3>
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border uppercase mt-0.5 ${
                              isEnabled
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {isEnabled ? 'ENABLED' : 'DISABLED'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(provider.id, provider.defaultName)}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                          isEnabled
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {isEnabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      {provider.description}
                    </p>

                    {configRecord?.lastTestedAt && (
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 pt-1">
                        <span>Last Tested: {new Date(configRecord.lastTestedAt).toLocaleString()}</span>
                        <span
                          className={`font-bold ${
                            lastStatus === 'SUCCESS' ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          ({lastStatus || 'UNTESTED'})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Form Body */}
                  <div className="p-5 space-y-3 bg-slate-50/50">
                    {provider.fields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                          {field.label}
                        </label>
                        {field.type === 'select' ? (
                          <select
                            value={values[field.key] || field.options?.[0] || ''}
                            onChange={(e) => handleFieldChange(provider.id, field.key, e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                          >
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type}
                            value={values[field.key] || ''}
                            onChange={(e) => handleFieldChange(provider.id, field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full p-2 bg-white border border-slate-200 rounded-md text-xs font-mono text-slate-900 focus:outline-hidden focus:border-slate-900"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={testingProvider === provider.id}
                      onClick={() => handleTestProvider(provider.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5 text-slate-500" />
                      {testingProvider === provider.id ? 'Testing...' : 'Test Provider'}
                    </button>

                    <button
                      type="button"
                      disabled={savingProvider === provider.id}
                      onClick={() => handleSaveConfig(provider.id, provider.defaultName)}
                      className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition disabled:opacity-50"
                    >
                      {savingProvider === provider.id ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Modal / Inspector for Test Dispatch Result ── */}
          {testResult && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600" />
                    )}
                    <h3 className="text-sm font-bold text-slate-900">
                      {testResult.provider} Test Result ({testResult.success ? 'SUCCESS' : 'FAILED'})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTestResult(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium">
                  {testResult.message}
                </div>

                {testResult.payloadPreview && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Rendered Payload / Receipt Preview
                    </label>
                    <pre className="p-3 rounded bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap max-h-56">
                      {testResult.payloadPreview}
                    </pre>
                  </div>
                )}

                {testResult.details && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Raw Provider Response Metadata
                    </label>
                    <pre className="p-2 rounded bg-slate-100 text-slate-800 text-[10px] font-mono overflow-x-auto">
                      {JSON.stringify(testResult.details, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setTestResult(null)}
                    className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-bold"
                  >
                    Close Inspector
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
