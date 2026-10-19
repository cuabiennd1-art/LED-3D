'use client';

import React, { useState, useEffect } from 'react';
import { FiDownload } from 'react-icons/fi';
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
import { formatPrice, getProductCoverImage } from '@/lib/utils';
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
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportOrders = async () => {
    try {
      setIsExporting(true);
      toast.loading('Đang khởi tạo file Excel báo cáo...', { id: 'report-export' });
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

  if (loading && !report) return <AdminLoading text="Đang xử lý dữ liệu báo cáo..." />;

  const primaryColor = theme.buttonColors?.primaryBg || '#3b82f6';

  const lineLabels =
    report?.revenueByDate?.length > 0
      ? report.revenueByDate.map((r: any) => r.date)
      : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const lineValues =
    report?.revenueByDate?.length > 0
      ? report.revenueByDate.map((r: any) => r.revenue)
      : [0, 0, 0, 0, 0, 0, 0];

  const lineChartData = {
    labels: lineLabels,
    datasets: [
      {
        label: 'Doanh thu',
        data: lineValues,
        borderColor: primaryColor,
        backgroundColor: `${primaryColor}25`,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: primaryColor,
        pointBorderColor: '#ffffff',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const obs = report?.ordersByStatus || {};
  const statusDoughnut = {
    labels: ['Chờ duyệt', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'],
    datasets: [
      {
        data: [obs.pending || 0, obs.confirmed || 0, obs.shipping || 0, obs.delivered || 0, obs.cancelled || 0],
        backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Báo Cáo & Phân Tích Doanh Số</h1>
        <div className={styles.periodFilter}>
          {[
            { key: 'today', label: 'Hôm nay' },
            { key: '7days', label: '7 ngày' },
            { key: '30days', label: '30 ngày' },
            { key: 'thisMonth', label: 'Tháng này' },
          ].map((p) => (
            <button
              key={p.key}
              className={`${styles.periodBtn} ${period === p.key ? styles.activePeriod : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}

          <button
            type="button"
            className={styles.btnExport}
            onClick={handleExportOrders}
            disabled={isExporting}
            title="Xuất toàn bộ đơn hàng sang file Excel"
          >
            <FiDownload /> {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
        </div>
      </div>

      {/* 4 Metrics */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Tổng Doanh Thu</span>
          <span className={styles.statValue} style={{ color: primaryColor }}>
            {formatPrice(report?.totalRevenue || 0)}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Tổng Đơn Hàng</span>
          <span className={styles.statValue}>{report?.totalOrders || 0} đơn</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Khách Hàng Mới</span>
          <span className={styles.statValue}>{report?.newCustomers || 0} khách</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Giá Trị Trung Bình / Đơn (AOV)</span>
          <span className={styles.statValue}>{formatPrice(report?.averageOrderValue || 0)}</span>
        </div>
      </div>

      {/* Main Charts */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Tăng Trưởng Doanh Thu Theo Ngày</h3>
          <div className={styles.chartWrap}>
            <Line
              data={lineChartData}
              options={{
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `Doanh thu: ${formatPrice(ctx.parsed.y || 0)}`,
                    },
                  },
                },
                scales: {
                  x: { grid: { color: 'rgba(255,255,255,0.05)' } },
                  y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                      callback: (val: any) =>
                        val >= 1000000 ? `${val / 1000000}M` : val >= 1000 ? `${val / 1000}k` : `${val}₫`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Cơ Cấu Trạng Thái Đơn Hàng</h3>
          <div className={styles.chartWrap}>
            <Doughnut
              data={statusDoughnut}
              options={{
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: theme.textColors?.textSecondary || '#94a3b8' },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Top Sản Phẩm Bán Chạy Nhất</h3>
        <div className={styles.topList}>
          {!report?.topProducts || report.topProducts.length === 0 ? (
            <p style={{ color: '#9ca3af', padding: 12 }}>Chưa có dữ liệu sản phẩm bán ra</p>
          ) : (
            report.topProducts.map((p: any, idx: number) => (
              <div key={p._id} className={styles.topItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: idx === 0 ? '#f59e0b' : 'var(--admin-border, #2d3343)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <img
                    src={getProductCoverImage(p, '/file.svg')}
                    alt={p.name}
                    style={{ width: 42, height: 42, borderRadius: 6, objectFit: 'cover' }}
                  />
                  <div>
                    <h4 style={{ color: 'var(--admin-text, #fff)', fontSize: '0.875rem', margin: 0 }}>
                      {p.name}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      Đã bán: <strong>{p.soldCount || 0}</strong> sản phẩm
                    </span>
                  </div>
                </div>
                <strong style={{ color: primaryColor }}>{formatPrice(p.salePrice || p.price)}</strong>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
