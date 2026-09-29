'use client';

import React, { useState } from 'react';
import { FiX, FiTruck, FiCheck, FiSend, FiEdit3, FiPackage } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatPrice } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import styles from './ShipOrderModal.module.css';

interface ShipOrderModalProps {
  order: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface CarrierDef {
  key: string;
  name: string;
  shortName: string;
  tagClass: string;
  tagText: string;
  desc: string;
}

const CARRIER_OPTIONS: CarrierDef[] = [
  {
    key: 'ghn',
    name: 'Giao Hàng Nhanh (GHN)',
    shortName: 'GHN Express',
    tagClass: styles.tagGHN,
    tagText: 'Hỏa Tốc',
    desc: 'Hỏa tốc nội thành, kết nối API trực tiếp, giao nhanh 24-48h',
  },
  {
    key: 'ghtk',
    name: 'Giao Hàng Tiết Kiệm (GHTK)',
    shortName: 'GHTK',
    tagClass: styles.tagGHTK,
    tagText: 'Tiết Kiệm',
    desc: 'Độ phủ sóng rộng 63 tỉnh thành, tối ưu chi phí, bưu cục dày đặc',
  },
  {
    key: 'viettelpost',
    name: 'Viettel Post',
    shortName: 'Viettel Post',
    tagClass: styles.tagVTP,
    tagText: 'Bảo Đảm',
    desc: 'Mạng lưới bưu chính quân đội, an toàn bảo đảm mọi tuyến huyện xã',
  },
  {
    key: 'internal',
    name: 'Tự Giao Hàng / Shipper Nội Bộ',
    shortName: 'Nội Bộ / Khác',
    tagClass: styles.tagStandard,
    tagText: 'Nội Bộ',
    desc: 'Shop tự điều phối nhân viên giao hàng hoặc gửi chành xe / bến xe',
  },
];

export default function ShipOrderModal({ order, onClose, onSuccess }: ShipOrderModalProps) {
  const [activeCarriers, setActiveCarriers] = useState<CarrierDef[]>(CARRIER_OPTIONS);
  const [selectedCarrier, setSelectedCarrier] = useState<string>('ghn');
  const [dispatchMode, setDispatchMode] = useState<'auto' | 'manual'>('auto');
  const [manualTrackingCode, setManualTrackingCode] = useState<string>('');
  const [shippingNote, setShippingNote] = useState<string>('Cho xem hàng không cho thử');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Load Shipping Carrier Settings from DB (only show carriers that are ON)
  React.useEffect(() => {
    async function loadCarrierConfig() {
      try {
        setLoadingConfig(true);
        const res = await apiFetch('/api/shipping/config');
        const data = await res.json();
        if (data.success && data.data) {
          const cConfig = data.data.carriers || {};
          const ghnOn = cConfig.ghn?.enabled ?? data.data.ghnEnabled ?? true;
          const ghtkOn = cConfig.ghtk?.enabled ?? data.data.ghtkEnabled ?? true;
          const vtpOn = cConfig.viettelpost?.enabled ?? data.data.vtpEnabled ?? true;

          const filtered = CARRIER_OPTIONS.filter((c) => {
            if (c.key === 'ghn') return ghnOn;
            if (c.key === 'ghtk') return ghtkOn;
            if (c.key === 'viettelpost') return vtpOn;
            if (c.key === 'internal') return true; // Tự giao hàng luôn mở
            return true;
          });

          setActiveCarriers(filtered);
          if (filtered.length > 0) {
            setSelectedCarrier(filtered[0].key);
          }
        }
      } catch (err) {
        console.error('Error fetching carrier config in ShipOrderModal:', err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadCarrierConfig();
  }, []);

  if (!order) return null;

  const codAmount = order.paymentStatus === 'paid' ? 0 : (order.totalAmount || 0);
  const selectedCarrierObj = activeCarriers.find((c) => c.key === selectedCarrier) || activeCarriers[0] || CARRIER_OPTIONS[0];

  const handleConfirmShipment = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      let finalTrackingCode = manualTrackingCode.trim();

      // Mode 1: Auto push via 3rd-party logistics API
      if (dispatchMode === 'auto' && selectedCarrier !== 'internal') {
        try {
          const pushRes = await apiFetch('/api/shipping/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: order._id,
              provider: selectedCarrier,
              orderData: {
                orderCode: order.orderCode,
                paymentMethod: order.paymentMethod,
                totalAmount: order.totalAmount,
                to_name: order.customer?.name,
                to_phone: order.customer?.phone,
                to_address: order.customer?.address,
                province: order.customer?.province,
                district: order.customer?.district,
                ward: order.customer?.ward,
                customer: order.customer,
                items: order.items,
                cod_amount: codAmount,
                notes: shippingNote,
                weight: 500,
              },
            }),
          });
          const pushData = await pushRes.json();
          if (pushData.success && pushData.data?.trackingCode) {
            finalTrackingCode = pushData.data.trackingCode;
            toast.success(`Hãng ${selectedCarrierObj.shortName} đã cấp mã vận đơn: ${finalTrackingCode}`);
          } else if (!pushData.success) {
            toast.error(pushData.message || 'Lỗi khi tạo vận đơn sang hãng vận chuyển', { duration: 6000 });
          }
        } catch (apiErr: any) {
          console.warn('Carrier Auto API push warning, falling back to direct update:', apiErr);
          toast.error(`Lỗi kết nối tới hãng vận chuyển: ${apiErr.message || 'Vui lòng thử lại'}`, { duration: 6000 });
        }
      }

      // If internal or no tracking code yet generated, assign fallback tracking code
      if (!finalTrackingCode) {
        if (selectedCarrier === 'internal') {
          finalTrackingCode = `NB-${order.orderCode || Date.now()}`;
        } else if (selectedCarrier === 'ghn') {
          finalTrackingCode = `GHN-${Date.now().toString().slice(-8)}`;
        } else if (selectedCarrier === 'ghtk') {
          finalTrackingCode = `GHTK.${Date.now().toString().slice(-8)}.HN`;
        } else if (selectedCarrier === 'viettelpost') {
          finalTrackingCode = `VTP${Date.now().toString().slice(-8)}`;
        }
      }

      // Update Order Status to 'shipping'
      const updateRes = await apiFetch(`/api/orders/${order._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'shipping',
          shippingProvider: selectedCarrier,
          shippingCarrier: selectedCarrierObj.name,
          trackingCode: finalTrackingCode,
          shippingNotes: shippingNote.trim() || undefined,
        }),
      });

      const updateData = await updateRes.json();
      if (updateData.success) {
        toast.success(`Đã chuyển đơn hàng #${order.orderCode} sang ĐANG GIAO HÀNG (${selectedCarrierObj.shortName})!`);
        onSuccess();
        onClose();
      } else {
        toast.error(updateData.message || 'Lỗi khi cập nhật trạng thái đơn hàng');
      }
    } catch (err: any) {
      console.error('Error dispatching shipment:', err);
      toast.error('Lỗi kết nối máy chủ. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h2 className={styles.title}>
              <FiTruck style={{ color: 'var(--primary, #3b82f6)' }} />
              Chọn Đơn Vị Giao Hàng
            </h2>
            <p className={styles.subtitle}>
              Đơn hàng #{order.orderCode} • Khách hàng: <strong>{order.customer?.name}</strong> ({order.customer?.phone})
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Đóng">
            <FiX />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleConfirmShipment} className={styles.body}>
          {/* Order Quick Summary */}
          <div className={styles.orderSummaryBox}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Địa chỉ giao hàng:</span>
              <span className={styles.summaryVal}>{order.customer?.address || 'Chưa cập nhật'}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Hình thức thanh toán:</span>
              <span className={styles.summaryVal}>
                {order.paymentMethod === 'bank_transfer' ? 'Chuyển khoản VietQR' : 'Thu tiền tận nơi (COD)'}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Tiền thu hộ COD:</span>
              <span className={styles.summaryVal} style={{ color: codAmount > 0 ? '#f59e0b' : '#10b981' }}>
                {codAmount > 0 ? formatPrice(codAmount) : '0 ₫ (Đã thanh toán trước)'}
              </span>
            </div>
          </div>

          {/* 1. Carrier Selector Grid */}
          <div>
            <label className={styles.sectionLabel}>
              <FiPackage style={{ color: 'var(--primary, #3b82f6)' }} />
              1. Chọn đơn vị vận chuyển phụ trách:
            </label>

            <div className={styles.carrierGrid}>
              {activeCarriers.map((c) => {
                const isSelected = selectedCarrier === c.key;
                return (
                  <div
                    key={c.key}
                    className={`${styles.carrierCard} ${isSelected ? styles.carrierSelected : ''}`}
                    onClick={() => setSelectedCarrier(c.key)}
                  >
                    <input
                      type="radio"
                      name="ship_carrier"
                      className={styles.carrierRadio}
                      checked={isSelected}
                      onChange={() => setSelectedCarrier(c.key)}
                    />
                    <div className={styles.carrierContent}>
                      <div className={styles.carrierHeader}>
                        <span className={styles.carrierName}>{c.shortName}</span>
                        <span className={`${styles.carrierTag} ${c.tagClass}`}>{c.tagText}</span>
                      </div>
                      <span className={styles.carrierDesc}>{c.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Dispatch Mode Toggle */}
          {selectedCarrier !== 'internal' && (
            <div>
              <label className={styles.sectionLabel}>
                <FiSend style={{ color: 'var(--primary, #3b82f6)' }} />
                2. Phương thức điều phối vận đơn:
              </label>

              <div className={styles.methodToggleWrap}>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${dispatchMode === 'auto' ? styles.toggleBtnActive : ''}`}
                  onClick={() => setDispatchMode('auto')}
                >
                  ⚡ Tự động đẩy qua API & Lấy mã vận đơn
                </button>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${dispatchMode === 'manual' ? styles.toggleBtnActive : ''}`}
                  onClick={() => setDispatchMode('manual')}
                >
                  ✍️ Nhập mã vận đơn thủ công
                </button>
              </div>
            </div>
          )}

          {/* 3. Manual Tracking Code (If manual mode or internal) */}
          {(dispatchMode === 'manual' || selectedCarrier === 'internal') && (
            <div className={styles.inputGroup}>
              <label>Mã vận đơn bưu kiện (Tùy chọn / Tự sinh):</label>
              <input
                type="text"
                placeholder={selectedCarrier === 'internal' ? `VD: SHIPPER_AN_${order.orderCode}` : 'VD: GHN59182490VN hoặc GHTK.184920.HN'}
                className={styles.input}
                value={manualTrackingCode}
                onChange={(e) => setManualTrackingCode(e.target.value)}
              />
            </div>
          )}

          {/* 4. Shipping Notes */}
          <div className={styles.inputGroup}>
            <label>Ghi chú gửi hàng cho Shipper:</label>
            <input
              type="text"
              placeholder="VD: Cho xem hàng không cho thử, Giao giờ hành chính..."
              className={styles.input}
              value={shippingNote}
              onChange={(e) => setShippingNote(e.target.value)}
            />
          </div>

          {/* Footer Action Buttons */}
          <div className={styles.footer} style={{ margin: '0 -24px -22px -24px' }}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
              Hủy bỏ
            </button>
            <button type="submit" className={styles.confirmBtn} disabled={isSubmitting}>
              <FiCheck size={16} />
              {isSubmitting ? 'Đang Xử Lý...' : `Xác Nhận & Giao Bằng ${selectedCarrierObj.shortName}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
