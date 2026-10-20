'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  FiArrowLeft,
  FiPhone,
  FiMail,
  FiMapPin,
  FiAward,
  FiShoppingBag,
  FiDollarSign,
  FiCalendar,
  FiClock,
  FiEdit2,
  FiCopy,
  FiExternalLink,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatPrice, formatDate } from '@/lib/utils';
import Skeleton from '@/components/common/Skeleton';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [customer, setCustomer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/customers/${id}`);
        const data = await res.json();
        if (data.success && data.data) {
          setCustomer(data.data);
        } else {
          toast.error(data.message || 'Không tìm thấy khách hàng');
        }
      } catch (err) {
        toast.error('Lỗi kết nối máy chủ');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success(`Đã sao chép SĐT: ${phone}`);
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return { text: 'Đã giao', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'shipping':
        return { text: 'Đang giao', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
      case 'confirmed':
        return { text: 'Đã xác nhận', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' };
      case 'pending':
        return { text: 'Chờ xử lý', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'cancelled':
        return { text: 'Đã hủy', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
      default:
        return { text: status || 'Đơn hàng', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}>
          <Skeleton type="rect" count={3} />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <h2>Không tìm thấy hồ sơ khách hàng</h2>
          <Link href="/admin/customers" className={styles.backBtn}>
            <FiArrowLeft /> Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const isVip = (customer.totalSpent || 0) >= 2000000;
  const orderCount = customer.orders?.length || customer.orderCount || 0;
  const aov = orderCount > 0 ? Math.round((customer.totalSpent || 0) / orderCount) : 0;

  return (
    <div className={styles.page}>
      {/* Top Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/admin/customers" className={styles.backBtn} title="Quay lại">
            <FiArrowLeft size={18} />
          </Link>
          <div>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{customer.name}</h1>
              <span className={isVip ? styles.badgeVip : styles.badgeNormal}>
                {isVip ? '★ VIP Member' : 'Thành viên'}
              </span>
            </div>
            <div className={styles.subtitle}>
              Mã khách hàng: <code>{customer._id}</code> • Tham gia: {customer.createdAt ? formatDate(customer.createdAt) : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Left Profile Card + Right Orders History */}
      <div className={styles.contentGrid}>
        {/* Left Column: Customer Profile Info */}
        <div className={styles.leftCol}>
          <div className={styles.card}>
            <div className={styles.profileHeader}>
              <div className={styles.avatar}>
                {customer.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className={styles.profileName}>{customer.name}</div>
              <div className={styles.profileTier}>
                {isVip ? 'Khách hàng VIP thân thiết' : 'Khách hàng thành viên'}
              </div>
            </div>

            <div className={styles.contactList}>
              <div className={styles.contactItem}>
                <FiPhone className={styles.contactIcon} />
                <div className={styles.contactInfo}>
                  <span className={styles.contactLabel}>Số điện thoại</span>
                  <div className={styles.contactValRow}>
                    <a href={`tel:${customer.phone}`} className={styles.phoneLink}>
                      {customer.phone}
                    </a>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => handleCopyPhone(customer.phone)}
                      title="Sao chép"
                    >
                      <FiCopy size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {customer.email && (
                <div className={styles.contactItem}>
                  <FiMail className={styles.contactIcon} />
                  <div className={styles.contactInfo}>
                    <span className={styles.contactLabel}>Email</span>
                    <a href={`mailto:${customer.email}`} className={styles.emailLink}>
                      {customer.email}
                    </a>
                  </div>
                </div>
              )}

              {customer.address && (
                <div className={styles.contactItem}>
                  <FiMapPin className={styles.contactIcon} />
                  <div className={styles.contactInfo}>
                    <span className={styles.contactLabel}>Địa chỉ giao hàng</span>
                    <span className={styles.addressText}>{customer.address}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CRM Lifetime Metrics */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Chỉ Số Chi Tiêu (CRM)</h3>
            <div className={styles.metricsGrid}>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Tổng Chi Tiêu</span>
                <strong className={styles.metricVal} style={{ color: 'var(--primary, #3b82f6)' }}>
                  {formatPrice(customer.totalSpent || 0)}
                </strong>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Số Đơn Hàng</span>
                <strong className={styles.metricVal}>{orderCount} đơn</strong>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>TB Đơn (AOV)</span>
                <strong className={styles.metricVal} style={{ color: '#10b981' }}>
                  {formatPrice(aov)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order History */}
        <div className={styles.rightCol}>
          <div className={styles.card}>
            <div className={styles.cardHeaderFlex}>
              <div className={styles.cardTitleWithIcon}>
                <FiShoppingBag size={18} />
                <span>Lịch Sử Mua Hàng ({customer.orders?.length || 0})</span>
              </div>
            </div>

            {!customer.orders || customer.orders.length === 0 ? (
              <div className={styles.emptyOrders}>
                Khách hàng chưa có đơn hàng nào trong hệ thống.
              </div>
            ) : (
              <div className={styles.ordersTableWrap}>
                <table className={styles.ordersTable}>
                  <thead>
                    <tr>
                      <th>Mã đơn hàng</th>
                      <th>Ngày đặt</th>
                      <th>Sản phẩm</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.orders.map((ord: any) => {
                      const badge = getOrderStatusBadge(ord.orderStatus || ord.status);
                      return (
                        <tr key={ord._id}>
                          <td>
                            <strong className={styles.orderCode}>
                              #{ord.orderCode || ord._id.slice(-6).toUpperCase()}
                            </strong>
                          </td>
                          <td className={styles.orderDate}>
                            {ord.createdAt ? formatDate(ord.createdAt) : '-'}
                          </td>
                          <td>
                            <span className={styles.orderItemsCount}>
                              {ord.items?.length || 1} món
                            </span>
                          </td>
                          <td>
                            <span
                              className={styles.statusPill}
                              style={{ color: badge.color, backgroundColor: badge.bg }}
                            >
                              {badge.text}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <strong className={styles.orderTotal}>
                              {formatPrice(ord.totalAmount || ord.total || 0)}
                            </strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
