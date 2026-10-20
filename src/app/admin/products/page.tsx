'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye, FiRotateCcw, FiFilter, FiX } from 'react-icons/fi';
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
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeFiltersCount =
    (categoryFilter ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (sortFilter !== 'newest' ? 1 : 0);
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
        <div className={styles.titleArea}>
          <div className={styles.titleWithCount}>
            <h1 className={styles.title}>Quản lý sản phẩm</h1>
            <span className={styles.totalBadge}>{totalProducts} SP</span>
          </div>
          <p className={styles.subtitle}>
            Tổng cộng: <strong style={{ color: 'var(--text-main, #fff)' }}>{totalProducts}</strong> sản phẩm trong kho
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={styles.btnPrimary}
        >
          <FiPlus size={16} /> <span>Thêm sản phẩm</span>
        </button>
      </div>

      <div className={styles.card}>
        {/* Search & Filter Bar */}
        <div className={styles.filters}>
          <div className={styles.searchRow}>
            <div className={styles.searchBox}>
              <FiSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc mã SP..."
                className={styles.searchInput}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              {search && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  title="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              className={`${styles.btnFilterToggle} ${showFilterPanel ? styles.btnFilterActive : ''} ${activeFiltersCount > 0 ? styles.hasActiveFilters : ''}`}
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              title="Bộ lọc sản phẩm"
              aria-expanded={showFilterPanel}
            >
              <FiFilter size={15} />
              <span className={styles.btnFilterText}>Bộ lọc</span>
              {activeFiltersCount > 0 && (
                <span className={styles.filterBadge}>{activeFiltersCount}</span>
              )}
            </button>
          </div>

          {/* Filter Panel (Only shown when filter icon is clicked) */}
          {showFilterPanel && (
            <div className={styles.filterPanel}>
              <div className={styles.filterPanelHeader}>
                <div className={styles.panelTitle}>
                  <FiFilter size={14} />
                  <span>Tùy chọn lọc</span>
                  {activeFiltersCount > 0 && (
                    <span className={styles.activeTagBadge}>({activeFiltersCount} đang chọn)</span>
                  )}
                </div>
                <div className={styles.panelActions}>
                  {(activeFiltersCount > 0 || search) && (
                    <button
                      type="button"
                      className={styles.btnResetPanel}
                      onClick={handleResetFilters}
                      disabled={isResetting}
                      title="Đặt lại toàn bộ bộ lọc"
                    >
                      <FiRotateCcw className={isResetting ? styles.spinning : ''} />
                      <span>Đặt lại</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.btnClosePanel}
                    onClick={() => setShowFilterPanel(false)}
                    title="Đóng bộ lọc"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              </div>

              <div className={styles.filterGrid}>
                {/* 1. Status Filter */}
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Trạng thái</label>
                  <div className={styles.statusSegment}>
                    <button
                      type="button"
                      className={`${styles.statusPill} ${statusFilter === 'all' ? styles.statusPillActive : ''}`}
                      onClick={() => {
                        setStatusFilter('all');
                        setPage(1);
                      }}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      className={`${styles.statusPill} ${statusFilter === 'active' ? styles.statusPillActive : ''}`}
                      onClick={() => {
                        setStatusFilter('active');
                        setPage(1);
                      }}
                    >
                      Đang bán
                    </button>
                    <button
                      type="button"
                      className={`${styles.statusPill} ${statusFilter === 'hidden' ? styles.statusPillActive : ''}`}
                      onClick={() => {
                        setStatusFilter('hidden');
                        setPage(1);
                      }}
                    >
                      Đã ẩn
                    </button>
                  </div>
                </div>

                {/* 2. Category Filter */}
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Danh mục</label>
                  <div className={`${styles.selectWrap} ${categoryFilter ? styles.selectActive : ''}`}>
                    <select
                      className={styles.panelSelect}
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
                  </div>
                </div>

                {/* 3. Sort Filter */}
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Sắp xếp</label>
                  <div className={`${styles.selectWrap} ${sortFilter !== 'newest' ? styles.selectActive : ''}`}>
                    <select
                      className={styles.panelSelect}
                      value={sortFilter}
                      onChange={(e) => {
                        setSortFilter(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="newest">Mới nhất</option>
                      <option value="popular">Bán chạy nhất</option>
                      <option value="price-asc">Giá: Thấp → Cao</option>
                      <option value="price-desc">Giá: Cao → Thấp</option>
                    </select>
                  </div>
                </div>

                {/* 4. Limit Filter */}
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Hiển thị</label>
                  <div className={styles.selectWrap}>
                    <select
                      className={styles.panelSelect}
                      value={limit}
                      onChange={(e) => {
                        setLimit(parseInt(e.target.value));
                        setPage(1);
                      }}
                    >
                      <option value={10}>10 sản phẩm / trang</option>
                      <option value={20}>20 sản phẩm / trang</option>
                      <option value={50}>50 sản phẩm / trang</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Products Table with Lazy Loading Skeleton */}
        {loading ? (
          <div style={{ padding: '16px' }}>
            <Skeleton type="table-row" count={limit > 10 ? 10 : limit} />
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 769px) */}
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
                    products.map((p) => {
                      const computedStock =
                        Array.isArray(p.variants) && p.variants.length > 0
                          ? p.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0)
                          : Number(p.stock) || 0;

                      return (
                        <tr key={p._id}>
                          <td style={{ width: 64 }}>
                            <div className={styles.desktopImgBox}>
                              <LazyImage
                                src={getProductCoverImage(p, '/file.svg')}
                                alt={p.name}
                                aspectRatio="1 / 1"
                                style={{ width: '100%', height: '100%', borderRadius: 8, objectFit: 'cover' }}
                              />
                            </div>
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
                            <span
                              style={{
                                fontWeight: 700,
                                color: computedStock <= 0 ? '#ef4444' : computedStock < 10 ? '#f59e0b' : 'inherit',
                              }}
                            >
                              {computedStock}
                            </span>
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Product Cards View (<= 768px) */}
            <div className={styles.mobileProductList}>
              {products.length === 0 ? (
                <div className={styles.mobileEmptyState}>
                  Không tìm thấy sản phẩm nào phù hợp với bộ lọc
                </div>
              ) : (
                products.map((p) => {
                  const computedStock =
                    Array.isArray(p.variants) && p.variants.length > 0
                      ? p.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0)
                      : Number(p.stock) || 0;

                  return (
                    <div key={p._id} className={styles.mobileProductCard}>
                      <div className={styles.mobileCardTop}>
                        <div className={styles.mobileImgBox}>
                          <LazyImage
                            src={getProductCoverImage(p, '/file.svg')}
                            alt={p.name}
                            aspectRatio="1 / 1"
                            style={{ width: '100%', height: '100%', borderRadius: 8, objectFit: 'cover' }}
                          />
                        </div>
                        <div className={styles.mobileCardMeta}>
                          <h3 className={styles.mobileProductTitle}>{p.name}</h3>
                          <div className={styles.mobileBadgesRow}>
                            <span className={styles.mobileCategoryBadge}>
                              {p.category?.name || 'Chưa phân loại'}
                            </span>
                            {p.variants && p.variants.length > 0 && (
                              <span className={styles.mobileVariantBadge}>
                                {p.variants.length} phân loại
                              </span>
                            )}
                          </div>
                          <div className={styles.mobilePriceRow}>
                            <span className={styles.mobileSalePrice}>
                              {formatPrice(p.salePrice || p.price)}
                            </span>
                            {p.salePrice && (
                              <span className={styles.mobileOriginalPrice}>
                                {formatPrice(p.price)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Stats Grid */}
                      <div className={styles.mobileStatsGrid}>
                        <div className={styles.mobileStatItem}>
                          <span className={styles.mobileStatLabel}>Tồn kho</span>
                          <span
                            className={styles.mobileStatVal}
                            style={{
                              color: computedStock <= 0 ? '#ef4444' : computedStock < 10 ? '#f59e0b' : 'inherit',
                            }}
                          >
                            {computedStock}
                          </span>
                        </div>
                        <div className={styles.mobileStatItem}>
                          <span className={styles.mobileStatLabel}>Đã bán</span>
                          <span className={styles.mobileStatVal} style={{ color: '#10b981' }}>
                            {p.soldCount ?? 0}
                          </span>
                        </div>
                        <div className={styles.mobileStatItem}>
                          <span className={styles.mobileStatLabel}>Trạng thái</span>
                          <div className={styles.mobileSwitchWrap}>
                            <label className={styles.switch}>
                              <input
                                type="checkbox"
                                checked={p.status === 'active'}
                                onChange={() => handleToggleStatus(p)}
                              />
                              <span className={styles.slider}></span>
                            </label>
                            <span className={p.status === 'active' ? styles.statusActiveText : styles.statusHiddenText}>
                              {p.status === 'active' ? 'Đang bán' : 'Đã ẩn'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions Row */}
                      <div className={styles.mobileActionsRow}>
                        <button
                          type="button"
                          className={styles.mobileActionBtn}
                          onClick={() => setSelectedDetailProductId(p._id)}
                        >
                          <FiEye /> <span>Chi tiết</span>
                        </button>
                        <button
                          type="button"
                          className={styles.mobileActionBtn}
                          onClick={() => setSelectedEditProductId(p._id)}
                        >
                          <FiEdit2 /> <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.mobileActionBtn} ${styles.danger}`}
                          onClick={() => setDeleteTarget({ id: p._id, name: p.name })}
                        >
                          <FiTrash2 /> <span>Xóa</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <span className={styles.paginationInfo}>
              Trang <strong>{page}</strong> / <strong>{totalPages}</strong> (Hiển thị {products.length} / {totalProducts} sản phẩm)
            </span>
            <div className={styles.paginationControls}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={styles.pageNavBtn}
              >
                ← Trước
              </button>

              <div className={styles.pageNumbersList}>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((pNum) => {
                    if (totalPages <= 7) return true;
                    return pNum === 1 || pNum === totalPages || Math.abs(pNum - page) <= 1;
                  })
                  .map((pNum) => (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`${styles.pageNumberBtn} ${page === pNum ? styles.activePageNumber : ''}`}
                    >
                      {pNum}
                    </button>
                  ))}
              </div>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={styles.pageNavBtn}
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
