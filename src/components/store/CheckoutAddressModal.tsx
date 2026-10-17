'use client';

import React, { useState, useEffect } from 'react';
import {
  FiX,
  FiMapPin,
  FiUser,
  FiPhone,
  FiFileText,
  FiMail,
  FiCheck,
  FiEdit2,
  FiShoppingBag,
  FiTruck,
  FiCreditCard,
  FiShield,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { vietnamProvinces } from '@/lib/vietnamLocations';
import styles from './CheckoutAddressModal.module.css';

export interface ICustomerAddressData {
  name: string;
  phone: string;
  email: string;
  province: string;
  district: string;
  ward?: string;
  streetAddress: string;
  notes: string;
}

interface CheckoutAddressModalProps {
  isOpen: boolean;
  mode: 'input' | 'confirm';
  onClose: () => void;
  customer: ICustomerAddressData;
  onSaveAddress: (newCustomer: ICustomerAddressData) => void;
  onConfirmOrder: () => void;
  onSwitchToEdit: () => void;
  submitting?: boolean;
  orderSummary: {
    totalAmount: number;
    paymentMethod: 'bank_transfer' | 'cod';
    subtotal: number;
    voucherDiscount: number;
    itemCount: number;
  };
}

export default function CheckoutAddressModal({
  isOpen,
  mode,
  onClose,
  customer,
  onSaveAddress,
  onConfirmOrder,
  onSwitchToEdit,
  submitting = false,
  orderSummary,
}: CheckoutAddressModalProps) {
  const [formData, setFormData] = useState<ICustomerAddressData>(customer);
  const [wardsList, setWardsList] = useState<string[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);

  // Sync form data whenever customer prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(customer);
    }
  }, [isOpen, customer]);

  // Province / District Cascading
  const selectedProvinceData =
    vietnamProvinces.find((p) => p.name === formData.province) || vietnamProvinces[0];
  const availableDistricts = selectedProvinceData?.districts || [];

  // Fetch dynamic wards whenever district changes or modal opens
  useEffect(() => {
    if (!isOpen || !formData.district) {
      setWardsList([]);
      return;
    }

    let isMounted = true;
    setLoadingWards(true);

    fetch(
      `/api/locations/wards?district=${encodeURIComponent(formData.district)}&province=${encodeURIComponent(formData.province)}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.wards)) {
          setWardsList(data.wards);
          // If current ward not in list, auto select first available ward
          if (data.wards.length > 0 && (!formData.ward || !data.wards.includes(formData.ward))) {
            setFormData((prev) => ({
              ...prev,
              ward: data.wards[0],
            }));
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load wards:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingWards(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, formData.province, formData.district]);

  const handleProvinceChange = (provinceName: string) => {
    const prov = vietnamProvinces.find((p) => p.name === provinceName);
    const firstDistrict = prov?.districts?.[0]?.name || '';
    setFormData((prev) => ({
      ...prev,
      province: provinceName,
      district: firstDistrict,
      ward: '',
    }));
  };

  const handleDistrictChange = (districtName: string) => {
    setFormData((prev) => ({
      ...prev,
      district: districtName,
      ward: '',
    }));
  };

  const handleSaveForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập họ và tên nhận hàng');
      return;
    }

    const cleanPhone = formData.phone.replace(/[\s.-]/g, '');
    if (!cleanPhone) {
      toast.error('Vui lòng nhập số điện thoại nhận hàng');
      return;
    }
    if (!/^0[0-9]{9}$/.test(cleanPhone)) {
      toast.error('Số điện thoại không hợp lệ (gồm 10 số bắt đầu bằng số 0)');
      return;
    }

    if (!formData.streetAddress.trim()) {
      toast.error('Vui lòng nhập số nhà, tên đường cụ thể');
      return;
    }

    const updated: ICustomerAddressData = {
      ...formData,
      name: formData.name.trim(),
      phone: cleanPhone,
      streetAddress: formData.streetAddress.trim(),
      ward: formData.ward?.trim() || '',
      notes: formData.notes.trim(),
      email: formData.email.trim(),
    };

    onSaveAddress(updated);
    toast.success('Đã lưu thông tin địa chỉ!');
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const fullDisplayAddress = [
    formData.streetAddress,
    formData.ward,
    formData.district,
    formData.province,
  ]
    .filter(Boolean)
    .join(', ');

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Decorative envelope stripe */}
        <div className={styles.envelopeStripe} />

        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            {mode === 'input' ? (
              <>
                <FiMapPin size={18} color="var(--primary, #f97316)" />
                <span>Nhập Thông Tin Giao Hàng</span>
              </>
            ) : (
              <>
                <FiShield size={18} color="#10b981" />
                <span>Kiểm Tra Lại Thông Tin Giao Hàng</span>
              </>
            )}
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Đóng"
          >
            <FiX />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {mode === 'input' ? (
            /* ===== MODE: INPUT / EDIT ADDRESS FORM ===== */
            <form id="addressForm" className={styles.formGrid} onSubmit={handleSaveForm}>
              {/* Row 1: Name & Phone */}
              <div className={styles.gridTwo}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    <FiUser size={13} />
                    <span>Họ và tên</span>
                    <span className={styles.requiredStar}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Văn An"
                    className={styles.inputField}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    <FiPhone size={13} />
                    <span>Số điện thoại</span>
                    <span className={styles.requiredStar}>*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="VD: 0987654321"
                    className={styles.inputField}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 2: Location Selectors (Tỉnh / Thành, Quận / Huyện, Phường / Xã) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    <FiMapPin size={13} />
                    <span>Tỉnh / Thành</span>
                    <span className={styles.requiredStar}>*</span>
                  </label>
                  <select
                    className={`${styles.inputField} ${styles.selectField}`}
                    value={formData.province}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                  >
                    {vietnamProvinces.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    <FiMapPin size={13} />
                    <span>Quận / Huyện</span>
                    <span className={styles.requiredStar}>*</span>
                  </label>
                  <select
                    className={`${styles.inputField} ${styles.selectField}`}
                    value={formData.district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                  >
                    {availableDistricts.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    <FiMapPin size={13} />
                    <span>Phường / Xã</span>
                    <span className={styles.requiredStar}>*</span>
                  </label>
                  <select
                    className={`${styles.inputField} ${styles.selectField}`}
                    value={formData.ward || ''}
                    disabled={loadingWards}
                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                  >
                    {loadingWards ? (
                      <option value="">Đang tải phường/xã...</option>
                    ) : wardsList.length > 0 ? (
                      wardsList.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))
                    ) : (
                      <option value={formData.ward || ''}>
                        {formData.ward || 'Chọn phường / xã'}
                      </option>
                    )}
                  </select>
                </div>
              </div>

              {/* Row 3: Specific Street Address */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  <FiMapPin size={13} />
                  <span>Số nhà, ngõ/ngách, tên đường cụ thể</span>
                  <span className={styles.requiredStar}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Số 123 Đường Cầu Giấy, Tòa nhà Discovery"
                  className={styles.inputField}
                  value={formData.streetAddress}
                  onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                />
              </div>
              {/* Row 4: Email & Note */}
              <div className={styles.gridTwo}>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    <FiFileText size={13} />
                    <span>Ghi chú giao hàng (Tùy chọn)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Giao giờ hành chính, gọi trước"
                    className={styles.inputField}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
            </form>
          ) : (
            /* ===== MODE: CONFIRM & REVIEW DETAILS ===== */
            <>
              <div className={styles.confirmNotice}>
                <span>💡</span>
                <span>
                  Vui lòng kiểm tra kỹ <strong>Số điện thoại</strong> và <strong>Địa chỉ giao hàng</strong> để shipper có thể liên hệ và giao hàng đúng hẹn nhé!
                </span>
              </div>

              <div className={styles.reviewCard}>
                {/* Receiver Info */}
                <div className={styles.reviewSection}>
                  <div className={styles.sectionLabel}>
                    <FiUser size={13} />
                    <span>Người nhận hàng</span>
                  </div>
                  <div className={styles.receiverRow}>
                    <span className={styles.receiverName}>{formData.name || customer.name}</span>
                    <span className={styles.dotSep}>•</span>
                    <span className={styles.receiverPhone}>{formData.phone || customer.phone}</span>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className={styles.reviewSection}>
                  <div className={styles.sectionLabel}>
                    <FiMapPin size={13} color="#ef4444" />
                    <span>Địa chỉ nhận hàng chi tiết</span>
                  </div>
                  <div className={styles.addressDetail}>
                    {fullDisplayAddress || 'Chưa có địa chỉ chi tiết'}
                  </div>
                </div>

                {formData.notes && (
                  <div className={styles.reviewSection}>
                    <div className={styles.sectionLabel}>
                      <FiFileText size={13} />
                      <span>Ghi chú giao hàng</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-main, #334155)' }}>
                      "{formData.notes}"
                    </div>
                  </div>
                )}

                <div className={styles.divider} />

                {/* Shipping info */}
                <div className={styles.infoRow}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiTruck size={14} color="#10b981" />
                    <span>Vận chuyển</span>
                  </span>
                  <span className={`${styles.infoVal} ${styles.freeTag}`}>
                    Miễn phí giao hàng (0 ₫)
                  </span>
                </div>

                {/* Payment Method */}
                <div className={styles.infoRow}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiCreditCard size={14} color="var(--primary, #f97316)" />
                    <span>Thanh toán</span>
                  </span>
                  <span className={styles.infoVal}>
                    {orderSummary.paymentMethod === 'bank_transfer'
                      ? '⚡ Chuyển khoản VietQR'
                      : '💵 Thanh toán khi nhận hàng (COD)'}
                  </span>
                </div>

                {/* Total amount */}
                <div className={styles.totalRow}>
                  <span className={styles.totalTitle}>
                    Tổng thanh toán ({orderSummary.itemCount} sản phẩm)
                  </span>
                  <span className={styles.totalValue}>
                    {formatPrice(orderSummary.totalAmount)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className={styles.modalFooter}>
          {mode === 'input' ? (
            <>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={onClose}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleSaveForm}
              >
                <FiCheck size={16} />
                <span>Lưu Địa Chỉ & Tiếp Tục</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={onSwitchToEdit}
              >
                <FiEdit2 size={14} />
                <span>Sửa địa chỉ</span>
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={submitting}
                onClick={onConfirmOrder}
              >
                <FiCheck size={16} />
                <span>{submitting ? 'Đang Xử Lý Đơn...' : 'Xác Nhận Đặt Hàng'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
