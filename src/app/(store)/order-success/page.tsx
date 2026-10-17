'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  FiCheckCircle,
  FiChevronLeft,
  FiCopy,
  FiCheck,
  FiMapPin,
  FiTruck,
  FiCreditCard,
  FiShoppingBag,
  FiClock,
  FiSearch,
  FiMessageSquare,
  FiAlertCircle,
  FiShield,
  FiArrowRight,
} from 'react-icons/fi';
import ZaloIcon from '@/components/ui/ZaloIcon';
import toast from 'react-hot-toast';
import { formatPrice } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useCart } from '@/contexts/CartContext';
import StoreLoading from '@/components/store/StoreLoading';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code') || '';
  const isPaidQuery = searchParams.get('paid') === 'true';
  const { theme } = useTheme();
  const { removeCheckedOutItems } = useCart();

  const cleanZaloPhone = (theme?.socialLinks?.zaloPhone || '').replace(/[^0-9]/g, '');

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const cleanedUpRef = useRef(false);
  const removeCheckedOutItemsRef = useRef(removeCheckedOutItems);
  removeCheckedOutItemsRef.current = removeCheckedOutItems;

  useEffect(() => {
    async function fetchOrderDetail() {
      if (!code) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await apiFetch(`/api/orders/${encodeURIComponent(code)}`);
        const data = await res.json();
        if (data.success && data.data) {
          setOrder(data.data);

          // Dọn dẹp giỏ hàng một lần duy nhất nếu đơn hàng là COD hoặc đã thanh toán
          if (!cleanedUpRef.current) {
            cleanedUpRef.current = true;
            if (data.data.paymentStatus === 'paid' || data.data.paymentMethod === 'cod' || isPaidQuery) {
              try {
                const pending = sessionStorage.getItem('shopbig_pending_payment_items');
                if (pending) {
                  const pendingItems = JSON.parse(pending);
                  if (Array.isArray(pendingItems) && pendingItems.length > 0) {
                    removeCheckedOutItemsRef.current(pendingItems);
                  }
                  sessionStorage.removeItem('shopbig_pending_payment_items');
                } else if (data.data.items && Array.isArray(data.data.items)) {
                  removeCheckedOutItemsRef.current(data.data.items);
                }
              } catch (e) {
                console.error('Error cleaning up cart:', e);
              }
            }
          }
        } else {
          setOrder(null);
        }
      } catch (err) {
        console.error('Error loading order details:', err);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    }

    fetchOrderDetail();
  }, [code, isPaidQuery]);

  const handleCopyCode = () => {
    const targetCode = order?.orderCode || code;
    if (typeof window !== 'undefined' && targetCode) {
      navigator.clipboard.writeText(targetCode);
      setCopied(true);
      toast.success(`Đã sao chép mã đơn #${targetCode}!`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleSearchOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    router.push(`/order-success?code=${encodeURIComponent(searchInput.trim().toUpperCase())}`);
  };

  if (loading) {
    return <StoreLoading text="Đang tải thông tin xác nhận đơn hàng..." />;
  }

  // Case: Order not found or no code provided
  if (!order && (!code || !loading)) {
    return (
      <div className={styles.page}>
        <nav className={styles.topNav}>
          <button className={styles.backBtn} onClick={handleBack} aria-label="Quay lại">
            <FiChevronLeft size={22} />
          </button>
          <div className={styles.navTitle}>Tra Cứu Đơn Hàng</div>
          <div style={{ width: 32 }} />
        </nav>

        <div className={styles.scrollArea}>
          <div className={styles.heroCard} style={{ marginTop: 20 }}>
            <div className={styles.iconRing} style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <FiAlertCircle className={styles.successIcon} style={{ color: '#ef4444' }} />
            </div>
            <h1 className={styles.heroTitle}>Không Tìm Thấy Đơn Hàng</h1>
            <p className={styles.heroDesc}>
              {code
                ? `Mã đơn hàng #${code} không tồn tại hoặc đã bị hủy trên hệ thống.`
                : 'Vui lòng nhập mã đơn hàng hoặc số điện thoại để kiểm tra tiến trình đơn hàng của bạn.'}
            </p>

            <form onSubmit={handleSearchOrder} className={styles.searchOrderForm}>
              <input
                type="text"
                placeholder="Nhập mã đơn (VD: ST123456)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={styles.searchOrderInput}
              />
              <button type="submit" className={styles.searchOrderBtn}>
                <FiSearch size={14} /> <span>Tìm kiếm</span>
              </button>
            </form>
          </div>

          <div className={styles.actionGroup}>
            <Link href="/" className={styles.primaryBtn}>
              <FiShoppingBag size={18} />
              <span>Khám Phá Sản Phẩm</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const orderCode = order?.orderCode || code;
  const isPaid = isPaidQuery || order?.paymentStatus === 'paid';
  const shopName = theme?.pageTitles?.logoText || 'Cửa Hàng';
  const subtotal =
    order?.subtotal ||
    order?.items?.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0) ||
    0;
  const shippingFee = order?.shippingFee || 0;
  const discountAmount = order?.discountAmount || order?.voucherDiscount || 0;
  const totalAmount = order?.totalAmount || Math.max(0, subtotal + shippingFee - discountAmount);

  // Stepper state calculation
  const orderStatus = order?.status || 'pending';
  const isConfirmed = orderStatus === 'confirmed' || orderStatus === 'shipping' || orderStatus === 'delivered';
  const isShipping = orderStatus === 'shipping' || orderStatus === 'delivered';
  const isDelivered = orderStatus === 'delivered';

  return (
    <div className={styles.page}>
      {/* Top Header */}
      <nav className={styles.topNav}>
        <button className={styles.backBtn} onClick={handleBack} aria-label="Quay lại">
          <FiChevronLeft size={22} />
        </button>
        <div className={styles.navTitle}>Chi Tiết Đơn Hàng</div>
        <div style={{ width: 32 }} />
      </nav>

      {/* Main Container */}
      <div className={styles.mainContainer}>
        {/* Responsive Grid: 1 Column on Mobile, 2 Columns on PC/Tablet */}
        <div className={styles.orderGrid}>
          {/* Left Column: Order Journey & Products Details */}
          <div className={styles.leftCol}>
            {/* 1. Success Hero Header */}
            <div className={styles.heroCard}>
              <div className={styles.iconRing}>
                <FiCheckCircle className={styles.successIcon} />
              </div>
              <h1 className={styles.heroTitle}>
                {isPaid ? 'Thanh Toán Thành Công!' : 'Đặt Hàng Thành Công!'}
              </h1>
              <p className={styles.heroDesc}>
                Cảm ơn bạn đã tin tưởng mua sắm tại <strong>{shopName}</strong>. Đơn hàng của bạn đã được ghi nhận vào hệ thống và đang được chuẩn bị đóng gói.
              </p>

              <div className={styles.codeContainer}>
                <span className={styles.codeLabel}>Mã đơn hàng:</span>
                <div className={styles.codeBox} onClick={handleCopyCode} title="Nhấn để sao chép mã đơn">
                  <span className={styles.codeText}>#{orderCode}</span>
                  <button type="button" className={styles.copyBtn} aria-label="Sao chép">
                    {copied ? <FiCheck size={14} color="#10b981" /> : <FiCopy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Order Step Progress Tracker */}
            <div className={styles.trackerCard}>
              <h3 className={styles.trackerTitle}>
                <FiClock size={15} className={styles.titleIcon} />
                <span>Tiến Trình Đơn Hàng</span>
              </h3>

              <div className={styles.stepperContainer}>
                {/* Step 1: Đã Đặt */}
                <div className={`${styles.stepItem} ${styles.stepCompleted}`}>
                  <div className={styles.stepDot}>
                    <FiCheck size={12} />
                  </div>
                  <span className={styles.stepName}>Đã Đặt</span>
                </div>

                <div className={`${styles.stepLine} ${isConfirmed ? styles.lineCompleted : ''}`} />

                {/* Step 2: Đang Chuẩn Bị */}
                <div className={`${styles.stepItem} ${isConfirmed ? styles.stepCompleted : styles.stepActive}`}>
                  <div className={styles.stepDot}>
                    {isConfirmed ? <FiCheck size={12} /> : '2'}
                  </div>
                  <span className={styles.stepName}>Chuẩn Bị Hàng</span>
                </div>

                <div className={`${styles.stepLine} ${isShipping ? styles.lineCompleted : ''}`} />

                {/* Step 3: Đang Giao */}
                <div className={`${styles.stepItem} ${isShipping ? styles.stepCompleted : ''}`}>
                  <div className={styles.stepDot}>
                    {isShipping ? <FiCheck size={12} /> : '3'}
                  </div>
                  <span className={styles.stepName}>Đang Giao Hàng</span>
                </div>

                <div className={`${styles.stepLine} ${isDelivered ? styles.lineCompleted : ''}`} />

                {/* Step 4: Hoàn Tất */}
                <div className={`${styles.stepItem} ${isDelivered ? styles.stepCompleted : ''}`}>
                  <div className={styles.stepDot}>
                    {isDelivered ? <FiCheck size={12} /> : '4'}
                  </div>
                  <span className={styles.stepName}>Hoàn Tất</span>
                </div>
              </div>
            </div>

            {/* 3. Ordered Items Card */}
            {order?.items && order.items.length > 0 && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <FiShoppingBag size={16} className={styles.titleIcon} />
                  <span>Sản Phẩm Đã Mua ({order.items.length})</span>
                </div>

                <div className={styles.itemList}>
                  {order.items.map((item: any, idx: number) => {
                    const itemImg = item.image || item.variant?.image || '/file.svg';
                    const variantName = item.variant?.name || item.variant?.title;
                    const unitPrice = item.price || item.variant?.price || 0;
                    const lineTotal = unitPrice * item.quantity;

                    return (
                      <div key={item._id || idx} className={styles.itemRow}>
                        <img
                          src={itemImg}
                          alt={item.name}
                          className={styles.itemImg}
                        />
                        <div className={styles.itemDetails}>
                          <span className={styles.itemName}>{item.name}</span>
                          {variantName && (
                            <span className={styles.itemVariant}>Phân loại: {variantName}</span>
                          )}
                          <div className={styles.itemPriceRow}>
                            <span className={styles.itemPrice}>
                              {formatPrice(lineTotal)}
                            </span>
                            <span className={styles.itemQty}>x{item.quantity}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Delivery Address & Shipping Carrier Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <FiMapPin size={16} className={styles.titleIcon} />
                <span>Địa Chỉ Nhận Hàng</span>
              </div>

              <div className={styles.addressBox}>
                <div className={styles.customerRow}>
                  <strong className={styles.customerName}>
                    {order?.customer?.name || 'Khách Hàng'}
                  </strong>
                  {order?.customer?.phone && (
                    <span className={styles.customerPhone}>
                      ({order.customer.phone})
                    </span>
                  )}
                </div>
                <p className={styles.fullAddress}>
                  {order?.customer?.address || 'Chưa có thông tin địa chỉ'}
                </p>
              </div>

              <div className={styles.divider} />

              <div className={styles.carrierRow}>
                <div className={styles.carrierLeft}>
                  <FiTruck size={16} color="#10b981" />
                  <div className={styles.carrierInfo}>
                    <span className={styles.carrierName}>
                      {order?.shippingCarrier || 'Giao Hàng Nhanh Toàn Quốc'}
                    </span>
                    <span className={styles.carrierEstimated}>
                      {order?.trackingCode ? `Mã vận đơn: ${order.trackingCode}` : 'Dự kiến giao hàng: 1-3 ngày làm việc'}
                    </span>
                  </div>
                </div>
                <span className={styles.carrierFee}>
                  {shippingFee > 0 ? formatPrice(shippingFee) : 'Miễn phí'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Payment Receipt & Next Actions (Sticky on PC) */}
          <div className={styles.rightCol}>
            {/* Payment Details & Bill Summary Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.headerLeft}>
                  <FiCreditCard size={16} className={styles.titleIcon} />
                  <span>Thanh Toán & Hóa Đơn</span>
                </div>
                <span
                  className={`${styles.statusBadge} ${isPaid ? styles.statusPaid : styles.statusUnpaid}`}
                >
                  {isPaid ? 'Đã Thanh Toán' : 'Chưa Thanh Toán'}
                </span>
              </div>

              <div className={styles.paymentMethodRow}>
                <span className={styles.paymentTitle}>
                  {order?.paymentMethod === 'bank_transfer'
                    ? '⚡ Chuyển khoản VietQR (Tự Động)'
                    : '💵 Thanh toán khi nhận hàng (COD)'}
                </span>
              </div>

              <div className={styles.divider} />

              <div className={styles.billRows}>
                <div className={styles.billRow}>
                  <span>Tổng tiền hàng</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className={styles.billRow}>
                  <span>Phí vận chuyển</span>
                  <span>{shippingFee > 0 ? formatPrice(shippingFee) : 'Miễn phí'}</span>
                </div>
                {discountAmount > 0 && (
                  <div className={styles.billRow} style={{ color: '#10b981' }}>
                    <span>Giảm giá voucher</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className={`${styles.billRow} ${styles.totalRow}`}>
                  <span className={styles.totalRowLabel}>Tổng thanh toán</span>
                  <span className={styles.totalVal}>{formatPrice(totalAmount)}</span>
                </div>
              </div>

              {/* Action Controls */}
              <div className={styles.actionGroup}>
                <Link href="/" className={styles.primaryBtn}>
                  <FiShoppingBag size={18} />
                  <span>Tiếp Tục Mua Sắm</span>
                </Link>

                <Link
                  href={`/tracking?code=${encodeURIComponent(orderCode)}`}
                  className={styles.secondaryBtn}
                >
                  <FiTruck size={16} />
                  <span>Theo Dõi Đơn Hàng</span>
                </Link>

                {cleanZaloPhone ? (
                  <a
                    href={`https://zalo.me/${cleanZaloPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.chatBtn}
                    title={`Chat Zalo (${cleanZaloPhone})`}
                  >
                    <ZaloIcon size={16} />
                    <span>Hỗ Trợ Zalo Cho Đơn Này</span>
                  </a>
                ) : (
                  <Link
                    href={`/chat?order=${encodeURIComponent(orderCode)}`}
                    className={styles.chatBtn}
                  >
                    <FiMessageSquare size={16} />
                    <span>Liên Hệ Hỗ Trợ Đơn Này</span>
                  </Link>
                )}
              </div>

              {/* Trust Section */}
              <div className={styles.pcTrustSection}>
                <div className={styles.trustRow}>
                  <FiShield size={15} className={styles.trustIcon} />
                  <span>Bảo hành chính hãng 100%</span>
                </div>
                <div className={styles.trustRow}>
                  <FiCheckCircle size={15} className={styles.trustIcon} />
                  <span>Đổi trả miễn phí trong 7 ngày</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<StoreLoading text="Đang tải thông tin đơn hàng..." />}>
      <OrderSuccessContent />
    </Suspense>
  );
}