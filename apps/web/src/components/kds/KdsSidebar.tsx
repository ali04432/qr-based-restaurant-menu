'use client';

import React, { useState, useEffect } from 'react';
import { ChefHat, ClipboardList, CheckCircle2, Clock, List, Settings, LogOut } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';

interface KdsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  kdsTheme?: 'dark' | 'light';
}

export function KdsSidebar({ activeTab, onTabChange, kdsTheme = 'dark' }: KdsSidebarProps) {
  const { user, logout } = useAuthContext();
  const [time, setTime] = useState<Date | null>(null);

  const isLight = kdsTheme === 'light';

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tabs = [
    { id: 'all', label: 'Order Screen', icon: ClipboardList },
    { id: 'preparing', label: 'Preparing', icon: Clock },
    { id: 'ready', label: 'Ready', icon: CheckCircle2 },
    { id: 'completed', label: 'Completed', icon: List },
    { id: 'menu', label: 'Menu', icon: ChefHat },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const sidebarBg = isLight
    ? 'bg-white border-slate-200'
    : 'bg-[#0D0F12] border-[rgba(255,255,255,0.08)]';

  const titleColor = isLight ? 'text-slate-900' : 'text-white';
  const clockBg = isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#131518] border-zinc-800/60';
  const clockTimeColor = isLight ? 'text-slate-800' : 'text-white';
  const clockDateColor = isLight ? 'text-slate-400' : 'text-zinc-500';
  const userBadgeBg = isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900/50 border-zinc-800/60';
  const userNameColor = isLight ? 'text-slate-800' : 'text-white';
  const userRoleColor = isLight ? 'text-slate-400' : 'text-zinc-500';
  const userAvatarBg = isLight ? 'bg-slate-200' : 'bg-zinc-800';
  const userAvatarText = isLight ? 'text-slate-600' : 'text-zinc-300';

  return (
    <aside
      className={`w-64 h-screen fixed left-0 top-0 border-r flex flex-col z-30 transition-colors duration-200 ${sidebarBg}`}
    >
      {/* Brand Header */}
      <div className="p-6 pb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <ChefHat className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className={`text-lg font-bold leading-tight ${titleColor}`}>LUMIÈRE</h2>
            <p className="text-[10px] text-amber-500 uppercase tracking-wider font-semibold">Kitchen Display System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 h-10 rounded-md font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                  : isLight
                  ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${isActive ? 'text-amber-400' : isLight ? 'text-slate-400' : 'text-zinc-500'}`}
                strokeWidth={1.5}
              />
              <span className="text-sm">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Status & Profile */}
      <div className="p-4 space-y-4">
        {/* Live Clock Widget */}
        {time && (
          <div className={`p-3 rounded-lg border text-center transition-colors ${clockBg}`}>
            <div className={`text-xl font-medium font-display tracking-tight ${clockTimeColor}`}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className={`text-xs mt-1 ${clockDateColor}`}>
              {time.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric', weekday: 'short' })}
            </div>
          </div>
        )}

        {/* User Badge */}
        <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${userBadgeBg}`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${userAvatarBg}`}>
              <span className={`text-xs font-medium ${userAvatarText}`}>{user?.name?.charAt(0) || 'C'}</span>
            </div>
            <div className="truncate">
              <p className={`text-xs font-medium truncate ${userNameColor}`}>{user?.name || 'Chef'}</p>
              <p className={`text-[10px] uppercase ${userRoleColor}`}>{user?.role || 'Staff'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}
