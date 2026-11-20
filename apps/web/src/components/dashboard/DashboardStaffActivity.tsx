'use client';

import React from 'react';
import Link from 'next/link';
import { Users, ArrowUpRight } from 'lucide-react';
import { StaffActivitySummary } from '@qr-menu/shared';

interface DashboardStaffActivityProps {
  activities: StaffActivitySummary[];
  loading: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-[#F5B342]/10 text-[#F5B342] border-[#F5B342]/20',
  ADMIN: 'bg-[#F5B342]/10 text-[#F5B342] border-[#F5B342]/20',
  MANAGER: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20',
  CHEF: 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20',
  WAITER: 'bg-[#22D3EE]/10 text-[#22D3EE] border-[#22D3EE]/20',
  CASHIER: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20',
};

export function DashboardStaffActivity({ activities, loading }: DashboardStaffActivityProps) {
  return (
    <div className="rounded-2xl bg-[#15171A] border border-[#25282D] p-5 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F8FAFC]">Staff Activity</h3>
            <p className="text-[11px] text-[#A1A1AA]">Recent team actions</p>
          </div>
        </div>
        <Link
          href="/admin/staff"
          className="flex items-center gap-1 text-xs font-semibold text-[#F5B342] hover:text-[#D6A84F] transition"
        >
          <span>View All</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Activity Feed */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-[#1B1E23] animate-pulse" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#A1A1AA]">
          No recent staff activity
        </div>
      ) : (
        <div className="space-y-1">
          {activities.slice(0, 6).map((activity) => {
            const roleStyle = ROLE_COLORS[activity.staffRole] || ROLE_COLORS.WAITER;
            return (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[#1B1E23] transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#1B1E23] border border-[#25282D] flex items-center justify-center text-[11px] font-bold text-[#F5B342] shrink-0">
                    {activity.staffName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#F8FAFC] truncate">
                        {activity.staffName}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${roleStyle}`}
                      >
                        {activity.staffRole}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#A1A1AA] truncate">
                      {activity.action}
                      {activity.details ? ` - ${activity.details}` : ''}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-[#A1A1AA] shrink-0 ml-2">
                  {new Date(activity.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
