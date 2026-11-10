'use client';

import React from 'react';
import { X, Printer, Download, Info, CheckCircle2 } from 'lucide-react';

interface HiroMarkerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HiroMarkerModal({ isOpen, onClose }: HiroMarkerModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Silver Sapoon — Hiro AR Marker</title>
          <style>
            body {
              font-family: system-ui, sans-serif;
              text-align: center;
              padding: 40px;
              color: #111;
            }
            .marker-box {
              max-width: 320px;
              margin: 20px auto;
              border: 1px solid #ccc;
              padding: 20px;
            }
            img {
              width: 260px;
              height: 260px;
              display: block;
              margin: 0 auto;
            }
            h1 { font-size: 20px; margin-bottom: 8px; }
            p { font-size: 13px; color: #555; }
          </style>
        </head>
        <body>
          <h1>Silver Sapoon — Hiro AR Dining Marker</h1>
          <p>Place this printed marker on your dining table, then point your phone camera at it to see the dish in full 3D AR.</p>
          <div class="marker-box">
            <img src="/ar/hiro-marker.png" alt="Hiro Marker" />
          </div>
          <p>Optimal print size: 8 cm to 12 cm square.</p>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/ar/hiro-marker.png';
    link.download = 'silver-sapoon-hiro-marker.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Info className="h-4 w-4 text-[var(--accent-gold)]" />
            <span>Hiro AR Dining Marker</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-300">
          Marker-Based AR projects the 3D food model on top of this pattern. Display it on another device or print it out to place on your dining table.
        </p>

        {/* Marker Image */}
        <div className="my-4 inline-block rounded-2xl bg-white p-4 shadow-inner">
          <img
            src="/ar/hiro-marker.png"
            alt="Hiro Marker"
            className="h-48 w-48 rounded-lg object-contain mx-auto"
          />
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Point your smartphone camera directly at this square</span>
        </div>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-slate-700 hover:text-white"
          >
            <Printer className="h-4 w-4" />
            <span>Print Marker</span>
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 px-4 py-2.5 text-xs font-bold text-[var(--accent-gold)] transition hover:bg-[var(--accent-gold)]/20"
          >
            <Download className="h-4 w-4" />
            <span>Save Image</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
        >
          Back to Camera
        </button>
      </div>
    </div>
  );
}

