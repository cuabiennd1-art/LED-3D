'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FiDollarSign,
  FiShoppingCart,
  FiUsers,
  FiPercent,
  FiTrendingUp,
  FiArrowRight,
  FiPackage,
} from 'react-icons/fi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { formatPrice, formatDate, getProductCoverImage } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import Skeleton from '@/components/common/Skeleton';
import LazyImage from '@/components/common/LazyImage';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const { theme } = useTheme();
  const [period, setPeriod] = useState('7days');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const periods = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'yesterday', label: 'Hôm qua' },
    { key: '7days', label: '7 ngày qua' },
    { key: '30days', label: '30 ngày qua' },
    { key: 'thisMonth', label: 'Tháng này' },
  ];

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/reports?period=${period}`);
      const data = await res.json();
      if (data.success && data.data) {
        setReportData(data.data);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period]);

  const primaryColor = theme.buttonColors?.primaryBg || '#3b82f6';
  const textColor = theme.textColors?.textPrimary || (theme.mode === 'light' ? '#0f172a' : '#f8fafc');
  const textMutedColor = theme.textColors?.textMuted || (theme.mode === 'light' ? '#64748b' : '#94a3b8');
  const borderColor = theme.componentColors?.borderColor || (theme.mode === 'light' ? '#e2e8f0' : '#232838');
  const cardBgColor = theme.componentColors?.cardBackground || (theme.mode === 'light' ? '#ffffff' : '#13161f');
  const gridLineColor = theme.mode === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)';

  // Line Chart Data for revenueByDate
  const lineLabels =
    reportData?.revenueByDate?.length > 0
      ? reportData.revenueByDate.map((r: any) => r.date)
      : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const lineValues =
    reportData?.revenueByDate?.length > 0
      ? reportData.revenueByDate.map((r: any) => r.revenue)
      : [0, 0, 0, 0, 0, 0, 0];

  const lineChartData = {
    labels: lineLabels,
    datasets: [
      {
        label: 'Doanh thu (₫)',
        data: lineValues,
        borderColor: primaryColor,
        backgroundColor: `${primaryColor}20`,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: primaryColor,
        pointBorderColor: '#ffffff',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  // Doughnut Data for ordersByStatus
  const obs = reportData?.ordersByStatus || {
    pending: 0,
    confirmed: 0,
    shipping: 0,
    delivered: 0,
    cancelled: 0,
  };

  const doughnutData = {
    labels: ['Chờ duyệt', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'],
    datasets: [
      {
        data: [
          obs.pending || 0,
          obs.confirmed || 0,
          obs.shipping || 0,
          obs.delivered || 0,
          obs.cancelled || 0,
        ],
        backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>Tổng Quan Báo Cáo Kinh Doanh</h1>
          <p className={styles.pageSubtitle}>
            Theo dõi thời gian thực doanh thu, tốc độ tăng trưởng và hiệu suất bán hàng
          </p>
        </div>

        {/* Period Selector */}
        <div className={styles.periodGroup}>
          {periods.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`${styles.periodBtn} ${period === p.key ? styles.activePeriod : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 KPI Stats Cards */}
      {loading && !reportData ? (
        <div className={styles.statsGrid}>
          <Skeleton type="rect" height={100} />
          <Skeleton type="rect" height={100} />
          <Skeleton type="rect" height={100} />
          <Skeleton type="rect" height={100} />
        </div>
      ) : (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: `${primaryColor}20`, color: primaryColor }}>
              <FiDollarSign />
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Tổng doanh thu</p>
              <h3 className={styles.statValue}>{formatPrice(reportData?.totalRevenue || 0)}</h3>
              <span className={`${styles.trend} ${styles.trendUp}`}>
                <FiTrendingUp /> Doanh thu thực nhận
              </span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <FiShoppingCart />
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Tổng số đơn hàng</p>
              <h3 className={styles.statValue}>{reportData?.totalOrders || 0}</h3>
              <span className={`${styles.trend} ${styles.trendUp}`}>
                <FiTrendingUp /> Toàn bộ trạng thái
              </span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
              <FiUsers />
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Khách hàng mới</p>
              <h3 className={styles.statValue}>{reportData?.newCustomers || 0}</h3>
              <span className={`${styles.trend} ${styles.trendUp}`}>
                <FiUsers /> Khách đăng ký mới
              </span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <FiPercent />
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Giá trị đơn trung bình (AOV)</p>
              <h3 className={styles.statValue}>{formatPrice(reportData?.averageOrderValue || 0)}</h3>
              <span className={`${styles.trend} ${styles.trendUp}`}>
                <FiTrendingUp /> AOV trung bình
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className={styles.chartsGrid}>
        {/* Line Chart */}
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <h3 style={{ color: 'var(--text-main)' }}>Biểu đồ tăng trưởng doanh thu theo ngày</h3>
          </div>
          <div className={styles.chartContainer}>
            <Line
              data={lineChartData}
              options={{
                maintainAspectRatio: false,
                responsive: true,
                interaction: {
                  mode: 'index',
                  intersect: false,
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: cardBgColor,
                    titleColor: textColor,
                    bodyColor: textMutedColor,
                    borderColor: borderColor,
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                      label: (ctx) => `Doanh thu: ${formatPrice(ctx.parsed.y || 0)}`,
                    },
                  },
                },
                scales: {
                  x: {
                    grid: { color: gridLineColor },
                    ticks: {
                      color: textMutedColor,
                      font: { size: 11 },
                      maxTicksLimit: 7,
                      autoSkip: true,
                      maxRotation: 0,
                    },
                  },
                  y: {
                    beginAtZero: true,
                    grid: { color: gridLineColor },
                    ticks: {
                      color: textMutedColor,
                      font: { size: 11 },
                      callback: (val: any) => (val >= 1000000 ? `${val / 1000000}M` : val >= 1000 ? `${val / 1000}k` : val),
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Doughnut Chart */}
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <h3 style={{ color: 'var(--text-main)' }}>Phân bố trạng thái đơn hàng</h3>
          </div>
          <div className={styles.chartContainer}>
            <Doughnut
              data={doughnutData}
              options={{
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: textColor,
                      padding: 12,
                      font: { size: 11, weight: 600 },
                      boxWidth: 10,
                      boxHeight: 10,
                    },
                  },
                  tooltip: {
                    backgroundColor: cardBgColor,
                    titleColor: textColor,
                    bodyColor: textMutedColor,
                    borderColor: borderColor,
                    borderWidth: 1,
                    padding: 10,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Tables Row: Recent Orders & Top 5 Selling Products */}
      <div className={styles.tablesGrid}>
        {/* Recent Orders */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Đơn hàng mới nhất</h3>
            <Link href="/admin/orders" className={styles.link}>
              Xem tất cả <FiArrowRight style={{ verticalAlign: 'middle' }} />
            </Link>
          </div>

          {/* Desktop Table View */}
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {!reportData?.recentOrders || reportData.recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', padding: 30 }}>
                      Chưa có đơn hàng nào trong khoảng thời gian này
                    </td>
                  </tr>
                ) : (
                  reportData.recentOrders.map((order: any) => (
                    <tr key={order._id}>
                      <td>
                        <Link href={`/admin/orders/${order._id}`} style={{ color: 'var(--primary, #3b82f6)', fontWeight: 700 }}>
                          #{order.orderCode}
                        </Link>
                      </td>
                      <td>{order.customer?.name || 'Khách vãng lai'}</td>
                      <td style={{ color: 'var(--primary, #3b82f6)', fontWeight: 700 }}>
                        {formatPrice(order.totalAmount)}
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            order.status === 'delivered'
                              ? styles.badgeDelivered
                              : order.status === 'cancelled'
                              ? styles.badgeCancelled
                              : order.status === 'shipping'
                              ? styles.badgeShipping
                              : order.status === 'confirmed'
                              ? styles.badgeConfirmed
                              : styles.badgePending
                          }`}
                        >
                          {order.status === 'delivered'
                            ? 'Đã giao'
                            : order.status === 'shipping'
                            ? 'Đang giao'
                            : order.status === 'confirmed'
                            ? 'Đã duyệt'
                            : order.status === 'cancelled'
                            ? 'Đã hủy'
                            : 'Chờ duyệt'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.8125rem' }}>
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Order Cards View (shown on screen <= 640px) */}
          <div className={styles.mobileOrderList}>
            {!reportData?.recentOrders || reportData.recentOrders.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', padding: '20px 0' }}>
                Chưa có đơn hàng nào trong khoảng thời gian này
              </p>
            ) : (
              reportData.recentOrders.map((order: any) => (
                <div key={order._id} className={styles.mobileOrderCard}>
                  <div className={styles.mobileOrderTop}>
                    <Link href={`/admin/orders/${order._id}`} className={styles.mobileOrderCode}>
                      #{order.orderCode}
                    </Link>
                    <span
                      className={`${styles.badge} ${
                        order.status === 'delivered'
                          ? styles.badgeDelivered
                          : order.status === 'cancelled'
                          ? styles.badgeCancelled
                          : order.status === 'shipping'
                          ? styles.badgeShipping
                          : order.status === 'confirmed'
                          ? styles.badgeConfirmed
                          : styles.badgePending
                      }`}
                    >
                      {order.status === 'delivered'
                        ? 'Đã giao'
                        : order.status === 'shipping'
                        ? 'Đang giao'
                        : order.status === 'confirmed'
                        ? 'Đã duyệt'
                        : order.status === 'cancelled'
                        ? 'Đã hủy'
                        : 'Chờ duyệt'}
                    </span>
                  </div>
                  <div className={styles.mobileOrderMid}>
                    <span className={styles.mobileCustomerName}>
                      {order.customer?.name || 'Khách vãng lai'}
                    </span>
                    <span className={styles.mobileOrderTime}>
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <div className={styles.mobileOrderBottom}>
                    <span className={styles.mobileOrderLabel}>Tổng tiền:</span>
                    <span className={styles.mobileOrderPrice}>
                      {formatPrice(order.totalAmount)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top 5 Products */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Top sản phẩm bán chạy</h3>
            <Link href="/admin/products" className={styles.link}>
              Kho hàng <FiArrowRight style={{ verticalAlign: 'middle' }} />
            </Link>
          </div>
          <div className={styles.productList}>
            {!reportData?.topProducts || reportData.topProducts.length === 0 ? (
              <p style={{ color: 'var(--text-muted, #94a3b8)', textAlign: 'center', margin: '20px 0' }}>
                Chưa có sản phẩm nào có lượt mua
              </p>
            ) : (
              reportData.topProducts.map((p: any, idx: number) => (
                <div key={p._id} className={styles.productItem}>
                  <div className={styles.productImgBox}>
                    <LazyImage
                      src={getProductCoverImage(p, '/file.svg')}
                      alt={p.name}
                      aspectRatio="1 / 1"
                      style={{ width: '100%', height: '100%', borderRadius: 6, objectFit: 'cover' }}
                    />
                  </div>
                  <div className={styles.productInfo}>
                    <h4 title={p.name}>{p.name}</h4>
                    <p>Đã bán: <strong style={{ color: 'var(--text-main, #fff)' }}>{p.soldCount || 0}</strong> chiếc</p>
                  </div>
                  <div className={styles.productRevenue}>
                    {formatPrice(p.salePrice || p.price)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
