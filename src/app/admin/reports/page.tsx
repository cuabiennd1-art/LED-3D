'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FiDownload,
  FiTrendingUp,
  FiDollarSign,
  FiShoppingBag,
  FiUsers,
  FiAward,
  FiCalendar,
  FiClock,
  FiArrowUpRight,
  FiBarChart2,
  FiPieChart,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
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
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { formatPrice, formatDate, getProductCoverImage } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import AdminLoading from '@/components/admin/AdminLoading';
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

export default function ReportsPage() {
  const { theme } = useTheme();
  const [period, setPeriod] = useState('7days');
  const [chartMode, setChartMode] = useState<'revenue' | 'orders'>('revenue');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportOrders = async () => {
    try {
      setIsExporting(true);
      toast.loading('Đang xuất file Excel báo cáo...', { id: 'report-export' });
      const res = await apiFetch('/api/orders/export?status=all');
      if (!res.ok) throw new Error('Lỗi tải dữ liệu');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const disposition = res.headers.get('content-disposition');
      let filename = 'Bao_cao_don_hang_ShopBig.csv';
      if (disposition && disposition.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/"/g, '').trim();
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Đã tải xuống file Excel báo cáo đơn hàng!', { id: 'report-export' });
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xuất file Excel', { id: 'report-export' });
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/reports?period=${period}`);
        const data = await res.json();
        if (data.success && data.data) {
          setReport(data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [period]);

  const primaryColor = theme.buttonColors?.primaryBg || '#3b82f6';

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return { text: 'Đã giao', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'shipping':
        return { text: 'Đang giao', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
      case 'confirmed':
        return { text: 'Đã duyệt', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' };
      case 'pending':
        return { text: 'Chờ duyệt', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'cancelled':
        return { text: 'Đã hủy', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
      default:
        return { text: status || 'Đơn hàng', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
    }
  };

  if (loading && !report) return <AdminLoading text="Đang xử lý dữ liệu báo cáo..." />;

  // Chart Labels & Datasets
  const lineLabels =
    report?.revenueByDate?.length > 0
      ? report.revenueByDate.map((r: any) => r.date)
      : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const lineRevenueValues =
    report?.revenueByDate?.length > 0
      ? report.revenueByDate.map((r: any) => r.revenue)
      : [0, 0, 0, 0, 0, 0, 0];

  const lineOrderValues =
    report?.revenueByDate?.length > 0
      ? report.revenueByDate.map((r: any) => r.orders || 0)
      : [0, 0, 0, 0, 0, 0, 0];

  const growthChartData = {
    labels: lineLabels,
    datasets:
      chartMode === 'revenue'
        ? [
            {
              label: 'Doanh thu',
              data: lineRevenueValues,
              borderColor: primaryColor,
              backgroundColor: `${primaryColor}20`,
              fill: true,
              tension: 0.35,
              pointBackgroundColor: primaryColor,
              pointBorderColor: '#ffffff',
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ]
        : [
            {
              label: 'Số đơn hàng',
              data: lineOrderValues,
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.25)',
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#8b5cf6',
              pointBorderColor: '#ffffff',
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ],
  };

  const obs = report?.ordersByStatus || {};
  const statusDoughnut = {
    labels: ['Chờ duyệt', 'Đã duyệt', 'Đang giao', 'Đã giao', 'Đã hủy'],
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

  const periodOptions = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'yesterday', label: 'Hôm qua' },
    { key: '7days', label: '7 ngày' },
    { key: '30days', label: '30 ngày' },
    { key: 'thisMonth', label: 'Tháng này' },
  ];

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Báo Cáo & Phân Tích Doanh Số</h1>
          <p className={styles.subtitle}>
            Theo dõi doanh thu, tốc độ tăng trưởng và hiệu suất bán lẻ
          </p>
        </div>

        {/* Filter & Action Toolbar */}
        <div className={styles.headerActions}>
          <div className={styles.periodFilter}>
            {periodOptions.map((p) => (
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

          <button
            type="button"
            className={styles.btnExport}
            onClick={handleExportOrders}
            disabled={isExporting}
            title="Xuất dữ liệu đơn hàng sang file Excel"
          >
            <FiDownload size={14} />
            <span>{isExporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
          </button>
        </div>
      </div>

      {/* 4 Glanceable KPI Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Tổng Doanh Thu</span>
            <div className={styles.statIcon} style={{ color: primaryColor, background: `${primaryColor}18` }}>
              <FiDollarSign />
            </div>
          </div>
          <span className={styles.statValue} style={{ color: primaryColor }}>
            {formatPrice(report?.totalRevenue || 0)}
          </span>
          <span className={styles.statHint}>Doanh thu trong kỳ đã chọn</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Tổng Đơn Hàng</span>
            <div className={styles.statIcon} style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.15)' }}>
              <FiShoppingBag />
            </div>
          </div>
          <span className={styles.statValue}>{report?.totalOrders || 0} đơn</span>
          <span className={styles.statHint}>Số đơn phát sinh</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Khách Hàng Mới</span>
            <div className={styles.statIcon} style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)' }}>
              <FiUsers />
            </div>
          </div>
          <span className={styles.statValue}>{report?.newCustomers || 0} khách</span>
          <span className={styles.statHint}>Khách tạo tài khoản / mua lần đầu</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Giá Trị TB / Đơn (AOV)</span>
            <div className={styles.statIcon} style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.15)' }}>
              <FiTrendingUp />
            </div>
          </div>
          <span className={styles.statValue} style={{ color: '#10b981' }}>
            {formatPrice(report?.averageOrderValue || 0)}
          </span>
          <span className={styles.statHint}>Trung bình mỗi đơn hàng</span>
        </div>
      </div>

      {/* Main Charts: Growth Line/Bar + Status Doughnut */}
      <div className={styles.chartsGrid}>
        {/* Growth Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartTitleWrap}>
              <FiBarChart2 className={styles.chartTitleIcon} size={18} />
              <h3 className={styles.chartTitle}>Biểu Đồ Tăng Trưởng</h3>
            </div>

            {/* Mode Switcher: Revenue vs Orders */}
            <div className={styles.chartModeSwitcher}>
              <button
                type="button"
                className={`${styles.modeBtn} ${chartMode === 'revenue' ? styles.modeBtnActive : ''}`}
                onClick={() => setChartMode('revenue')}
              >
                Doanh thu
              </button>
              <button
                type="button"
                className={`${styles.modeBtn} ${chartMode === 'orders' ? styles.modeBtnActive : ''}`}
                onClick={() => setChartMode('orders')}
              >
                Số lượng đơn
              </button>
            </div>
          </div>

          <div className={styles.chartWrap}>
            <Line
              data={growthChartData}
              options={{
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) =>
                        chartMode === 'revenue'
                          ? ` Doanh thu: ${formatPrice(ctx.parsed.y || 0)}`
                          : ` Số đơn: ${ctx.parsed.y || 0} đơn`,
                    },
                  },
                },
                scales: {
                  x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                      color: '#94a3b8',
                      font: { size: 11 },
                      maxRotation: 0,
                      autoSkip: true,
                      maxTicksLimit: 12,
                    },
                  },
                  y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                      color: '#94a3b8',
                      font: { size: 11 },
                      callback: (val: any) =>
                        chartMode === 'revenue'
                          ? val >= 1000000
                            ? `${val / 1000000}M`
                            : val >= 1000
                            ? `${val / 1000}k`
                            : `${val}₫`
                          : `${val}`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Status Distribution Donut */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartTitleWrap}>
              <FiPieChart className={styles.chartTitleIcon} size={18} />
              <h3 className={styles.chartTitle}>Cơ Cấu Đơn Hàng</h3>
            </div>
          </div>

          <div className={styles.doughnutWrap}>
            <Doughnut
              data={statusDoughnut}
              options={{
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: theme.textColors?.textSecondary || '#94a3b8',
                      boxWidth: 10,
                      boxHeight: 10,
                      font: { size: 11 },
                      padding: 10,
                    },
                  },
                },
              }}
            />
          </div>

          {/* Status Breakdown Pills */}
          <div className={styles.statusBreakdown}>
            <div className={styles.statusMiniPill} style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}>
              <span className={styles.statusDot} style={{ background: '#f59e0b' }} />
              <span>Chờ duyệt: <strong>{obs.pending || 0}</strong></span>
            </div>
            <div className={styles.statusMiniPill} style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}>
              <span className={styles.statusDot} style={{ background: '#3b82f6' }} />
              <span>Đã duyệt: <strong>{obs.confirmed || 0}</strong></span>
            </div>
            <div className={styles.statusMiniPill} style={{ borderColor: 'rgba(139, 92, 246, 0.3)' }}>
              <span className={styles.statusDot} style={{ background: '#8b5cf6' }} />
              <span>Đang giao: <strong>{obs.shipping || 0}</strong></span>
            </div>
            <div className={styles.statusMiniPill} style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <span className={styles.statusDot} style={{ background: '#10b981' }} />
              <span>Đã giao: <strong>{obs.delivered || 0}</strong></span>
            </div>
            <div className={styles.statusMiniPill} style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <span className={styles.statusDot} style={{ background: '#ef4444' }} />
              <span>Đã hủy: <strong>{obs.cancelled || 0}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Top Products & Recent Orders */}
      <div className={styles.lowerGrid}>
        {/* Top Best-Selling Products */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartTitleWrap}>
              <FiAward className={styles.chartTitleIcon} size={18} style={{ color: '#f59e0b' }} />
              <h3 className={styles.chartTitle}>Top Sản Phẩm Bán Chạy Nhất</h3>
            </div>
          </div>

          <div className={styles.topList}>
            {!report?.topProducts || report.topProducts.length === 0 ? (
              <p className={styles.emptyText}>Chưa có dữ liệu sản phẩm bán ra trong kỳ này</p>
            ) : (
              report.topProducts.map((p: any, idx: number) => {
                const isGold = idx === 0;
                const isSilver = idx === 1;
                const isBronze = idx === 2;
                return (
                  <div key={p._id || idx} className={styles.topItem}>
                    <div className={styles.topItemLeft}>
                      <span
                        className={`${styles.rankBadge} ${
                          isGold
                            ? styles.rankGold
                            : isSilver
                            ? styles.rankSilver
                            : isBronze
                            ? styles.rankBronze
                            : styles.rankNormal
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <img
                        src={getProductCoverImage(p, '/file.svg')}
                        alt={p.name}
                        className={styles.productThumb}
                      />
                      <div className={styles.productMeta}>
                        <h4 className={styles.productName} title={p.name}>
                          {p.name}
                        </h4>
                        <span className={styles.productSold}>
                          Đã bán: <strong>{p.soldCount || 0}</strong> sản phẩm
                        </span>
                      </div>
                    </div>
                    <div className={styles.productPriceWrap}>
                      <strong className={styles.productPrice}>
                        {formatPrice(p.salePrice || p.price)}
                      </strong>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Orders List */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartTitleWrap}>
              <FiClock className={styles.chartTitleIcon} size={18} style={{ color: '#3b82f6' }} />
              <h3 className={styles.chartTitle}>Đơn Hàng Gần Đây</h3>
            </div>
            <Link href="/admin/orders" className={styles.viewAllLink}>
              <span>Xem tất cả</span>
              <FiArrowUpRight size={13} />
            </Link>
          </div>

          {!report?.recentOrders || report.recentOrders.length === 0 ? (
            <p className={styles.emptyText}>Chưa có đơn hàng nào phát sinh gần đây</p>
          ) : (
            <div className={styles.recentOrdersList}>
              {report.recentOrders.map((ord: any) => {
                const badge = getOrderStatusBadge(ord.status);
                return (
                  <div key={ord._id} className={styles.recentOrderItem}>
                    <div className={styles.recentOrderLeft}>
                      <div className={styles.recentOrderTop}>
                        <strong className={styles.recentOrderCode}>
                          #{ord.orderCode || ord._id?.slice(-6).toUpperCase()}
                        </strong>
                        <span className={styles.recentOrderDate}>
                          {ord.createdAt ? formatDate(ord.createdAt) : ''}
                        </span>
                      </div>
                      <div className={styles.recentCustomerName}>
                        {ord.customer?.name || ord.customer?.phone || 'Khách vãng lai'}
                      </div>
                    </div>

                    <div className={styles.recentOrderRight}>
                      <span
                        className={styles.orderStatusBadge}
                        style={{ color: badge.color, backgroundColor: badge.bg }}
                      >
                        {badge.text}
                      </span>
                      <strong className={styles.recentOrderAmount}>
                        {formatPrice(ord.totalAmount || 0)}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
