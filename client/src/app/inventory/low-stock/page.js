'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { Modal } from '../../../components/Modal';
import { apiClient } from '../../../lib/api';
import { formatCurrency } from '../../../lib/money';
import { useSettings } from '../../../context/SettingsContext';

export default function LowStockPage() {
  const { settings, refreshLowStockCount } = useSettings();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Receive stock modal state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [receiveQty, setReceiveQty] = useState('10');
  const [receiveNote, setReceiveNote] = useState('');
  const [isReceiving, setIsReceiving] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchLowStockProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await apiClient('/inventory/low-stock');
      setProducts(res.data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load low-stock items');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLowStockProducts();
  }, [fetchLowStockProducts]);

  const handleOpenReceive = (p) => {
    setSelectedProduct(p);
    setReceiveQty('15');
    setReceiveNote('');
    setModalError('');
  };

  const handleReceiveSubmit = async (e) => {
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
          reason: receiveNote || 'Restock from low-stock alert dashboard'
        })
      });
      setSelectedProduct(null);
      fetchLowStockProducts();
      refreshLowStockCount();
    } catch (err) {
      setModalError(err.message || 'Failed to update stock');
    } finally {
      setIsReceiving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-[#0f172a] tracking-tight flex items-center space-x-2">
              <span>Low-stock alerts</span>
              <span className="border border-[#f59e0b] text-[#b45309] font-bold text-xs px-2 py-0.5 rounded-[3px]">
                {products.length} {products.length === 1 ? 'item' : 'items'}
              </span>
            </h1>
            <p className="text-xs text-[#64748b]">
              Products at or below designated reorder threshold, prioritized by replenishment urgency.
            </p>
          </div>

          <Link
            href="/products"
            className="text-xs text-[#15803d] hover:underline font-semibold"
          >
            ← View full catalogue
          </Link>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[3px]">
            {errorMsg}
          </div>
        )}

        {/* Low Stock Table */}
        <div className="bg-white border border-[#cbd5e1] rounded-[3px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#64748b]">
                <tr>
                  <th className="py-2.5 px-3 font-medium">SKU</th>
                  <th className="py-2.5 px-3 font-medium">Product</th>
                  <th className="py-2.5 px-3 font-medium">Category</th>
                  <th className="py-2.5 px-3 font-medium text-right">Selling Price</th>
                  <th className="py-2.5 px-3 font-medium text-center">Available Stock</th>
                  <th className="py-2.5 px-3 font-medium text-center">Reorder Threshold</th>
                  <th className="py-2.5 px-3 font-medium text-center">Urgency</th>
                  <th className="py-2.5 px-3 font-medium text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {products.length > 0 ? (
                  products.map((p) => {
                    const isOut = p.stock === 0;

                    return (
                      <tr key={p._id} className="hover:bg-[#f8fafc]">
                        <td className="py-2.5 px-3 font-mono text-[#475569]">{p.sku}</td>
                        <td className="py-2.5 px-3 font-medium text-[#0f172a]">{p.name}</td>
                        <td className="py-2.5 px-3 text-[#64748b]">{p.category}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[#0f172a] font-medium">
                          {formatCurrency(p.sellingPrice, settings?.currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums">
                          {isOut ? (
                            <span className="text-red-600 font-semibold inline-flex items-center space-x-1">
                              <span>●</span>
                              <span>0 (Out)</span>
                            </span>
                          ) : (
                            <span className="text-[#b45309] font-medium inline-flex items-center space-x-1">
                              <span>●</span>
                              <span>{p.stock} units</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums text-[#64748b]">
                          {p.reorderLevel} units
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isOut ? (
                            <span className="text-xs font-bold text-red-600">CRITICAL</span>
                          ) : (
                            <span className="text-xs font-semibold text-[#b45309]">LOW</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleOpenReceive(p)}
                            className="bg-[#15803d] hover:bg-[#166534] text-white font-semibold text-[11px] px-3 py-1 rounded-[3px] transition-colors"
                          >
                            Receive stock
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[#94a3b8]">
                      {isLoading ? 'Scanning inventory...' : 'Great news! All products are adequately stocked.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Restock Modal */}
      <Modal
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        title={`Receive Stock: ${selectedProduct?.name || ''}`}
      >
        <form onSubmit={handleReceiveSubmit} className="space-y-3">
          {modalError && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[3px]">
              {modalError}
            </div>
          )}

          <div className="text-xs text-[#64748b]">
            SKU: <span className="font-mono text-[#0f172a] font-semibold">{selectedProduct?.sku}</span> | Current Available:{' '}
            <span className="font-semibold text-red-600">{selectedProduct?.stock}</span> units
          </div>

          <div>
            <label className="block text-xs font-medium text-[#334155] mb-1">
              Quantity Received (units)
            </label>
            <input
              type="number"
              min="1"
              required
              value={receiveQty}
              onChange={(e) => setReceiveQty(e.target.value)}
              className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#334155] mb-1">
              Supplier / Batch Reference (Optional)
            </label>
            <input
              type="text"
              value={receiveNote}
              onChange={(e) => setReceiveNote(e.target.value)}
              placeholder="e.g. Supplier invoice #8892"
              className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="px-3 py-1.5 border border-[#cbd5e1] text-xs text-[#334155] rounded-[3px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isReceiving}
              className="px-4 py-1.5 bg-[#15803d] hover:bg-[#166534] text-white font-medium text-xs rounded-[3px]"
            >
              {isReceiving ? 'Updating...' : 'Record Received Stock'}
            </button>
          </div>
        </form>
      </Modal>
    </ProtectedRoute>
  );
}
