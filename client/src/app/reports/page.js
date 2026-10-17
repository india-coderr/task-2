'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { apiClient } from '../../lib/api';
import { formatCurrency, formatQuantity } from '../../lib/money';
import { getDaysAgoLocalString, getTodayLocalString, formatDisplayDate } from '../../lib/date';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

export default function ReportsPage() {
  const { isAdmin } = useAuth();
  const { settings } = useSettings();

  // Default to past 7 days to show comprehensive data
  const [fromDate, setFromDate] = useState(getDaysAgoLocalString(7));
  const [toDate, setToDate] = useState(getTodayLocalString());

  const [salesReport, setSalesReport] = useState(null);
  const [profitReport, setProfitReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const salesRes = await apiClient(`/reports/sales?from=${fromDate}&to=${toDate}`);
      setSalesReport(salesRes.data);

      if (isAdmin) {
        const profitRes = await apiClient(`/reports/profit?from=${fromDate}&to=${toDate}`);
        setProfitReport(profitRes.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch analytics and reports');
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, isAdmin]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const salesSummary = salesReport?.summary || {
    totalSales: 0,
    transactionsCount: 0,
    averageSale: 0
  };

  const profitSummary = profitReport?.summary || {
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    marginPercent: 0,
    totalTaxCollected: 0
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header and Date Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Sales & profit reports</h1>
            <p className="text-xs text-[#64748b]">
              Comprehensive turnover analysis and performance tracking.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-[#334155] bg-white border border-[#cbd5e1] p-1.5 rounded-[3px]">
            <span>From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-0.5 border border-[#cbd5e1] rounded-[3px] bg-white"
            />
            <span>To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-0.5 border border-[#cbd5e1] rounded-[3px] bg-white"
            />
            <button
              onClick={fetchReports}
              className="bg-[#15803d] text-white px-2.5 py-0.5 rounded-[3px] font-semibold"
            >
              Update
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[3px]">
            {errorMsg}
          </div>
        )}

        {/* Section 1: Sales Performance Metrics */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider">
            Sales overview ({fromDate} to {toDate})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-[#16a34a] rounded-[3px] p-3.5">
              <div className="text-[11px] text-[#64748b] font-medium">Gross revenue (inc. tax)</div>
              <div className="text-2xl font-bold text-[#0f172a] tabular-nums mt-1">
                {formatCurrency(salesSummary.totalSales, settings?.currencySymbol)}
              </div>
            </div>

            <div className="bg-white border border-[#d97706] rounded-[3px] p-3.5">
              <div className="text-[11px] text-[#64748b] font-medium">Completed transactions</div>
              <div className="text-2xl font-bold text-[#0f172a] tabular-nums mt-1">
                {formatQuantity(salesSummary.transactionsCount)}
              </div>
            </div>

            <div className="bg-white border border-[#16a34a] rounded-[3px] p-3.5">
              <div className="text-[11px] text-[#64748b] font-medium">Average transaction value</div>
              <div className="text-2xl font-bold text-[#0f172a] tabular-nums mt-1">
                {formatCurrency(salesSummary.averageSale, settings?.currencySymbol)}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Top Selling Products */}
        <div className="bg-white border border-[#cbd5e1] rounded-[3px] p-4">
          <h3 className="font-bold text-sm text-[#0f172a] mb-3">Top-selling products</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-[#64748b] font-medium">
                  <th className="pb-2">SKU</th>
                  <th className="pb-2">Product Name</th>
                  <th className="pb-2 text-right">Units Sold</th>
                  <th className="pb-2 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {salesReport?.topProducts?.length > 0 ? (
                  salesReport.topProducts.map((p) => (
                    <tr key={p.productId} className="hover:bg-[#f8fafc]">
                      <td className="py-2.5 font-mono text-[#64748b]">{p.sku}</td>
                      <td className="py-2.5 font-medium text-[#0f172a]">{p.name}</td>
                      <td className="py-2.5 text-right tabular-nums text-[#334155] font-semibold">
                        {p.quantitySold}
                      </td>
                      <td className="py-2.5 text-right tabular-nums font-bold text-[#0f172a]">
                        {formatCurrency(p.revenue, settings?.currencySymbol)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[#94a3b8]">
                      {isLoading ? 'Computing sales...' : 'No sales records for selected timeframe.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Daily Sales Breakdown Table */}
        <div className="bg-white border border-[#cbd5e1] rounded-[3px] p-4">
          <h3 className="font-bold text-sm text-[#0f172a] mb-3">Daily sales breakdown</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-[#64748b] font-medium">
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-center">Transactions</th>
                  <th className="pb-2 text-center">Total Items Sold</th>
                  <th className="pb-2 text-right">Day Gross Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {salesReport?.dailyBreakdown?.length > 0 ? (
                  salesReport.dailyBreakdown.map((d) => (
                    <tr key={d.date} className="hover:bg-[#f8fafc]">
                      <td className="py-2.5 font-medium text-[#0f172a]">
                        {formatDisplayDate(d.date)} ({d.date})
                      </td>
                      <td className="py-2.5 text-center tabular-nums text-[#334155]">{d.transactions}</td>
                      <td className="py-2.5 text-center tabular-nums text-[#334155]">{d.itemsCount}</td>
                      <td className="py-2.5 text-right tabular-nums font-bold text-[#0f172a]">
                        {formatCurrency(d.totalSales, settings?.currencySymbol)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[#94a3b8]">
                      No daily records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Admin Profit & Margin Report (Confidential - Admin Only) */}
        {isAdmin && (
          <div className="border-t border-[#cbd5e1] pt-6 space-y-4">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider">
                Gross Profit & COGS Analysis
              </h2>
              <span className="border border-[#15803d] text-[#15803d] font-bold text-[10px] px-1.5 py-0.5 rounded-[3px]">
                ADMIN CONFIDENTIAL
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-[#cbd5e1] rounded-[3px] p-3.5">
                <div className="text-[11px] text-[#64748b] font-medium">Net Revenue (Ex. Tax)</div>
                <div className="text-xl font-bold text-[#0f172a] tabular-nums mt-1">
                  {formatCurrency(profitSummary.revenue, settings?.currencySymbol)}
                </div>
              </div>

              <div className="bg-white border border-[#cbd5e1] rounded-[3px] p-3.5">
                <div className="text-[11px] text-[#64748b] font-medium">Cost of Goods Sold (COGS)</div>
                <div className="text-xl font-bold text-[#475569] tabular-nums mt-1">
                  {formatCurrency(profitSummary.cogs, settings?.currencySymbol)}
                </div>
              </div>

              <div className="bg-white border border-[#16a34a] rounded-[3px] p-3.5">
                <div className="text-[11px] text-[#64748b] font-medium">Gross Profit</div>
                <div className="text-xl font-bold text-[#15803d] tabular-nums mt-1">
                  {formatCurrency(profitSummary.grossProfit, settings?.currencySymbol)}
                </div>
              </div>

              <div className="bg-white border border-[#d97706] rounded-[3px] p-3.5">
                <div className="text-[11px] text-[#64748b] font-medium">Profit Margin %</div>
                <div className="text-xl font-bold text-[#d97706] tabular-nums mt-1">
                  {profitSummary.marginPercent}%
                </div>
              </div>
            </div>

            {/* Daily Profit Breakdown Table */}
            <div className="bg-white border border-[#cbd5e1] rounded-[3px] p-4">
              <h3 className="font-bold text-sm text-[#0f172a] mb-3">Daily Profit & Margin Table</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] text-[#64748b] font-medium">
                      <th className="pb-2">Date</th>
                      <th className="pb-2 text-center">Transactions</th>
                      <th className="pb-2 text-right">Net Revenue (Ex. Tax)</th>
                      <th className="pb-2 text-right">COGS</th>
                      <th className="pb-2 text-right">Gross Profit</th>
                      <th className="pb-2 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {profitReport?.dailyBreakdown?.length > 0 ? (
                      profitReport.dailyBreakdown.map((d) => (
                        <tr key={d.date} className="hover:bg-[#f8fafc]">
                          <td className="py-2.5 font-medium text-[#0f172a]">{formatDisplayDate(d.date)}</td>
                          <td className="py-2.5 text-center tabular-nums text-[#334155]">{d.transactions}</td>
                          <td className="py-2.5 text-right tabular-nums text-[#334155]">
                            {formatCurrency(d.revenue, settings?.currencySymbol)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-[#64748b]">
                            {formatCurrency(d.cogs, settings?.currencySymbol)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums font-semibold text-[#15803d]">
                            {formatCurrency(d.grossProfit, settings?.currencySymbol)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums font-bold text-[#0f172a]">
                            {d.marginPercent}%
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-[#94a3b8]">
                          No profit data available for this range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
