'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FiSearch,
  FiEye,
  FiCheck,
  FiTruck,
  FiTrash2,
  FiRotateCcw,
  FiShoppingBag,
  FiCalendar,
  FiClock,
  FiPrinter,
  FiDownload,
  FiCheckSquare,
  FiSquare,
  FiFileText,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatPrice, formatDate } from '@/lib/utils';
import { formatVariantDisplay } from '@/lib/variant-helper';
import Skeleton from '@/components/common/Skeleton';
import OrderDetailModal from '@/components/admin/OrderDetailModal';
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal';
import CancelOrderConfirmModal from '@/components/admin/CancelOrderConfirmModal';
import DeliverConfirmModal from '@/components/admin/DeliverConfirmModal';
import ShipOrderModal from '@/components/admin/ShipOrderModal';
import OrderPackingSlipModal from '@/components/admin/OrderPackingSlipModal';
import LowStockWarningModal, { ILowStockItem } from '@/components/admin/LowStockWarningModal';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [isResetting, setIsResetting] = useState(false);

  // Batch & Print states
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [printSlipOrders, setPrintSlipOrders] = useState<any[] | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Modal states
  const [selectedDetailOrderId, setSelectedDetailOrderId] = useState<string | null>(null);
  const [shippingTargetOrder, setShippingTargetOrder] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; code: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cancel Order Modal state
  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    code: string;
    trackingCode?: string;
    carrier?: string;
  } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Deliver Confirm Modal state
  const [deliverTarget, setDeliverTarget] = useState<{
    id: string;
    code: string;
    isCod?: boolean;
    totalAmount?: number;
  } | null>(null);
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const [isSyncingVTP, setIsSyncingVTP] = useState(false);

  // Low Stock Warning Modal state
  const [lowStockWarningData, setLowStockWarningData] = useState<{
    isOpen: boolean;
    orderId: string;
    orderCode: string;
    status: string;
    items: ILowStockItem[];
  } | null>(null);
  const [isConfirmingLowStock, setIsConfirmingLowStock] = useState(false);

  const tabs = [
    { key: 'all', label: 'Tất cả đơn' },
    { key: 'pending', label: 'Chờ duyệt' },
    { key: 'confirmed', label: 'Đã xác nhận' },
    { key: 'shipping', label: 'Đang giao' },
    { key: 'delivered', label: 'Đã giao thành công' },
    { key: 'cancelled', label: 'Đã hủy' },
  ];

  // Fetch orders based on API 5.1 specifications
  const fetchOrders = async (overrides?: {
    page?: number;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const curPage = overrides?.page !== undefined ? overrides.page : page;
    const curStatus = overrides?.status !== undefined ? overrides.status : activeStatus;
    const curSearch = overrides?.search !== undefined ? overrides.search : search;
    const curStart = overrides?.startDate !== undefined ? overrides.startDate : startDate;
    const curEnd = overrides?.endDate !== undefined ? overrides.endDate : endDate;

    try {
      setLoading(true);
      let url = `/api/orders?page=${curPage}&limit=10&status=${curStatus}`;
      if (curSearch) url += `&search=${encodeURIComponent(curSearch)}`;
      if (curStart) url += `&startDate=${curStart}`;
      if (curEnd) url += `&endDate=${curEnd}`;

      const res = await apiFetch(url);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalOrders(data.pagination.total || 0);
        }
      }
    } catch (err) {
      toast.error('Lỗi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, activeStatus, search, startDate, endDate]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(orders.map((o) => o._id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleToggleOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handlePrintSingle = (order: any) => {
    setPrintSlipOrders([order]);
  };

  const handlePrintSelected = () => {
    const selected = orders.filter((o) => selectedOrderIds.includes(o._id));
    if (selected.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 đơn hàng để in');
      return;
    }
    setPrintSlipOrders(selected);
  };

  // Export orders to Excel (CSV with UTF-8 BOM)
  const handleExportExcel = async (type: 'all' | 'filtered' | 'selected' = 'filtered') => {
    try {
      setIsExporting(true);
      let url = '/api/orders/export?';
      if (type === 'selected' && selectedOrderIds.length > 0) {
        url += `orderIds=${selectedOrderIds.join(',')}`;
      } else if (type === 'all') {
        url += `status=all`;
      } else {
        if (activeStatus && activeStatus !== 'all') url += `status=${activeStatus}&`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (startDate) url += `startDate=${startDate}&`;
        if (endDate) url += `endDate=${endDate}&`;
      }

      toast.loading('Đang khởi tạo file Excel...', { id: 'exporting' });
      const res = await apiFetch(url);
      if (!res.ok) throw new Error('Lỗi khi tải dữ liệu đơn hàng');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;

      const disposition = res.headers.get('content-disposition');
      let filename = 'Danh_sach_don_hang_ShopBig.csv';
      if (disposition && disposition.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/"/g, '').trim();
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Đã xuất file Excel đơn hàng thành công!', { id: 'exporting' });
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xuất file Excel', { id: 'exporting' });
    } finally {
      setIsExporting(false);
    }
  };

  // Reset all filters & explicitly fetch API
  const handleResetFilters = async () => {
    setIsResetting(true);
    setSearch('');
    setActiveStatus('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
    setSelectedOrderIds([]);

    await fetchOrders({
      page: 1,
      status: 'all',
      search: '',
      startDate: '',
      endDate: '',
    });

    setIsResetting(false);
    toast.success('Đã làm mới và tải lại danh sách đơn hàng!');
  };

  // Quick update order status (API 5.3 PUT)
  const handleUpdateStatus = async (
    orderId: string,
    status: string,
    forceConfirm: boolean = false,
    orderCode?: string
  ) => {
    try {
      if (forceConfirm) setIsConfirmingLowStock(true);
      const res = await apiFetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, forceConfirm }),
      });
      const data = await res.json();

      if (data.requiresConfirmation) {
        setLowStockWarningData({
          isOpen: true,
          orderId,
          orderCode: orderCode || orderId,
          status,
          items: data.lowStockItems || [],
        });
        return;
      }

      if (data.success) {
        toast.success(data.message || `Đã cập nhật trạng thái đơn thành công!`);
        setLowStockWarningData(null);
        fetchOrders();
      } else {
        toast.error(data.message || 'Lỗi cập nhật');
      }
    } catch (e) {
      toast.error('Lỗi cập nhật đơn hàng');
    } finally {
      setIsConfirmingLowStock(false);
    }
  };

  // Cancel Order with 3rd-party carrier sync (Viettel Post, GHN, GHTK)
  const handleConfirmCancel = async (reason: string) => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      const res = await apiFetch(`/api/orders/${cancelTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', notes: reason }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Đã hủy đơn hàng #${cancelTarget.code} thành công!`);
        setCancelTarget(null);
        fetchOrders();
      } else {
        toast.error(data.message || 'Lỗi hủy đơn hàng');
      }
    } catch (err) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsCancelling(false);
    }
  };

  // Deliver Order confirmation (Xác nhận đã giao hàng thành công)
  const handleConfirmDeliver = async () => {
    if (!deliverTarget) return;
    setIsConfirmingDelivery(true);
    try {
      const res = await apiFetch(`/api/orders/${deliverTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'delivered',
          ...(deliverTarget.isCod ? { paymentStatus: 'paid' } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Đã xác nhận đơn hàng #${deliverTarget.code} giao thành công!`);
        setDeliverTarget(null);
        fetchOrders();
      } else {
        toast.error(data.message || 'Lỗi cập nhật giao hàng');
      }
    } catch (err) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsConfirmingDelivery(false);
    }
  };

  // Sync active orders with Viettel Post live API
  const handleSyncVTP = async () => {
    setIsSyncingVTP(true);
    try {
      const res = await apiFetch('/api/shipping/sync-vtp', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchOrders();
      } else {
        toast.error(data.message || 'Lỗi đồng bộ Viettel Post');
      }
    } catch (err) {
      toast.error('Lỗi kết nối máy chủ khi đồng bộ');
    } finally {
      setIsSyncingVTP(false);
    }
  };

  // Delete Order (API 5.3 DELETE)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/orders/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã xóa đơn hàng #${deleteTarget.code} thành công!`);
        setDeleteTarget(null);
        setSelectedOrderIds((prev) => prev.filter((id) => id !== deleteTarget.id));
        fetchOrders();
      } else {
        toast.error(data.message || 'Lỗi xóa đơn hàng');
      }
    } catch (err) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsDeleting(false);
    }
  };

  const isAllSelected = orders.length > 0 && orders.every((o) => selectedOrderIds.includes(o._id));

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Quản Lý Đơn Hàng</h1>
          <p className={styles.subtitle}>
            Tổng số: <strong style={{ color: 'var(--text-main, #fff)' }}>{totalOrders}</strong> đơn hàng trong hệ thống
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnExport}
            onClick={() => handleExportExcel('filtered')}
            disabled={isExporting}
            title="Xuất file Excel danh sách đơn hàng theo bộ lọc hiện tại"
          >
            <FiDownload /> {isExporting ? 'Đang xuất...' : 'Xuất Excel (.csv)'}
          </button>
        </div>
      </div>

      <div className={styles.card}>
        {/* Status Tabs */}
        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.tab} ${activeStatus === tab.key ? styles.activeTab : ''}`}
              onClick={() => {
                setActiveStatus(tab.key);
                setPage(1);
                setSelectedOrderIds([]);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters Bar */}
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm theo mã đơn (#ST...), tên khách, số điện thoại..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '0.8125rem' }}>Từ:</span>
            <input
              type="date"
              className={styles.dateInput}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />
            <span style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '0.8125rem' }}>Đến:</span>
            <input
              type="date"
              className={styles.dateInput}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Reset Filters Button */}
          <button
            type="button"
            className={styles.btnReset}
            onClick={handleResetFilters}
            disabled={isResetting}
            title="Đặt lại bộ lọc & Làm mới danh sách"
          >
            <FiRotateCcw className={isResetting ? styles.spinning : ''} />
            <span>{isResetting ? 'Đang làm mới...' : 'Đặt lại bộ lọc'}</span>
          </button>

          {/* Sync with Viettel Post Button */}
          <button
            type="button"
            className={styles.btnReset}
            style={{
              background: 'rgba(234, 88, 12, 0.1)',
              borderColor: 'rgba(234, 88, 12, 0.3)',
              color: '#ea580c',
            }}
            onClick={handleSyncVTP}
            disabled={isSyncingVTP}
            title="Đồng bộ trạng thái giao hàng từ Viettel Post"
          >
            <FiRefreshCw className={isSyncingVTP ? 'animate-spin' : ''} />
            <span>{isSyncingVTP ? 'Đang đồng bộ...' : 'Đồng bộ VTP'}</span>
          </button>
        </div>

        {/* Sticky Batch Action Bar when orders are selected */}
        {selectedOrderIds.length > 0 && (
          <div className={styles.batchBar}>
            <div className={styles.batchInfo}>
              <FiCheckSquare style={{ color: '#38bdf8', fontSize: '1.125rem' }} />
              <span>
                Đã chọn <strong style={{ color: '#38bdf8', fontSize: '1rem' }}>{selectedOrderIds.length}</strong> đơn hàng
              </span>
            </div>

            <div className={styles.batchActions}>
              <button
                type="button"
                className={styles.btnBatchPrint}
                onClick={handlePrintSelected}
                title="In toàn bộ phiếu đóng hàng khổ A6 cho các đơn đã chọn"
              >
                <FiPrinter /> In {selectedOrderIds.length} phiếu đóng hàng (A6)
              </button>

              <button
                type="button"
                className={styles.btnExport}
                onClick={() => handleExportExcel('selected')}
                title="Xuất riêng các đơn hàng đã chọn ra file Excel"
              >
                <FiDownload /> Xuất Excel ({selectedOrderIds.length} đơn)
              </button>

              <button
                type="button"
                className={styles.btnClearSelection}
                onClick={() => setSelectedOrderIds([])}
                title="Bỏ chọn toàn bộ"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        {/* Orders Table with Skeleton */}
        {loading ? (
          <div style={{ padding: 16 }}>
            <Skeleton type="table-row" count={8} />
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      title="Chọn tất cả đơn hàng trên trang này"
                    />
                  </th>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Sản phẩm</th>
                  <th>Tổng tiền</th>
                  <th>Thanh toán</th>
                  <th>Trạng thái</th>
                  <th>Thời gian đặt</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted, #9ca3af)', padding: 40 }}>
                      Không tìm thấy đơn hàng nào phù hợp với bộ lọc
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => {
                    const isSelected = selectedOrderIds.includes(o._id);

                    return (
                      <tr key={o._id} style={{ background: isSelected ? 'rgba(56, 189, 248, 0.06)' : undefined }}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={isSelected}
                            onChange={() => handleToggleOrder(o._id)}
                          />
                        </td>
                        <td className={styles.bold}>
                          <button
                            type="button"
                            onClick={() => setSelectedDetailOrderId(o._id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary, #3b82f6)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '0.9375rem',
                            }}
                          >
                            #{o.orderCode}
                          </button>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-main, #ffffff)' }}>{o.customer?.name}</strong>
                          <br />
                          <span className={styles.textMuted}>{o.customer?.phone}</span>
                        </td>
                        <td>
                          <span style={{ color: 'var(--text-main, #ffffff)', fontWeight: 600 }}>
                            {o.items?.length || 0} sản phẩm
                          </span>
                          {o.items?.[0] && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #64748b)', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {o.items[0].name}
                              {formatVariantDisplay(o.items[0]) ? ` (${formatVariantDisplay(o.items[0])})` : ''}
                              {o.items.length > 1 ? ` (+${o.items.length - 1})` : ''}
                            </div>
                          )}
                        </td>
                        <td className={styles.bold} style={{ color: 'var(--primary, #3b82f6)' }}>
                          {formatPrice(o.totalAmount)}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: o.paymentStatus === 'paid' ? '#10b981' : '#f59e0b',
                            }}
                          >
                            {o.paymentStatus === 'paid' ? '● Đã thanh toán' : '○ Chưa thanh toán'}
                          </span>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim, #64748b)' }}>
                            {o.paymentMethod === 'bank_transfer' ? 'VietQR/Chuyển khoản' : 'COD (Tiền mặt)'}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`${styles.badge} ${
                              o.status === 'delivered'
                                ? styles.badgeDelivered
                                : o.status === 'cancelled'
                                ? styles.badgeCancelled
                                : o.status === 'shipping'
                                ? styles.badgeShipping
                                : o.status === 'confirmed'
                                ? styles.badgeConfirmed
                                : styles.badgePending
                            }`}
                          >
                            {o.status === 'delivered'
                              ? 'Đã giao thành công'
                              : o.status === 'shipping'
                              ? 'Đang giao'
                              : o.status === 'confirmed'
                              ? 'Đã duyệt'
                              : o.status === 'cancelled'
                              ? 'Đã hủy'
                              : 'Chờ duyệt'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '0.8125rem' }}>
                          {formatDate(o.createdAt)}
                        </td>
                        <td>
                          <div className={styles.actions} style={{ justifyContent: 'flex-end', display: 'flex', gap: 6 }}>
                            {/* 1. Print Packing Slip A6 */}
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => handlePrintSingle(o)}
                              title="In phiếu đóng hàng A6"
                              style={{ color: '#38bdf8' }}
                            >
                              <FiPrinter />
                            </button>

                            {/* 2. View Details */}
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => setSelectedDetailOrderId(o._id)}
                              title="Xem chi tiết đơn hàng"
                            >
                              <FiEye />
                            </button>

                            {/* Status transitions */}
                            {/* 1. XÁC NHẬN ĐƠN: Chỉ hiển thị khi đơn ở trạng thái "Chờ duyệt" (pending) */}
                            {o.status === 'pending' && (
                              <button
                                type="button"
                                className={styles.actionBtn}
                                title="Xác nhận & duyệt đơn hàng"
                                style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.12)' }}
                                onClick={() => handleUpdateStatus(o._id, 'confirmed', false, o.orderCode)}
                              >
                                <FiCheck />
                              </button>
                            )}

                            {/* 2. GIAO HÀNG (ĐẨY SANG HÃNG): Chỉ hiển thị sau khi ĐÃ XÁC NHẬN (confirmed) */}
                            {o.status === 'confirmed' && (
                              <button
                                type="button"
                                className={styles.actionBtn}
                                title="Giao hàng (Đẩy sang hãng vận chuyển Viettel Post/GHN/GHTK)"
                                style={{ color: '#ea580c', background: 'rgba(234, 88, 12, 0.12)' }}
                                onClick={() => setShippingTargetOrder(o)}
                              >
                                <FiTruck />
                              </button>
                            )}

                            {/* 3. XÁC NHẬN ĐÃ GIAO HÀNG THÀNH CÔNG: Chỉ hiển thị khi đơn đang giao (shipping / delivering) */}
                            {(o.status === 'shipping' || o.status === 'delivering') && (
                              <button
                                type="button"
                                className={styles.actionBtn}
                                title="Xác nhận đã giao hàng thành công"
                                style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.12)' }}
                                onClick={() =>
                                  setDeliverTarget({
                                    id: o._id,
                                    code: o.orderCode,
                                    isCod: o.paymentMethod === 'cod',
                                    totalAmount: o.totalAmount,
                                  })
                                }
                              >
                                <FiCheckCircle />
                              </button>
                            )}

                            {/* 4. HỦY ĐƠN HÀNG: Thay thế nút xóa đơn hàng, tự động hủy cả bên đối tác thứ 3 */}
                            {o.status !== 'cancelled' && o.status !== 'delivered' && (
                              <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.dangerBtn}`}
                                onClick={() =>
                                  setCancelTarget({
                                    id: o._id,
                                    code: o.orderCode,
                                    trackingCode: o.trackingCode,
                                    carrier: o.shippingCarrier || o.shippingProvider,
                                  })
                                }
                                title="Hủy đơn hàng (Hủy cả bên vận chuyển thứ 3)"
                                style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.12)' }}
                              >
                                <FiXCircle />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--border-color, #232838)', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted, #9ca3af)' }}>
              Trang <strong>{page}</strong> / <strong>{totalPages}</strong> (Hiển thị {orders.length} trên tổng số {totalOrders} đơn hàng)
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

      {/* Order Detail Modal (API 5.3) */}
      <OrderDetailModal
        orderId={selectedDetailOrderId}
        onClose={() => setSelectedDetailOrderId(null)}
        onSuccess={fetchOrders}
      />

      {/* Ship Order Carrier Modal */}
      <ShipOrderModal
        order={shippingTargetOrder}
        onClose={() => setShippingTargetOrder(null)}
        onSuccess={fetchOrders}
      />

      {/* Order Packing Slip Print Modal (Single or Batch) */}
      {printSlipOrders && (
        <OrderPackingSlipModal
          orders={printSlipOrders}
          onClose={() => setPrintSlipOrders(null)}
        />
      )}

      {/* Cancel Order Confirm Modal (Thay thế DeleteConfirmModal, hủy cả bên vận chuyển thứ 3) */}
      <CancelOrderConfirmModal
        isOpen={!!cancelTarget}
        orderCode={cancelTarget?.code || ''}
        trackingCode={cancelTarget?.trackingCode}
        carrier={cancelTarget?.carrier}
        isCancelling={isCancelling}
        onConfirm={handleConfirmCancel}
        onClose={() => setCancelTarget(null)}
      />

      {/* Deliver Confirm Modal */}
      <DeliverConfirmModal
        isOpen={!!deliverTarget}
        orderCode={deliverTarget?.code || ''}
        isCod={deliverTarget?.isCod}
        totalAmount={deliverTarget?.totalAmount}
        isConfirming={isConfirmingDelivery}
        onConfirm={handleConfirmDeliver}
        onClose={() => setDeliverTarget(null)}
      />

      {/* Low Stock Warning Modal */}
      {lowStockWarningData && (
        <LowStockWarningModal
          isOpen={lowStockWarningData.isOpen}
          onClose={() => setLowStockWarningData(null)}
          onConfirm={() =>
            handleUpdateStatus(
              lowStockWarningData.orderId,
              lowStockWarningData.status,
              true,
              lowStockWarningData.orderCode
            )
          }
          orderCode={lowStockWarningData.orderCode}
          items={lowStockWarningData.items}
          loading={isConfirmingLowStock}
        />
      )}
    </div>
  );
}
