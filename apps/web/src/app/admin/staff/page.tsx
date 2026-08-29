'use client';

import React, { useState, useEffect } from 'react';
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

  const fetchData = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const [staffData, payrollData, activityData] = await Promise.all([
        adminService.getStaff(restaurantId, token),
        adminService.getPayrollSummary(restaurantId, token),
        adminService.getStaffActivity(restaurantId, token),
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
  };

  useEffect(() => {
    fetchData();
  }, [restaurantId, token]);

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
      subtitle="Role-Based Access Control, Employee Records & Operational Audit Feed"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]}
      onRefresh={fetchData}
      isRefreshing={refreshing}
    >
      {/* View Tabs Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('STAFF')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition ${
              activeTab === 'STAFF'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Directory ({staffList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PAYROLL')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition ${
              activeTab === 'PAYROLL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Monthly Payroll</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACTIVITY')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition ${
              activeTab === 'ACTIVITY'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Staff Action Logs ({activityLogs.length})</span>
          </button>
        </div>

        {activeTab === 'STAFF' && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Account</span>
          </button>
        )}
      </div>

      {/* Tab 1: Staff Directory */}
      {activeTab === 'STAFF' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4 text-right">Monthly Salary</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{s.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                        {s.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {/* phone not in shared StaffUser type */}
                      {(s as any).phone || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      Rs. {(s.salary || 45000).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(s)}
                        className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                        title="Edit Staff Member"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Monthly Payroll Breakdown */}
      {activeTab === 'PAYROLL' && (
        <div className="space-y-6">
          {/* Payroll KPI summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Monthly Payroll
              </span>
              <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                Rs. {payroll?.monthlyPayrollTotal?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Across all active employees</p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Active Staff Headcount
              </span>
              <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                {payroll?.totalActiveStaff || 0} Staff
              </div>
              <p className="text-xs text-slate-500 mt-1">Kitchen, floor, & management</p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Average Staff Salary
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-2 font-mono">
                Rs. {payroll?.averageSalary?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Monthly median compensation</p>
            </div>
          </div>

          {/* Role Salary Distribution Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-900 uppercase tracking-wider">
              Department & Role Payroll Distribution
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Role Department</th>
                  <th className="py-3 px-4 text-right">Headcount</th>
                  <th className="py-3 px-4 text-right">Total Payroll</th>
                  <th className="py-3 px-4 text-right">Avg / Member</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payroll?.roleBreakdown && Object.entries(payroll.roleBreakdown).map(([roleName, rb]) => (
                  <tr key={roleName} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900 uppercase tracking-wider">
                      {roleName}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                      {rb.count}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      Rs. {rb.totalCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      Rs. {rb.count > 0 ? Math.round(rb.totalCost / rb.count).toLocaleString() : 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Staff Action Logs */}
      {activeTab === 'ACTIVITY' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Action Event</th>
                  <th className="py-3 px-4">Audit Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activityLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                      No staff activity logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {log.staffName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-100 text-slate-700">
                          {log.staffRole}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-700">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingStaff ? 'Edit Staff Profile' : 'Register Staff Account'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-2 rounded bg-rose-50 text-rose-700 text-xs flex items-center gap-1.5 border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tariq Mehmood"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                />
              </div>

              {!editingStaff && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tariq@restaurant.com"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {editingStaff ? 'New Password (leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  required={!editingStaff}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role Permission
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 font-bold focus:outline-hidden focus:border-slate-900"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Salary (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={salary}
                    onChange={(e) => setSalary(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-1.5 px-3 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-1.5 px-4 rounded text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingStaff ? 'Save Changes' : 'Register Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
