'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FiZap,
  FiSave,
  FiExternalLink,
  FiPlus,
  FiTrash2,
  FiClock,
  FiCalendar,
  FiTrendingUp,
  FiShoppingBag,
  FiCheckCircle,
  FiAlertCircle,
  FiSliders,
  FiPercent,
  FiBell,
  FiEye,
  FiCopy,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatPrice, getProductCoverImage } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import AdminLoading from '@/components/admin/AdminLoading';
import ProductSelectModal from '@/components/admin/ProductSelectModal';
import styles from './page.module.css';

interface IFlashItem {
  _id?: string;
  productId: string;
  product?: any;
  originalPrice: number;
  salePrice?: number;
  flashPrice: number;
  discountPercent: number;
  flashPercent?: number;
  flashStock?: number;
  soldCount: number;
  isActive: boolean;
}

interface ISlot {
  id: string;
  name: string;
  startTime: string; // "12:00"
  endTime: string;   // "18:00"
  dateType: 'all_days' | 'specific_date' | 'date_range';
  specificDate?: string; // YYYY-MM-DD
  startDate?: string;    // YYYY-MM-DD
  endDate?: string;      // YYYY-MM-DD
  enabled: boolean;
  items: IFlashItem[];
}

function parseTimeToMinutes(timeStr: string = '00:00'): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map((p) => parseInt(p, 10) || 0);
  return parts[0] * 60 + (parts[1] || 0);
}

