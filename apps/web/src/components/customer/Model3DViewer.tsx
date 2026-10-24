'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Box,
  Eye,
  Maximize2,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Info,
  RotateCcw,
  X,
  Smartphone,
  RefreshCw,
  QrCode,
  ShieldAlert,
} from 'lucide-react';

// ============================================================
// Model3DViewer — Production AR/3D Component (Phase 3)
// Features:
// 1. "View in 3D (360°)" interactive 3D rotation & zoom
// 2. "View on My Table (AR)" WebXR & iOS QuickLook launcher
// 3. Prominent "Sample model – not the actual dish" disclaimer
// 4. Desktop/Unsupported device QR modal for mobile AR scanning
// 5. Loading, Error, and Permission-denied recovery states
// ============================================================

let modelViewerLoaded = false;

interface Model3DViewerProps {
  modelUrl: string;
  iosModelUrl?: string | null;
  previewImage?: string | null;
  name: string;
  scale?: number;
  widthCm?: number | null;
  heightCm?: number | null;
  depthCm?: number | null;
  portionLabel?: string | null;
  fixedArScale?: boolean;
  isSample?: boolean;
  onEvent?: (eventType: string) => void;
  compact?: boolean;
}

function detectPlatform() {
  if (typeof navigator === 'undefined') return { isIOS: false, isAndroid: false, isMobile: false };
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  return { isIOS, isAndroid, isMobile: isIOS || isAndroid };
}

