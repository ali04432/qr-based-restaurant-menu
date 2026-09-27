'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
} from 'lucide-react';

// ============================================================
// Model3DViewer — Production AR/3D Component
// ============================================================

interface Model3DViewerProps {
  modelUrl: string;
  iosModelUrl?: string | null;
  previewImage?: string | null;
  name: string;
  /** Calibration scale factor — admin-set to match real-world physical size. Default 1.0. */
  scale?: number;
  widthCm?: number | null;
  heightCm?: number | null;
  depthCm?: number | null;
  portionLabel?: string | null;
  /** When true: AR launches with fixed real-world scale (no customer resizing). Default true. */
  fixedArScale?: boolean;
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
  width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 9, border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(8px)',
  color: '#fff', cursor: 'pointer',
};

export default function Model3DViewer({
  modelUrl, iosModelUrl, previewImage, name, scale = 1,
  widthCm, heightCm, depthCm, portionLabel, fixedArScale = true, onEvent, compact = false,
}: Model3DViewerProps) {
  const modelViewerRef = useRef<HTMLElement & { canActivateAR?: boolean; activateAR?: () => void }>(null);
  const [mvLoaded, setMvLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | '3d'>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDims, setShowDims] = useState(false);
  const [arAvailable, setArAvailable] = useState(false);
  const [arStatus, setArStatus] = useState<'unknown' | 'available' | 'unavailable'>('unknown');
  const [platform, setPlatform] = useState({ isIOS: false, isAndroid: false, isMobile: false });

  const hasDims = widthCm || heightCm || depthCm;
  const dimStr = [widthCm, heightCm, depthCm].filter(Boolean).map(Number).join(' × ');

  useEffect(() => {
    setPlatform(detectPlatform());
    if (typeof window === 'undefined') return;
    if (customElements.get('model-viewer')) { setMvLoaded(true); return; }
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';
    s.onload = () => setMvLoaded(true);
    s.onerror = () => setLoadError(true);
    document.head.appendChild(s);
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
    const t = window.setTimeout(checkAr, 1400);
    return () => clearTimeout(t);
  }, [mvLoaded, viewMode, checkAr]);

  const handleLaunchAr = useCallback(() => {
    onEvent?.('ar.viewer.opened');
    if (platform.isIOS && iosModelUrl) {
      const a = document.createElement('a');
      a.setAttribute('rel', 'ar');
      a.setAttribute('href', iosModelUrl);
      a.click();
      onEvent?.('ar.quicklook.launched');
    } else if (modelViewerRef.current?.activateAR) {
      modelViewerRef.current.activateAR();
      onEvent?.('ar.session.started');
    }
  }, [platform, iosModelUrl, onEvent]);

  const handleModelLoad = useCallback(() => {
    onEvent?.('ar.model.loaded');
    checkAr();
  }, [onEvent, checkAr]);

  const arButtonShown = arAvailable || (platform.isIOS && !!iosModelUrl);

  const DimBadge = () => !hasDims ? null : (
    <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 10, padding: '6px 10px', color: '#d4af37', fontSize: 10, fontWeight: 700, lineHeight: 1.6, zIndex: 10 }}>
      <div style={{ color: 'rgba(212,175,55,0.7)', fontSize: 9, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Approx. Dish Size</div>
      {dimStr} cm
      {portionLabel && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, marginTop: 2 }}>{portionLabel}</div>}
    </div>
  );

  const ModelViewerEl = ({ fullH = false }: { fullH?: boolean }) => {
    const style: React.CSSProperties = { width: '100%', height: fullH ? '100%' : undefined, aspectRatio: fullH ? undefined : '4/3', minHeight: fullH ? undefined : 280, backgroundColor: '#080810', display: 'block' };
    return mvLoaded && !loadError ? (
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error custom web component
      <model-viewer
        ref={modelViewerRef}
        src={modelUrl}
        ios-src={iosModelUrl || undefined}
        alt={`3D model of ${name}`}
        camera-controls auto-rotate ar
        ar-modes="webxr scene-viewer quick-look"
        ar-scale={fixedArScale ? 'fixed' : 'auto'}
        xr-environment
        shadow-intensity="1" shadow-softness="0.8"
        exposure="0.9" tone-mapping="commerce"
        style={style}
        scale={`${scale} ${scale} ${scale}`}
        onLoad={handleModelLoad}
      />
    ) : loadError ? (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#64748b', fontSize: 13 }}>
        <Box size={38} color="rgba(100,116,139,0.5)" />
        <span>3D viewer unavailable</span>
      </div>
    ) : (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
        <div style={{ width: 26, height: 26, border: '3px solid #d4af37', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: '#64748b', fontSize: 12 }}>Loading 3D model…</span>
      </div>
    );
  };

  if (compact) {
    return (
      <button onClick={() => { setViewMode('3d'); onEvent?.('view3d.opened'); }} aria-label={`View ${name} in 3D`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-gold)] transition hover:bg-[var(--accent-gold)]/20"
      ><Box size={12} />3D View</button>
    );
  }

  if (isFullscreen) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.97)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{name}</span>
            {hasDims && <span style={{ color: '#d4af37', fontSize: 10, marginLeft: 10, opacity: 0.8 }}>{dimStr} cm</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {arButtonShown && (
              <button onClick={handleLaunchAr} aria-label="View in AR" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <Camera size={14} />View in Your Space
              </button>
            )}
            <button onClick={() => setIsFullscreen(false)} aria-label="Close fullscreen" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: 8, color: '#fff', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
          </div>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <ModelViewerEl fullH />
          {hasDims && <DimBadge />}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
      {/* PREVIEW MODE */}
      {viewMode === 'preview' && (
        <div style={{ position: 'relative', aspectRatio: '4/3', minHeight: 280 }}>
          {previewImage
            ? <img src={previewImage} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0d0d1a,#141428)' }}><Box size={52} color="rgba(212,175,55,0.35)" /></div>
          }
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 50%)', pointerEvents: 'none' }} />
          <button onClick={() => { setViewMode('3d'); onEvent?.('view3d.opened'); }} aria-label={`View ${name} in 3D`}
            style={{ position: 'absolute', bottom: 14, right: 14, display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(212,175,55,0.35)', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(12px)', color: '#d4af37', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <Box size={14} />View in 3D
          </button>
          {hasDims && <DimBadge />}
        </div>
      )}

      {/* 3D MODE */}
      {viewMode === '3d' && (
        <div>
          <div style={{ position: 'relative', background: '#080810' }}>
            <ModelViewerEl />

            {/* Top-right controls */}
            <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6, zIndex: 10 }}>
              <button onClick={() => setViewMode('preview')} title="Back to image" aria-label="Back to image" style={ctrlBtn}><Eye size={15} /></button>
              <button onClick={() => setIsFullscreen(true)} title="Fullscreen" aria-label="Fullscreen" style={ctrlBtn}><Maximize2 size={15} /></button>
              {hasDims && (
                <button onClick={() => setShowDims(v => !v)} title="Dish size info" aria-label="Dish size info" style={{ ...ctrlBtn, color: showDims ? '#d4af37' : '#fff', borderColor: showDims ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.15)' }}><Info size={15} /></button>
              )}
            </div>

            {/* Dimension info panel */}
            {showDims && hasDims && (
              <div style={{ position: 'absolute', top: 10, left: 10, right: 56, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, padding: '10px 14px', zIndex: 10 }}>
                <div style={{ color: '#d4af37', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Approximate Dish Size</div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{dimStr} cm</div>
                {portionLabel && <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 3 }}>{portionLabel}</div>}
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, marginTop: 6, lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RotateCcw size={8} /> Drag to rotate • Pinch to zoom
                </div>
              </div>
            )}

            {/* AR button — only when actually available */}
            {arButtonShown && (
              <button onClick={handleLaunchAr} aria-label="View this dish in your space using AR"
                style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', alignItems: 'center', gap: 7, padding: '11px 18px', borderRadius: 13, border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(12px)', color: '#10b981', fontSize: 12, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em', boxShadow: '0 4px 20px rgba(16,185,129,0.15)', zIndex: 10 }}>
                <Camera size={15} />View in Your Space
              </button>
            )}

            {hasDims && !showDims && <DimBadge />}
          </div>

          {/* AR capability note */}
          {arStatus === 'available' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 11, color: '#10b981', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '0 0 20px 20px' }}>
              <CheckCircle2 size={13} />AR ready — tap "View in Your Space" to place this dish on your real table
            </div>
          )}
          {arStatus === 'unavailable' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 11, color: '#94a3b8', background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '0 0 20px 20px' }}>
              <AlertTriangle size={13} />AR not supported on this device — you can still view the dish in 3D above
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
