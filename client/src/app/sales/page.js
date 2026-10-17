'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { apiClient } from '../../lib/api';
import { formatCurrency } from '../../lib/money';
import { formatDisplayDateTime } from '../../lib/date';
import { useSettings } from '../../context/SettingsContext';

export default function SalesHistoryPage() {
  const { settings } = useSettings();
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalCount: 0 });

  // Filters
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20'
      });
      if (invoiceSearch.trim()) params.append('invoiceNumber', invoiceSearch.trim());
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const res = await apiClient(`/sales?${params.toString()}`);
      setSales(res.data);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load sales');
    } finally {
      setIsLoading(false);
    }
  }, [page, invoiceSearch, fromDate, toDate]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Sales history</h1>
            <p className="text-xs text-[#64748b]">Past transactions and recorded customer invoices.</p>
          </div>

          <Link
            href="/sales/new"
            className="bg-[#15803d] hover:bg-[#166534] text-white text-xs font-semibold px-3 py-1.5 rounded-[3px] transition-colors"
          >
            + New Sale
          </Link>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[3px]">
            {errorMsg}
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="bg-white border border-[#cbd5e1] rounded-[3px] p-3 flex flex-wrap items-center gap-2.5 text-xs">
          <input
            type="text"
            value={invoiceSearch}
            onChange={(e) => {
              setInvoiceSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search invoice number..."
            className="w-full sm:w-56 px-2.5 py-1 border border-[#cbd5e1] rounded-[3px] font-mono focus:outline-none focus:border-[#15803d]"
          />

          <div className="flex items-center space-x-1">
            <span>From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 border border-[#cbd5e1] rounded-[3px] bg-white"
            />
          </div>

          <div className="flex items-center space-x-1">
            <span>To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 border border-[#cbd5e1] rounded-[3px] bg-white"
            />
          </div>

          {(invoiceSearch || fromDate || toDate) && (
            <button
              onClick={() => {
                setInvoiceSearch('');
                setFromDate('');
                setToDate('');
                setPage(1);
              }}
              className="text-[#15803d] hover:underline font-semibold text-xs ml-auto"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Sales Table */}
        <div className="bg-white border border-[#cbd5e1] rounded-[3px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#64748b]">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Invoice Number</th>
                  <th className="py-2.5 px-3 font-medium">Date & Time</th>
                  <th className="py-2.5 px-3 font-medium">Customer</th>
                  <th className="py-2.5 px-3 font-medium text-center">Items</th>
                  <th className="py-2.5 px-3 font-medium">Payment</th>
                  <th className="py-2.5 px-3 font-medium text-right">Total</th>
                  <th className="py-2.5 px-3 font-medium">Cashier</th>
                  <th className="py-2.5 px-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {sales.length > 0 ? (
                  sales.map((s) => (
                    <tr key={s._id} className="hover:bg-[#f8fafc]">
                      <td className="py-2.5 px-3 font-mono font-semibold text-[#0f172a]">
                        <Link href={`/sales/${s._id}`} className="hover:text-[#15803d] hover:underline">
                          {s.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-[#64748b]">
                        {formatDisplayDateTime(s.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 text-[#334155]">
                        {s.customerName || <span className="text-[#94a3b8]">Walk-in</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums text-[#334155]">
                        {s.items?.reduce((acc, i) => acc + (i.quantity || 0), 0) || s.items?.length || 1}
                      </td>
                      <td className="py-2.5 px-3 text-[#334155]">{s.paymentMethod}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold text-[#0f172a]">
                        {formatCurrency(s.total, settings?.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-[#64748b]">{s.createdBy?.name || 'Staff'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/sales/${s._id}`}
                          className="border border-[#cbd5e1] hover:bg-[#f8fafc] text-[#334155] font-medium px-2 py-0.5 rounded-[3px] text-[11px]"
                        >
                          Print invoice
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#94a3b8]">
                      {isLoading ? 'Loading sales records...' : 'No sales invoices found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-between text-xs text-[#64748b]">
            <div>
              Showing {sales.length} of {meta.totalCount} sales
            </div>
            <div className="flex items-center space-x-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2.5 py-1 border border-[#cbd5e1] rounded-[3px] bg-white disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 font-medium text-[#0f172a]">
                Page {page} of {meta.totalPages}
              </span>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 border border-[#cbd5e1] rounded-[3px] bg-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
