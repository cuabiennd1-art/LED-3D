'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FiArrowLeft, FiCheck, FiTruck, FiUser, FiMapPin, FiPackage, FiX, FiDollarSign, FiPrinter, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatPrice, formatDate } from '@/lib/utils';
import { formatVariantDisplay } from '@/lib/variant-helper';
import AdminLoading from '@/components/admin/AdminLoading';
import OrderTrackingTimeline from '@/components/store/OrderTrackingTimeline';
import ShipOrderModal from '@/components/admin/ShipOrderModal';
import OrderPackingSlipModal from '@/components/admin/OrderPackingSlipModal';
import CancelOrderConfirmModal from '@/components/admin/CancelOrderConfirmModal';
import DeliverConfirmModal from '@/components/admin/DeliverConfirmModal';
import LowStockWarningModal, { ILowStockItem } from '@/components/admin/LowStockWarningModal';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeliverModalOpen, setIsDeliverModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDelivering, setIsDelivering] = useState(false);

  // Low Stock Warning Modal
  const [lowStockWarningData, setLowStockWarningData] = useState<{
    isOpen: boolean;
    status: string;
    paymentStatus?: string;
    items: ILowStockItem[];
  } | null>(null);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/orders/${id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setOrder(data.data);
      } else {
        toast.error('Không tìm thấy đơn hàng');
      }
    } catch (e) {
      toast.error('Lỗi tải thông tin đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  const updateOrderStatus = async (
    status: string,
    paymentStatus?: string,
    forceConfirm: boolean = false,
    notes?: string
  ) => {
    setUpdating(true);
    try {
      const payload: any = { status, forceConfirm };
      if (paymentStatus) payload.paymentStatus = paymentStatus;
      if (notes) payload.notes = notes;

      const res = await apiFetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.requiresConfirmation) {
        setUpdating(false);
        setLowStockWarningData({
          isOpen: true,
          status,
          paymentStatus,
          items: data.lowStockItems || [],
        });
        return;
      }

      if (data.success) {
        toast.success(data.message || `Đã cập nhật trạng thái đơn thành ${status}`);
        setLowStockWarningData(null);
        fetchOrder();
      } else {
        toast.error(data.message || 'Lỗi cập nhật');
      }
    } catch (err) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <AdminLoading text="Đang tải chi tiết đơn hàng..." />;
  if (!order) return <div className={styles.page}>Không tìm thấy đơn hàng</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Link href="/admin/orders" className={styles.backBtn}>
            <FiArrowLeft />
          </Link>
          <h1 className={styles.title}>Đơn hàng #{order.orderCode}</h1>
          <span
            className={`${styles.badge} ${
              order.status === 'delivered'
                ? styles.badgeSuccess
                : order.status === 'cancelled'
                ? styles.badgeDanger
                : order.status === 'shipping'
                ? styles.badgeInfo
                : styles.badgePending
            }`}
          >
            {order.status === 'delivered'
              ? 'Đã giao thành công'
              : order.status === 'shipping'
              ? 'Đang giao hàng'
              : order.status === 'confirmed'
              ? 'Đã xác nhận'
              : order.status === 'cancelled'
              ? 'Đã hủy'
              : 'Chờ xác nhận'}
          </span>
        </div>

        <div className={styles.actions}>
          {/* Print Packing Slip A6 */}
          <button
            type="button"
            className={styles.btnPrimary}
            style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)' }}
            onClick={() => setIsSlipModalOpen(true)}
            title="In phiếu đóng hàng khổ A6 máy in nhiệt"
          >
            <FiPrinter /> In Phiếu Đóng Hàng (A6)
          </button>

          {/* Hủy đơn hàng (Hủy cả bên vận chuyển thứ 3) */}
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <button
              className={styles.btnDanger}
              onClick={() => setIsCancelModalOpen(true)}
              disabled={updating}
              title="Hủy đơn hàng và hủy cả bên vận chuyển thứ 3"
            >
              <FiXCircle /> Hủy Đơn Hàng
            </button>
          )}

          {/* 1. Chờ duyệt (pending): Chỉ hiển thị nút Duyệt đơn */}
          {order.status === 'pending' && (
            <button
              type="button"
              className={styles.btnPrimary}
              style={{ background: '#10b981' }}
              onClick={() => updateOrderStatus('confirmed')}
              disabled={updating}
            >
              <FiCheck /> Duyệt Đơn
            </button>
          )}

          {/* 2. Đã xác nhận (confirmed): Hiển thị nút Giao hàng (Đẩy sang hãng) */}
          {order.status === 'confirmed' && (
            <button
              type="button"
              className={styles.btnPrimary}
              style={{ background: '#ea580c' }}
              onClick={() => setIsShipModalOpen(true)}
              disabled={updating}
            >
              <FiTruck /> Giao Hàng (Đẩy Sang Hãng)
            </button>
          )}

          {/* 3. Đang giao hàng (shipping / delivering): Hiển thị nút Xác nhận đã giao thành công */}
          {(order.status === 'shipping' || order.status === 'delivering') && (
            <button
              className={styles.btnPrimary}
              style={{ background: '#10b981' }}
              onClick={() => setIsDeliverModalOpen(true)}
              disabled={updating}
            >
              <FiCheckCircle /> Xác Nhận Đã Giao Hàng
            </button>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.mainCol}>
          <div className={styles.card}>
            <h3>
              <FiPackage className={styles.inlineIcon} /> Sản phẩm trong đơn ({order.items?.length || 0})
            </h3>
            <div className={styles.productList}>
              {order.items?.map((item: any, idx: number) => {
                const variantLabel = formatVariantDisplay(item);
                return (
                  <div key={idx} className={styles.productItem}>
                    <img
                      src={item.image || '/file.svg'}
                      alt={item.name}
                      className={styles.productImg}
                    />
                    <div className={styles.productInfo}>
                      <h4>{item.name}</h4>
                      {variantLabel && (
                        <p className={styles.textMuted} style={{ fontSize: '0.8125rem', marginTop: 4 }}>
                          Phân loại: <strong style={{ color: 'var(--primary, #3b82f6)' }}>{variantLabel}</strong>
                        </p>
                      )}
                    </div>
                    <div className={styles.productPrice}>
                      <p>
                        {formatPrice(item.price)} x {item.quantity}
                      </p>
                      <strong>{formatPrice(item.price * item.quantity)}</strong>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span>Tạm tính tiền hàng:</span>
                <span>{formatPrice(order.subtotal || order.totalAmount)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Phí vận chuyển:</span>
                <span>{order.shippingFee === 0 ? 'Miễn phí' : formatPrice(order.shippingFee)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className={styles.summaryRow} style={{ color: '#10b981' }}>
                  <span>Giảm giá:</span>
                  <span>-{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                <span>Tổng tiền cần thanh toán:</span>
                <span style={{ color: 'var(--primary, #3b82f6)' }}>{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Real-time Order Tracking Timeline */}
          <OrderTrackingTimeline
            orderCode={order.orderCode}
            trackingCode={order.trackingCode}
            carrier={order.shippingProvider || order.shippingCarrier}
          />

          {order.notes && (
            <div className={styles.card} style={{ marginTop: 20 }}>
              <h3>Ghi chú của khách</h3>
              <p style={{ color: '#f3f4f6', fontStyle: 'italic' }}>"{order.notes}"</p>
            </div>
          )}
        </div>

        <div className={styles.sideCol}>
          <div className={styles.card}>
            <h3>
              <FiUser className={styles.inlineIcon} /> Thông tin người nhận
            </h3>
            <p className={styles.infoText}>
              <strong>{order.customer?.name}</strong>
            </p>
            <p className={styles.infoText}>SĐT: {order.customer?.phone}</p>
            {order.customer?.email && <p className={styles.infoText}>Email: {order.customer.email}</p>}
          </div>

          <div className={styles.card}>
            <h3>
              <FiMapPin className={styles.inlineIcon} /> Địa chỉ giao hàng
            </h3>
            <p className={styles.infoText}>{order.customer?.address}</p>
          </div>

          <div className={styles.card}>
            <h3>
              <FiDollarSign className={styles.inlineIcon} /> Thanh toán
            </h3>
            <p className={styles.infoText}>
              Phương thức: <strong>{order.paymentMethod === 'bank_transfer' ? 'Chuyển khoản VietQR' : 'COD (Tiền mặt)'}</strong>
            </p>
            <p className={styles.infoText}>
              Trạng thái:{' '}
              <strong style={{ color: order.paymentStatus === 'paid' ? '#10b981' : '#f59e0b' }}>
                {order.paymentStatus === 'paid' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}
              </strong>
            </p>
            {order.paymentStatus !== 'paid' && (
              <button
                type="button"
                className={styles.btnSecondary}
                style={{ marginTop: 8, fontSize: '0.8125rem' }}
                onClick={() => updateOrderStatus(order.status, 'paid')}
              >
                Xác nhận đã nhận tiền
              </button>
            )}
          </div>

          <div className={styles.card}>
            <h3>
              <FiTruck className={styles.inlineIcon} /> Vận chuyển & Giao hàng
            </h3>
            {order.trackingCode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p className={styles.infoText}>
                  Đơn vị vận chuyển: <strong>{order.shippingCarrier || order.shippingProvider?.toUpperCase()}</strong>
                </p>
                <p className={styles.infoText}>
                  Mã vận đơn: <strong style={{ color: 'var(--primary, #3b82f6)' }}>{order.trackingCode}</strong>
                </p>
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    style={{ marginTop: 6 }}
                    onClick={() => setIsShipModalOpen(true)}
                  >
                    <FiTruck /> Đổi / Chọn lại đơn vị giao hàng
                  </button>
                )}
              </div>
            ) : (
              <div>
                <p className={styles.textMuted} style={{ marginBottom: 12 }}>
                  Đơn hàng chưa phân bổ đơn vị vận chuyển.
                </p>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setIsShipModalOpen(true)}
                >
                  <FiTruck /> Chọn Đơn Vị Giao Hàng Ngay
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ship Order Modal */}
      <ShipOrderModal
        order={isShipModalOpen ? order : null}
        onClose={() => setIsShipModalOpen(false)}
        onSuccess={fetchOrder}
      />

      {/* Order Packing Slip Modal */}
      {isSlipModalOpen && order && (
        <OrderPackingSlipModal
          orders={[order]}
          onClose={() => setIsSlipModalOpen(false)}
        />
      )}

      {/* Cancel Order Confirm Modal */}
      {order && (
        <CancelOrderConfirmModal
          isOpen={isCancelModalOpen}
          orderCode={order.orderCode}
          trackingCode={order.trackingCode}
          carrier={order.shippingCarrier || order.shippingProvider}
          isCancelling={isCancelling}
          onConfirm={async (reason) => {
            setIsCancelling(true);
            try {
              await updateOrderStatus('cancelled', undefined, false, reason);
              setIsCancelModalOpen(false);
            } finally {
              setIsCancelling(false);
            }
          }}
          onClose={() => setIsCancelModalOpen(false)}
        />
      )}

      {/* Deliver Confirm Modal */}
      {order && (
        <DeliverConfirmModal
          isOpen={isDeliverModalOpen}
          orderCode={order.orderCode}
          isCod={order.paymentMethod === 'cod'}
          totalAmount={order.totalAmount}
          isConfirming={isDelivering}
          onConfirm={async () => {
            setIsDelivering(true);
            try {
              await updateOrderStatus('delivered', order.paymentMethod === 'cod' ? 'paid' : order.paymentStatus);
              setIsDeliverModalOpen(false);
            } finally {
              setIsDelivering(false);
            }
          }}
          onClose={() => setIsDeliverModalOpen(false)}
        />
      )}

      {/* Low Stock Warning Modal */}
      {lowStockWarningData && (
        <LowStockWarningModal
          isOpen={lowStockWarningData.isOpen}
          onClose={() => setLowStockWarningData(null)}
          onConfirm={() =>
            updateOrderStatus(
              lowStockWarningData.status,
              lowStockWarningData.paymentStatus,
              true
            )
          }
          orderCode={order?.orderCode}
          items={lowStockWarningData.items}
          loading={updating}
        />
      )}
    </div>
  );
}
