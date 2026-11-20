'use client';

import React from 'react';
import Link from 'next/link';
import {
  ChefHat,
  ConciergeBell,
  Boxes,
  Bot,
  QrCode,
  Box,
  Users,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

interface QuickLinkProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
  borderHover: string;
}

function QuickLink({ href, icon, title, description, accentColor, borderHover }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between p-3 rounded-xl border border-[#25282D] bg-[#1B1E23]/50 hover:bg-[#1B1E23] ${borderHover} transition group`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${accentColor}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold text-[#F8FAFC] group-hover:text-[#F5B342] transition">
            {title}
          </p>
          <p className="text-[10px] text-[#A1A1AA]">{description}</p>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-[#A1A1AA] group-hover:text-[#F5B342] transition shrink-0" />
    </Link>
  );
}

export function DashboardOperationsHub() {
  const links: QuickLinkProps[] = [
    {
      href: '/kds',
      icon: <ChefHat className="w-4 h-4" />,
      title: 'Kitchen Display',
      description: 'Live cook queue & tickets',
      accentColor: 'bg-[#F5B342]/10 text-[#F5B342] border border-[#F5B342]/20',
      borderHover: 'hover:border-[#F5B342]/40',
    },
    {
      href: '/admin/waiter',
      icon: <ConciergeBell className="w-4 h-4" />,
      title: 'Waiter Panel',
      description: 'Ready orders & table service',
      accentColor: 'bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20',
      borderHover: 'hover:border-[#22D3EE]/40',
    },
    {
      href: '/admin/inventory',
      icon: <Boxes className="w-4 h-4" />,
      title: 'Inventory',
      description: 'Stock levels & reorder alerts',
      accentColor: 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20',
      borderHover: 'hover:border-[#22C55E]/40',
    },
    {
      href: '/admin/tables',
      icon: <QrCode className="w-4 h-4" />,
      title: 'Tables & QR',
      description: 'QR codes & floor plan',
      accentColor: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20',
      borderHover: 'hover:border-[#8B5CF6]/40',
    },
    {
      href: '/admin/ar',
      icon: <Box className="w-4 h-4" />,
      title: '3D & AR Assets',
      description: 'Menu visualization models',
      accentColor: 'bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/20',
      borderHover: 'hover:border-[#F97316]/40',
    },
    {
      href: '/admin/staff',
      icon: <Users className="w-4 h-4" />,
      title: 'Staff & Payroll',
      description: 'Team management & shifts',
      accentColor: 'bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20',
      borderHover: 'hover:border-[#22D3EE]/40',
    },
    {
      href: '/admin/analytics',
      icon: <TrendingUp className="w-4 h-4" />,
      title: 'Analytics & Reports',
      description: 'Business intelligence',
      accentColor: 'bg-[#F5B342]/10 text-[#F5B342] border border-[#F5B342]/20',
      borderHover: 'hover:border-[#F5B342]/40',
    },
    {
      href: '/admin/ai',
      icon: <Bot className="w-4 h-4" />,
      title: 'AI Assistant',
      description: 'Revenue insights & queries',
      accentColor: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20',
      borderHover: 'hover:border-[#8B5CF6]/40',
    },
  ];

  return (
    <div className="rounded-2xl bg-[#15171A] border border-[#25282D] p-5 shadow-lg">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-[#F8FAFC]">Quick Access</h3>
        <p className="text-[11px] text-[#A1A1AA]">Operations & management modules</p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {links.map((link) => (
          <QuickLink key={link.href} {...link} />
        ))}
      </div>
    </div>
  );
}
