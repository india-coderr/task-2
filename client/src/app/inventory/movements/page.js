'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { apiClient } from '../../../lib/api';
import { formatDisplayDateTime } from '../../../lib/date';

export default function MovementsPage() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalCount: 0 });

  // Filters
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const fetchProductsList = useCallback(async () => {
    try {
      const res = await apiClient('/products?limit=100');
      setProducts(res.data || []);
    } catch (err) {
      console.warn('Could not load products:', err.message);
    }
  }, []);

  const fetchMovements = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20'
      });
      if (selectedProductId) params.append('productId', selectedProductId);
      if (selectedType && selectedType !== 'all') params.append('type', selectedType);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const res = await apiClient(`/inventory/movements?${params.toString()}`);
      setMovements(res.data);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load stock movements');
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedProductId, selectedType, fromDate, toDate]);

  useEffect(() => {
    fetchProductsList();
  }, [fetchProductsList]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const renderTypeBadge = (type) => {
    switch (type) {
      case 'initial':
        return <span className="text-gray-700 font-medium">Initial stock</span>;
      case 'stock_received':
        return <span className="text-[#15803d] font-semibold">Stock received</span>;
      case 'adjustment_increase':
        return <span className="text-blue-700 font-medium">Adjustment (+ve)</span>;
      case 'adjustment_decrease':
        return <span className="text-amber-700 font-medium">Adjustment (-ve)</span>;
      case 'sale':
        return <span className="text-purple-700 font-medium">Sale deduction</span>;
      default:
        return <span>{type}</span>;
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Stock movements audit log</h1>
          <p className="text-xs text-[#64748b]">
            Immutable, append-only log of every inventory balance change and transaction.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[3px]">
            {errorMsg}
          </div>
        )}

        {/* Filter bar */}
        <div className="bg-white border border-[#cbd5e1] rounded-[3px] p-3 flex flex-wrap items-center gap-2.5 text-xs">
          <select
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-56 px-2.5 py-1 border border-[#cbd5e1] rounded-[3px] bg-white"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1 border border-[#cbd5e1] rounded-[3px] bg-white"
          >
            <option value="all">All Movement Types</option>
            <option value="initial">Initial opening stock</option>
            <option value="stock_received">Stock received</option>
            <option value="adjustment_increase">Adjustment increase</option>
            <option value="adjustment_decrease">Adjustment decrease</option>
            <option value="sale">Sale</option>
          </select>

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

          {(selectedProductId || selectedType !== 'all' || fromDate || toDate) && (
            <button
              onClick={() => {
                setSelectedProductId('');
                setSelectedType('all');
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

        {/* Movements Audit Table */}
        <div className="bg-white border border-[#cbd5e1] rounded-[3px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#64748b]">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Timestamp</th>
                  <th className="py-2.5 px-3 font-medium">Product</th>
                  <th className="py-2.5 px-3 font-medium">SKU</th>
                  <th className="py-2.5 px-3 font-medium">Type</th>
                  <th className="py-2.5 px-3 font-medium text-center">Change</th>
                  <th className="py-2.5 px-3 font-medium text-center">Balance Before</th>
                  <th className="py-2.5 px-3 font-medium text-center">Balance After</th>
                  <th className="py-2.5 px-3 font-medium">User</th>
                  <th className="py-2.5 px-3 font-medium">Reason / Note</th>
                  <th className="py-2.5 px-3 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {movements.length > 0 ? (
                  movements.map((m) => (
                    <tr key={m._id} className="hover:bg-[#f8fafc]">
                      <td className="py-2.5 px-3 text-[#64748b] whitespace-nowrap">
                        {formatDisplayDateTime(m.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#0f172a]">{m.nameSnapshot}</td>
                      <td className="py-2.5 px-3 font-mono text-[#64748b]">{m.skuSnapshot}</td>
                      <td className="py-2.5 px-3">{renderTypeBadge(m.type)}</td>
                      <td className="py-2.5 px-3 text-center tabular-nums font-semibold">
                        {m.quantityChange > 0 ? (
                          <span className="text-[#15803d]">+{m.quantityChange}</span>
                        ) : (
                          <span className="text-red-600">{m.quantityChange}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums text-[#64748b]">
                        {m.balanceBefore}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums font-bold text-[#0f172a]">
                        {m.balanceAfter}
                      </td>
                      <td className="py-2.5 px-3 text-[#475569]">
                        {m.performedBy?.name || 'System'}
                      </td>
                      <td className="py-2.5 px-3 text-[#64748b] max-w-xs truncate" title={m.reason}>
                        {m.reason || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        {m.reference?.invoiceNumber ? (
                          <Link
                            href={`/sales/${m.reference.saleId}`}
                            className="font-mono text-[#15803d] hover:underline"
                          >
                            {m.reference.invoiceNumber}
                          </Link>
                        ) : (
                          <span className="text-[#94a3b8]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-[#94a3b8]">
                      {isLoading ? 'Loading audit trail...' : 'No stock movements found matching criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-between text-xs text-[#64748b]">
            <div>
              Showing {movements.length} of {meta.totalCount} movement logs
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