function getVietnamDateString(date: Date = new Date()): string {
  const vnOffset = 7 * 60;
  const localOffset = date.getTimezoneOffset();
  const vnTime = new Date(date.getTime() + (vnOffset + localOffset) * 60 * 1000);
  const y = vnTime.getFullYear();
  const m = String(vnTime.getMonth() + 1).padStart(2, '0');
  const d = String(vnTime.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AdminFlashSalePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Campaign Config State
  const [isActive, setIsActive] = useState(true);
  const [title, setTitle] = useState('⚡ SIÊU SALE GIỜ VÀNG - GIẢM TỚI 50%');
  const [subtitle, setSubtitle] = useState('Săn deal chớp nhoáng • Số lượng có hạn • Giá rẻ vô địch');

  // Slots List State
  const [slots, setSlots] = useState<ISlot[]>([
    {
      id: 'slot_1',
      name: 'Săn Sale Sáng',
      startTime: '09:00',
      endTime: '12:00',
      dateType: 'all_days',
      enabled: true,
      items: [],
    },
    {
      id: 'slot_2',
      name: 'Giờ Vàng Nửa Giá',
      startTime: '12:00',
      endTime: '18:00',
      dateType: 'all_days',
      enabled: true,
      items: [],
    },
    {
      id: 'slot_3',
      name: 'Flash Deal Tối',
      startTime: '18:00',
      endTime: '21:00',
      dateType: 'all_days',
      enabled: true,
      items: [],
    },
  ]);

  // Selected Slot to Edit
  const [activeSlotId, setActiveSlotId] = useState<string>('slot_1');

  // FOMO Settings
  const [fomoSettings, setFomoSettings] = useState({
    enableLivePurchasePopup: true,
    popupIntervalSeconds: 25,
    enableCheckoutTimer: true,
    checkoutTimerMinutes: 15,
    enableViewerCount: true,
    enableProductTimer: true,
    productTimerMinutes: 10,
  });

  // Bulk discount & Variant Preview states
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState<number>(20);
  const [expandedProductVariantIds, setExpandedProductVariantIds] = useState<Record<string, boolean>>({});

  // Current Live Info for Header
  const [currentRunningSlotName, setCurrentRunningSlotName] = useState('');
  const [countdownText, setCountdownText] = useState('00:00:00');

  // Load Config from API
  const loadFlashSale = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/admin/flash-sale');
      const data = await res.json();
      if (data.success && data.data) {
        const fs = data.data;
        setIsActive(fs.isActive !== undefined ? fs.isActive : true);
        setTitle(fs.title || '');
        setSubtitle(fs.subtitle || '');

        if (fs.slots && fs.slots.length > 0) {
          const loadedSlots: ISlot[] = fs.slots.map((s: any, idx: number) => ({
            id: s.id || `slot_${idx + 1}`,
            name: s.name || `Khung giờ ${idx + 1}`,
            startTime: s.startTime || '12:00',
            endTime: s.endTime || '18:00',
            dateType: s.dateType || 'all_days',
            specificDate: s.specificDate || '',
            startDate: s.startDate || '',
            endDate: s.endDate || '',
            enabled: s.enabled !== undefined ? s.enabled : true,
            items: (s.items || [])
              .filter((it: any) => {
                const pid = it?.productId?._id || it?.productId;
                return pid && typeof pid.toString === 'function' && pid.toString().trim().length > 0 && pid.toString() !== 'null' && pid.toString() !== '[object Object]';
              })
              .map((it: any) => {
                const prod = it.productId || {};
                const orig = Number(it.originalPrice) || Number(prod.price) || 0;
                const normalSale = (Number(it.salePrice) && Number(it.salePrice) > 0 && Number(it.salePrice) < orig)
                  ? Number(it.salePrice)
                  : (Number(prod.salePrice) && Number(prod.salePrice) > 0 && Number(prod.salePrice) < orig ? Number(prod.salePrice) : orig);
                const productSalePct = orig > normalSale ? Math.round(((orig - normalSale) / orig) * 100) : 0;
                const flashPct = it.flashPercent !== undefined
                  ? Number(it.flashPercent)
                  : (normalSale > (it.flashPrice || 0) && (it.flashPrice || 0) > 0
                    ? Math.max(0, Math.round(((normalSale - it.flashPrice) / normalSale) * 100))
                    : 10);
                const totalPct = it.discountPercent || Math.min(99, productSalePct + flashPct);

                return {
                  _id: it._id,
                  productId: it.productId?._id || it.productId,
                  product: it.productId || {},
                  originalPrice: orig,
                  salePrice: normalSale,
                  flashPrice: it.flashPrice || Math.round((normalSale * (1 - flashPct / 100)) / 1000) * 1000,
                  flashPercent: flashPct,
                  discountPercent: totalPct,
                  flashStock: it.flashStock || 50,
                  soldCount: it.soldCount || 0,
                  isActive: it.isActive !== undefined ? it.isActive : true,
                };
              }),
          }));

          setSlots(loadedSlots);
          if (!loadedSlots.some((s) => s.id === activeSlotId)) {
            setActiveSlotId(loadedSlots[0].id);
          }
        }
        if (fs.fomoSettings) setFomoSettings(fs.fomoSettings);
      }
    } catch (err) {
      console.error('Error loading Flash Sale config:', err);
      toast.error('Lỗi khi tải cấu hình Flash Sale');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlashSale();
  }, []);

  // Update Live Countdown Timer for preview
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const todayStr = getVietnamDateString(now);
      const curHour = now.getHours();
      const curMin = now.getMinutes();
      const curSec = now.getSeconds();
      const currentTotalMinutes = curHour * 60 + curMin;

      const liveSlot = slots.find((s) => {
        if (!s.enabled) return false;
        if (s.dateType === 'specific_date' && s.specificDate && todayStr !== s.specificDate) return false;
        if (s.dateType === 'date_range') {
          if (s.startDate && todayStr < s.startDate) return false;
          if (s.endDate && todayStr > s.endDate) return false;
        }
        const startMin = parseTimeToMinutes(s.startTime);
        const endMin = parseTimeToMinutes(s.endTime);
        return currentTotalMinutes >= startMin && currentTotalMinutes < endMin;
      });

      if (liveSlot) {
        setCurrentRunningSlotName(`${liveSlot.name} (${liveSlot.startTime} - ${liveSlot.endTime})`);
        const endMin = parseTimeToMinutes(liveSlot.endTime);
        const diffSeconds = Math.max(0, endMin * 60 - (currentTotalMinutes * 60 + curSec));

        const hrs = Math.floor(diffSeconds / 3600);
        const mins = Math.floor((diffSeconds % 3600) / 60);
        const secs = diffSeconds % 60;
        setCountdownText(
          `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        );
      } else {
        setCurrentRunningSlotName('Chưa đến khung giờ');
        setCountdownText('--:--:--');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [slots]);

  // Active Slot helper
  const currentSlot = slots.find((s) => s.id === activeSlotId) || slots[0] || null;

  // Toggle variant preview
  const toggleVariantPreview = (itemId: string) => {
    setExpandedProductVariantIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Bulk Apply % to all items in current slot (giảm thêm pct% dựa trên giá sale của sản phẩm)
  const handleApplyBulkDiscount = () => {
    if (!currentSlot) return;
    const pct = Math.max(1, Math.min(99, Number(bulkDiscountPercent) || 0));
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== currentSlot.id) return s;
        const updated = (s.items || []).map((it) => {
          const prod = it.product || {};
          const orig = Number(it.originalPrice) || Number(prod.price) || 0;
          const normalSale = (Number(it.salePrice) && Number(it.salePrice) > 0 && Number(it.salePrice) < orig)
            ? Number(it.salePrice)
            : (Number(prod.salePrice) && Number(prod.salePrice) > 0 && Number(prod.salePrice) < orig ? Number(prod.salePrice) : orig);
          const productSalePct = orig > normalSale ? Math.round(((orig - normalSale) / orig) * 100) : 0;
          const flash = Math.round((normalSale * (1 - pct / 100)) / 1000) * 1000;
          const totalPct = Math.min(99, productSalePct + pct);

          return {
            ...it,
            salePrice: normalSale,
            flashPercent: pct,
            discountPercent: totalPct,
            flashPrice: flash,
          };
        });
        return { ...s, items: updated };
      })
    );
    toast.success(`Đã áp dụng giảm thêm ${pct}% Flash Sale (dựa trên giá sale) cho tất cả sản phẩm trong ${currentSlot.name}`);
  };

  // Make Current Slot Live Now (00:00 - 23:59)
  const handleMakeSlotLiveNow = () => {
    if (!currentSlot) return;
    setSlots((prev) =>
      prev.map((s) => (s.id === currentSlot.id ? { ...s, startTime: '00:00', endTime: '23:59', enabled: true } : s))
    );
    toast.success(`Đã đặt ${currentSlot.name} diễn ra cả ngày (00:00 - 23:59) để thử nghiệm ngay!`);
  };

  // Add new Slot
  const handleAddNewSlot = () => {
    const newId = `slot_${Date.now()}`;
    const newSlot: ISlot = {
      id: newId,
      name: `Khung Giờ Mới #${slots.length + 1}`,
      startTime: '12:00',
      endTime: '15:00',
      dateType: 'all_days',
      enabled: true,
      items: [],
    };
    setSlots((prev) => [...prev, newSlot]);
    setActiveSlotId(newId);
    toast.success('Đã tạo khung giờ Flash Sale mới');
  };

  // Delete Slot
  const handleDeleteSlot = (slotId: string) => {
    if (slots.length <= 1) {
      toast.error('Hệ thống cần ít nhất 1 khung giờ Flash Sale');
      return;
    }
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
    const remaining = slots.filter((s) => s.id !== slotId);
    if (remaining.length > 0) {
      setActiveSlotId(remaining[0].id);
    }
    toast.success('Đã xóa khung giờ Flash Sale');
  };

  // Update Slot fields
  const handleUpdateSlotField = (field: keyof ISlot, value: any) => {
    if (!currentSlot) return;
    setSlots((prev) =>
      prev.map((s) => (s.id === currentSlot.id ? { ...s, [field]: value } : s))
    );
  };

  // Add Products to Current Slot
  const handleAddProductsToSlot = (newProducts: any[]) => {
    if (!currentSlot) return;

    const newItems: IFlashItem[] = newProducts.map((p) => {
      const origPrice = Number(p.price) || 0;
      const normalSale = (Number(p.salePrice) && Number(p.salePrice) > 0 && Number(p.salePrice) < origPrice)
        ? Number(p.salePrice)
        : origPrice;
      const productSalePct = origPrice > normalSale ? Math.round(((origPrice - normalSale) / origPrice) * 100) : 0;
      const flashDiscount = bulkDiscountPercent > 0 ? bulkDiscountPercent : 10;
      const fPrice = Math.round((normalSale * (1 - flashDiscount / 100)) / 1000) * 1000;
      const totalDiscount = Math.min(99, productSalePct + flashDiscount);

      return {
        productId: p._id,
        product: p,
        originalPrice: origPrice,
        salePrice: normalSale,
        flashPrice: fPrice > 0 ? fPrice : normalSale,
        flashPercent: flashDiscount,
        discountPercent: totalDiscount,
        flashStock: Math.max(20, Math.min(100, p.stock || 50)),
        soldCount: Math.floor(Math.random() * 12) + 5,
        isActive: true,
      };
    });

    setSlots((prev) =>
      prev.map((s) =>
        s.id === currentSlot.id
          ? { ...s, items: [...(s.items || []), ...newItems] }
          : s
      )
    );
    toast.success(`Đã thêm ${newProducts.length} sản phẩm vào ${currentSlot.name}`);
  };

  // Remove Item from current slot
  const handleRemoveItemFromSlot = (itemIndex: number) => {
    if (!currentSlot) return;
    setSlots((prev) =>
      prev.map((s) =>
        s.id === currentSlot.id
          ? { ...s, items: s.items.filter((_, i) => i !== itemIndex) }
          : s
      )
    );
  };

  // Update Item field inside current slot
  const handleItemChangeInSlot = (itemIndex: number, field: string, value: any) => {
    if (!currentSlot) return;
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== currentSlot.id) return s;
        const updatedItems = [...s.items];
        const target = { ...updatedItems[itemIndex] };
        const prod = target.product || {};
        const orig = Number(target.originalPrice) || Number(prod.price) || 0;
        const normalSale = (Number(target.salePrice) && Number(target.salePrice) > 0 && Number(target.salePrice) < orig)
          ? Number(target.salePrice)
          : (Number(prod.salePrice) && Number(prod.salePrice) > 0 && Number(prod.salePrice) < orig ? Number(prod.salePrice) : orig);
        const productSalePct = orig > normalSale ? Math.round(((orig - normalSale) / orig) * 100) : 0;

        if (field === 'discountPercent' || field === 'flashPercent') {
          const flashPct = Math.max(0, Math.min(99, Number(value) || 0));
          target.flashPercent = flashPct;
          target.salePrice = normalSale;
          target.flashPrice = Math.round((normalSale * (1 - flashPct / 100)) / 1000) * 1000;
          target.discountPercent = Math.min(99, productSalePct + flashPct);
        } else if (field === 'flashPrice') {
          const price = Math.max(0, Number(value) || 0);
          target.flashPrice = price;
          target.salePrice = normalSale;
          const extraFlashPct = normalSale > price ? Math.max(0, Math.round(((normalSale - price) / normalSale) * 100)) : 0;
          target.flashPercent = extraFlashPct;
          target.discountPercent = Math.min(99, productSalePct + extraFlashPct);
        } else {
          (target as any)[field] = value;
        }

        updatedItems[itemIndex] = target;
        return { ...s, items: updatedItems };
      })
    );
  };

  // Save all settings to API
  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        title,
        subtitle,
        isActive,
        slots: slots.map((s) => ({
          id: s.id,
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
          dateType: s.dateType,
          specificDate: s.specificDate,
          startDate: s.startDate,
          endDate: s.endDate,
          enabled: s.enabled,
          items: (s.items || [])
            .filter((it: any) => {
              const pid = it?.productId?._id || it?.productId;
              return pid && typeof pid.toString === 'function' && pid.toString().trim().length > 0 && pid.toString() !== 'null' && pid.toString() !== '[object Object]';
            })
            .map((it: any) => ({
              productId: it.productId?._id || it.productId,
              originalPrice: Number(it.originalPrice) || 0,
              salePrice: Number(it.salePrice) || 0,
              flashPrice: Number(it.flashPrice) || 0,
              discountPercent: Number(it.discountPercent) || 0,
              flashPercent: Number(it.flashPercent) || 0,
              flashStock: Math.max(1, Number(it.flashStock) || 50),
              soldCount: Number(it.soldCount) || 0,
              isActive: it.isActive !== undefined ? it.isActive : true,
            })),
        })),
        // Root items as fallback
        items: (currentSlot?.items || [])
          .filter((it: any) => {
            const pid = it?.productId?._id || it?.productId;
            return pid && typeof pid.toString === 'function' && pid.toString().trim().length > 0 && pid.toString() !== 'null' && pid.toString() !== '[object Object]';
          })
          .map((it: any) => ({
            productId: it.productId?._id || it.productId,
            originalPrice: Number(it.originalPrice) || 0,
            salePrice: Number(it.salePrice) || 0,
            flashPrice: Number(it.flashPrice) || 0,
            discountPercent: Number(it.discountPercent) || 0,
            flashPercent: Number(it.flashPercent) || 0,
            flashStock: Math.max(1, Number(it.flashStock) || 50),
            soldCount: Number(it.soldCount) || 0,
            isActive: it.isActive !== undefined ? it.isActive : true,
          })),
        fomoSettings,
      };

      const res = await apiFetch('/api/admin/flash-sale', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Đã lưu toàn bộ cấu hình Khung Giờ & Sản Phẩm Flash Sale!');
        loadFlashSale();
      } else {
        toast.error(data.message || 'Lỗi lưu cấu hình');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLoading text="Đang tải cấu hình Flash Sale..." />;

  const slotItems = currentSlot?.items || [];
  const totalSoldInSlot = slotItems.reduce((sum, it) => sum + (Number(it.soldCount) || 0), 0);
  const totalStockInSlot = slotItems.reduce((sum, it) => sum + (Number(it.flashStock) || 0), 0);
  const soldOutPercent = totalStockInSlot > 0 ? Math.round((totalSoldInSlot / totalStockInSlot) * 100) : 0;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>
            <FiZap style={{ color: 'var(--admin-accent, #3b82f6)' }} /> Quản Trị Khung Giờ Flash Sale & FOMO
          </h1>
          <p className={styles.subtitle}>
            Tự do thiết lập các khung giờ trong ngày, mốc ngày cụ thể, chọn sản phẩm và % sale riêng cho từng khung giờ
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/?tab=products&filter=flash-sale" target="_blank" className={styles.btnPreviewWeb}>
            <FiEye /> Xem ngoài Web <FiExternalLink size={12} />
          </Link>
          <button
            type="button"
            className={styles.btnSave}
            onClick={handleSave}
            disabled={saving}
          >
            <FiSave /> {saving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
          </button>
        </div>
      </div>

      {/* Live Status Banner */}
      <div
        className={`${styles.statusBanner} ${isActive ? styles.statusBannerLive : styles.statusBannerInactive
          }`}
      >
        <div className={styles.statusIndicator}>
          {isActive && <div className={styles.pulseDot} />}
          <span className={styles.statusText}>
            Trạng thái Flash Sale:{' '}
            <strong style={{ color: isActive ? 'var(--admin-accent, #3b82f6)' : 'var(--admin-text-muted, #9ca3af)' }}>
              {isActive ? `🟢 ĐANG BẬT (${currentRunningSlotName})` : '⚪ ĐANG TẮT'}
            </strong>
          </span>
        </div>

        {isActive && (
          <div className={styles.countdownDisplay}>
            <span>Đếm ngược slot:</span>
            <span className={styles.countdownTimer}>{countdownText}</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Tổng Số Khung Giờ (Slots)</span>
          <span className={styles.statValue}>
            {slots.length} khung giờ ({slots.filter((s) => s.enabled).length} bật)
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Sản Phẩm Trong Khung Giờ Này</span>
          <span className={styles.statValue}>{slotItems.length} sản phẩm</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Tiến Độ Cháy Hàng (Slot này)</span>
          <span className={styles.statValue} style={{ color: 'var(--admin-accent, #3b82f6)' }}>
            🔥 {totalSoldInSlot}/{totalStockInSlot} ({soldOutPercent}%)
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Đồng Hồ Giữ Đơn Checkout</span>
          <span className={styles.statValue}>
            {fomoSettings.checkoutTimerMinutes} phút
          </span>
        </div>
      </div>

      {/* 1. Master Campaign Title & Toggle Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>
            <FiSliders style={{ color: 'var(--admin-accent, #3b82f6)' }} /> Cấu Hình Chung Chiến Dịch
          </div>
          <div className={styles.toggleWrapper} onClick={() => setIsActive(!isActive)}>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span className={styles.slider}></span>
            </label>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isActive ? 'var(--admin-accent, #3b82f6)' : 'var(--admin-text-muted, #9ca3af)' }}>
              {isActive ? 'BẬT Flash Sale toàn shop' : 'TẮT Flash Sale'}
            </span>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroupFull}>
            <label className={styles.label}>Tiêu đề hiển thị ngoài trang chủ:</label>
            <input
              type="text"
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="⚡ SIÊU SALE GIỜ VÀNG - GIẢM TỚI 50%"
            />
          </div>

          <div className={styles.formGroupFull}>
            <label className={styles.label}>Mô tả phụ (Subtitle):</label>
            <input
              type="text"
              className={styles.input}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Săn deal chớp nhoáng • Số lượng có hạn..."
            />
          </div>
        </div>
      </div>

      {/* 2. Slot Manager & Slot Settings */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>
            <FiClock style={{ color: 'var(--admin-accent, #3b82f6)' }} /> Danh Sách Khung Giờ Flash Sale ({slots.length})
          </div>
          <button
            type="button"
            className={styles.btnAddSlot}
            onClick={handleAddNewSlot}
          >
            <FiPlus /> + Thêm Khung Giờ Mới
          </button>
        </div>

        {/* Slot Selector Tabs */}
        <div className={styles.slotTabsBar}>
          {slots.map((s) => {
            const isSelected = activeSlotId === s.id;
            return (
              <div
                key={s.id}
                className={`${styles.slotTab} ${isSelected ? styles.slotTabActive : ''}`}
                onClick={() => setActiveSlotId(s.id)}
              >
                <div>
                  <div className={styles.slotTabName}>{s.name}</div>
                  <div className={styles.slotTabTime}>
                    {s.startTime} - {s.endTime} ({s.items?.length || 0} món)
                  </div>
                </div>
                <span
                  className={`${styles.slotTabBadge} ${s.enabled ? styles.badgeLive : styles.badgeDisabled
                    }`}
                >
                  {s.enabled ? 'Bật' : 'Tắt'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Active Slot Detail Editor */}
        {currentSlot && (
          <div className={styles.slotEditorBox}>
            <div className={styles.slotEditorHeader}>
              <div className={styles.slotEditorTitle}>
                <FiSliders /> Chỉnh sửa: <strong>{currentSlot.name}</strong>
              </div>

              <div className={styles.slotEditorActions}>
                <label className={styles.toggleWrapper}>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={currentSlot.enabled}
                      onChange={(e) => handleUpdateSlotField('enabled', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                    {currentSlot.enabled ? 'Khung giờ này đang BẬT' : 'Khung giờ này ĐÃ TẮT'}
                  </span>
                </label>

                <button
                  type="button"
                  className={styles.btnDeleteSlot}
                  onClick={() => handleDeleteSlot(currentSlot.id)}
                  title="Xóa khung giờ này"
                >
                  <FiTrash2 /> Xóa khung giờ
                </button>
              </div>
            </div>

            <div className={styles.slotFormGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Tên khung giờ:</label>
                <input
                  type="text"
                  className={styles.input}
                  value={currentSlot.name}
                  onChange={(e) => handleUpdateSlotField('name', e.target.value)}
                  placeholder="VD: Săn Sale Sáng, Giờ Vàng Nửa Giá"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Giờ bắt đầu:</label>
                <input
                  type="time"
                  className={styles.input}
                  value={currentSlot.startTime}
                  onChange={(e) => handleUpdateSlotField('startTime', e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Giờ kết thúc:</label>
                <input
                  type="time"
                  className={styles.input}
                  value={currentSlot.endTime}
                  onChange={(e) => handleUpdateSlotField('endTime', e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Mốc ngày áp dụng:</label>
                <select
                  className={styles.select}
                  value={currentSlot.dateType}
                  onChange={(e: any) => handleUpdateSlotField('dateType', e.target.value)}
                >
                  <option value="all_days">🔁 Lặp lại hàng ngày</option>
                  <option value="specific_date">📅 Ngày cụ thể (1 ngày)</option>
                  <option value="date_range">📆 Khoảng ngày (Từ ngày... đến ngày...)</option>
                </select>
              </div>

              {currentSlot.dateType === 'specific_date' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Chọn ngày diễn ra:</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={currentSlot.specificDate || ''}
                    onChange={(e) => handleUpdateSlotField('specificDate', e.target.value)}
                  />
                </div>
              )}

              {currentSlot.dateType === 'date_range' && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Từ ngày:</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={currentSlot.startDate || ''}
                      onChange={(e) => handleUpdateSlotField('startDate', e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Đến ngày:</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={currentSlot.endDate || ''}
                      onChange={(e) => handleUpdateSlotField('endDate', e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 3. Products in Current Slot Table */}
        <div style={{ marginTop: 20 }}>
          <div className={styles.slotProductsHeader}>
            <div className={styles.slotProductsTitleWrap}>
              <FiShoppingBag className={styles.slotProductsIcon} />
              <span className={styles.slotProductsTitle}>
                Sản phẩm slot: <strong className={styles.slotNameHighlight}>{currentSlot?.name}</strong>
                <span className={styles.slotCountTag}>({slotItems.length})</span>
              </span>
            </div>
            <button
              type="button"
              className={styles.btnAddProductCompact}
              onClick={() => setIsProductModalOpen(true)}
            >
              <FiPlus size={14} /> Thêm
            </button>
          </div>

          {/* Bulk Discount Toolbar */}
          {slotItems.length > 0 && (
            <div className={styles.bulkToolbar}>
              <div className={styles.bulkLeftArea}>
                <span className={styles.bulkText}>
                  ⚡ Giảm nhanh {slotItems.length} SP:
                </span>
                <div className={styles.bulkInputGroup}>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={bulkDiscountPercent}
                    onChange={(e) => setBulkDiscountPercent(Number(e.target.value) || 0)}
                    className={styles.bulkInput}
                  />
                  <span className={styles.bulkPercentSign}>%</span>
                  <button
                    type="button"
                    onClick={handleApplyBulkDiscount}
                    className={styles.btnApplyBulk}
                  >
                    Áp dụng
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleMakeSlotLiveNow}
                className={styles.btnMakeLiveNow}
              >
                🔥 Kích hoạt slot cả ngày (00:00 - 23:59)
              </button>
            </div>
          )}

          {slotItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--admin-text-muted, #9ca3af)', background: 'var(--admin-bg, #111318)', borderRadius: 10, border: '1px solid var(--admin-border, #2d3343)' }}>
              Khung giờ này chưa có sản phẩm nào. Bấm <strong>"+ Thêm Sản Phẩm"</strong> để chọn hàng và cài đặt % Sale.
            </div>
          ) : (
            <>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}>Bật</th>
                      <th style={{ width: 65, textAlign: 'center' }}>Ảnh</th>
                      <th style={{ minWidth: 260 }}>Tên sản phẩm & Phân loại</th>
                      <th style={{ width: 140 }}>Giá gốc / Giá sale</th>
                      <th style={{ width: 120 }}>% Flash Sale</th>
                      <th style={{ width: 140 }}>Giá Flash Sale</th>
                      <th style={{ width: 110 }}>Đã bán 🔥</th>
                      <th style={{ width: 60, textAlign: 'center' }}>Xóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slotItems.map((item, idx) => {
                      const prod = typeof item.product === 'object' && item.product !== null ? item.product : {};
                      const prodName = prod.name || (item as any).name || prod.title || 'Sản phẩm Flash Sale';
                      const prodImg = getProductCoverImage(prod, (item as any).image || '/file.svg');
                      const realStock = Array.isArray(prod.variants) && prod.variants.length > 0
                        ? prod.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0)
                        : (Number(prod.stock) || 0);

                      const itemId = String(item._id || item.productId || idx);
                      const isExpanded = Boolean(expandedProductVariantIds[itemId]);
                      const hasVariants = Array.isArray(prod.variants) && prod.variants.length > 0;

                      return (
                        <React.Fragment key={idx}>
                          <tr style={{ opacity: item.isActive ? 1 : 0.5 }}>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={item.isActive}
                                onChange={(e) => handleItemChangeInSlot(idx, 'isActive', e.target.checked)}
                                style={{ accentColor: '#f97316', width: 18, height: 18, cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <img
                                src={prodImg}
                                alt={prodName}
                                className={styles.tableThumb}
                                style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }}
                              />
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <strong style={{ color: 'var(--admin-text, #f3f4f6)', fontSize: '0.875rem', lineHeight: 1.35, fontWeight: 700 }}>
                                  {prodName}
                                </strong>
                                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted, #9ca3af)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <span>Kho: <strong style={{ color: realStock < 10 ? '#ef4444' : '#10b981' }}>{realStock}</strong> cái</span>
                                  {hasVariants && (
                                    <button
                                      type="button"
                                      onClick={() => toggleVariantPreview(itemId)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#60a5fa',
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontSize: '0.75rem',
                                        textDecoration: 'underline',
                                      }}
                                    >
                                      {isExpanded ? '▲ Thu gọn phân loại' : `▼ Xem ${prod.variants.length} phân loại (giảm ${item.flashPercent !== undefined ? item.flashPercent : (item.discountPercent || 0)}% từ giá sale)`}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ fontWeight: 600, color: 'var(--admin-text-muted, #9ca3af)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.875rem' }}>
                                  {formatPrice(item.salePrice || item.originalPrice)}
                                </span>
                                {item.originalPrice > (item.salePrice || 0) && (
                                  <span style={{ textDecoration: 'line-through', fontSize: '0.72rem', color: '#9ca3af' }}>
                                    Gốc: {formatPrice(item.originalPrice)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <input
                                    type="number"
                                    min={0}
                                    max={99}
                                    className={styles.tableInput}
                                    value={item.flashPercent !== undefined ? item.flashPercent : (item.discountPercent || '')}
                                    onChange={(e) => handleItemChangeInSlot(idx, 'flashPercent', e.target.value)}
                                    style={{ width: 65, color: '#f97316', fontWeight: 700 }}
                                  />
                                  <span style={{ fontWeight: 700, color: '#f97316' }}>%</span>
                                </div>
                                <span style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                  Tổng: -{item.discountPercent || 0}%
                                </span>
                              </div>
                            </td>
                            <td>
                              <input
                                type="number"
                                step={1000}
                                min={0}
                                className={styles.tableInput}
                                value={item.flashPrice || ''}
                                onChange={(e) => handleItemChangeInSlot(idx, 'flashPrice', e.target.value)}
                                style={{ color: '#f97316', fontWeight: 800 }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                className={styles.tableInput}
                                value={item.soldCount || ''}
                                onChange={(e) => handleItemChangeInSlot(idx, 'soldCount', e.target.value)}
                                style={{ width: 80, color: '#f97316' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className={styles.btnDeleteRow}
                                onClick={() => handleRemoveItemFromSlot(idx)}
                                title="Xóa sản phẩm khỏi khung giờ này"
                              >
                                <FiTrash2 />
                              </button>
                            </td>
                          </tr>

                          {/* Variant breakdown sub-row */}
                          {hasVariants && isExpanded && (
                            <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                              <td colSpan={8} style={{ padding: '10px 16px' }}>
                                <div style={{
                                  padding: '10px 14px',
                                  background: 'var(--admin-bg, #111318)',
                                  borderRadius: 8,
                                  border: '1px dashed var(--admin-border, #374151)',
                                }}>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f97316', marginBottom: 6 }}>
                                    ⚡ Bảng giá Flash Sale từng phân loại (giảm {item.flashPercent !== undefined ? item.flashPercent : (item.discountPercent || 0)}% từ giá sale, tổng giảm: -{item.discountPercent || 0}%):
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                                    {prod.variants.map((v: any, vIdx: number) => {
                                      const vOrig = Number(v.price) || item.originalPrice;
                                      const vSale = (Number(v.salePrice) && Number(v.salePrice) > 0 && Number(v.salePrice) < vOrig)
                                        ? Number(v.salePrice)
                                        : vOrig;
                                      const fPct = item.flashPercent !== undefined ? item.flashPercent : (item.discountPercent || 0);
                                      const vFlash = Math.round((vSale * (1 - fPct / 100)) / 1000) * 1000;
                                      const vProdSalePct = vOrig > vSale ? Math.round(((vOrig - vSale) / vOrig) * 100) : 0;
                                      const vTotalPct = Math.min(99, vProdSalePct + fPct);
                                      const vName = v.title || v.name || v.color || v.size || `Phân loại #${vIdx + 1}`;
                                      return (
                                        <div key={vIdx} style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          padding: '6px 10px',
                                          background: 'rgba(255,255,255,0.03)',
                                          borderRadius: 6,
                                          fontSize: '0.78rem',
                                          border: '1px solid var(--admin-border, #2d3343)',
                                        }}>
                                          <span style={{ color: '#e5e7eb', fontWeight: 500 }}>{vName}</span>
                                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            {vOrig > vSale && (
                                              <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '0.72rem' }}>
                                                {formatPrice(vOrig)}
                                              </span>
                                            )}
                                            <span style={{ color: '#10b981', fontSize: '0.72rem' }}>
                                              {formatPrice(vSale)}
                                            </span>
                                            <span style={{ color: '#f97316', fontWeight: 800 }}>
                                              {formatPrice(vFlash)}
                                            </span>
                                            <span style={{ background: '#f97316', color: '#fff', fontSize: '0.65rem', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>
                                              -{vTotalPct}%
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Flash Sale Product Cards View (<= 768px - ZERO horizontal scroll) */}
              <div className={styles.mobileFlashItemList}>
                {slotItems.map((item, idx) => {
                  const prod = typeof item.product === 'object' && item.product !== null ? item.product : {};
                  const prodName = prod.name || (item as any).name || prod.title || 'Sản phẩm Flash Sale';
                  const prodImg = getProductCoverImage(prod, (item as any).image || '/file.svg');
                  const realStock = Array.isArray(prod.variants) && prod.variants.length > 0
                    ? prod.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0)
                    : (Number(prod.stock) || 0);

                  const itemId = String(item._id || item.productId || idx);
                  const isExpanded = Boolean(expandedProductVariantIds[itemId]);
                  const hasVariants = Array.isArray(prod.variants) && prod.variants.length > 0;

                  return (
                    <div
                      key={idx}
                      className={`${styles.mobileFlashCard} ${!item.isActive ? styles.mobileFlashCardInactive : ''}`}
                    >
                      {/* Top Row: Checkbox, Thumbnail, Title & Current Price, Delete */}
                      <div className={styles.mobileCardTop}>
                        <input
                          type="checkbox"
                          checked={item.isActive}
                          onChange={(e) => handleItemChangeInSlot(idx, 'isActive', e.target.checked)}
                          className={styles.mobileCheckbox}
                          title={item.isActive ? 'Đang bật trong slot' : 'Đang tắt'}
                        />

                        <img
                          src={prodImg}
                          alt={prodName}
                          className={styles.mobileThumb}
                        />

                        <div className={styles.mobileMetaArea}>
                          <strong className={styles.mobileProdTitle}>{prodName}</strong>
                          <div className={styles.mobilePriceRow}>
                            <span className={styles.mobileCurrentPriceTag}>
                              {formatPrice(item.salePrice || item.originalPrice)}
                            </span>
                            {item.originalPrice > (item.salePrice || 0) && (
                              <span className={styles.mobileOrigPriceTag}>
                                {formatPrice(item.originalPrice)}
                              </span>
                            )}
                            <span className={styles.mobileStockTag}>
                              • Kho: <strong>{realStock}</strong>
                            </span>
                          </div>
                          {hasVariants && (
                            <button
                              type="button"
                              onClick={() => toggleVariantPreview(itemId)}
                              className={styles.mobileBtnVariantToggle}
                            >
                              {isExpanded ? '▲ Thu gọn' : `▼ Xem ${prod.variants.length} phân loại`}
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          className={styles.btnDeleteRow}
                          onClick={() => handleRemoveItemFromSlot(idx)}
                          title="Xóa khỏi khung giờ này"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>

                      {/* Bottom Action Strip: 3-column micro grid for fast editing */}
                      <div className={styles.mobileCardActionStrip}>
                        <div className={styles.mobileFieldCol}>
                          <label className={styles.mobileFieldLabel}>% Giảm</label>
                          <div className={styles.mobileInputWrap}>
                            <input
                              type="number"
                              min={0}
                              max={99}
                              className={styles.mobileFieldInput}
                              value={item.flashPercent !== undefined ? item.flashPercent : (item.discountPercent || '')}
                              onChange={(e) => handleItemChangeInSlot(idx, 'flashPercent', e.target.value)}
                            />
                            <span className={styles.mobileFieldSuffix}>%</span>
                          </div>
                          <span className={styles.mobileFieldHint}>Tổng: -{item.discountPercent || 0}%</span>
                        </div>

                        <div className={styles.mobileFieldCol}>
                          <label className={styles.mobileFieldLabel}>Giá Flash Sale</label>
                          <div className={styles.mobileInputWrap}>
                            <input
                              type="number"
                              step={1000}
                              min={0}
                              className={styles.mobileFieldInputHighlight}
                              value={item.flashPrice || ''}
                              onChange={(e) => handleItemChangeInSlot(idx, 'flashPrice', e.target.value)}
                            />
                            <span className={styles.mobileFieldSuffix}>₫</span>
                          </div>
                          <span className={styles.mobileFieldHintPrice}>
                            {item.flashPrice ? formatPrice(item.flashPrice) : 'Chưa nhập'}
                          </span>
                        </div>

                        <div className={styles.mobileFieldCol}>
                          <label className={styles.mobileFieldLabel}>Đã bán ảo 🔥</label>
                          <div className={styles.mobileInputWrap}>
                            <input
                              type="number"
                              min={0}
                              className={styles.mobileFieldInput}
                              value={item.soldCount || ''}
                              onChange={(e) => handleItemChangeInSlot(idx, 'soldCount', e.target.value)}
                            />
                          </div>
                          <span className={styles.mobileFieldHint}>sp</span>
                        </div>
                      </div>

                      {/* Variant Breakdown Card when expanded */}
                      {hasVariants && isExpanded && (
                        <div className={styles.mobileVariantBreakdown}>
                          <div className={styles.mobileVariantTitle}>
                            ⚡ Bảng giá Flash Sale từng phân loại (giảm {item.flashPercent !== undefined ? item.flashPercent : (item.discountPercent || 0)}% từ giá sale):
                          </div>
                          <div className={styles.mobileVariantGrid}>
                            {prod.variants.map((v: any, vIdx: number) => {
                              const vOrig = Number(v.price) || item.originalPrice;
                              const vSale = (Number(v.salePrice) && Number(v.salePrice) > 0 && Number(v.salePrice) < vOrig)
                                ? Number(v.salePrice)
                                : vOrig;
                              const fPct = item.flashPercent !== undefined ? item.flashPercent : (item.discountPercent || 0);
                              const vFlash = Math.round((vSale * (1 - fPct / 100)) / 1000) * 1000;
                              const vProdSalePct = vOrig > vSale ? Math.round(((vOrig - vSale) / vOrig) * 100) : 0;
                              const vTotalPct = Math.min(99, vProdSalePct + fPct);
                              const vName = v.title || v.name || v.color || v.size || `Phân loại #${vIdx + 1}`;

                              return (
                                <div key={vIdx} className={styles.mobileVariantCardItem}>
                                  <span className={styles.mobileVariantItemName}>{vName}</span>
                                  <div className={styles.mobileVariantItemPrices}>
                                    {vOrig > vSale && (
                                      <span className={styles.mobileVariantOrigPrice}>{formatPrice(vOrig)}</span>
                                    )}
                                    <span className={styles.mobileVariantSalePrice}>{formatPrice(vSale)}</span>
                                    <strong className={styles.mobileVariantFlashPrice}>{formatPrice(vFlash)}</strong>
                                    <span className={styles.mobileVariantBadge}>-{vTotalPct}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. FOMO & Social Proof Settings Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>
            <FiBell style={{ color: 'var(--admin-accent, #3b82f6)' }} /> Hiệu Ứng Tâm Lý FOMO & Social Proof
          </div>
          <button
            type="button"
            className={styles.btnSave}
            style={{ padding: '8px 16px', fontSize: '0.875rem' }}
            onClick={handleSave}
            disabled={saving}
          >
            <FiSave /> {saving ? 'Đang lưu...' : 'Lưu Cài Đặt FOMO'}
          </button>
        </div>

        <div className={styles.fomoGrid}>
          {/* Live purchase popup */}
          <div className={styles.fomoOption}>
            <div className={styles.fomoOptionHeader}>
              <span className={styles.fomoOptionTitle}>🔔 Popup "Khách vừa mua"</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={fomoSettings.enableLivePurchasePopup}
                  onChange={(e) =>
                    setFomoSettings((prev) => ({
                      ...prev,
                      enableLivePurchasePopup: e.target.checked,
                    }))
                  }
                />
                <span className={styles.slider}></span>
              </label>
            </div>
            <p className={styles.fomoOptionDesc}>
              Hiển thị thông báo nhỏ góc trái màn hình: <em>"Anh Minh (Hà Nội) vừa đặt mua 2 phút trước"</em>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--admin-text-muted, #9ca3af)' }}>
                Tần suất lặp:
              </span>
              <input
                type="number"
                min={10}
                max={120}
                value={fomoSettings.popupIntervalSeconds}
                onChange={(e) =>
                  setFomoSettings((prev) => ({
                    ...prev,
                    popupIntervalSeconds: Number(e.target.value) || 25,
                  }))
                }
                className={styles.input}
                style={{ width: 70, padding: '4px 8px' }}
              />
              <span style={{ fontSize: '0.8125rem' }}>giây</span>
            </div>
          </div>

          {/* Checkout lock timer */}
          <div className={styles.fomoOption}>
            <div className={styles.fomoOptionHeader}>
              <span className={styles.fomoOptionTitle}>⏳ Đồng hồ giữ đơn tại Checkout</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={fomoSettings.enableCheckoutTimer}
                  onChange={(e) =>
                    setFomoSettings((prev) => ({
                      ...prev,
                      enableCheckoutTimer: e.target.checked,
                    }))
                  }
                />
                <span className={styles.slider}></span>
              </label>
            </div>
            <p className={styles.fomoOptionDesc}>
              Đếm ngược giữ ưu đãi Flash Sale trên trang `/checkout` để thôi thúc khách hoàn tất thanh toán.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--admin-text-muted, #9ca3af)' }}>
                Thời gian giữ đơn:
              </span>
              <input
                type="number"
                min={5}
                max={60}
                value={fomoSettings.checkoutTimerMinutes}
                onChange={(e) =>
                  setFomoSettings((prev) => ({
                    ...prev,
                    checkoutTimerMinutes: Number(e.target.value) || 15,
                  }))
                }
                className={styles.input}
                style={{ width: 70, padding: '4px 8px' }}
              />
              <span style={{ fontSize: '0.8125rem' }}>phút</span>
            </div>
          </div>

          {/* Product Offer/Reservation Countdown Timer */}
          <div className={styles.fomoOption}>
            <div className={styles.fomoOptionHeader}>
              <span className={styles.fomoOptionTitle}>⚡ Đồng hồ giữ đơn tại chi tiết sản phẩm</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={fomoSettings.enableProductTimer !== false}
                  onChange={(e) =>
                    setFomoSettings((prev: any) => ({
                      ...prev,
                      enableProductTimer: e.target.checked,
                    }))
                  }
                />
                <span className={styles.slider}></span>
              </label>
            </div>
            <p className={styles.fomoOptionDesc}>
              Hiển thị đồng hồ đếm ngược giữ giá ưu đãi kèm thanh tiến trình tại trang chi tiết sản phẩm để thôi thúc khách bấm <strong>Mua Ngay</strong>.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--admin-text-muted, #9ca3af)' }}>
                Thời gian đếm ngược:
              </span>
              <input
                type="number"
                min={3}
                max={60}
                value={fomoSettings.productTimerMinutes || 10}
                onChange={(e) =>
                  setFomoSettings((prev: any) => ({
                    ...prev,
                    productTimerMinutes: Number(e.target.value) || 10,
                  }))
                }
                className={styles.input}
                style={{ width: 70, padding: '4px 8px' }}
              />
              <span style={{ fontSize: '0.8125rem' }}>phút</span>
            </div>
          </div>

          {/* Real-time viewer count */}
          <div className={styles.fomoOption}>
            <div className={styles.fomoOptionHeader}>
              <span className={styles.fomoOptionTitle}>👁️ Số người đang cùng xem</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={fomoSettings.enableViewerCount}
                  onChange={(e) =>
                    setFomoSettings((prev: any) => ({
                      ...prev,
                      enableViewerCount: e.target.checked,
                    }))
                  }
                />
                <span className={styles.slider}></span>
              </label>
            </div>
            <p className={styles.fomoOptionDesc}>
              Hiển thị số lượng người đang xem sản phẩm trên trang chi tiết: <em>"🔥 18 người đang xem lúc này"</em>.
            </p>
          </div>
        </div>
      </div>

      {/* Product Select Modal */}
      <ProductSelectModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSelect={handleAddProductsToSlot}
        existingProductIds={slotItems.map((it) => it.productId)}
      />
    </div>
  );
}
