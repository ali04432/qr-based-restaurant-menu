'use client';

import React, { useState } from 'react';
import { Volume2, Bell, Clock, Monitor, Sliders, CheckCircle2 } from 'lucide-react';
import { kdsService } from '../../services/kds.service';

export function KdsSettings() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [repeatSound, setRepeatSound] = useState(false);
  const [overdueThreshold, setOverdueThreshold] = useState(15);
  const [station, setStation] = useState('ALL');
  const [autoCompleteDelay, setAutoCompleteDelay] = useState(30);
  const [saved, setSaved] = useState(false);

  const testAudio = () => {
    kdsService.playNewOrderSound();
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 pb-24 max-w-4xl space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">KDS Screen Settings</h2>
          <p className="text-xs text-zinc-400 mt-1">Configure kitchen alert audio, timers, and station routing</p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs rounded-lg transition-all flex items-center gap-2"
        >
          {saved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved!</span>
            </>
          ) : (
            <span>Save Preferences</span>
          )}
        </button>
      </div>

      {/* Section 1: Audio & Alerts */}
      <div className="bg-[#0D0F12] border border-zinc-800/60 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Volume2 className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Audio & Alert Sounds</h3>
            <p className="text-xs text-zinc-500">Audio chime settings when new customer orders arrive</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#131518] border border-zinc-800/40">
            <div>
              <p className="text-xs font-medium text-white">New Order Chime</p>
              <p className="text-[11px] text-zinc-500">Play pleasant harmonic chime on incoming order</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={testAudio}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
              >
                Test Sound
              </button>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-[#131518] border border-zinc-800/40">
            <div>
              <p className="text-xs font-medium text-white">Repeat Alert for Unseen Orders</p>
              <p className="text-[11px] text-zinc-500">Repeat chime every 60 seconds if order remains in New column</p>
            </div>
            <input
              type="checkbox"
              checked={repeatSound}
              onChange={(e) => setRepeatSound(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Timers & SLA Alerts */}
      <div className="bg-[#0D0F12] border border-zinc-800/60 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Clock className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Preparation Timers & Overdue Warnings</h3>
            <p className="text-xs text-zinc-500">Highlight cards in red when wait time exceeds threshold</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#131518] border border-zinc-800/40">
            <div>
              <p className="text-xs font-medium text-white">Overdue Warning Threshold</p>
              <p className="text-[11px] text-zinc-500">Highlight order card in red after this elapsed time</p>
            </div>
            <select
              value={overdueThreshold}
              onChange={(e) => setOverdueThreshold(Number(e.target.value))}
              className="bg-zinc-900 border border-zinc-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value={10}>10 Minutes</option>
              <option value={15}>15 Minutes</option>
              <option value={20}>20 Minutes</option>
              <option value={30}>30 Minutes</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-[#131518] border border-zinc-800/40">
            <div>
              <p className="text-xs font-medium text-white">Auto-Archive Ready Orders</p>
              <p className="text-[11px] text-zinc-500">Automatically move orders to Completed after being marked Ready</p>
            </div>
            <select
              value={autoCompleteDelay}
              onChange={(e) => setAutoCompleteDelay(Number(e.target.value))}
              className="bg-zinc-900 border border-zinc-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value={0}>Manual (Never auto-archive)</option>
              <option value={15}>After 15 minutes</option>
              <option value={30}>After 30 minutes</option>
              <option value={60}>After 1 hour</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 3: Station Filtering */}
      <div className="bg-[#0D0F12] border border-zinc-800/60 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Monitor className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Kitchen Station Configuration</h3>
            <p className="text-xs text-zinc-500">Filter orders to show only items assigned to this preparation station</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {[
            { id: 'ALL', label: 'All Stations (Main KDS)' },
            { id: 'GRILL', label: 'Grill / Steaks' },
            { id: 'PIZZA', label: 'Pizza & Oven' },
            { id: 'BAR', label: 'Bar & Drinks' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStation(st.id)}
              className={`p-3 rounded-lg border text-left text-xs font-medium transition-all ${
                station === st.id
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : 'bg-[#131518] border-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