const ctrlBtn: React.CSSProperties = {
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(0,0,0,0.68)',
  backdropFilter: 'blur(10px)',
  color: '#fff',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

export default function Model3DViewer({
  modelUrl,
  iosModelUrl,
  previewImage,
  name,
  scale = 1,
  widthCm,
  heightCm,
  depthCm,
  portionLabel,
  fixedArScale = true,
  isSample = false,
  onEvent,
  compact = false,
}: Model3DViewerProps) {
  const modelViewerRef = useRef<HTMLElement & { canActivateAR?: boolean; activateAR?: () => void }>(null);
  const [mvLoaded, setMvLoaded] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | '3d'>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDims, setShowDims] = useState(false);
  const [arAvailable, setArAvailable] = useState(false);
  const [arStatus, setArStatus] = useState<'unknown' | 'available' | 'unavailable'>('unknown');
  const [platform, setPlatform] = useState({ isIOS: false, isAndroid: false, isMobile: false });
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [qrEncodedUrl, setQrEncodedUrl] = useState<string>('');
  const [permissionError, setPermissionError] = useState(false);

  // Check if model should be flagged as sample
  const isSampleModel =
    isSample ||
    modelUrl?.includes('avocado.glb') ||
    name?.toLowerCase().includes('sample') ||
    portionLabel?.toLowerCase().includes('sample');

  const hasDims = Boolean(widthCm || heightCm || depthCm);
  const dimStr = [widthCm, heightCm, depthCm].filter(Boolean).map(Number).join(' × ');

  // Dynamic import of @google/model-viewer package on client
  useEffect(() => {
    setPlatform(detectPlatform());
    if (typeof window === 'undefined') return;

    if (customElements.get('model-viewer')) {
      setMvLoaded(true);
      return;
    }

    if (modelViewerLoaded) return;
    modelViewerLoaded = true;

    import('@google/model-viewer')
      .then(() => setMvLoaded(true))
      .catch(() => setLoadError(true));
  }, []);

  const checkAr = useCallback(() => {
    const mv = modelViewerRef.current;
    if (mv && typeof mv.canActivateAR !== 'undefined') {
      const can = !!mv.canActivateAR;
      setArAvailable(can);
      setArStatus(can ? 'available' : 'unavailable');
    }
  }, []);

  useEffect(() => {
    if (!mvLoaded) return;
    checkAr();
    const t = window.setTimeout(checkAr, 1200);
    return () => clearTimeout(t);
  }, [mvLoaded, viewMode, checkAr]);

  // Launch AR or open QR modal on desktop
  const handleLaunchAr = useCallback(() => {
    setPermissionError(false);
    onEvent?.('ar.viewer.opened');

    if (platform.isIOS && iosModelUrl) {
      const a = document.createElement('a');
      a.setAttribute('rel', 'ar');
      a.setAttribute('href', iosModelUrl);
      a.click();
      onEvent?.('ar.quicklook.launched');
      return;
    }

    if (modelViewerRef.current?.canActivateAR && modelViewerRef.current?.activateAR) {
      try {
        modelViewerRef.current.activateAR();
        onEvent?.('ar.session.started');
      } catch (err) {
        console.warn('[AR] Launch error:', err);
        setPermissionError(true);
      }
      return;
    }

    // Fallback for desktop or unsupported phone browser: generate phone QR code.
    // Encodes the public HTTPS tunnel URL if configured (e.g. NEXT_PUBLIC_TUNNEL_URL),
    // otherwise preserves the current window URL with query parameters.
    let targetUrl = '';
    if (typeof window !== 'undefined') {
      const pathnameAndSearch = window.location.pathname + window.location.search + window.location.hash;
      const tunnelUrl = process.env.NEXT_PUBLIC_TUNNEL_URL?.trim();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

      if (tunnelUrl && !tunnelUrl.includes('localhost') && !tunnelUrl.includes('127.0.0.1')) {
        targetUrl = `${tunnelUrl.replace(/\/$/, '')}${pathnameAndSearch}`;
      } else if (appUrl && !appUrl.includes('localhost') && !appUrl.includes('127.0.0.1')) {
        targetUrl = `${appUrl.replace(/\/$/, '')}${pathnameAndSearch}`;
      } else {
        targetUrl = window.location.href;
      }
    }

    setQrEncodedUrl(targetUrl);

    QRCode.toDataURL(targetUrl, {
      width: 260,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => {
        setQrCodeDataUrl(url);
        setShowQrModal(true);
        onEvent?.('ar.qr_modal.opened');
      })
      .catch(() => {
        setShowQrModal(true);
      });
  }, [platform, iosModelUrl, onEvent]);

  const handleModelLoad = useCallback(() => {
    setModelReady(true);
    setLoadError(false);
    onEvent?.('ar.model.loaded');
    checkAr();
  }, [onEvent, checkAr]);

  const handleModelError = useCallback(() => {
    setModelReady(false);
    setLoadError(true);
    onEvent?.('ar.model.error');
  }, [onEvent]);

  const arButtonShown = arAvailable || (platform.isIOS && !!iosModelUrl) || !platform.isMobile;

  // Sample Model Badge component
  const SampleBadge = () =>
    !isSampleModel ? null : (
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-300 backdrop-blur-md shadow-sm">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
        <span>Sample model – not the actual dish</span>
      </div>
    );

  // Real Dimensions Badge
  const DimBadge = () =>
    !hasDims ? null : (
      <div className="absolute bottom-3 left-3 z-20 rounded-xl border border-amber-500/30 bg-black/75 px-3 py-2 text-xs font-semibold text-amber-400 backdrop-blur-md shadow-md">
        <div className="text-[10px] uppercase tracking-wider text-amber-500/80">Dish Dimensions</div>
        <div className="font-bold text-white">{dimStr} cm</div>
        {portionLabel && <div className="text-[10px] text-slate-400">{portionLabel}</div>}
      </div>
    );

  // Core <model-viewer> renderer
  const ModelViewerEl = ({ fullH = false }: { fullH?: boolean }) => {
    const style: React.CSSProperties = {
      width: '100%',
      height: fullH ? '100%' : undefined,
      aspectRatio: fullH ? undefined : '4/3',
      minHeight: fullH ? undefined : 320,
      backgroundColor: '#07090e',
      display: 'block',
    };

    if (loadError) {
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 12,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <AlertTriangle className="h-10 w-10 text-rose-400/80" />
          <div className="text-sm font-semibold text-white">Failed to load 3D model</div>
          <p className="text-xs text-slate-400 max-w-xs">
            The 3D model file could not be rendered or is temporarily unreachable.
          </p>
          <button
            onClick={() => {
              setLoadError(false);
              setModelReady(false);
            }}
            className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Loading</span>
          </button>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full">
        {!modelReady && (
          <div
            style={{
              ...style,
              position: 'absolute',
              inset: 0,
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent shadow-lg" />
            <span className="text-xs font-semibold text-slate-300">Loading 3D Food Model…</span>
          </div>
        )}

        {mvLoaded && (
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error custom web component
          <model-viewer
            ref={modelViewerRef}
            src={modelUrl}
            ios-src={iosModelUrl || undefined}
            alt={`3D model of ${name}`}
            camera-controls
            auto-rotate
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale={fixedArScale ? 'fixed' : 'auto'}
            xr-environment
            shadow-intensity="1"
            shadow-softness="0.8"
            exposure="1.0"
            tone-mapping="commerce"
            style={style}
            scale={`${scale} ${scale} ${scale}`}
            onLoad={handleModelLoad}
            onError={handleModelError}
          />
        )}
      </div>
    );
  };

  // Compact trigger (used inside cards/summaries)
  if (compact) {
    return (
      <button
        onClick={() => {
          setViewMode('3d');
          onEvent?.('view3d.opened');
        }}
        aria-label={`View ${name} in 3D`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-gold)] transition hover:bg-[var(--accent-gold)]/20"
      >
        <Box className="h-3 w-3" />
        <span>3D View</span>
      </button>
    );
  }

  // Fullscreen modal
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/98">
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white text-base">{name}</span>
            {isSampleModel && (
              <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                Sample
              </span>
            )}
            {hasDims && <span className="text-xs text-amber-400 font-mono">{dimStr} cm</span>}
          </div>
          <div className="flex items-center gap-2">
            {arButtonShown && (
              <button
                onClick={handleLaunchAr}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/25"
              >
                <Camera className="h-4 w-4" />
                <span>View on My Table (AR)</span>
              </button>
            )}
            <button
              onClick={() => setIsFullscreen(false)}
              aria-label="Close fullscreen"
              className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="relative flex-1">
          <ModelViewerEl fullH />
          <SampleBadge />
          {hasDims && <DimBadge />}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl">
      {/* ── PREVIEW MODE (Photo view with 3D and AR action buttons) ── */}
      {viewMode === 'preview' && (
        <div className="relative aspect-[4/3] min-h-[300px]">
          {previewImage ? (
            <img src={previewImage} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
              <Box className="h-16 w-16 text-amber-400/40" />
            </div>
          )}

          {/* Vignette overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

          {/* Sample Badge */}
          <SampleBadge />

          {/* Real dimensions badge */}
          {hasDims && <DimBadge />}

          {/* Action Button Bar: "View in 3D (360°)" and "View on My Table (AR)" */}
          <div className="absolute bottom-3 right-3 z-20 flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setViewMode('3d');
                onEvent?.('view3d.opened');
              }}
              aria-label={`View ${name} in 3D (360°)`}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-slate-950/80 px-3.5 py-2.5 text-xs font-bold text-amber-400 backdrop-blur-md shadow-lg transition hover:bg-amber-500/20 hover:border-amber-400"
            >
              <Box className="h-4 w-4 animate-pulse" />
              <span>View in 3D (360°)</span>
            </button>

            <button
              onClick={handleLaunchAr}
              aria-label={`View ${name} on My Table in Augmented Reality`}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/20 px-3.5 py-2.5 text-xs font-bold text-emerald-300 backdrop-blur-md shadow-lg transition hover:bg-emerald-500/30 hover:border-emerald-400"
            >
              <Camera className="h-4 w-4" />
              <span>View on My Table (AR)</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 3D INTERACTIVE MODE ── */}
      {viewMode === '3d' && (
        <div className="relative">
          <div className="relative bg-[#07090e]">
            <ModelViewerEl />

            {/* Sample Badge */}
            <SampleBadge />

            {/* Top-right overlay controls */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
              <button
                onClick={() => setViewMode('preview')}
                title="Switch back to photo"
                aria-label="Back to image"
                style={ctrlBtn}
              >
                <Eye size={16} />
              </button>
              <button
                onClick={() => setIsFullscreen(true)}
                title="Fullscreen view"
                aria-label="Fullscreen"
                style={ctrlBtn}
              >
                <Maximize2 size={16} />
              </button>
              {hasDims && (
                <button
                  onClick={() => setShowDims((v) => !v)}
                  title="Dish dimensions"
                  aria-label="Dish dimensions"
                  style={{
                    ...ctrlBtn,
                    color: showDims ? '#d4af37' : '#fff',
                    borderColor: showDims ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.18)',
                  }}
                >
                  <Info size={16} />
                </button>
              )}
            </div>

            {/* Dimension info floating panel */}
            {showDims && hasDims && (
              <div className="absolute top-12 left-3 right-16 z-30 rounded-xl border border-amber-500/30 bg-black/90 p-3.5 backdrop-blur-md shadow-xl text-left">
                <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold mb-1">
                  Real Physical Dimensions
                </div>
                <div className="text-sm font-extrabold text-white">{dimStr} cm</div>
                {portionLabel && <div className="text-xs text-slate-300 mt-1">{portionLabel}</div>}
                <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5">
                  <RotateCcw className="h-3 w-3" />
                  <span>Drag to rotate 360° • Pinch to zoom</span>
                </div>
              </div>
            )}

            {/* Bottom-right AR trigger in 3D mode */}
            <div className="absolute bottom-3 right-3 z-20">
              <button
                onClick={handleLaunchAr}
                aria-label="View on My Table (AR)"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-black/85 px-4 py-2.5 text-xs font-bold text-emerald-300 backdrop-blur-md shadow-xl transition hover:bg-emerald-500/20"
              >
                <Camera className="h-4 w-4" />
                <span>View on My Table (AR)</span>
              </button>
            </div>

            {hasDims && !showDims && <DimBadge />}
          </div>

          {/* AR Capability / Instructions Footer Bar */}
          <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2">
              {arStatus === 'available' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">
                    AR Ready — tap "View on My Table" to preview at full real-world scale
                  </span>
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4 text-amber-400" />
                  <span className="text-slate-400">
                    Interact in 3D above, or tap "View on My Table" to scan on your phone
                  </span>
                </>
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-mono hidden sm:inline">
              360° Interactive Canvas
            </div>
          </div>
        </div>
      )}

      {/* ── PERMISSION ERROR TOAST ── */}
      {permissionError && (
        <div className="m-3 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
          <span>Camera access was declined. Enable camera permissions in your mobile browser settings to use AR.</span>
          <button
            onClick={() => setPermissionError(false)}
            className="ml-auto text-rose-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── DESKTOP QR CODE MODAL FOR MOBILE AR ── */}
      {showQrModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <QrCode className="h-5 w-5 text-emerald-400" />
                <span>Experience in AR on Your Phone</span>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Point your smartphone camera at this QR code to view <strong className="text-white">{name}</strong> right on your dining table in Augmented Reality.
            </p>

            {qrCodeDataUrl ? (
              <div className="inline-block rounded-2xl bg-white p-3 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeDataUrl}
                  alt="Scan for Mobile AR"
                  className="h-52 w-52 rounded-lg object-contain"
                />
              </div>
            ) : (
              <div className="h-52 w-52 flex items-center justify-center mx-auto text-xs text-slate-500">
                Generating QR code…
              </div>
            )}

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Works directly in Safari (iOS) and Chrome (Android)</span>
            </div>

            {qrEncodedUrl && (
              <div className="mt-3 rounded-lg bg-slate-950/70 p-2 border border-slate-800 text-left">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-0.5">Encoded URL</span>
                <span className="text-[11px] font-mono text-emerald-400 break-all select-all block">{qrEncodedUrl}</span>
              </div>
            )}

            {qrEncodedUrl && (qrEncodedUrl.includes('localhost') || qrEncodedUrl.includes('127.0.0.1')) && (
              <div className="mt-2 rounded-lg bg-amber-950/40 border border-amber-800/60 p-2 text-left">
                <p className="text-[10px] text-amber-300 leading-tight">
                  <span className="font-bold">⚠️ Scanning on phone?</span> Because this URL uses localhost, set <code className="bg-amber-900/40 px-1 py-0.5 rounded text-[9px] text-amber-200">NEXT_PUBLIC_TUNNEL_URL</code> in your <code className="bg-amber-900/40 px-1 py-0.5 rounded text-[9px] text-amber-200">.env</code> to your public HTTPS tunnel URL (e.g. Cloudflare or ngrok).
                </p>
              </div>
            )}

            <button
              onClick={() => setShowQrModal(false)}
              className="mt-5 w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
