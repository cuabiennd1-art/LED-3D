'use client';

import React from 'react';
import { FiCheckCircle, FiDollarSign } from 'react-icons/fi';
import { formatPrice } from '@/lib/utils';
import styles from './DeleteConfirmModal.module.css';

interface DeliverConfirmModalProps {
  isOpen: boolean;
  orderCode: string;
  isCod?: boolean;
  totalAmount?: number;
  isConfirming?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeliverConfirmModal({
  isOpen,
  orderCode,
  isCod = false,
  totalAmount = 0,
  isConfirming = false,
  onConfirm,
  onClose,
}: DeliverConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Success Icon */}
        <div
          className={styles.iconWrapper}
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderColor: 'rgba(16, 185, 129, 0.35)',
            color: '#10b981',
          }}
        >
          <FiCheckCircle />
        </div>

        {/* Title */}
        <h3 className={styles.title}>Xác Nhận Giao Hàng Thành Công</h3>

        {/* Target Order Badge */}
        <div style={{ marginBottom: 16 }}>
          <span className={styles.highlightItem} style={{ fontSize: '1rem', color: '#10b981' }}>
            #{orderCode}
          </span>
        </div>

        <p className={styles.message}>
          Bạn có chắc chắn đơn hàng <strong>#{orderCode}</strong> đã được giao thành công tới tay khách hàng?
        </p>

        {isCod && (
          <div
            className={styles.warningBox}
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderColor: 'rgba(16, 185, 129, 0.3)',
              color: '#6ee7b7',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700, marginBottom: 2 }}>
              <FiDollarSign /> Thu tiền mặt COD: {formatPrice(totalAmount)}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
              Trạng thái thanh toán của đơn hàng sẽ tự động chuyển thành <strong>Đã thanh toán</strong>.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isConfirming}
          >
            Đóng
          </button>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={onConfirm}
            disabled={isConfirming}
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
            }}
          >
            <FiCheckCircle /> {isConfirming ? 'Đang cập nhật...' : 'Xác Nhận Đã Giao'}
          </button>
        </div>
      </div>
    </div>
  );
}
