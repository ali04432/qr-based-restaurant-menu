'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Edit2,
  DollarSign,
  History,
  Shield,
  CheckCircle2,
  AlertCircle,
  X,
  UserPlus,
  Briefcase,
  TrendingUp,
  UserCheck,
  Building,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { StaffUser, PayrollSummary, UserRole } from '@qr-menu/shared';

const ROLES = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.CHEF,
  UserRole.WAITER,
  UserRole.CASHIER,
];

const ROLE_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  SUPER_ADMIN: { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
  ADMIN: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  MANAGER: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
  CHEF: { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30' },
  WAITER: { bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border-teal-500/30' },
  CASHIER: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
};

export default function AdminStaffPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [payroll, setPayroll] = useState<PayrollSummary | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'STAFF' | 'PAYROLL' | 'ACTIVITY'>('STAFF');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.WAITER);
  const [salary, setSalary] = useState<number>(45000);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const [staffData, payrollData, activityData] = await Promise.all([
        adminService.getStaff(restaurantId, token),
        adminService.getPayrollSummary(restaurantId, token),
        adminService.getStaffActivity(restaurantId, 50, token),
      ]);
      setStaffList(staffData || []);
      setPayroll(payrollData || null);
      setActivityLogs(activityData || []);
    } catch (err) {
      console.warn('[AdminStaff] Failed to fetch staff data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setName('');
    setEmail('');
    setPassword('password123');
    setRole(UserRole.WAITER);
    setSalary(45000);
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (s: StaffUser) => {
    setEditingStaff(s);
    setName(s.name);
    setEmail(s.email);
    setPassword('');
    setRole(s.role);
    setSalary(s.salary ?? 45000);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormError('');
    setIsSubmitting(true);

    try {
      if (editingStaff) {
        const updated = await adminService.updateStaff(
          editingStaff.id,
          {
            name: name.trim(),
            role,
            salary: Number(salary),
            ...(password ? { password } : {}),
          },
          token
        );
        setStaffList((prev) => prev.map((s) => (s.id === editingStaff.id ? updated : s)));
      } else {
        const created = await adminService.createStaff(
          {
            restaurantId,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            role,
            salary: Number(salary),
          },
          token
        );
        setStaffList((prev) => [...prev, created]);
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title="Staff & Payroll Management"
      subtitle="Role-Based Staff Directory, Authoritative Monthly Payroll & Action Audit Feed"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]}
      onRefresh={fetchData}
      isRefreshing={refreshing}
    >
      {/* Payroll & Staff KPI Summary Cards (Section 20 & 38) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Staff
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {staffList.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total registered accounts</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Employees
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            {payroll?.totalActiveStaff || staffList.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Active status staff</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Monthly Payroll
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            Rs. {(payroll?.monthlyPayrollTotal || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-amber-400 font-medium mt-1">Total active wage cost</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Average Wage
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-200 mt-2">
            Rs. {Math.round(payroll?.averageSalary || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Per staff member</p>
        </div>
      </div>

      {/* View Tabs Bar */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('STAFF')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'STAFF'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Staff Directory ({staffList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PAYROLL')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'PAYROLL'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Payroll Breakdown</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACTIVITY')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'ACTIVITY'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80'
            }`}
          >
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span>Staff Action Logs ({activityLogs.length})</span>
          </button>
        </div>

        {activeTab === 'STAFF' && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-md shadow-amber-950/40 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Account</span>
          </button>
        )}
      </div>

      {/* Tab 1: Staff Directory Table */}
      {activeTab === 'STAFF' && (
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl shadow-xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
              <thead className="bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Assigned Role</th>
                  <th className="py-3.5 px-4">Email Address</th>
                  <th className="py-3.5 px-4 text-right">Monthly Wage</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {staffList.map((s) => {
                  const roleBadge = ROLE_BADGES[s.role] || ROLE_BADGES.WAITER;

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-xs">{s.name}</div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ID: {s.id.slice(0, 8)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}
                        >
                          {s.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-400 text-xs">
                        {s.email}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                        Rs. {(s.salary || 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Edit staff details"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Monthly Payroll Breakdown */}
      {activeTab === 'PAYROLL' && payroll && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Monthly Departmental Wage Distributions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(payroll.roleBreakdown || {}).map(([r, data]: [string, any]) => (
                <div key={r} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      {r} Team
                    </span>
                    <span className="text-sm font-bold text-white mt-1 block">
                      {data.count} Staff Member(s)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-emerald-400 block">
                      Rs. {data.totalCost?.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500">Total payroll</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Staff Action Logs (Section 39) */}
      {activeTab === 'ACTIVITY' && (
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl shadow-xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
              <thead className="bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Action Performed</th>
                  <th className="py-3 px-4">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activityLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500 text-xs">
                      No staff actions logged yet.
                    </td>
                  </tr>
                ) : (
                  activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        <div>{log.staffName}</div>
                        <span className="text-[10px] text-amber-400 font-mono font-normal">
                          {log.staffRole}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-200 border border-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {log.details || 'Standard operational task'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingStaff ? `Edit Staff: ${editingStaff.name}` : 'Create Staff Member Account'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tariq Khan"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {!editingStaff && (
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@silversapoon.com"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  {editingStaff ? 'Reset Password (optional)' : 'Password *'}
                </label>
                <input
                  type="password"
                  required={!editingStaff}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingStaff ? 'Leave blank to keep current' : 'Min 6 characters'}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Operational Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Monthly Wage (Rs.) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={salary}
                    onChange={(e) => setSalary(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingStaff ? 'Update Staff' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
