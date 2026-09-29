'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiX, FiUser, FiTruck, FiPackage, FiCreditCard, FiExternalLink, FiPrinter } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatPrice, formatDate } from '@/lib/utils';
import { formatVariantDisplay } from '@/lib/variant-helper';
import LazyImage from '@/components/common/LazyImage';
import Skeleton from '@/components/common/Skeleton';
import OrderTrackingTimeline from '@/components/store/OrderTrackingTimeline';
import ShipOrderModal from '@/components/admin/ShipOrderModal';
import OrderPackingSlipModal from '@/components/admin/OrderPackingSlipModal';
import { apiFetch } from '@/lib/api';
import styles from './OrderDetailModal.module.css';

interface OrderDetailModalProps {
  orderId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OrderDetailModal({
  orderId,
  onClose,
  onSuccess,
}: OrderDetailModalProps) {
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/orders/${orderId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setOrder(data.data);
        } else {
          toast.error(data.message || 'Không tìm thấy đơn hàng');
          onClose();
        }
      } catch (e) {
        toast.error('Lỗi khi tải thông tin đơn hàng');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (!orderId) return null;

  const handleUpdateStatus = async (status: string) => {
    if (status === 'shipping') {
      // Open carrier selection modal
      setIsShipModalOpen(true);
      return;
    }

    if (status === 'cancelled') {
      const confirmMsg = order?.trackingCode
        ? `Bạn có chắc chắn muốn hủy đơn hàng #${order.orderCode}?\nVận đơn ${order.trackingCode} bên ${order.shippingCarrier || 'hãng vận chuyển'} cũng sẽ được hủy tự động.`
        : `Bạn có chắc chắn muốn hủy đơn hàng #${order?.orderCode}?`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    setIsUpdating(true);
    try {
      const payload: any = { status };
      if (status === 'delivered' && order?.paymentMethod === 'cod') {
        payload.paymentStatus = 'paid';
      }

      const res = await apiFetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Đã cập nhật trạng thái đơn thành công!`);
        setOrder({
          ...order,
          status,
          ...(payload.paymentStatus ? { paymentStatus: payload.paymentStatus } : {}),
        });
        onSuccess();
      } else {
        toast.error(data.message || 'Lỗi cập nhật');
      }
    } catch (e) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePaymentStatus = async (paymentStatus: string) => {
    setIsUpdating(true);
    try {
      const res = await apiFetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã cập nhật trạng thái thanh toán!`);
        setOrder({ ...order, paymentStatus });
        onSuccess();
      } else {
        toast.error(data.message || 'Lỗi cập nhật');
      }
    } catch (e) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h2 className={styles.title}>
              Chi tiết đơn hàng #{order?.orderCode || ''}
            </h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Đóng">
            <FiX />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Skeleton type="rect" height={100} />
              <Skeleton type="rect" height={160} />
              <Skeleton type="table-row" count={2} />
            </div>
          ) : order ? (
            <>
              {/* Customer & Payment Grid */}
              <div className={styles.grid2}>
                <div className={styles.infoCard}>
                  <h4 className={styles.cardTitle}>
                    <FiUser /> Thông tin người nhận
                  </h4>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Họ và tên:</span>
                    <span className={styles.infoValue}>{order.customer?.name}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Số điện thoại:</span>
                    <span className={styles.infoValue}>{order.customer?.phone}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Địa chỉ:</span>
                    <span className={styles.infoValue}>{order.customer?.address}</span>
                  </div>
                  {order.customer?.email && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Email:</span>
                      <span className={styles.infoValue}>{order.customer?.email}</span>
                    </div>
                  )}
                </div>

