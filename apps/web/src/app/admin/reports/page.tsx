'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  DollarSign,
  Boxes,
  RefreshCw,
  Search,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { UserRole } from '@qr-menu/shared';

export default function AdminReportsPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [reportType, setReportType] = useState<'sales' | 'profit' | 'inventory'>('sales');
  const [reportData, setReportData] = useState<any | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReport = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      if (reportType === 'sales') {
        const data = await adminService.getSalesReport(restaurantId, dateFrom || undefined, dateTo || undefined, token);
        setReportData(data);
      } else if (reportType === 'profit') {
        const data = await adminService.getProfitReport(restaurantId, token);
        setReportData({ rows: data });
      } else {
        const data = await adminService.getInventoryReport(restaurantId, token);
        setReportData(data);
      }
    } catch (err) {
      console.warn('[AdminReports] Failed to fetch report data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [restaurantId, token, reportType]);

  const handleExportCSV = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const exportUrl = `${apiBase}/api/admin/reports/export?restaurantId=${restaurantId}&type=${reportType}`;
    window.open(exportUrl, '_blank');
  };

  return (
    <AdminLayout
      title="Financial Reports & CSV Exports"
      subtitle="Auditable Sales Books, Product Profitability & Valuation Sheets"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]}
      onRefresh={fetchReport}
      isRefreshing={refreshing}
    >
      {/* Report Controls & Switcher */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Report Type Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { type: 'sales', label: 'Itemized Sales Report', icon: DollarSign },
              { type: 'profit', label: 'Profit Margins Report', icon: TrendingUp },
              { type: 'inventory', label: 'Inventory Valuation Sheet', icon: Boxes },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.type}
                  type="button"
                  onClick={() => setReportType(tab.type as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap ${
                    reportType === tab.type
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md text-xs font-bold transition shadow-xs shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV Spreadsheet</span>
          </button>
        </div>

        {/* Date Filter for Sales Report */}
        {reportType === 'sales' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-xs flex-wrap">
            <span className="font-semibold text-slate-700">Filter Date Range:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900"
            />
            <button
              type="button"
              onClick={fetchReport}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-xs transition"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* Report Data Table Preview */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-xs text-slate-900 uppercase tracking-wider">
            {reportType === 'sales'
              ? `Itemized Sales Preview (${reportData?.rows?.length || 0} entries)`
              : reportType === 'profit'
              ? `Dish Profit Margins Preview (${reportData?.rows?.length || 0} dishes)`
              : `Inventory Valuation Preview (Total: Rs. ${reportData?.totalValuation?.toLocaleString() || 0})`}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Real DB Records</span>
        </div>

        <div className="overflow-x-auto">
          {reportType === 'sales' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Table</th>
                  <th className="py-3 px-4">Dish Name</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData?.rows?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                      No sales data in this date range.
                    </td>
                  </tr>
                ) : (
                  reportData?.rows?.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{row.orderNumber}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">Table {row.tableNumber}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{row.itemName}</td>
                      <td className="py-2.5 px-4 text-right font-mono">Rs. {row.unitPrice}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">{row.quantity}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        Rs. {row.subtotal.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-[10px] font-semibold text-slate-600">
                          {row.paymentMethod} ({row.paymentStatus})
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(row.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : reportType === 'profit' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="py-3 px-4">Dish Item</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-right">Units Sold</th>
                  <th className="py-3 px-4 text-right">Total Revenue</th>
                  <th className="py-3 px-4 text-right">Gross Profit</th>
                  <th className="py-3 px-4 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData?.rows?.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{row.itemName}</td>
                    <td className="py-2.5 px-4 text-slate-600">{row.category}</td>
                    <td className="py-2.5 px-4 text-right font-mono">Rs. {row.price}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">Rs. {row.costPrice}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">{row.unitsSold}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      Rs. {row.totalRevenue.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                      Rs. {row.grossProfit.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                      {row.profitMargin}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="py-3 px-4">Dish Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Stock Level</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-right">Inventory Valuation</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData?.rows?.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{row.itemName}</td>
                    <td className="py-2.5 px-4 text-slate-600">{row.category}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900">
                      {row.stockCount}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">Rs. {row.costPrice}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                      Rs. {row.sellingPrice}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      Rs. {row.totalValuation.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                          row.status === 'OUT_OF_STOCK'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : row.status === 'LOW_STOCK'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
