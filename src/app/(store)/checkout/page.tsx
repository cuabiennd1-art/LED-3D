'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiChevronLeft,
  FiMapPin,
  FiEdit2,
  FiShoppingBag,
  FiTruck,
  FiCreditCard,
  FiShield,
  FiCheckCircle,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiTag,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useCart, CartItem, getCartItemPrice, getCartItemOriginalPrice } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatPrice } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import CheckoutVoucherModal, { IVoucherOption } from '@/components/store/CheckoutVoucherModal';
import CheckoutAddressModal, { ICustomerAddressData } from '@/components/store/CheckoutAddressModal';
import styles from './page.module.css';

interface CarrierOption {
  carrier: string;
  name: string;
  fee: number;
  estimatedDays: string;
  description: string;
}

// Helper to sanitize any previously corrupted accumulated addresses
function cleanStreetAddress(raw: string = ''): string {
  if (!raw) return '';
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length > 0) {
    return parts[0];
  }
  return raw;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items: cartItems, checkoutItems, removeCheckedOutItems } = useCart();
  const { theme } = useTheme();

  // Active checkout items for this purchase
  const [activeItems, setActiveItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // FOMO Reservation Timer State
  const [isTimerEnabled, setIsTimerEnabled] = useState(false);
  const [reservationSeconds, setReservationSeconds] = useState(0);

  useEffect(() => {
    async function loadCheckoutFomo() {
      try {
        const res = await apiFetch('/api/flash-sale');
        const data = await res.json();
        const fomo = data?.data?.fomoSettings;
        if (fomo && fomo.enableCheckoutTimer === true) {
          setIsTimerEnabled(true);
          const mins = Number(fomo.checkoutTimerMinutes) || 15;
          setReservationSeconds(mins * 60);
        } else {
          setIsTimerEnabled(false);
          setReservationSeconds(0);
        }
      } catch (e) {
        setIsTimerEnabled(false);
      }
    }
    loadCheckoutFomo();
  }, []);

  useEffect(() => {
    if (!isTimerEnabled || reservationSeconds <= 0) return;
    const timer = setInterval(() => {
      setReservationSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isTimerEnabled, reservationSeconds]);

  useEffect(() => {
    try {
      const savedCheckout = sessionStorage.getItem('shopbig_checkout_items');
      if (savedCheckout) {
        const parsed = JSON.parse(savedCheckout);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActiveItems(parsed);
          setIsInitialized(true);
          return;
        }
      }
    } catch (e) {
      console.error('Error reading checkout items:', e);
    }

    if (checkoutItems && checkoutItems.length > 0) {
      setActiveItems(checkoutItems);
    } else {
      setActiveItems(cartItems);
    }
    setIsInitialized(true);
  }, [checkoutItems, cartItems]);

  useEffect(() => {
    if (activeItems.length > 0) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('shopbig-track-event', {
            detail: {
              eventName: 'InitiateCheckout',
              customData: {
                value: activeItems.reduce((sum, item) => sum + getCartItemPrice(item) * item.quantity, 0),
                currency: 'VND',
                num_items: activeItems.reduce((sum, item) => sum + item.quantity, 0),
                content_ids: activeItems.map((item) => item.productId),
              },
            },
          })
        );
      }
    }
  }, [activeItems.length]);

  const [customer, setCustomer] = useState<ICustomerAddressData>({
    name: '',
    phone: '',
    email: '',
    province: 'Hà Nội',
    district: 'Quận Cầu Giấy',
    ward: '',
    streetAddress: '',
    notes: '',
  });

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressModalMode, setAddressModalMode] = useState<'input' | 'confirm'>('input');

  // Auto-fill from local profile with sanitization
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('shopbig_profile');
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        setCustomer((prev) => ({
          ...prev,
          name: p.name || prev.name,
          phone: p.phone || prev.phone,
          email: p.email || prev.email,
          province: p.province || prev.province,
          district: p.district || prev.district,
          ward: p.ward || prev.ward,
          streetAddress: p.streetAddress ? cleanStreetAddress(p.streetAddress) : cleanStreetAddress(p.address || prev.streetAddress),
        }));
      }
    } catch (e) {
      console.error('Error loading checkout profile:', e);
    }
  }, []);

  const [paymentConfig, setPaymentConfig] = useState({ codEnabled: true, bankTransferEnabled: true });
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cod'>('cod');
  const [submitting, setSubmitting] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<IVoucherOption | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // Fetch payment config to show only enabled payment methods
  useEffect(() => {
    async function fetchPaymentConfig() {
      try {
        const res = await apiFetch('/api/settings/payment');
        const data = await res.json();
        if (data.success && data.data) {
          const cod = data.data.codEnabled !== false;
          const bank = data.data.bankTransferEnabled !== false;
          setPaymentConfig({ codEnabled: cod, bankTransferEnabled: bank });

          if (cod) {
            setPaymentMethod('cod');
          } else if (bank) {
            setPaymentMethod('bank_transfer');
          }
        }
      } catch (e) {
        console.error('Error loading payment config in checkout:', e);
      }
    }
    fetchPaymentConfig();
  }, []);

  // Derived subtotal for this purchase
  const checkoutSubtotal = activeItems.reduce((acc, item) => {
    return acc + getCartItemPrice(item) * item.quantity;
  }, 0);

  // Calculate voucher discount amount
  const voucherDiscountAmount = selectedVoucher
    ? (selectedVoucher.discountAmount !== undefined
      ? selectedVoucher.discountAmount
      : selectedVoucher.discountType === 'fixed'
        ? Math.min(selectedVoucher.discountValue, checkoutSubtotal)
        : Math.min(
          Math.round((checkoutSubtotal * selectedVoucher.discountValue) / 100),
          selectedVoucher.maxDiscountAmount && selectedVoucher.maxDiscountAmount > 0
            ? selectedVoucher.maxDiscountAmount
            : checkoutSubtotal
        ))
    : 0;

  // Free shipping policy (0đ)
  const dynamicShippingFee = 0;
  const finalTotalAmount = Math.max(0, checkoutSubtotal + dynamicShippingFee - voucherDiscountAmount);

  const fullDisplayAddress = [
    customer.streetAddress,
    customer.ward,
    customer.district,
    customer.province,
  ]
    .filter(Boolean)
    .join(', ');

  const hasValidAddress = Boolean(
    customer.name?.trim() &&
    customer.phone?.trim() &&
    customer.streetAddress?.trim()
  );

  // Triggered when user clicks "Đặt Hàng Ngay" or submits the checkout form
  const handleOpenCheckoutModal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (activeItems.length === 0) {
      toast.error('Không có sản phẩm nào để thanh toán!');
      return;
    }
    if (!paymentConfig.codEnabled && !paymentConfig.bankTransferEnabled) {
      toast.error('Cửa hàng hiện đang tạm đóng cổng thanh toán. Vui lòng liên hệ Chat với Shop!');
      return;
    }

    if (!hasValidAddress) {
      // 1. Chưa có địa chỉ -> hiện modal nhập thông tin địa chỉ
      setAddressModalMode('input');
      setIsAddressModalOpen(true);
    } else {
      // 2. Đã có địa chỉ -> hiển thị lại modal với thông tin kiểm tra lại địa chỉ
      setAddressModalMode('confirm');
      setIsAddressModalOpen(true);
    }
  };

  // Saved address from the modal
  const handleSaveAddressFromModal = (updated: ICustomerAddressData) => {
    setCustomer(updated);
    try {
      const fullAddressStr = [
        updated.streetAddress,
        updated.ward,
        updated.district,
        updated.province,
      ].filter(Boolean).join(', ');

      localStorage.setItem(
        'shopbig_profile',
        JSON.stringify({
          ...updated,
          address: fullAddressStr,
        })
      );
    } catch (e) {
      console.error('Error saving profile to localStorage:', e);
    }

    // Sau khi lưu thông tin, tự động chuyển sang modal kiểm tra lại địa chỉ
    setAddressModalMode('confirm');
  };

  // The actual order submission execution (called from the confirm modal)
  const executeSubmitOrder = async () => {
    if (submitting) return;

    if (!customer.name.trim()) {
      toast.error('Vui lòng nhập họ và tên nhận hàng');
      setAddressModalMode('input');
      setIsAddressModalOpen(true);
      return;
    }
    if (!customer.phone.trim()) {
      toast.error('Vui lòng nhập số điện thoại');
      setAddressModalMode('input');
      setIsAddressModalOpen(true);
      return;
    }
    if (!customer.streetAddress.trim()) {
      toast.error('Vui lòng nhập số nhà, tên đường cụ thể');
      setAddressModalMode('input');
      setIsAddressModalOpen(true);
      return;
    }
    if (activeItems.length === 0) {
      toast.error('Không có sản phẩm nào để thanh toán!');
      return;
    }
    if (!paymentConfig.codEnabled && !paymentConfig.bankTransferEnabled) {
      toast.error('Cửa hàng hiện đang tạm đóng cổng thanh toán. Vui lòng liên hệ Chat với Shop!');
      return;
    }

    try {
      setSubmitting(true);

      const orderPayload = {
        customer: {
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          email: customer.email.trim() || 'khachhang@shopbig.vn',
          address: fullDisplayAddress,
          province: customer.province,
          district: customer.district,
          ward: customer.ward || '',
        },
        items: activeItems.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: getCartItemPrice(i),
          quantity: i.quantity,
          image: i.image,
          variant: i.variant,
        })),
        subtotal: checkoutSubtotal,
        shippingFee: 0,
        discountAmount: voucherDiscountAmount,
        voucherCode: selectedVoucher ? selectedVoucher.code : undefined,
        totalAmount: finalTotalAmount,
        paymentMethod,
        shippingProvider: 'standard',
        shippingCarrier: 'Giao hàng tiêu chuẩn (Freeship)',
        notes: customer.notes.trim() || undefined,
      };

      const res = await apiFetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (data.success && data.data) {
        setIsAddressModalOpen(false);
        toast.success('Đặt hàng thành công!');

        // Dispatch Purchase event for 100% real tracking and Server-side CAPI
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('shopbig-track-event', {
              detail: {
                eventName: 'Purchase',
                customData: {
                  value: finalTotalAmount,
                  currency: 'VND',
                  order_id: data.data.orderCode || data.data._id,
                  num_items: activeItems.reduce((s, i) => s + i.quantity, 0),
                  content_ids: activeItems.map((i) => i.productId),
                },
                userData: {
                  email: customer.email.trim() || undefined,
                  phone: customer.phone.trim() || undefined,
                },
              },
            })
          );
        }

        // Save customer info locally for future visits
        try {
          localStorage.setItem(
            'shopbig_profile',
            JSON.stringify({
              name: customer.name.trim(),
              phone: customer.phone.trim(),
              email: customer.email.trim() || 'khachhang@shopbig.vn',
              streetAddress: customer.streetAddress.trim(),
              province: customer.province,
              district: customer.district,
              ward: customer.ward,
              address: fullDisplayAddress,
            })
          );
          // Save order code for order tracking
          if (data.data.orderCode) {
            const stored = JSON.parse(localStorage.getItem('shopbig_order_codes') || '[]');
            const updated = [data.data.orderCode, ...stored.filter((c: string) => c !== data.data.orderCode)].slice(0, 10);
            localStorage.setItem('shopbig_order_codes', JSON.stringify(updated));
          }

          // If voucher was applied, remove it from saved wallet in localStorage
          if (selectedVoucher) {
            try {
              const storedVouchers = JSON.parse(localStorage.getItem('shopbig_saved_vouchers') || '[]');
              const updatedVouchers = storedVouchers.filter((c: string) => c !== selectedVoucher.code);
              localStorage.setItem('shopbig_saved_vouchers', JSON.stringify(updatedVouchers));
              window.dispatchEvent(new CustomEvent('shopbig_voucher_saved'));
            } catch (e) { }
          }
        } catch (e) {
          console.error('Error saving profile or order code locally:', e);
        }

        if (paymentMethod === 'bank_transfer') {
          // Lưu danh sách sản phẩm chờ thanh toán vào sessionStorage
          try {
            sessionStorage.setItem('shopbig_pending_payment_items', JSON.stringify(activeItems));
          } catch (e) { }

          router.push(`/payment?orderId=${data.data._id}&code=${data.data.orderCode}`);
        } else {
          // Thanh toán COD -> Xóa sản phẩm vừa mua khỏi giỏ hàng ngay
          removeCheckedOutItems(activeItems);
          router.push(`/order-success?code=${data.data.orderCode}`);
        }
      } else {
        toast.error(data.message || 'Lỗi tạo đơn hàng');
      }
    } catch (err) {
      console.error('Error submitting order:', err);
      toast.error('Không thể gửi đơn hàng. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/cart');
    }
  };

  const shopName = theme?.pageTitles?.logoText || 'Cửa Hàng';

  if (isInitialized && activeItems.length === 0) {
    return (
      <div className={styles.page}>
        <nav className={styles.topNav}>
          <div className={styles.topNavLeft}>
            <button className={styles.backBtn} onClick={handleBack} aria-label="Quay lại">
              <FiChevronLeft size={22} />
            </button>
          </div>
          <div className={styles.navTitle}>Thanh Toán Đơn Hàng</div>
          <div className={styles.topNavRight}></div>
        </nav>

        <div className={styles.emptyState}>
          <FiShoppingBag className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>Chưa có sản phẩm thanh toán</h3>
          <p className={styles.emptyDesc}>Hãy chọn mua các sản phẩm chất lượng tại cửa hàng nhé!</p>
          <Link href="/" className={styles.emptyBtn}>
            Khám Phá Sản Phẩm Ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ===== FIXED TOP NAVIGATION ===== */}
      <nav className={styles.topNav}>
        <div className={styles.topNavLeft}>
          <button className={styles.backBtn} onClick={handleBack} aria-label="Quay lại">
            <FiChevronLeft size={22} />
          </button>
        </div>
        <h1 className={styles.navTitle}>Xác Nhận Đơn Hàng</h1>
        <div className={styles.topNavRight}></div>
      </nav>

      <form className={styles.scrollArea} onSubmit={handleOpenCheckoutModal}>
        {/* FOMO Checkout Reservation Timer Banner */}
        {isTimerEnabled && reservationSeconds > 0 && (
          <div className={styles.reservationBanner}>
            <FiClock className={styles.reservationIcon} />
            <div>
              Ưu đãi Flash Sale của bạn được giữ trong{' '}
              <strong className={styles.reservationTimer}>
                {String(Math.floor(reservationSeconds / 60)).padStart(2, '0')}:
                {String(reservationSeconds % 60).padStart(2, '0')}
              </strong>{' '}
              phút. Vui lòng hoàn tất đặt hàng!
            </div>
          </div>
        )}

        {/* 1. SHIPPING ADDRESS CARD (MODERN ELEGANT TIKTOK SHOP DESIGN) */}
        <div className={styles.addressCard}>
          {/* Decorative Envelope Stripe */}
          <div className={styles.envelopeStripe} />

          <div className={styles.addressCardBody}>
            <div className={styles.addressHeader}>
              <div className={styles.addressHeaderLeft}>
                <div className={styles.pinIconWrap}>
                  <FiMapPin size={15} color="#ef4444" />
                </div>
                <span className={styles.addressTitle}>Địa Chỉ Nhận Hàng</span>
              </div>
              <button
                type="button"
                className={styles.editAddressBtn}
                onClick={() => {
                  setAddressModalMode('input');
                  setIsAddressModalOpen(true);
                }}
              >
                <FiEdit2 size={12} />
                <span>{hasValidAddress ? 'Thay đổi' : 'Thêm mới'}</span>
              </button>
            </div>

            {hasValidAddress ? (
              <div
                className={styles.addressPreview}
                onClick={() => {
                  setAddressModalMode('input');
                  setIsAddressModalOpen(true);
                }}
              >
                <div className={styles.contactRow}>
                  <span className={styles.customerName}>{customer.name}</span>
                  <span className={styles.dotSeparator}>•</span>
                  <span className={styles.customerPhone}>{customer.phone}</span>
                  <span className={styles.defaultBadge}>Mặc định</span>
                </div>
                <p className={styles.fullAddressText}>{fullDisplayAddress}</p>
              </div>
            ) : (
              <div
                className={styles.emptyAddressCard}
                onClick={() => {
                  setAddressModalMode('input');
                  setIsAddressModalOpen(true);
                }}
              >
                <div className={styles.emptyAddressText}>
                  <FiMapPin size={18} color="#ef4444" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main, #0f172a)' }}>
                      Chưa có địa chỉ nhận hàng
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
                      Vui lòng thêm thông tin địa chỉ để nhận hàng
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.addAddressBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddressModalMode('input');
                    setIsAddressModalOpen(true);
                  }}
                >
                  + Thêm địa chỉ
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. ORDERED PRODUCTS CARD (ONLY ACTIVE ITEMS FOR THIS PURCHASE) */}
        <div className={styles.productCard}>
          <div className={styles.cardHeader}>
            <FiShoppingBag size={15} color="var(--primary, #3b82f6)" />
            <span>{shopName} ({activeItems.length} món)</span>
          </div>

          {activeItems.map((i, idx) => {
            const itemPrice = getCartItemPrice(i);
            const originalPrice = getCartItemOriginalPrice(i);
            const hasDiscount = originalPrice > itemPrice;

            return (
              <div key={idx} className={styles.orderItemRow}>
                <img
                  src={i.image || 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400'}
                  alt={i.name}
                  className={styles.orderItemImg}
                />
                <div className={styles.orderItemDetails}>
                  <span className={styles.orderItemName}>{i.name}</span>
                  {i.variant?.name && (
                    <span className={styles.orderItemVariant}>Phân loại: {i.variant.name}</span>
                  )}
                  {i.hasGift && (
                    <span style={{ fontSize: 11.5, color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      🎁 Quà tặng: {i.giftText || 'Kèm quà tặng đặc biệt'}
                    </span>
                  )}
                  <div className={styles.orderItemPriceRow}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span className={styles.orderItemPrice}>
                        {formatPrice(itemPrice * i.quantity)}
                      </span>
                      {hasDiscount && (
                        <span style={{ fontSize: 11, color: '#64748b', textDecoration: 'line-through' }}>
                          {formatPrice(originalPrice * i.quantity)}
                        </span>
                      )}
                    </div>
                    <span className={styles.orderItemQty}>x{i.quantity}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 2.5 SHOP VOUCHER SELECTION CARD */}
        <div className={styles.voucherCard} onClick={() => setIsVoucherModalOpen(true)}>
          <div className={styles.voucherLeft}>
            <FiTag size={18} style={{ color: 'var(--primary, #f97316)' }} />
            <div className={styles.voucherTitleWrap}>
              <span className={styles.voucherLabel}>Shop Voucher</span>
              {selectedVoucher ? (
                <span className={styles.voucherSelectedBadge}>
                  ✓ {selectedVoucher.name || selectedVoucher.code} (-{formatPrice(voucherDiscountAmount)})
                </span>
              ) : (
                <span className={styles.voucherHint}>
                  Chọn hoặc nhập mã giảm giá
                </span>
              )}
            </div>
          </div>
          <div className={styles.voucherRight}>
            <span className={styles.voucherActionText}>
              {selectedVoucher ? 'Đổi mã' : 'Chọn mã'}
            </span>
            <FiChevronRight size={14} />
          </div>
        </div>

        {/* 3. FREE SHIPPING BANNER (MIỄN PHÍ VẬN CHUYỂN TOÀN QUỐC) */}
        <div className={styles.shippingCard}>
          <div className={styles.cardHeader}>
            <FiTruck size={15} color="var(--primary, #3b82f6)" />
            <span>Vận Chuyển Toàn Quốc</span>
            <span style={{ fontSize: 11, color: '#10b981', marginLeft: 'auto', fontWeight: 700 }}>
              ✓ MIỄN PHÍ VẬN CHUYỂN
            </span>
          </div>

          <div style={{ padding: '6px 0 2px 0', fontSize: 13, color: 'var(--text-muted, #94a3b8)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🚚 Đơn hàng của bạn được áp dụng chính sách Freeship 0đ toàn quốc.</span>
          </div>
        </div>

        {/* 4. PAYMENT METHOD SELECTOR */}
        <div className={styles.paymentCard}>
          <div className={styles.cardHeader}>
            <FiCreditCard size={15} color="var(--primary, #3b82f6)" />
            <span>Phương Thức Thanh Toán</span>
          </div>

          <div className={styles.paymentList}>
            {/* {paymentConfig.bankTransferEnabled && (
              <div
                className={`${styles.paymentOption} ${paymentMethod === 'bank_transfer' ? styles.paymentActive : ''}`}
                onClick={() => setPaymentMethod('bank_transfer')}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'bank_transfer'}
                  onChange={() => setPaymentMethod('bank_transfer')}
                />
                <div className={styles.paymentOptionInfo}>
                  <span className={styles.paymentOptionTitle}>
                    ⚡ Chuyển khoản VietQR (SePay Tự Động)
                  </span>
                  <span className={styles.paymentOptionDesc}>
                    Quét mã QR qua mọi ứng dụng ngân hàng, xác nhận trong 3 giây
                  </span>
                </div>
              </div>
            )} */}

            {paymentConfig.codEnabled && (
              <div
                className={`${styles.paymentOption} ${paymentMethod === 'cod' ? styles.paymentActive : ''}`}
                onClick={() => setPaymentMethod('cod')}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <div className={styles.paymentOptionInfo}>
                  <span className={styles.paymentOptionTitle}>
                    💵 Thanh toán khi nhận hàng (COD)
                  </span>
                  <span className={styles.paymentOptionDesc}>
                    Kiểm tra hàng và thanh toán tiền mặt cho shipper
                  </span>
                </div>
              </div>
            )}

            {!paymentConfig.bankTransferEnabled && !paymentConfig.codEnabled && (
              <div
                style={{
                  padding: '14px 16px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 10,
                  fontSize: 13,
                  color: '#f59e0b',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                ⚠️ Cửa hàng đang tạm đóng cổng thanh toán tự động. Quý khách vui lòng bấm <strong>Chat với Shop</strong> để được nhân viên hỗ trợ đặt hàng nhanh!
              </div>
            )}
          </div>
        </div>

        {/* 5. BILL SUMMARY */}
        <div className={styles.billCard}>
          <div className={styles.billRow}>
            <span>Tổng tiền hàng</span>
            <span className={styles.billVal}>{formatPrice(checkoutSubtotal)}</span>
          </div>
          {voucherDiscountAmount > 0 && (
            <div className={styles.billRow}>
              <span>Giảm giá Voucher ({selectedVoucher?.code})</span>
              <span className={styles.billVal} style={{ color: '#ef4444', fontWeight: 700 }}>
                -{formatPrice(voucherDiscountAmount)}
              </span>
            </div>
          )}
          <div className={styles.billRow}>
            <span>Phí vận chuyển</span>
            <span className={styles.billVal} style={{ color: '#10b981', fontWeight: 700 }}>
              Miễn phí (0 ₫)
            </span>
          </div>
        </div>
      </form>

      {/* ===== FIXED BOTTOM ACTION BAR ===== */}
      <div className={styles.bottomBar}>
        <div className={styles.bottomBarInner}>
          <div className={styles.totalGroup}>
            <span className={styles.totalLabel}>Tổng thanh toán</span>
            <span className={styles.totalAmount}>{formatPrice(finalTotalAmount)}</span>
          </div>

          <button
            type="button"
            className={styles.orderSubmitBtn}
            disabled={submitting}
            onClick={handleOpenCheckoutModal}
          >
            {submitting ? 'Đang Xử Lý...' : 'Đặt Hàng Ngay'}
          </button>
        </div>
      </div>

      {/* ===== VOUCHER SELECTION MODAL ===== */}
      <CheckoutVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        orderSubtotal={checkoutSubtotal}
        customerPhone={customer.phone}
        selectedVoucher={selectedVoucher}
        onSelectVoucher={(v) => setSelectedVoucher(v)}
      />

      {/* ===== ADDRESS INPUT & CONFIRMATION MODAL ===== */}
      <CheckoutAddressModal
        isOpen={isAddressModalOpen}
        mode={addressModalMode}
        onClose={() => setIsAddressModalOpen(false)}
        customer={customer}
        onSaveAddress={handleSaveAddressFromModal}
        onConfirmOrder={executeSubmitOrder}
        onSwitchToEdit={() => setAddressModalMode('input')}
        submitting={submitting}
        orderSummary={{
          totalAmount: finalTotalAmount,
          paymentMethod,
          subtotal: checkoutSubtotal,
          voucherDiscount: voucherDiscountAmount,
          itemCount: activeItems.reduce((acc, i) => acc + i.quantity, 0),
        }}
      />
    </div>
  );
}