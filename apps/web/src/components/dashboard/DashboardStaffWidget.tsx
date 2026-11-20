'use client';

import React from 'react';
import Link from 'next/link';
import { Users, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { useDashboardTheme } from './DashboardThemeContext';
import { StaffUser } from '@qr-menu/shared';

interface DashboardStaffWidgetProps {
  staff: StaffUser[];
  loading: boolean;
}

const ROLE_BADGES: Record<string, string> = {
  SUPER_ADMIN: 'bg-[#F5B342]/15 text-[#F5B342] border-[#F5B342]/30',
  ADMIN: 'bg-[#F5B342]/15 text-[#F5B342] border-[#F5B342]/30',
  MANAGER: 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30',
  CHEF: 'bg-[#F97316]/15 text-[#F97316] border-[#F97316]/30',
  WAITER: 'bg-[#22D3EE]/15 text-[#22D3EE] border-[#22D3EE]/30',
  CASHIER: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30',
};

export function DashboardStaffWidget({ staff, loading }: DashboardStaffWidgetProps) {
  const { resolvedTheme } = useDashboardTheme();
  const isLight = resolvedTheme === 'light';

  return (
    <div
      className={`rounded-2xl border p-5 shadow-lg transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-[#15171A] border-[#25282D] text-[#F8FAFC]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-inherit">Staff & Operations Team</h3>
            <p className="text-[11px] text-[#A1A1AA]">Team members & active roles</p>
          </div>
        </div>
        <Link
          href="/admin/staff"
          className="flex items-center gap-1 text-xs font-semibold text-[#F5B342] hover:text-[#D6A84F] transition"
        >
          <span>Staff Hub</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-black/10 animate-pulse" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#A1A1AA]">
          No staff members registered
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr
                className={`border-b text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] ${
                  isLight ? 'border-slate-100' : 'border-[#25282D]'
                }`}
              >
                <th className="py-2 px-2">Staff Name</th>
                <th className="py-2 px-2">Role</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2 text-right">Base Salary</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-[#25282D]/60'}`}>
              {staff.slice(0, 5).map((member) => (
                <tr
                  key={member.id}
                  className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1B1E23]/60'}`}
                >
                  <td className="py-2.5 px-2">
                    <p className="font-semibold text-inherit leading-tight">{member.name}</p>
                    <p className="text-[10px] text-[#A1A1AA]">{member.email}</p>
                  </td>
                  <td className="py-2.5 px-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        ROLE_BADGES[member.role] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                        member.status === 'ACTIVE' ? 'text-[#22C55E]' : 'text-[#A1A1AA]'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          member.status === 'ACTIVE' ? 'bg-[#22C55E]' : 'bg-slate-400'
                        }`}
                      />
                      {member.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-semibold text-[#F5B342]">
                    {member.salary ? `Rs. ${member.salary.toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
