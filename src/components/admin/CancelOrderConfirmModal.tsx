'use client';

import React, { useState } from 'react';
import { FiXCircle, FiTruck, FiAlertTriangle } from 'react-icons/fi';
import styles from './DeleteConfirmModal.module.css';

interface CancelOrderConfirmModalProps {
  isOpen: boolean;
  orderCode: string;
  trackingCode?: string;
  carrier?: string;
  isCancelling?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export default function CancelOrderConfirmModal({
  isOpen,
  orderCode,
  trackingCode,
  carrier,
  isCancelling = false,
  onConfirm,
  onClose,
}: CancelOrderConfirmModalProps) {
  const [reason, setReason] = useState('Khách yêu cầu hủy đơn');

  if (!isOpen) return null;

  const hasTracking = Boolean(trackingCode && trackingCode.trim());

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Danger Cancel Icon */}
        <div className={styles.iconWrapper} style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.35)', color: '#ef4444' }}>
          <FiXCircle />
        </div>

        {/* Title */}
        <h3 className={styles.title}>Xác Nhận Hủy Đơn Hàng</h3>

        {/* Target Order Badge */}
        <div style={{ marginBottom: 16 }}>
          <span className={styles.highlightItem} style={{ fontSize: '1rem', color: '#f87171' }}>
            #{orderCode}
          </span>
        </div>

        {/* Carrier Sync Notice if Order has Waybill */}
        {hasTracking ? (
          <div
            className={styles.warningBox}
            style={{
              backgroundColor: 'rgba(234, 88, 12, 0.12)',
              borderColor: 'rgba(234, 88, 12, 0.4)',
              color: '#fdba74',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontWeight: 700, color: '#fb923c' }}>
              <FiTruck /> Đồng bộ hủy vận đơn bên đối tác ({carrier || 'Viettel Post'}):
            </div>
            <div>
              Mã vận đơn: <strong style={{ color: '#ffffff' }}>{trackingCode}</strong>
            </div>
            <div style={{ fontSize: '0.75rem', marginTop: 4, opacity: 0.9 }}>
              Hệ thống sẽ đồng thời gửi lệnh hủy sang máy chủ <strong>{carrier || 'Viettel Post'}</strong> để bưu tá không đến lấy hàng.
            </div>
          </div>
        ) : (
          <p className={styles.message}>
            Bạn có chắc chắn muốn hủy đơn hàng này? Tồn kho của các sản phẩm trong đơn sẽ được tự động hoàn trả lại hệ thống.
          </p>
        )}

        {/* Cancellation Reason Input */}
        <div style={{ textAlign: 'left', marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: 6 }}>
            Lý do hủy đơn:
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do hủy đơn hàng..."
            disabled={isCancelling}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-color, #232838)',
              backgroundColor: 'var(--bg-main, #090a0f)',
              color: 'var(--text-main, #ffffff)',
              fontSize: '0.875rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isCancelling}
          >
            Đóng
          </button>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={() => onConfirm(reason)}
            disabled={isCancelling}
            style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
            }}
          >
            <FiXCircle /> {isCancelling ? 'Đang gửi lệnh hủy...' : 'Xác Nhận Hủy Đơn'}
          </button>
        </div>
      </div>
    </div>
  );
}
