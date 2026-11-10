'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Camera,
  Scan,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Box,
} from 'lucide-react';
import HiroMarkerModal from './HiroMarkerModal';

interface MarkerArModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelUrl: string;
  name: string;
  scale?: number;
  widthCm?: number | null;
  heightCm?: number | null;
  depthCm?: number | null;
  onEvent?: (eventType: string) => void;
}

export default function MarkerArModal({
  isOpen,
  onClose,
  modelUrl,
  name,
  scale = 1.0,
  widthCm,
  heightCm,
  depthCm,
  onEvent,
}: MarkerArModalProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [markerDetected, setMarkerDetected] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showHiroGuide, setShowHiroGuide] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  // Message listener from iframe
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'AR_EVENT') {
        switch (data.event) {
          case 'marker-found':
            setMarkerDetected(true);
            onEvent?.('ar.marker.found');
            break;
          case 'marker-lost':
            setMarkerDetected(false);
            onEvent?.('ar.marker.lost');
            break;
          case 'camera-ready':
            setIsIframeLoaded(true);
            setCameraError(null);
            onEvent?.('ar.camera.ready');
            break;
          case 'permission-denied':
            setCameraError('Camera access was denied. Please allow camera permissions in your browser address bar.');
            onEvent?.('ar.camera.denied');
            break;
          case 'camera-error':
            setCameraError(data.error || 'Unable to access device camera.');
            onEvent?.('ar.camera.error');
            break;
          case 'request-close':
            handleSafeClose();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isOpen, onEvent]);

  // Safe close procedure to gracefully stop camera streams before unmount
  const handleSafeClose = useCallback(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({ type: 'STOP_AR' }, '*');
      } catch (err) {
        console.warn('[MarkerArModal] Error posting STOP_AR:', err);
      }
    }

    // Small delay to allow camera release before destroying iframe DOM
    window.setTimeout(() => {
      setMarkerDetected(false);
      setCameraError(null);
      setIsIframeLoaded(false);
      onClose();
    }, 150);
  }, [onClose]);

  if (!isOpen) return null;

  // Build iframe query URL
  const query = new URLSearchParams({
    model: modelUrl,
    name: name,
    scale: String(scale),
    width: String(widthCm || 24),
    height: String(heightCm || 4.2),
    depth: String(depthCm || 24),
  });

  const iframeSrc = `/ar/marker-viewer.html?${query.toString()}`;

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col bg-slate-950">
      {/* Top Navigation Bar */}
      <div className="relative z-20 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]">
            <Camera className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">{name}</h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Marker WebAR</span>
              <span>•</span>
              <span className={markerDetected ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {markerDetected ? 'Marker Tracking Active' : 'Scanning for Hiro Marker'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHiroGuide(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
            title="Display or Print Hiro Marker"
          >
            <HelpCircle className="h-4 w-4 text-[var(--accent-gold)]" />
            <span className="hidden sm:inline">Marker Guide</span>
          </button>

          <button
            onClick={handleSafeClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-white"
            aria-label="Close AR"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main AR Camera Viewport */}
      <div className="relative flex-1 overflow-hidden bg-black">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          allow="camera; accelerometer; gyroscope; xr-spatial-tracking"
          className="h-full w-full border-0"
          title={`Augmented Reality Marker View for ${name}`}
        />

        {/* Live Tracking Status Badge Overlay */}
        <div className="pointer-events-none absolute top-4 left-4 z-20">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold backdrop-blur-md shadow-lg transition-all ${
              markerDetected
                ? 'border border-emerald-500/40 bg-emerald-950/80 text-emerald-300'
                : 'border border-amber-500/40 bg-slate-900/80 text-amber-300'
            }`}
          >
            {markerDetected ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Hiro Marker Locked</span>
              </>
            ) : (
              <>
                <Scan className="h-3.5 w-3.5 text-amber-400 animate-spin shrink-0" />
                <span>Searching for Marker...</span>
              </>
            )}
          </div>
        </div>

        {/* Camera Error Prompt */}
        {cameraError && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 p-4">
            <div className="max-w-sm rounded-2xl border border-rose-500/30 bg-slate-900 p-6 text-center shadow-2xl">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-white">Camera Access Required</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">{cameraError}</p>
              <div className="mt-5 flex gap-2 justify-center">
                <button
                  onClick={() => {
                    setCameraError(null);
                    if (iframeRef.current) {
                      iframeRef.current.src = iframeSrc;
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-gold)] px-4 py-2 text-xs font-bold text-black transition hover:brightness-105"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry Camera</span>
                </button>
                <button
                  onClick={handleSafeClose}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
                >
                  <Box className="h-3.5 w-3.5" />
                  <span>Use 3D View</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hiro Marker Guide Helper */}
      <HiroMarkerModal
        isOpen={showHiroGuide}
        onClose={() => setShowHiroGuide(false)}
      />
    </div>
  );
}

