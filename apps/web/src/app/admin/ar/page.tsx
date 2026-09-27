'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Smartphone,
  Monitor,
  Activity,
  Copy,
  Check,
  Zap,
  Info,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import Model3DViewer from '../../../components/customer/Model3DViewer';
import {
  ArAsset,
  CreateArAssetInput,
  UpdateArAssetInput,
  VisualizationEvent,
  MenuItem,
} from '@qr-menu/shared';

export default function AdminArPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '';

  const [activeTab, setActiveTab] = useState<'ASSETS' | 'ANALYTICS' | 'PREVIEW'>('ASSETS');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assets, setAssets] = useState<ArAsset[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [analytics, setAnalytics] = useState<{
    periodDays: number;
    totalEvents: number;
    byEventType: Record<string, number>;
    byDevice: Record<string, number>;
    arSupportedCount: number;
    arUnsupportedCount: number;
    recentEvents: VisualizationEvent[];
  } | null>(null);

  // Asset creation / edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ArAsset | null>(null);
  const [menuItemId, setMenuItemId] = useState('');
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<'MODEL_3D' | 'AR_GLTF' | 'AR_USDZ'>('MODEL_3D');
  const [modelUrl, setModelUrl] = useState('');
  const [iosModelUrl, setIosModelUrl] = useState('');
  const [previewImage, setPreviewImage] = useState('');
  const [scale, setScale] = useState<number>(1.0);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'DRAFT'>('ACTIVE');
  const [metadata, setMetadata] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preview modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<ArAsset | null>(null);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<ArAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy URL indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const [assetList, items, analyticsData] = await Promise.all([
        adminService.getArAssets(token).catch(() => []),
        adminService.getMenuItems(restaurantId, {}, token).catch(() => []),
        adminService.getArAnalytics(7, token).catch(() => null),
      ]);

      setAssets(assetList || []);
      setMenuItems(items || []);
      setAnalytics(analyticsData);
    } catch (err) {
      console.warn('[AdminAr] Failed to fetch AR data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, restaurantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setEditingAsset(null);
    setMenuItemId('');
    setName('');
    setAssetType('MODEL_3D');
    setModelUrl('');
    setIosModelUrl('');
    setPreviewImage('');
    setScale(1.0);
    setStatus('ACTIVE');
    setMetadata('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (asset: ArAsset) => {
    setEditingAsset(asset);
    setMenuItemId(asset.menuItemId || '');
    setName(asset.name);
    setAssetType((asset.assetType as any) || 'MODEL_3D');
    setModelUrl(asset.modelUrl || '');
    setIosModelUrl(asset.iosModelUrl || '');
    setPreviewImage(asset.previewImage || '');
    setScale(asset.scale || 1.0);
    setStatus((asset.status as any) || 'ACTIVE');
    setMetadata(asset.metadata || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Asset name is required');
      return;
    }
    if (!modelUrl.trim()) {
      setFormError('3D Model URL (.glb / .gltf) is required');
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingAsset) {
        const payload: UpdateArAssetInput = {
          name: name.trim(),
          assetType,
          modelUrl: modelUrl.trim(),
          iosModelUrl: iosModelUrl.trim() || undefined,
          previewImage: previewImage.trim() || undefined,
          scale,
          status,
          metadata: metadata.trim() || undefined,
        };
        await adminService.updateArAsset(editingAsset.id, payload, token);
      } else {
        const payload: CreateArAssetInput = {
          menuItemId: menuItemId || undefined,
          name: name.trim(),
          assetType,
          modelUrl: modelUrl.trim(),
          iosModelUrl: iosModelUrl.trim() || undefined,
          previewImage: previewImage.trim() || undefined,
          scale,
          status,
          metadata: metadata.trim() || undefined,
        };
        await adminService.createArAsset(payload, token);
      }

      setModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save AR asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAsset = async () => {
    if (!assetToDelete) return;
    try {
      setIsDeleting(true);
      await adminService.deleteArAsset(assetToDelete.id, token);
      setDeleteModalOpen(false);
      setAssetToDelete(null);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete asset');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const activeAssetsCount = assets.filter((a) => a.status === 'ACTIVE').length;
  const draftAssetsCount = assets.filter((a) => a.status === 'DRAFT').length;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
                <Box className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                AR & 3D Visualization Management
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold tracking-wide">
                  PHASE 4
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-400 max-w-2xl">
              Manage 3D GLTF models, Apple AR QuickLook USDZ assets, and monitor real-time WebXR customer telemetry.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData()}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 transition flex items-center gap-2 text-sm shadow-sm"
              title="Refresh Assets"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add 3D / AR Asset</span>
            </button>
          </div>
        </div>

        {/* Operational Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active 3D Assets
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Box className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{activeAssetsCount}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="text-amber-400 font-medium">{draftAssetsCount} in draft</span>
              <span>• Total {assets.length} items linked</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Customer Visualizations
              </span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Eye className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {analytics?.totalEvents ?? 0}
            </div>
            <div className="text-xs text-slate-400">Last 7 days guest engagements</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                AR Viewer Opens
              </span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Smartphone className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {analytics?.byEventType?.['ar.viewer.opened'] ?? 0}
            </div>
            <div className="text-xs text-slate-400">
              WebXR & QuickLook sessions initiated
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                AR Compatibility Rate
              </span>
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {analytics && analytics.totalEvents > 0
                ? `${Math.round(
                    (analytics.arSupportedCount / (analytics.totalEvents || 1)) * 100
                  )}%`
                : '100%'}
            </div>
            <div className="text-xs text-slate-400">Supported guest device environments</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('ASSETS')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === 'ASSETS'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>AR Assets Catalog ({assets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('ANALYTICS')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === 'ANALYTICS'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Visualization Telemetry</span>
          </button>
        </div>

        {/* TAB 1: ASSETS CATALOG */}
        {activeTab === 'ASSETS' && (
          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/80">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-500" />
                <p>Loading 3D / AR Assets...</p>
              </div>
            ) : assets.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80">
                <Box className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-1">No 3D Models Configured</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-5">
                  Link 3D GLTF (.glb) or USDZ (.usdz) files to your dishes to provide immersive AR dining experiences.
                </p>
                <button
                  onClick={openCreateModal}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold inline-flex items-center gap-2 text-sm shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Add First 3D Asset
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {assets.map((asset) => {
                  const linkedItem = menuItems.find((m) => m.id === asset.menuItemId);
                  return (
                    <div
                      key={asset.id}
                      className="rounded-2xl bg-slate-900/70 border border-slate-800/80 overflow-hidden flex flex-col hover:border-slate-700/80 transition shadow-lg group"
                    >
                      {/* Card Thumbnail / Preview */}
                      <div className="relative h-44 bg-slate-950/80 flex items-center justify-center overflow-hidden border-b border-slate-800/60">
                        {asset.previewImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.previewImage}
                            alt={asset.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <Box className="w-12 h-12 text-amber-500/40 mx-auto mb-2" />
                            <span className="text-xs text-slate-500">3D GLTF Model</span>
                          </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              asset.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : asset.status === 'DRAFT'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-700/40 text-slate-400 border border-slate-600/30'
                            }`}
                          >
                            {asset.status}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-900/80 text-slate-300 border border-slate-700/60 backdrop-blur">
                            {asset.assetType}
                          </span>
                        </div>

                        {/* Interactive Preview Button */}
                        <button
                          onClick={() => {
                            setPreviewAsset(asset);
                            setPreviewModalOpen(true);
                          }}
                          className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/90 text-amber-400 hover:text-white hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 backdrop-blur transition shadow-md"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Interactive 3D</span>
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-white text-base leading-snug">
                              {asset.name}
                            </h3>
                          </div>

                          {linkedItem ? (
                            <div className="text-xs text-amber-400/90 flex items-center gap-1 mb-2">
                              <span>Linked to:</span>
                              <span className="font-semibold">{linkedItem.name}</span>
                              <span className="text-slate-500">
                                (Rs. {linkedItem.price?.toLocaleString()})
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500 italic mb-2">
                              Unlinked (General asset)
                            </div>
                          )}

                          <div className="text-xs text-slate-400 space-y-1">
                            <div className="flex items-center justify-between">
                              <span>Scale Factor:</span>
                              <span className="font-mono text-slate-300">{asset.scale}x</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>MIME Type:</span>
                              <span className="font-mono text-slate-300">{asset.mimeType}</span>
                            </div>
                            {asset.iosModelUrl && (
                              <div className="flex items-center justify-between text-cyan-400">
                                <span>Apple QuickLook (USDZ):</span>
                                <span className="font-medium">Configured</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleCopy(asset.modelUrl || '', asset.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1.5 transition"
                            title="Copy Model URL"
                          >
                            {copiedId === asset.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>URL</span>
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEditModal(asset)}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition"
                              title="Edit Asset"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setAssetToDelete(asset);
                                setDeleteModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                              title="Delete Asset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TELEMETRY & ANALYTICS */}
        {activeTab === 'ANALYTICS' && (
          <div className="space-y-6">
            {analytics ? (
              <>
                {/* Event distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-md">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-400" />
                      Interactions by Event Type
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(analytics.byEventType || {}).map(([type, count]) => {
                        const pct = Math.round(
                          (count / (analytics.totalEvents || 1)) * 100
                        );
                        return (
                          <div key={type} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-slate-300">{type}</span>
                              <span className="text-slate-400">
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {Object.keys(analytics.byEventType || {}).length === 0 && (
                        <p className="text-xs text-slate-500 italic">
                          No visualization events logged yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-md">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-cyan-400" />
                      Guest Devices & Platforms
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(analytics.byDevice || {}).map(([dev, count]) => {
                        const pct = Math.round(
                          (count / (analytics.totalEvents || 1)) * 100
                        );
                        return (
                          <div key={dev} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="capitalize text-slate-300">{dev}</span>
                              <span className="text-slate-400">
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-500 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {Object.keys(analytics.byDevice || {}).length === 0 && (
                        <p className="text-xs text-slate-500 italic">No device telemetry logged.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Event Stream */}
                <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-md">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Recent Visualization Telemetry Events (Last 15)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Event Type</th>
                          <th className="py-2.5 px-3">Device</th>
                          <th className="py-2.5 px-3">AR Supported</th>
                          <th className="py-2.5 px-3">Session ID</th>
                          <th className="py-2.5 px-3">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {analytics.recentEvents?.slice(0, 15).map((evt) => (
                          <tr key={evt.id} className="hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono text-amber-400">
                              {evt.eventType}
                            </td>
                            <td className="py-2.5 px-3 text-slate-300 capitalize">
                              {evt.deviceType || 'unknown'}
                            </td>
                            <td className="py-2.5 px-3">
                              {evt.arSupported ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                                  YES
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-400 font-semibold">
                                  NO
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500 truncate max-w-[120px]">
                              {evt.sessionId || 'anonymous'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {new Date(evt.createdAt || Date.now()).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        {(!analytics.recentEvents || analytics.recentEvents.length === 0) && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-500 italic">
                              No recent events recorded.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                No telemetry data available yet.
              </div>
            )}
          </div>
        )}

        {/* CREATE / EDIT ASSET MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
                <div className="flex items-center gap-2 text-white font-bold text-lg">
                  <Box className="w-5 h-5 text-amber-400" />
                  <span>{editingAsset ? 'Edit 3D / AR Asset' : 'New 3D / AR Asset'}</span>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAsset} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">
                    Link to Menu Item (Optional)
                  </label>
                  <select
                    value={menuItemId}
                    onChange={(e) => setMenuItemId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- No specific item linked (General Asset) --</option>
                    {menuItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} — Rs. {item.price?.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    When linked, guests opening this dish details page can visualize it in 3D / AR.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">
                    Asset Title / Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Gourmet Truffle Burger 3D"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">
                      Asset Type
                    </label>
                    <select
                      value={assetType}
                      onChange={(e) => setAssetType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-amber-500"
                    >
                      <option value="MODEL_3D">3D Model (GLTF / GLB)</option>
                      <option value="AR_GLTF">AR GLTF (WebXR compatible)</option>
                      <option value="AR_USDZ">AR QuickLook (Apple iOS)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-amber-500"
                    >
                      <option value="ACTIVE">ACTIVE (Visible to guests)</option>
                      <option value="DRAFT">DRAFT (Testing mode)</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">
                    3D Model URL (.glb / .gltf) *
                  </label>
                  <input
                    type="url"
                    required
                    value={modelUrl}
                    onChange={(e) => setModelUrl(e.target.value)}
                    placeholder="https://.../models/dish.glb"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Direct public URL to a binary GLTF (.glb) file.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">
                    iOS Quick Look URL (.usdz, Optional)
                  </label>
                  <input
                    type="url"
                    value={iosModelUrl}
                    onChange={(e) => setIosModelUrl(e.target.value)}
                    placeholder="https://.../models/dish.usdz"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Required for native AR Quick Look on Safari iOS devices without WebXR.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">
                    Preview Thumbnail URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={previewImage}
                    onChange={(e) => setPreviewImage(e.target.value)}
                    placeholder="https://.../dish-preview.jpg"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">
                      Model Scale Factor
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="10.0"
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value) || 1.0)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <span className="text-xs text-slate-400">
                      Default is 1.0. Adjust for real-world table sizing.
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-sm transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editingAsset ? 'Save Changes' : 'Create Asset'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* INTERACTIVE 3D PREVIEW MODAL */}
        {previewModalOpen && previewAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Box className="w-5 h-5 text-amber-400" />
                  <span>3D Model Preview: {previewAsset.name}</span>
                </div>
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 bg-slate-950 flex items-center justify-center min-h-[420px]">
                <Model3DViewer
                  modelUrl={previewAsset.modelUrl || ''}
                  iosModelUrl={previewAsset.iosModelUrl}
                  previewImage={previewAsset.previewImage}
                  name={previewAsset.name}
                  scale={previewAsset.scale}
                />
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
                <span>Drag to orbit • Scroll to zoom • WebXR / QuickLook enabled</span>
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteModalOpen && assetToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center gap-3 text-rose-400 mb-4">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-lg font-bold text-white">Delete AR Asset?</h3>
              </div>
              <p className="text-sm text-slate-400 mb-6">
                Are you sure you want to delete <strong className="text-white">{assetToDelete.name}</strong>? Guests will no longer be able to visualize this dish in 3D.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAsset}
                  disabled={isDeleting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Asset'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
