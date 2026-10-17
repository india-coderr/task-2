'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { Modal } from '../../components/Modal';
import { apiClient } from '../../lib/api';
import { formatCurrency, formatQuantity } from '../../lib/money';
import { getTodayLocalString, formatDisplayTime } from '../../lib/date';
import { useSettings } from '../../context/SettingsContext';

export default function DashboardPage() {
  const { settings, refreshLowStockCount } = useSettings();
  const [fromDate, setFromDate] = useState(getTodayLocalString());
  const [toDate, setToDate] = useState(getTodayLocalString());
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Quick Receive Stock Modal state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [receiveQty, setReceiveQty] = useState('');
  const [receiveNote, setReceiveNote] = useState('');
  const [isReceiving, setIsReceiving] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await apiClient(`/reports/sales?from=${fromDate}&to=${toDate}`);
      setReportData(res.data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleOpenReceive = (product) => {
    setSelectedProduct(product);
    setReceiveQty('10');
    setReceiveNote('');
    setModalError('');
  };

  const handleReceiveStockSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setIsReceiving(true);
    try {
      await apiClient('/inventory/adjustments', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProduct._id,
          type: 'stock_received',
          quantity: parseInt(receiveQty, 10),
          reason: receiveNote || 'Restocked from dashboard'
        })
      });
      setSelectedProduct(null);
      fetchDashboardData();
      refreshLowStockCount();
    } catch (err) {
      setModalError(err.message || 'Could not record received stock');
    } finally {
      setIsReceiving(false);
    }
  };

  const summary = reportData?.summary || {
    totalSales: 0,
    transactionsCount: 0,
    averageSale: 0,
    lowStockCount: 0
  };

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        {/* Header with Title and Date Range Selectors - Exactly from Image 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Dashboard</h1>

          <div className="flex items-center space-x-2 text-xs text-[#334155]">
            <span>From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-white border border-[#cbd5e1] rounded-[3px] px-2 py-1 text-xs text-[#0f172a] focus:outline-none focus:border-[#15803d]"
            />
            <span>To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-white border border-[#cbd5e1] rounded-[3px] px-2 py-1 text-xs text-[#0f172a] focus:outline-none focus:border-[#15803d]"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[3px]">
            {errorMsg}
          </div>
        )}

        {/* 4 Summary Metric Panels - Exactly matched to Image 1 design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Sales - Green Border */}
          <div className="bg-white border border-[#16a34a] rounded-[3px] p-3.5">
            <div className="text-[11px] text-[#64748b] font-medium">Sales</div>
            <div className="text-2xl font-bold text-[#0f172a] tabular-nums mt-1">
              {formatCurrency(summary.totalSales, settings?.currencySymbol)}
            </div>
          </div>

          {/* Transactions - Amber Border */}
          <div className="bg-white border border-[#d97706] rounded-[3px] p-3.5">
            <div className="text-[11px] text-[#64748b] font-medium">Transactions</div>
            <div className="text-2xl font-bold text-[#0f172a] tabular-nums mt-1">
              {formatQuantity(summary.transactionsCount)}
            </div>
          </div>

          {/* Average sale - Green Border */}
          <div className="bg-white border border-[#16a34a] rounded-[3px] p-3.5">
            <div className="text-[11px] text-[#64748b] font-medium">Average sale</div>
            <div className="text-2xl font-bold text-[#0f172a] tabular-nums mt-1">
              {formatCurrency(summary.averageSale, settings?.currencySymbol)}
            </div>
          </div>

          {/* Low stock - Amber Border */}
          <div className="bg-white border border-[#d97706] rounded-[3px] p-3.5">
            <div className="text-[11px] text-[#64748b] font-medium">Low stock</div>
            <div className="text-2xl font-bold text-[#0f172a] tabular-nums mt-1">
              {summary.lowStockCount} {summary.lowStockCount === 1 ? 'product' : 'products'}
            </div>
          </div>
        </div>

        {/* Middle Section: Top Products (Left, Green Border) and Low Stock (Right, Amber Border) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top products Table Panel */}
          <div className="bg-white border border-[#16a34a] rounded-[3px] p-4 flex flex-col">
            <h2 className="font-bold text-[14px] text-[#0f172a] mb-3">Top products</h2>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-[#64748b] font-medium">
                    <th className="pb-2">Product</th>
                    <th className="pb-2 text-right">Sold</th>
                    <th className="pb-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {reportData?.topProducts?.length > 0 ? (
                    reportData.topProducts.slice(0, 5).map((prod) => (
                      <tr key={prod.productId} className="hover:bg-[#f8fafc]">
                        <td className="py-2.5 font-medium text-[#0f172a]">{prod.name}</td>
                        <td className="py-2.5 text-right tabular-nums text-[#334155]">
                          {prod.quantitySold}
                        </td>
                        <td className="py-2.5 text-right tabular-nums font-medium text-[#0f172a]">
                          {formatCurrency(prod.revenue, settings?.currencySymbol)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-[#94a3b8]">
                        {isLoading ? 'Loading top products...' : 'No sales recorded for this date range'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low stock Alert List Panel */}
          <div className="bg-white border border-[#d97706] rounded-[3px] p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-[14px] text-[#0f172a]">Low stock</h2>
              <Link
                href="/inventory/low-stock"
                className="text-xs font-semibold text-[#15803d] hover:underline"
              >
                View all {summary.lowStockCount}
              </Link>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-[#64748b] font-medium">
                    <th className="pb-2">Product</th>
                    <th className="pb-2">Stock</th>
                    <th className="pb-2">Reorder at</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {reportData?.topLowStock?.length > 0 ? (
                    reportData.topLowStock.map((prod) => (
                      <tr key={prod._id} className="hover:bg-[#f8fafc]">
                        <td className="py-2 text-[#0f172a] font-medium">{prod.name}</td>
                        <td className="py-2 tabular-nums">
                          {prod.stock === 0 ? (
                            <span className="text-red-600 font-semibold flex items-center space-x-1">
                              <span>●</span>
                              <span>Out</span>
                            </span>
                          ) : (
                            <span className="text-[#b45309] font-medium flex items-center space-x-1">
                              <span>●</span>
                              <span>{prod.stock}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-[#64748b] tabular-nums">{prod.reorderLevel}</td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => handleOpenReceive(prod)}
                            className="border border-[#16a34a] hover:bg-[#f0fdf4] text-[#15803d] font-semibold text-[11px] px-2.5 py-0.5 rounded-[3px] transition-colors"
                          >
                            Receive
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[#94a3b8]">
                        All products are currently well stocked!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom Section: Recent Sales Table - Amber Border Panel */}
        <div className="bg-white border border-[#d97706] rounded-[3px] p-4">
          <h2 className="font-bold text-[14px] text-[#0f172a] mb-3">Recent sales</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-[#64748b] font-medium">
                  <th className="pb-2">Invoice</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2 text-center">Items</th>
                  <th className="pb-2">Payment</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {reportData?.recentSales?.length > 0 ? (
                  reportData.recentSales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-[#f8fafc]">
                      <td className="py-2.5">
                        <Link
                          href={`/sales/${sale._id}`}
                          className="font-mono text-[#0f172a] hover:text-[#15803d] hover:underline"
                        >
                          {sale.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 text-[#64748b] tabular-nums">
                        {formatDisplayTime(sale.createdAt)}
                      </td>
                      <td className="py-2.5 text-center text-[#334155] tabular-nums">
                        {sale.items?.reduce((acc, i) => acc + (i.quantity || 0), 0) || sale.items?.length || 1}
                      </td>
                      <td className="py-2.5 text-[#334155]">{sale.paymentMethod}</td>
                      <td className="py-2.5 text-right font-semibold text-[#0f172a] tabular-nums">
                        {formatCurrency(sale.total, settings?.currencySymbol)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#94a3b8]">
                      {isLoading ? 'Loading recent sales...' : 'No sales found for the selected range.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for Quick Receive Stock from Dashboard */}
      <Modal
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        title={`Receive Stock: ${selectedProduct?.name || ''}`}
      >
        <form onSubmit={handleReceiveStockSubmit} className="space-y-3">
          {modalError && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[3px]">
              {modalError}
            </div>
          )}

          <div className="text-xs text-[#64748b]">
            SKU: <span className="font-mono text-[#0f172a] font-semibold">{selectedProduct?.sku}</span> | Current Stock: <span className="font-semibold text-[#0f172a]">{selectedProduct?.stock}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#334155] mb-1">
              Quantity Received (units)
            </label>
            <input
              type="number"
              min="1"
              value={receiveQty}
              onChange={(e) => setReceiveQty(e.target.value)}
              required
              className="w-full px-3 py-1.5 text-xs border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#15803d]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#334155] mb-1">
              Supplier / Reference Note (Optional)
            </label>
            <input
              type="text"
              value={receiveNote}
              onChange={(e) => setReceiveNote(e.target.value)}
              placeholder="e.g. PO #1084, Morning vendor delivery"
              className="w-full px-3 py-1.5 text-xs border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#15803d]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="px-3 py-1.5 border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs text-[#334155] rounded-[3px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isReceiving}
              className="px-4 py-1.5 bg-[#15803d] hover:bg-[#166534] disabled:opacity-50 text-white font-medium text-xs rounded-[3px]"
            >
              {isReceiving ? 'Updating...' : 'Confirm Received Stock'}
            </button>
          </div>
        </form>
      </Modal>
    </ProtectedRoute>
  );
}