                <div className={styles.infoCard}>
                  <h4 className={styles.cardTitle}>
                    <FiCreditCard /> Thanh toán & Vận chuyển
                  </h4>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Phương thức:</span>
                    <span className={styles.infoValue}>
                      {order.paymentMethod === 'bank_transfer' ? 'Chuyển khoản / VietQR' : 'Thanh toán khi nhận (COD)'}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Thanh toán:</span>
                    <select
                      className={styles.statusSelect}
                      value={order.paymentStatus || 'unpaid'}
                      disabled={isUpdating}
                      onChange={(e) => handleUpdatePaymentStatus(e.target.value)}
                    >
                      <option value="unpaid">Chưa thanh toán</option>
                      <option value="paid">Đã thanh toán</option>
                    </select>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Thời gian đặt:</span>
                    <span className={styles.infoValue}>{formatDate(order.createdAt)}</span>
                  </div>
                  {order.notes && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Ghi chú:</span>
                      <span className={styles.infoValue} style={{ color: '#f59e0b' }}>{order.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div className={styles.itemsSection}>
                <h4 className={styles.sectionTitle}>
                  <FiPackage /> Danh sách sản phẩm ({order.items?.length || 0})
                </h4>
                <div className={styles.itemList}>
                  {order.items?.map((item: any, i: number) => {
                    const variantLabel = formatVariantDisplay(item);
                    return (
                      <div key={i} className={styles.itemRow}>
                        <LazyImage
                          src={item.image || '/file.svg'}
                          alt={item.name}
                          aspectRatio="1 / 1"
                          style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }}
                        />
                        <div className={styles.itemInfo}>
                          <div className={styles.itemName}>{item.name}</div>
                          {variantLabel && (
                            <div className={styles.itemVariant}>
                              Phân loại: <strong style={{ color: 'var(--primary, #3b82f6)' }}>{variantLabel}</strong>
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className={styles.itemPrice}>
                            {formatPrice(item.price)} x {item.quantity}
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
                            = {formatPrice(item.price * item.quantity)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary Box */}
              <div className={styles.summaryBox}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Tạm tính tiền hàng:</span>
                  <span className={styles.infoValue}>{formatPrice(order.subtotal || 0)}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Phí vận chuyển:</span>
                  <span className={styles.infoValue}>
                    {order.shippingFee ? formatPrice(order.shippingFee) : 'Miễn phí'}
                  </span>
                </div>
                {order.discountAmount > 0 && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Khuyến mãi giảm giá:</span>
                    <span className={styles.infoValue} style={{ color: '#ef4444' }}>
                      -{formatPrice(order.discountAmount)}
                    </span>
                  </div>
                )}
                <div className={styles.totalRow}>
                  <span>Tổng tiền thanh toán:</span>
                  <span className={styles.totalPrice}>{formatPrice(order.totalAmount)}</span>
                </div>
              </div>

              {/* Real-time Shipping Tracker */}
              <OrderTrackingTimeline
                orderCode={order.orderCode}
                trackingCode={order.trackingCode}
                carrier={order.shippingProvider || order.shippingCarrier}
              />
            </>
          ) : null}
        </div>

        {/* Footer */}
        {order && (
          <div className={styles.footer}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)' }}>
                Trạng thái đơn:
              </span>
              <select
                className={styles.statusSelect}
                value={order.status}
                disabled={isUpdating}
                onChange={(e) => handleUpdateStatus(e.target.value)}
              >
                <option value="pending">Chờ duyệt</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="shipping">Đang giao hàng</option>
                <option value="delivered">Đã giao thành công</option>
                <option value="cancelled">Đã hủy đơn</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={styles.btnPrintSlip}
                onClick={() => setIsSlipModalOpen(true)}
                title="In phiếu đóng hàng chuẩn A6 cho đơn vị vận chuyển"
              >
                <FiPrinter /> In phiếu đóng hàng (A6)
              </button>

              <Link href={`/admin/orders/${order._id}`} className={styles.fullDetailBtn}>
                <FiExternalLink /> Xem trang chi tiết
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Ship Order Carrier Modal */}
      <ShipOrderModal
        order={isShipModalOpen ? order : null}
        onClose={() => setIsShipModalOpen(false)}
        onSuccess={() => {
          onSuccess();
          onClose();
        }}
      />

      {/* Order Packing Slip Modal */}
      {isSlipModalOpen && order && (
        <OrderPackingSlipModal
          orders={[order]}
          onClose={() => setIsSlipModalOpen(false)}
        />
      )}
    </div>
  );
}
