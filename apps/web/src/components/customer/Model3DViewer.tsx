'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Eye, RotateCcw, ZoomIn, ZoomOut, Smartphone, X } from 'lucide-react';

// ============================================================
// Model3DViewer Component
//
// Progressive enhancement:
//   1. Tries <model-viewer> (Google's web component) for full 3D + AR.
//   2. Falls back to a preview image with "AR not supported" badge.
//
// Works without AR on desktop. Gracefully degrades on all platforms.
// ============================================================

interface Model3DViewerProps {
  modelUrl: string;
  iosModelUrl?: string | null;
  previewImage?: string | null;
  name: string;
  scale?: number;
  onEvent?: (eventType: string) => void;
  compact?: boolean;
}

// Detect AR support
function detectArSupport(): { webxr: boolean; quicklook: boolean } {
  if (typeof navigator === 'undefined') return { webxr: false, quicklook: false };
  const webxr = 'xr' in navigator;
  const quicklook = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return { webxr, quicklook };
}

export default function Model3DViewer({
  modelUrl,
  iosModelUrl,
  previewImage,
  name,
  scale = 1,
  onEvent,
  compact = false,
}: Model3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [modelViewerLoaded, setModelViewerLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [arSupport, setArSupport] = useState<{ webxr: boolean; quicklook: boolean }>({
    webxr: false,
    quicklook: false,
  });
  const [viewMode, setViewMode] = useState<'image' | '3d'>('image');
  const [loadError, setLoadError] = useState(false);

  // Load Google's model-viewer web component
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (customElements.get('model-viewer')) {
      setModelViewerLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';
    script.onload = () => setModelViewerLoaded(true);
    script.onerror = () => setLoadError(true);
    document.head.appendChild(script);

    return () => {
      // Don't remove — other instances may use it
    };
  }, []);

  useEffect(() => {
    setArSupport(detectArSupport());
  }, []);

  const handleView3D = useCallback(() => {
    setViewMode('3d');
    onEvent?.('view3d.opened');
  }, [onEvent]);

  const handleOpenAr = useCallback(() => {
    onEvent?.('ar.viewer.opened');
    // model-viewer handles AR launch natively
  }, [onEvent]);

  const handleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const hasAr = arSupport.webxr || arSupport.quicklook;

  // ── Fullscreen overlay ──────────────────────────────────────
  if (isFullscreen) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.95)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
          }}
        >
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{name}</span>
          <button
            onClick={handleFullscreen}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10,
              padding: '8px',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          {modelViewerLoaded && (
            // @ts-ignore - model-viewer is a web component
            <model-viewer
              src={modelUrl}
              ios-src={iosModelUrl || undefined}
              alt={name}
              camera-controls
              auto-rotate
              ar={hasAr ? '' : undefined}
              ar-modes="webxr scene-viewer quick-look"
              shadow-intensity="1"
              exposure="0.8"
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'transparent',
              }}
              scale={`${scale} ${scale} ${scale}`}
            />
          )}
        </div>
      </div>
    );
  }

  // ── Compact pill button (for FoodCard) ──────────────────────
  if (compact) {
    return (
      <button
        onClick={handleView3D}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-gold)] transition hover:bg-[var(--accent-gold)]/20"
        title="View in 3D"
      >
        <Box size={12} />
        3D View
      </button>
    );
  }

  // ── Main 3D viewer panel ────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-card)',
      }}
    >
      {/* Image mode — show preview with 3D button */}
      {viewMode === 'image' && (
        <div style={{ position: 'relative', aspectRatio: '4/3', minHeight: 280 }}>
          {previewImage ? (
            <img
              src={previewImage}
              alt={name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              }}
            >
              <Box size={48} color="var(--accent-gold)" />
            </div>
          )}

          {/* 3D Badge / Button */}
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              display: 'flex',
              gap: 8,
            }}
          >
            <button
              onClick={handleView3D}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 12,
                border: '1px solid rgba(212, 175, 55, 0.3)',
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(12px)',
                color: '#d4af37',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              <Box size={14} />
              View in 3D
            </button>

            {hasAr && (
              <button
                onClick={handleOpenAr}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  background: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(12px)',
                  color: '#10b981',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                <Smartphone size={14} />
                View in AR
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3D Mode — show model-viewer */}
      {viewMode === '3d' && (
        <div style={{ position: 'relative', aspectRatio: '4/3', minHeight: 280 }}>
          {modelViewerLoaded && !loadError ? (
            // @ts-ignore - model-viewer is a web component
            <model-viewer
              src={modelUrl}
              ios-src={iosModelUrl || undefined}
              alt={name}
              camera-controls
              auto-rotate
              ar={hasAr ? '' : undefined}
              ar-modes="webxr scene-viewer quick-look"
              shadow-intensity="1"
              exposure="0.8"
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#0a0a0f',
              }}
              scale={`${scale} ${scale} ${scale}`}
            />
          ) : loadError ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 12,
                background: '#0a0a0f',
                color: 'var(--text-secondary)',
                fontSize: 13,
              }}
            >
              <Box size={36} color="var(--text-muted)" />
              <span>3D viewer unavailable</span>
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0a0a0f',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  border: '3px solid var(--accent-gold)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            </div>
          )}

          {/* Controls */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              display: 'flex',
              gap: 6,
            }}
          >
            <button
              onClick={() => setViewMode('image')}
              title="Back to image"
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              <Eye size={16} />
            </button>
            <button
              onClick={handleFullscreen}
              title="Fullscreen"
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {/* AR launch button */}
          {hasAr && (
            <button
              onClick={handleOpenAr}
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 12,
                border: '1px solid rgba(16, 185, 129, 0.3)',
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(12px)',
                color: '#10b981',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              <Smartphone size={14} />
              Launch AR
            </button>
          )}
        </div>
      )}
    </div>
  );
}
