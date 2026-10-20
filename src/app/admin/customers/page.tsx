'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FiSearch,
  FiUser,
  FiEye,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiRotateCcw,
  FiUsers,
  FiAward,
  FiDollarSign,
  FiX,
  FiCheck,
  FiPhone,
  FiMail,
  FiMapPin,
  FiClock,
  FiCopy,
  FiShoppingBag,
  FiFilter,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatPrice, formatDate } from '@/lib/utils';
import Skeleton from '@/components/common/Skeleton';
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'vip' | 'member' | 'has_orders'>('all');

  // Modal State (Add / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    province: '',
    district: '',
    ward: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CRM Detail Profile Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Customers (API 6.1)
  const fetchCustomers = async (overrides?: { page?: number; search?: string }) => {
    const curPage = overrides?.page !== undefined ? overrides.page : page;
    const curSearch = overrides?.search !== undefined ? overrides.search : search;

    try {
      setLoading(true);
      let url = `/api/customers?page=${curPage}&limit=10`;
      if (curSearch) url += `&search=${encodeURIComponent(curSearch)}`;

      const res = await apiFetch(url);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCustomers(data.pagination.total || 0);
        }
      }
    } catch (err) {
      toast.error('Lỗi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

  // Reset Filters
  const handleResetFilters = async () => {
    setIsResetting(true);
    setSearch('');
    setSegmentFilter('all');
    setPage(1);

    await fetchCustomers({ page: 1, search: '' });

    setIsResetting(false);
    toast.success('Đã làm mới danh sách khách hàng!');
  };

  // Open Add Modal (API 6.3 POST)
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      province: '',
      district: '',
      ward: '',
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal (API 6.3 PUT)
  const handleOpenEdit = (c: any) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      province: c.province || '',
      district: c.district || '',
      ward: c.ward || '',
    });
    setIsModalOpen(true);
  };

  // Open CRM Profile Detail Modal
  const handleOpenDetail = async (c: any) => {
    setDetailCustomer(c);
    setDetailModalOpen(true);
    try {
      setLoadingDetail(true);
      const res = await apiFetch(`/api/customers/${c._id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setDetailCustomer(data.data);
      }
    } catch (err) {
      console.error('Error fetching customer detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Copy Phone Helper
  const handleCopyPhone = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    toast.success(`Đã sao chép SĐT: ${phone}`);
  };

  // Order status badge helper
  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return { text: 'Đã giao', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'shipping':
        return { text: 'Đang giao', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
      case 'confirmed':
        return { text: 'Đã xác nhận', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' };
      case 'pending':
        return { text: 'Chờ xử lý', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'cancelled':
        return { text: 'Đã hủy', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
      default:
        return { text: status || 'Đơn hàng', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
    }
  };

  // Submit Form (Create / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Vui lòng nhập họ tên và số điện thoại');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer._id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingCustomer ? 'Cập nhật khách hàng thành công!' : 'Thêm khách hàng mới thành công!');
        setIsModalOpen(false);
        fetchCustomers();
      } else {
        toast.error(data.message || 'Lỗi xử lý khách hàng');
      }
    } catch (err) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Customer (API 6.3 DELETE)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/customers/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã xóa khách hàng "${deleteTarget.name}" thành công!`);
        setDeleteTarget(null);
        fetchCustomers();
      } else {
        toast.error(data.message || 'Lỗi xóa khách hàng');
      }
    } catch (err) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute CRM Stats
  const vipCount = customers.filter((c) => (c.totalSpent || 0) >= 2000000).length;
  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);

  // Client-side Filter by Segment
  const filteredCustomers = customers.filter((c) => {
    const isVip = (c.totalSpent || 0) >= 2000000;
    if (segmentFilter === 'vip') return isVip;
    if (segmentFilter === 'member') return !isVip;
    if (segmentFilter === 'has_orders') return (c.orderCount || 0) > 0;
    return true;
  });

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Quản Lý Khách Hàng (CRM)</h1>
          <p className={styles.subtitle}>
            Kiểm soát thông tin người mua, theo dõi chi tiêu và lịch sử đơn hàng
          </p>
        </div>

        <button className={styles.addBtn} onClick={handleOpenAdd}>
          <FiPlus size={16} />
          <span>Thêm khách hàng mới</span>
        </button>
      </div>

      {/* Glanceable 3-Metric Strip (Mobile & Desktop) */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FiUsers />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{totalCustomers}</div>
            <div className={styles.statLabel}>Tổng khách hàng</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)' }}>
            <FiAward />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{vipCount}</div>
            <div className={styles.statLabel}>Khách VIP (≥ 2tr)</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: 'var(--accent, #10b981)', background: 'rgba(16, 185, 129, 0.12)' }}>
            <FiDollarSign />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{formatPrice(totalRevenue)}</div>
            <div className={styles.statLabel}>Doanh thu khách</div>
          </div>
        </div>
      </div>

      {/* Main Customers Card */}
      <div className={styles.card}>
        {/* Search & Reset Bar */}
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm theo tên khách, số điện thoại, email..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <button
            type="button"
            className={styles.btnReset}
            onClick={handleResetFilters}
            disabled={isResetting}
            title="Đặt lại bộ lọc & Tải lại"
          >
            <FiRotateCcw className={isResetting ? styles.spinning : ''} />
            <span>{isResetting ? 'Đang làm mới...' : 'Đặt lại'}</span>
          </button>
        </div>

        {/* CRM Segment Filter Tabs */}
        <div className={styles.segmentTabs}>
          <button
            type="button"
            className={`${styles.segmentTab} ${segmentFilter === 'all' ? styles.segmentTabActive : ''}`}
            onClick={() => setSegmentFilter('all')}
          >
            Tất cả ({customers.length})
          </button>
          <button
            type="button"
            className={`${styles.segmentTab} ${segmentFilter === 'vip' ? styles.segmentTabActive : ''}`}
            onClick={() => setSegmentFilter('vip')}
          >
            ★ Khách VIP ({vipCount})
          </button>
          <button
            type="button"
            className={`${styles.segmentTab} ${segmentFilter === 'member' ? styles.segmentTabActive : ''}`}
            onClick={() => setSegmentFilter('member')}
          >
            Thành viên ({Math.max(0, customers.length - vipCount)})
          </button>
          <button
            type="button"
            className={`${styles.segmentTab} ${segmentFilter === 'has_orders' ? styles.segmentTabActive : ''}`}
            onClick={() => setSegmentFilter('has_orders')}
          >
            Có đơn hàng ({customers.filter((c) => (c.orderCount || 0) > 0).length})
          </button>
        </div>

        {/* Desktop Table (> 768px) with Skeleton */}
        {loading ? (
          <div style={{ padding: 16 }}>
            <Skeleton type="table-row" count={6} />
          </div>
        ) : (
          <>
            {/* 1. Desktop Data Table */}
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Liên hệ</th>
                    <th>Địa chỉ nhận hàng</th>
                    <th>Số đơn hàng</th>
                    <th>Tổng chi tiêu</th>
                    <th>Hạng CRM</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted, #9ca3af)', padding: 40 }}>
                        Không tìm thấy khách hàng nào phù hợp
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => {
                      const isVip = (c.totalSpent || 0) >= 2000000;
                      return (
                        <tr key={c._id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div className={styles.customerAvatar}>
                                {c.name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(c)}
                                  className={styles.customerNameBtn}
                                  title="Xem chi tiết khách hàng"
                                >
                                  {c.name}
                                </button>
                                <div className={styles.textMuted}>
                                  Tham gia: {c.createdAt ? formatDate(c.createdAt) : '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.phoneCell}>
                              <a href={`tel:${c.phone}`} className={styles.phoneLink}>
                                {c.phone}
                              </a>
                              <button
                                type="button"
                                className={styles.miniCopyBtn}
                                onClick={(e) => handleCopyPhone(e, c.phone)}
                                title="Sao chép SĐT"
                              >
                                <FiCopy size={11} />
                              </button>
                            </div>
                            {c.email && <div className={styles.textMuted}>{c.email}</div>}
                          </td>
                          <td style={{ maxWidth: 220, color: 'var(--text-muted, #94a3b8)', fontSize: '0.8125rem' }}>
                            {c.address || '-'}
                          </td>
                          <td>
                            <strong style={{ color: 'var(--text-main, #ffffff)' }}>{c.orderCount || 0}</strong> đơn
                          </td>
                          <td className={styles.bold} style={{ color: 'var(--primary, #3b82f6)' }}>
                            {formatPrice(c.totalSpent || 0)}
                          </td>
                          <td>
                            <span className={isVip ? styles.badgeVip : styles.badgeNormal}>
                              {isVip ? '★ VIP Member' : 'Thành viên'}
                            </span>
                          </td>
                          <td>
                            <div className={styles.actions}>
                              <button
                                type="button"
                                className={styles.actionBtn}
                                onClick={() => handleOpenDetail(c)}
                                title="Xem hồ sơ & Lịch sử mua hàng"
                              >
                                <FiEye />
                              </button>

                              <button
                                type="button"
                                className={styles.actionBtn}
                                onClick={() => handleOpenEdit(c)}
                                title="Chỉnh sửa thông tin"
                              >
                                <FiEdit2 />
                              </button>

                              <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.dangerBtn}`}
                                onClick={() => setDeleteTarget({ id: c._id, name: c.name })}
                                title="Xóa khách hàng"
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

            {/* 2. Mobile Touch Cards (<= 768px) */}
            <div className={styles.mobileList}>
              {filteredCustomers.length === 0 ? (
                <div className={styles.emptyState}>
                  Không tìm thấy khách hàng nào phù hợp
                </div>
              ) : (
                filteredCustomers.map((c) => {
                  const isVip = (c.totalSpent || 0) >= 2000000;
                  return (
                    <div key={c._id} className={styles.mobileCard}>
                      {/* Card Header: Avatar, Name, VIP status & Joined date */}
                      <div className={styles.mobileCardHeader}>
                        <div className={styles.mobileAvatar}>
                          {c.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className={styles.mobileHeaderInfo}>
                          <div className={styles.mobileNameRow}>
                            <button
                              type="button"
                              className={styles.mobileCustomerName}
                              onClick={() => handleOpenDetail(c)}
                            >
                              {c.name}
                            </button>
                            <span className={isVip ? styles.badgeVip : styles.badgeNormal}>
                              {isVip ? '★ VIP' : 'Thành viên'}
                            </span>
                          </div>
                          <div className={styles.mobileJoinedDate}>
                            <FiClock size={11} />
                            <span>Tham gia: {c.createdAt ? formatDate(c.createdAt) : '-'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Contact Details */}
                      <div className={styles.mobileContactBox}>
                        <div className={styles.mobileContactRow}>
                          <a href={`tel:${c.phone}`} className={styles.mobilePhoneLink}>
                            <FiPhone size={13} />
                            <span>{c.phone}</span>
                          </a>
                          <button
                            type="button"
                            className={styles.mobileCopyBtn}
                            onClick={(e) => handleCopyPhone(e, c.phone)}
                            title="Sao chép SĐT"
                          >
                            <FiCopy size={12} />
                          </button>
                        </div>

                        {c.email && (
                          <div className={styles.mobileEmailRow}>
                            <FiMail size={13} />
                            <span>{c.email}</span>
                          </div>
                        )}

                        {c.address && (
                          <div className={styles.mobileAddressRow}>
                            <FiMapPin size={13} />
                            <span>{c.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Metric Strip */}
                      <div className={styles.mobileMetricsRow}>
                        <div className={styles.mobileMetricItem}>
                          <span className={styles.mobileMetricLabel}>Đơn hàng</span>
                          <strong className={styles.mobileMetricValue}>{c.orderCount || 0} đơn</strong>
                        </div>
                        <div className={styles.mobileMetricDivider} />
                        <div className={styles.mobileMetricItem}>
                          <span className={styles.mobileMetricLabel}>Tổng chi tiêu</span>
                          <strong className={`${styles.mobileMetricValue} ${styles.mobileSpentValue}`}>
                            {formatPrice(c.totalSpent || 0)}
                          </strong>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className={styles.mobileCardActions}>
                        <button
                          type="button"
                          className={styles.mobileActionBtn}
                          onClick={() => handleOpenDetail(c)}
                        >
                          <FiEye size={13} />
                          <span>Hồ sơ & Đơn</span>
                        </button>
                        <button
                          type="button"
                          className={styles.mobileActionBtn}
                          onClick={() => handleOpenEdit(c)}
                        >
                          <FiEdit2 size={13} />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.mobileActionBtn} ${styles.mobileDeleteBtn}`}
                          onClick={() => setDeleteTarget({ id: c._id, name: c.name })}
                        >
                          <FiTrash2 size={13} />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Responsive Pagination Bar */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <span className={styles.paginationInfo}>
              Trang <strong>{page}</strong> / <strong>{totalPages}</strong> ({filteredCustomers.length} / {totalCustomers} khách)
            </span>
            <div className={styles.paginationActions}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={styles.pageBtn}
              >
                ← Trước
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setPage(pNum)}
                  className={`${styles.pageBtn} ${page === pNum ? styles.pageBtnActive : ''}`}
                >
                  {pNum}
                </button>
              ))}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={styles.pageBtn}
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CRM Profile & Order History Modal */}
      {detailModalOpen && detailCustomer && (
        <div className={styles.modalOverlay} onClick={() => setDetailModalOpen(false)}>
          <div className={`${styles.modal} ${styles.detailModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <div className={styles.detailAvatar}>
                  {detailCustomer.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className={styles.detailNameRow}>
                    <h3 className={styles.modalTitle}>{detailCustomer.name}</h3>
                    <span className={(detailCustomer.totalSpent || 0) >= 2000000 ? styles.badgeVip : styles.badgeNormal}>
                      {(detailCustomer.totalSpent || 0) >= 2000000 ? '★ VIP Member' : 'Thành viên'}
                    </span>
                  </div>
                  <div className={styles.detailSub}>
                    Mã KH: <code>{detailCustomer._id?.slice(-8)}</code> • Tham gia: {detailCustomer.createdAt ? formatDate(detailCustomer.createdAt) : '-'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setDetailModalOpen(false)}
                title="Đóng"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Customer Quick Info */}
              <div className={styles.profileContactCard}>
                <div className={styles.profileContactItem}>
                  <FiPhone className={styles.profileIcon} />
                  <a href={`tel:${detailCustomer.phone}`} className={styles.phoneText}>
                    {detailCustomer.phone}
                  </a>
                  <button
                    type="button"
                    className={styles.miniCopyBtn}
                    onClick={(e) => handleCopyPhone(e, detailCustomer.phone)}
                  >
                    <FiCopy size={12} />
                  </button>
                </div>
                {detailCustomer.email && (
                  <div className={styles.profileContactItem}>
                    <FiMail className={styles.profileIcon} />
                    <a href={`mailto:${detailCustomer.email}`} className={styles.emailText}>
                      {detailCustomer.email}
                    </a>
                  </div>
                )}
                {detailCustomer.address && (
                  <div className={styles.profileContactItem}>
                    <FiMapPin className={styles.profileIcon} />
                    <span>{detailCustomer.address}</span>
                  </div>
                )}
              </div>

              {/* 3 Lifetime CRM Metrics */}
              <div className={styles.detailStatsGrid}>
                <div className={styles.detailStatBox}>
                  <span className={styles.detailStatLabel}>Tổng Chi Tiêu</span>
                  <strong className={styles.detailStatVal} style={{ color: 'var(--primary, #3b82f6)' }}>
                    {formatPrice(detailCustomer.totalSpent || 0)}
                  </strong>
                </div>
                <div className={styles.detailStatBox}>
                  <span className={styles.detailStatLabel}>Số Đơn Hàng</span>
                  <strong className={styles.detailStatVal}>
                    {detailCustomer.orders?.length ?? detailCustomer.orderCount ?? 0} đơn
                  </strong>
                </div>
                <div className={styles.detailStatBox}>
                  <span className={styles.detailStatLabel}>TB Mỗi Đơn (AOV)</span>
                  <strong className={styles.detailStatVal} style={{ color: '#10b981' }}>
                    {formatPrice(
                      (detailCustomer.orders?.length ?? detailCustomer.orderCount ?? 0) > 0
                        ? Math.round((detailCustomer.totalSpent || 0) / ((detailCustomer.orders?.length ?? detailCustomer.orderCount) || 1))
                        : 0
                    )}
                  </strong>
                </div>
              </div>

              {/* Order History Section */}
              <div className={styles.orderHistorySection}>
                <div className={styles.orderHistoryHeader}>
                  <div className={styles.orderHistoryTitle}>
                    <FiShoppingBag size={15} />
                    <span>Lịch Sử Mua Hàng ({detailCustomer.orders?.length || 0})</span>
                  </div>
                </div>

                {loadingDetail ? (
                  <div style={{ padding: 12 }}>
                    <Skeleton type="rect" count={2} />
                  </div>
                ) : !detailCustomer.orders || detailCustomer.orders.length === 0 ? (
                  <div className={styles.emptyOrders}>
                    Chưa có đơn hàng nào được ghi nhận cho khách hàng này.
                  </div>
                ) : (
                  <div className={styles.orderList}>
                    {detailCustomer.orders.map((ord: any) => {
                      const badge = getOrderStatusBadge(ord.orderStatus || ord.status);
                      return (
                        <div key={ord._id} className={styles.orderItemCard}>
                          <div className={styles.orderItemTop}>
                            <div>
                              <span className={styles.orderCode}>
                                #{ord.orderCode || ord._id.slice(-6).toUpperCase()}
                              </span>
                              <span className={styles.orderDate}>
                                {ord.createdAt ? formatDate(ord.createdAt) : ''}
                              </span>
                            </div>
                            <span
                              className={styles.statusPill}
                              style={{ color: badge.color, backgroundColor: badge.bg }}
                            >
                              {badge.text}
                            </span>
                          </div>

                          <div className={styles.orderItemBottom}>
                            <span className={styles.orderItemCount}>
                              {ord.items?.length || 1} sản phẩm
                            </span>
                            <strong className={styles.orderItemTotal}>
                              {formatPrice(ord.totalAmount || ord.total || 0)}
                            </strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setDetailModalOpen(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => {
                  setDetailModalOpen(false);
                  handleOpenEdit(detailCustomer);
                }}
              >
                <FiEdit2 />
                <span>Chỉnh Sửa Khách Hàng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm / Chỉnh Sửa Khách Hàng (API 6.3) */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <div className={styles.modalHeaderIcon}>
                  {editingCustomer ? <FiEdit2 size={18} /> : <FiUser size={18} />}
                </div>
                <div>
                  <h3 className={styles.modalTitle}>
                    {editingCustomer ? 'Chỉnh Sửa Thông Tin Khách Hàng' : 'Thêm Khách Hàng Mới'}
                  </h3>
                  <div className={styles.modalSubtitle}>
                    {editingCustomer ? `Cập nhật hồ sơ: ${editingCustomer.name}` : 'Tạo mới hồ sơ khách hàng vào hệ thống CRM'}
                  </div>
                </div>
              </div>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)} title="Đóng">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Họ và tên khách hàng <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.inputWithIcon}>
                    <FiUser className={styles.inputIcon} size={15} />
                    <input
                      type="text"
                      required
                      className={styles.input}
                      placeholder="VD: Nguyễn Văn An"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Số điện thoại <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.inputWithIcon}>
                    <FiPhone className={styles.inputIcon} size={15} />
                    <input
                      type="tel"
                      required
                      className={styles.input}
                      placeholder="VD: 0987123456"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\s+/g, '') })}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Địa chỉ Email</label>
                  <div className={styles.inputWithIcon}>
                    <FiMail className={styles.inputIcon} size={15} />
                    <input
                      type="email"
                      className={styles.input}
                      placeholder="VD: nguyenvanan@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Địa chỉ nhận hàng</label>
                  <div className={styles.textareaWithIcon}>
                    <FiMapPin className={styles.textareaIcon} size={15} />
                    <textarea
                      className={styles.textarea}
                      placeholder="VD: Số 15 Lê Văn Lương, Trung Hòa, Cầu Giấy, Hà Nội"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className={styles.saveBtn} disabled={isSubmitting}>
                  <FiCheck size={16} />
                  <span>{isSubmitting ? 'Đang lưu...' : editingCustomer ? 'Lưu Cập Nhật' : 'Tạo Khách Hàng'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Khách Hàng (API 6.3) */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Xác Nhận Xóa Khách Hàng"
        message="Hành động này sẽ xóa hồ sơ khách hàng khỏi hệ thống CRM."
        itemTitle={deleteTarget?.name}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
