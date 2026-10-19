'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye, FiRotateCcw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatPrice, getProductCoverImage } from '@/lib/utils';
import LazyImage from '@/components/common/LazyImage';
import Skeleton from '@/components/common/Skeleton';
import ProductFormModal from '@/components/admin/ProductFormModal';
import ProductDetailModal from '@/components/admin/ProductDetailModal';
import ProductEditModal from '@/components/admin/ProductEditModal';
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortFilter, setSortFilter] = useState('newest');
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDetailProductId, setSelectedDetailProductId] = useState<string | null>(null);
  const [selectedEditProductId, setSelectedEditProductId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch products based on API 2.1 specifications
  const fetchProducts = async (overrides?: {
    page?: number;
    limit?: number;
    status?: string;
    sort?: string;
    search?: string;
    category?: string;
  }) => {
    const curPage = overrides?.page !== undefined ? overrides.page : page;
    const curLimit = overrides?.limit !== undefined ? overrides.limit : limit;
    const curStatus = overrides?.status !== undefined ? overrides.status : statusFilter;
    const curSort = overrides?.sort !== undefined ? overrides.sort : sortFilter;
    const curSearch = overrides?.search !== undefined ? overrides.search : search;
    const curCat = overrides?.category !== undefined ? overrides.category : categoryFilter;

    try {
      setLoading(true);
      let url = `/api/products?page=${curPage}&limit=${curLimit}&status=${curStatus}&sort=${curSort}`;
      if (curSearch) url += `&search=${encodeURIComponent(curSearch)}`;
      if (curCat) url += `&category=${encodeURIComponent(curCat)}`;

      const res = await apiFetch(url);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalProducts(data.pagination.total || 0);
        }
      }
    } catch (err) {
      toast.error('Lỗi tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  // Reset all filters & explicitly reload fresh data from API
  const handleResetFilters = async () => {
    setIsResetting(true);
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('all');
    setSortFilter('newest');
    setLimit(10);
    setPage(1);

    await fetchProducts({
      page: 1,
      limit: 10,
      status: 'all',
      sort: 'newest',
      search: '',
      category: '',
    });

    setIsResetting(false);
    toast.success('Đã làm mới và tải lại danh sách sản phẩm!');
  };

  // Fetch categories for filtering dropdown
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await apiFetch('/api/categories');
        const data = await res.json();
        if (data.success) {
          setCategories(data.data || []);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, limit, categoryFilter, statusFilter, sortFilter, search]);

  // Toggle status
  const handleToggleStatus = async (product: any) => {
    const newStatus = product.status === 'active' ? 'hidden' : 'active';
    try {
      const res = await apiFetch(`/api/products/${product._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã ${newStatus === 'active' ? 'mở bán' : 'ẩn'} sản phẩm "${product.name}"`);
        setProducts((prev) =>
          prev.map((p) => (p._id === product._id ? { ...p, status: newStatus } : p))
        );
      }
    } catch (e) {
      toast.error('Lỗi cập nhật trạng thái');
    }
  };

  // Delete product with confirmation modal (API 2.5)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/products/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã xóa sản phẩm "${deleteTarget.name}" thành công!`);
        setDeleteTarget(null);
        fetchProducts();
      } else {
        toast.error(data.message || 'Lỗi xóa sản phẩm');
      }
    } catch (e) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý sản phẩm</h1>
          <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.875rem' }}>
            Tổng cộng: <strong style={{ color: 'var(--text-main, #fff)' }}>{totalProducts}</strong> sản phẩm trong kho
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={styles.btnPrimary}
        >
          <FiPlus /> Thêm sản phẩm mới
        </button>
      </div>

      <div className={styles.card}>
        {/* Filters Bar */}
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã sản phẩm..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Category Filter */}
          <select
            className={styles.select}
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c._id} value={c.slug || c._id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang bán</option>
            <option value="hidden">Đã ẩn</option>
          </select>

          {/* Sort Filter */}
          <select
            className={styles.select}
            value={sortFilter}
            onChange={(e) => {
              setSortFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="newest">Mới nhất</option>
            <option value="popular">Bán chạy nhất</option>
            <option value="price-asc">Giá: Thấp đến Cao</option>
            <option value="price-desc">Giá: Cao đến Thấp</option>
          </select>

          {/* Limit / Page */}
          <select
            className={styles.select}
            value={limit}
            onChange={(e) => {
              setLimit(parseInt(e.target.value));
              setPage(1);
            }}
            style={{ maxWidth: 100 }}
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
          </select>

          {/* Reset Filters Button */}
          <button
            type="button"
            className={styles.btnReset}
            onClick={handleResetFilters}
            disabled={isResetting}
            title="Đặt lại toàn bộ bộ lọc & Tải lại danh sách"
          >
            <FiRotateCcw className={isResetting ? styles.spinning : ''} />
            <span>{isResetting ? 'Đang làm mới...' : 'Đặt lại bộ lọc'}</span>
          </button>
        </div>

        {/* Products Table with Lazy Loading Skeleton */}
        {loading ? (
          <div style={{ padding: '16px 0' }}>
            <Skeleton type="table-row" count={limit > 10 ? 10 : limit} />
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ảnh</th>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Giá niêm yết</th>
                  <th>Giá khuyến mãi</th>
                  <th>Tồn kho</th>
                  <th>Đã bán</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted, #9ca3af)', padding: 40 }}>
                      Không tìm thấy sản phẩm nào phù hợp với bộ lọc
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p._id}>
                      <td style={{ width: 64 }}>
                        <LazyImage
                          src={getProductCoverImage(p, '/file.svg')}
                          alt={p.name}
                          aspectRatio="1 / 1"
                          style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover' }}
                        />
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-main, #fff)', fontSize: '0.9375rem' }}>{p.name}</strong>
                        {p.variants && p.variants.length > 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #64748b)' }}>
                            {p.variants.length} phân loại biến thể
                          </div>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted, #9ca3af)' }}>{p.category?.name || 'Chưa phân loại'}</td>
                      <td style={{ color: p.salePrice ? 'var(--text-dim, #64748b)' : 'var(--text-main, #fff)', textDecoration: p.salePrice ? 'line-through' : 'none' }}>
                        {formatPrice(p.price)}
                      </td>
                      <td style={{ color: 'var(--primary, #3b82f6)', fontWeight: 700 }}>
                        {p.salePrice ? formatPrice(p.salePrice) : '-'}
                      </td>
                      <td>
                        {(() => {
                          const computedStock =
                            Array.isArray(p.variants) && p.variants.length > 0
                              ? p.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0)
                              : Number(p.stock) || 0;
                          return (
                            <span
                              style={{
                                fontWeight: 700,
                                color: computedStock <= 0 ? '#ef4444' : computedStock < 10 ? '#f59e0b' : 'inherit',
                              }}
                            >
                              {computedStock}
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        <strong style={{ color: 'var(--accent, #10b981)' }}>{p.soldCount ?? 0}</strong>
                      </td>
                      <td>
                        <label className={styles.switch}>
                          <input
                            type="checkbox"
                            checked={p.status === 'active'}
                            onChange={() => handleToggleStatus(p)}
                          />
                          <span className={styles.slider}></span>
                        </label>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => setSelectedDetailProductId(p._id)}
                            title="Xem chi tiết sản phẩm"
                          >
                            <FiEye />
                          </button>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => setSelectedEditProductId(p._id)}
                            title="Chỉnh sửa sản phẩm"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.danger}`}
                            onClick={() => setDeleteTarget({ id: p._id, name: p.name })}
                            title="Xóa sản phẩm"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted, #9ca3af)' }}>
              Trang <strong>{page}</strong> / <strong>{totalPages}</strong> (Hiển thị {products.length} trên tổng số {totalProducts} sản phẩm)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm, 6px)',
                  background: 'var(--bg-main, #090a0f)',
                  color: 'var(--text-main, #fff)',
                  border: '1px solid var(--border-color, #232838)',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.4 : 1,
                  fontWeight: 600,
                }}
              >
                ← Trước
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    background: page === pNum ? 'var(--primary, #3b82f6)' : 'var(--bg-main, #090a0f)',
                    color: page === pNum ? 'var(--primary-text, #fff)' : 'var(--text-main, #fff)',
                    border: '1px solid var(--border-color, #232838)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {pNum}
                </button>
              ))}

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm, 6px)',
                  background: 'var(--bg-main, #090a0f)',
                  color: 'var(--text-main, #fff)',
                  border: '1px solid var(--border-color, #232838)',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.4 : 1,
                  fontWeight: 600,
                }}
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Product Modal (API 2.2) */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchProducts}
        categories={categories}
      />

      {/* View Product Detail Modal (API 2.3) */}
      <ProductDetailModal
        productId={selectedDetailProductId}
        onClose={() => setSelectedDetailProductId(null)}
      />

      {/* Edit Product Modal (API 2.4) */}
      <ProductEditModal
        productId={selectedEditProductId}
        onClose={() => setSelectedEditProductId(null)}
        onSuccess={fetchProducts}
        categories={categories}
      />

      {/* Delete Product Modal (API 2.5) */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        itemTitle={deleteTarget?.name}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
