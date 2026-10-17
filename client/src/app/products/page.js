'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { Modal } from '../../components/Modal';
import { apiClient } from '../../lib/api';
import { formatCurrency } from '../../lib/money';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const { settings, refreshLowStockCount } = useSettings();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalCount: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms state
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    purchasePrice: '',
    sellingPrice: '',
    stock: '0',
    reorderLevel: '5'
  });

  const [adjustData, setAdjustData] = useState({
    type: 'stock_received',
    quantity: '10',
    reason: ''
  });

  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiClient('/products/categories');
      setCategories(res.data || []);
    } catch (err) {
      console.warn('Could not load categories:', err.message);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15'
      });
      if (search.trim()) params.append('search', search.trim());
      if (category) params.append('category', category);
      if (stockStatus && stockStatus !== 'all') params.append('stockStatus', stockStatus);
      if (isAdmin && includeInactive) params.append('includeInactive', 'true');

      const res = await apiClient(`/products?${params.toString()}`);
      setProducts(res.data);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, category, stockStatus, includeInactive, isAdmin]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenAdd = () => {
    setFormData({
      sku: '',
      name: '',
      category: categories[0] || 'Staples',
      purchasePrice: '',
      sellingPrice: '',
      stock: '10',
      reorderLevel: '5'
    });
    setModalError('');
    setModalSuccess('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku,
      name: p.name,
      category: p.category,
      purchasePrice: p.purchasePrice !== undefined ? String(p.purchasePrice) : '',
      sellingPrice: String(p.sellingPrice),
      reorderLevel: String(p.reorderLevel)
    });
    setModalError('');
    setModalSuccess('');
  };

  const handleOpenAdjust = (p) => {
    setAdjustingProduct(p);
    setAdjustData({
      type: 'stock_received',
      quantity: '10',
      reason: ''
    });
    setModalError('');
    setModalSuccess('');
  };

  const handleCreateProductSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);
    try {
      await apiClient('/products', {
        method: 'POST',
        body: JSON.stringify({
          sku: formData.sku,
          name: formData.name,
          category: formData.category,
          purchasePrice: parseFloat(formData.purchasePrice),
          sellingPrice: parseFloat(formData.sellingPrice),
          stock: parseInt(formData.stock, 10),
          reorderLevel: parseInt(formData.reorderLevel, 10)
        })
      });
      setIsAddModalOpen(false);
      fetchProducts();
      fetchCategories();
      refreshLowStockCount();
    } catch (err) {
      setModalError(err.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProductSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);
    try {
      const payload = {
        sku: formData.sku,
        name: formData.name,
        category: formData.category,
        sellingPrice: parseFloat(formData.sellingPrice),
        reorderLevel: parseInt(formData.reorderLevel, 10)
      };
      if (formData.purchasePrice !== '') {
        payload.purchasePrice = parseFloat(formData.purchasePrice);
      }

      await apiClient(`/products/${editingProduct._id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setEditingProduct(null);
      fetchProducts();
      fetchCategories();
    } catch (err) {
      setModalError(err.message || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (p) => {
    try {
      const endpoint = p.isActive
        ? `/products/${p._id}/deactivate`
        : `/products/${p._id}/activate`;
      await apiClient(endpoint, { method: 'PATCH' });
      fetchProducts();
      refreshLowStockCount();
    } catch (err) {
      setErrorMsg(err.message || 'Action failed');
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);
    try {
      await apiClient('/inventory/adjustments', {
        method: 'POST',
        body: JSON.stringify({
          productId: adjustingProduct._id,
          type: adjustData.type,
          quantity: parseInt(adjustData.quantity, 10),
          reason: adjustData.reason
        })
      });
      setAdjustingProduct(null);
      fetchProducts();
      refreshLowStockCount();
    } catch (err) {
      setModalError(err.message || 'Failed to record stock adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Products</h1>
            <p className="text-xs text-[#64748b]">Manage catalogue inventory and stock levels</p>
          </div>

          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="bg-[#15803d] hover:bg-[#166534] text-white text-xs font-semibold px-3 py-1.5 rounded-[3px] transition-colors"
            >
              + Add Product
            </button>
          )}
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
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or SKU..."
            className="w-full sm:w-56 px-2.5 py-1 border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#15803d]"
          />

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1 border border-[#cbd5e1] rounded-[3px] bg-white focus:outline-none focus:border-[#15803d]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={stockStatus}
            onChange={(e) => {
              setStockStatus(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1 border border-[#cbd5e1] rounded-[3px] bg-white focus:outline-none focus:border-[#15803d]"
          >
            <option value="all">All Stock Statuses</option>
            <option value="in_stock">In Stock (&gt; reorder level)</option>
            <option value="low_stock">Low Stock (≤ reorder level)</option>
            <option value="out_of_stock">Out of Stock (0 units)</option>
          </select>

          {isAdmin && (
            <label className="flex items-center space-x-1.5 text-[#334155] cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => {
                  setIncludeInactive(e.target.checked);
                  setPage(1);
                }}
                className="rounded-[3px]"
              />
              <span>Include Deactivated</span>
            </label>
          )}
        </div>

        {/* Products Table */}
        <div className="bg-white border border-[#cbd5e1] rounded-[3px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#64748b]">
                <tr>
                  <th className="py-2.5 px-3 font-medium">SKU</th>
                  <th className="py-2.5 px-3 font-medium">Product Name</th>
                  <th className="py-2.5 px-3 font-medium">Category</th>
                  {isAdmin && (
                    <th className="py-2.5 px-3 font-medium text-right">Cost Price</th>
                  )}
                  <th className="py-2.5 px-3 font-medium text-right">Selling Price</th>
                  <th className="py-2.5 px-3 font-medium text-center">Stock</th>
                  <th className="py-2.5 px-3 font-medium text-center">Reorder At</th>
                  <th className="py-2.5 px-3 font-medium text-center">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {products.length > 0 ? (
                  products.map((p) => {
                    const isOutOfStock = p.stock <= 0;
                    const isLowStock = p.stock <= p.reorderLevel && p.stock > 0;

                    return (
                      <tr key={p._id} className="hover:bg-[#f8fafc]">
                        <td className="py-2.5 px-3 font-mono text-[#475569]">{p.sku}</td>
                        <td className="py-2.5 px-3 font-medium text-[#0f172a]">{p.name}</td>
                        <td className="py-2.5 px-3 text-[#64748b]">{p.category}</td>
                        {isAdmin && (
                          <td className="py-2.5 px-3 text-right tabular-nums text-[#64748b]">
                            {formatCurrency(p.purchasePrice, settings?.currencySymbol)}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-[#0f172a]">
                          {formatCurrency(p.sellingPrice, settings?.currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums">
                          {isOutOfStock ? (
                            <span className="text-red-600 font-semibold inline-flex items-center space-x-1">
                              <span>●</span>
                              <span>Out</span>
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[#b45309] font-medium inline-flex items-center space-x-1">
                              <span>●</span>
                              <span>{p.stock} Low</span>
                            </span>
                          ) : (
                            <span className="text-[#15803d] font-semibold">{p.stock}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums text-[#64748b]">
                          {p.reorderLevel}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {p.isActive ? (
                            <span className="text-[#15803d] text-[11px] font-medium">Active</span>
                          ) : (
                            <span className="text-[#94a3b8] text-[11px] font-medium">Deactivated</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-2">
                          {/* Stock adjustment/receive button */}
                          <button
                            onClick={() => handleOpenAdjust(p)}
                            className="border border-[#16a34a] text-[#15803d] hover:bg-[#f0fdf4] font-medium px-2 py-0.5 rounded-[3px] text-[11px]"
                          >
                            {isAdmin ? 'Adjust stock' : 'Receive stock'}
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="border border-[#cbd5e1] text-[#334155] hover:bg-[#f8fafc] font-medium px-2 py-0.5 rounded-[3px] text-[11px]"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleToggleActive(p)}
                                className={`border font-medium px-2 py-0.5 rounded-[3px] text-[11px] ${
                                  p.isActive
                                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                                    : 'border-green-200 text-green-700 hover:bg-green-50'
                                }`}
                              >
                                {p.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="py-8 text-center text-[#94a3b8]">
                      {isLoading ? 'Loading products...' : 'No products found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-between text-xs text-[#64748b]">
            <div>
              Showing {products.length} of {meta.totalCount} products
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

      {/* Add Product Modal (Admin) */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Product">
        <form onSubmit={handleCreateProductSubmit} className="space-y-3">
          {modalError && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[3px]">
              {modalError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">SKU</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. DAL-002"
                className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">Category</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Staples"
                className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#334155] mb-1">Product Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Moong dal 1 kg"
              className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">Cost Price (₹)</label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                placeholder="100.00"
                className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">Selling Price (₹)</label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                placeholder="130.00"
                className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">Opening Stock</label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">Reorder Level</label>
              <input
                type="number"
                min="0"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px]"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3 py-1.5 border border-[#cbd5e1] text-xs text-[#334155] rounded-[3px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-[#15803d] hover:bg-[#166534] text-white font-medium text-xs rounded-[3px]"
            >
              {isSubmitting ? 'Creating...' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal (Admin) */}
      <Modal isOpen={Boolean(editingProduct)} onClose={() => setEditingProduct(null)} title="Edit Product">
        <form onSubmit={handleUpdateProductSubmit} className="space-y-3">
          {modalError && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[3px]">
              {modalError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">SKU</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">Category</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#334155] mb-1">Product Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">Cost Price (₹)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">Selling Price (₹)</label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#334155] mb-1">Reorder Level</label>
            <input
              type="number"
              min="0"
              value={formData.reorderLevel}
              onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
              className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px]"
            />
          </div>

          <p className="text-[11px] text-[#64748b]">
            Note: Current stock ({editingProduct?.stock}) cannot be modified via edit. Use Inventory Adjustments to maintain traceable audit consistency.
          </p>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingProduct(null)}
              className="px-3 py-1.5 border border-[#cbd5e1] text-xs text-[#334155] rounded-[3px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-[#15803d] hover:bg-[#166534] text-white font-medium text-xs rounded-[3px]"
            >
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Adjustment / Stock Received Modal */}
      <Modal
        isOpen={Boolean(adjustingProduct)}
        onClose={() => setAdjustingProduct(null)}
        title={isAdmin ? `Adjust Stock: ${adjustingProduct?.name || ''}` : `Receive Stock: ${adjustingProduct?.name || ''}`}
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-3">
          {modalError && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[3px]">
              {modalError}
            </div>
          )}

          <div className="text-xs text-[#64748b]">
            Current stock: <span className="font-semibold text-[#0f172a]">{adjustingProduct?.stock}</span> units
          </div>

          {isAdmin ? (
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">Action Type</label>
              <select
                value={adjustData.type}
                onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value })}
                className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px] bg-white"
              >
                <option value="stock_received">Stock Received (Vendor delivery)</option>
                <option value="adjustment_increase">Manual Adjustment (+ Increase)</option>
                <option value="adjustment_decrease">Manual Adjustment (- Decrease / Shrinkage)</option>
              </select>
            </div>
          ) : (
            <div>
              <span className="text-xs font-medium text-[#334155]">Type: </span>
              <span className="text-xs text-[#15803d] font-semibold">Stock Received</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#334155] mb-1">Quantity (units)</label>
            <input
              type="number"
              min="1"
              required
              value={adjustData.quantity}
              onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
              className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#334155] mb-1">
              {adjustData.type !== 'stock_received' ? 'Reason (Mandatory)' : 'Supplier / Reference Note (Optional)'}
            </label>
            <input
              type="text"
              required={adjustData.type !== 'stock_received'}
              value={adjustData.reason}
              onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
              placeholder={adjustData.type !== 'stock_received' ? 'e.g. Expired stock written off, Damaged in transit' : 'e.g. PO #991, Delivery from wholesale'}
              className="w-full px-2.5 py-1 text-xs border border-[#cbd5e1] rounded-[3px]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setAdjustingProduct(null)}
              className="px-3 py-1.5 border border-[#cbd5e1] text-xs text-[#334155] rounded-[3px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-[#15803d] hover:bg-[#166534] text-white font-medium text-xs rounded-[3px]"
            >
              {isSubmitting ? 'Recording...' : 'Confirm Stock Change'}
            </button>
          </div>
        </form>
      </Modal>
    </ProtectedRoute>
  );
}
