'use client';

import React, { useState, useEffect } from 'react';
import {
  FiTruck,
  FiSave,
  FiCheckCircle,
  FiDollarSign,
  FiZap,
  FiSend,
  FiActivity,
  FiKey,
  FiLayers,
  FiSettings,
  FiEye,
  FiEyeOff,
  FiX,
  FiHome,
  FiMapPin,
  FiPhone,
  FiUser,
  FiPackage,
  FiExternalLink,
  FiCopy,
  FiRefreshCw,
  FiAlertCircle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatPrice } from '@/lib/utils';
import { vietnamProvinces } from '@/lib/vietnamLocations';
import Skeleton from '@/components/common/Skeleton';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

export default function ShippingAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // Modal State for Carrier Token & Shop ID Configuration
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [activeModalCarrier, setActiveModalCarrier] = useState<'ghn' | 'ghtk' | 'viettelpost'>('ghn');
  const [showTokens, setShowTokens] = useState({
    ghn: false,
    ghtk: false,
    viettelpost: false,
  });

  // Helper to format number with thousand dots separator (VD: 100.000)
  const formatWithDots = (val: string | number) => {
    if (val === '' || val === undefined || val === null) return '';
    const digits = val.toString().replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('vi-VN');
  };

  const parseFromDots = (val: string | number) => {
    if (typeof val === 'number') return val;
    const digits = (val || '').toString().replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  };

  // Full Shipping Config State (API 8.3)
  const [config, setConfig] = useState({
    originAddress: {
      name: 'ShopBig Store - Kho Tổng',
      phone: '0364978796',
      province: 'Hà Nội',
      district: 'Quận Nam Từ Liêm',
      ward: 'Phường Mỹ Đình 2',
      address: 'Số 10 Phạm Hùng, Mỹ Đình',
      pickNote: 'Lấy hàng trong giờ hành chính, gọi trước khi đến',
    },
    carriers: {
      ghn: {
        enabled: true,
        token: '',
        shopId: '',
        environment: 'production',
      },
      ghtk: {
        enabled: true,
        token: '',
        partnerId: '',
        environment: 'production',
      },
      viettelpost: {
        enabled: true,
        token: '',
        username: '',
        password: '',
        environment: 'production',
      },
    },
    rates: {
      defaultInnerFee: 22000,
      defaultOuterFee: 32000,
      freeShippingThreshold: 500000,
      autoPushOrder: true,
    },
  });

  // Calculator State (API 8.1)
  const [calcData, setCalcData] = useState({
    province: 'Hà Nội',
    district: 'Quận Cầu Giấy',
    weight: 500,
    orderValue: 450000,
  });
  const [calcResults, setCalcResults] = useState<any | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Dynamic Wards State for Origin Warehouse
  const [warehouseWards, setWarehouseWards] = useState<string[]>([]);
  const [loadingWarehouseWards, setLoadingWarehouseWards] = useState(false);

  // 3rd-Party Webhook Simulator State
  const [webhookSim, setWebhookSim] = useState({
    carrier: 'ghn',
    orderCode: 'ST949668',
    status: 'delivering',
    location: 'Bưu cục Châu Đốc - An Giang',
    description: 'Shipper đang trên đường phát hàng tận nơi đến bạn',
    shipperName: 'Nguyễn Văn Phát',
    shipperPhone: '0988.777.666',
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any | null>(null);

  // Viettel Post Live Test Push State
  const [testPushTab, setTestPushTab] = useState<'mock' | 'order'>('mock');
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [testCancelLoading, setTestCancelLoading] = useState(false);
  const [testPushResult, setTestPushResult] = useState<any | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [vtpInfo, setVtpInfo] = useState<{
    connected: boolean;
    username?: string;
    inventories?: any[];
    pendingOrders?: any[];
  } | null>(null);

  const [mockOrderForm, setMockOrderForm] = useState({
    name: 'Nguyễn Văn Kiểm Thử',
    phone: '0988776655',
    address: 'Số 10 Dịch Vọng Hậu',
    province: 'Hà Nội',
    district: 'Quận Cầu Giấy',
    ward: 'Phường Dịch Vọng Hậu',
    productName: 'Áo Polo Nam Kiểm Thử VTP',
    totalAmount: 150000,
    codAmount: 150000,
    weight: 500,
    paymentMethod: 'cod',
    orderService: 'STK',
    autoCancel: true,
  });

  const [recipientWards, setRecipientWards] = useState<string[]>([]);
  const [loadingRecipientWards, setLoadingRecipientWards] = useState(false);
  const [selectedPendingOrderId, setSelectedPendingOrderId] = useState<string>('');

  const loadVtpInfo = async () => {
    try {
      const res = await apiFetch('/api/shipping/test-push');
      const data = await res.json();
      if (data.success) {
        setVtpInfo(data);
        if (data.pendingOrders?.length > 0 && !selectedPendingOrderId) {
          setSelectedPendingOrderId(data.pendingOrders[0]._id);
        }
      }
    } catch (e) {
      console.warn('Error loading VTP info:', e);
    }
  };

  // Load Shipping Config (API 8.3 GET)
  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/shipping/config');
      const data = await res.json();
      if (data.success && data.data) {
        setConfig(data.data);
      }
    } catch (e) {
      toast.error('Lỗi tải cấu hình vận chuyển');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadVtpInfo();
  }, []);

  // Fetch wards for test recipient whenever province or district changes
  useEffect(() => {
    const dist = mockOrderForm.district;
    const prov = mockOrderForm.province;
    if (!dist) {
      setRecipientWards([]);
      return;
    }
    let isMounted = true;
    setLoadingRecipientWards(true);
    fetch(`/api/locations/wards?district=${encodeURIComponent(dist)}&province=${encodeURIComponent(prov || '')}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.wards)) {
          setRecipientWards(data.wards);
        }
      })
      .catch((e) => console.error('Failed to load recipient wards:', e))
      .finally(() => {
        if (isMounted) setLoadingRecipientWards(false);
      });
    return () => {
      isMounted = false;
    };
  }, [mockOrderForm.province, mockOrderForm.district]);

  // Auto-fetch wards whenever warehouse district or province changes
  useEffect(() => {
    const dist = config.originAddress?.district;
    const prov = config.originAddress?.province;
    if (!dist) {
      setWarehouseWards([]);
      return;
    }

    let isMounted = true;
    setLoadingWarehouseWards(true);

    fetch(
      `/api/locations/wards?district=${encodeURIComponent(dist)}&province=${encodeURIComponent(prov || '')}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.wards)) {
          setWarehouseWards(data.wards);
          // If current ward not in list and wards exist, auto set first one or keep if already filled
          if (data.wards.length > 0 && !config.originAddress?.ward) {
            setConfig((prev) => ({
              ...prev,
              originAddress: {
                ...prev.originAddress,
                ward: data.wards[0],
              },
            }));
          }
        }
      })
      .catch((e) => console.error('Failed to load warehouse wards:', e))
      .finally(() => {
        if (isMounted) setLoadingWarehouseWards(false);
      });

    return () => {
      isMounted = false;
    };
  }, [config.originAddress?.province, config.originAddress?.district]);

  // Save Shipping Config (API 8.3 POST)
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/shipping/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Cập nhật cấu hình vận chuyển thành công!');
        if (data.data) setConfig(data.data);
      } else {
        toast.error(data.message || 'Lỗi lưu cấu hình');
      }
    } catch (e) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  // Test Carrier Connection (API 8.3 TEST)
  const handleTestConnection = async (provider: string, tokenOverride?: string) => {
    setTestingProvider(provider);
    try {
      let payload: any = { provider };

      if (provider === 'ghn') {
        payload = {
          provider: 'ghn',
          token: tokenOverride || config.carriers.ghn.token,
          shopId: config.carriers.ghn.shopId,
          environment: config.carriers.ghn.environment,
        };
      } else if (provider === 'ghtk') {
        payload = {
          provider: 'ghtk',
          token: tokenOverride || config.carriers.ghtk.token,
        };
      } else if (provider === 'viettelpost') {
        payload = {
          provider: 'viettelpost',
          token: tokenOverride || config.carriers.viettelpost.token,
        };
      }

      const res = await apiFetch('/api/shipping/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        if (data.warning) {
          toast(data.message, { icon: '⚠️', duration: 6000 });
        } else {
          toast.success(data.message || `Kết nối tới ${provider.toUpperCase()} thành công!`, { duration: 6000 });
        }
      } else {
        toast.error(data.message || 'Lỗi kiểm tra kết nối', { duration: 6000 });
      }
    } catch (e) {
      toast.error('Lỗi kiểm tra kết nối API');
    } finally {
      setTestingProvider(null);
    }
  };

  // Push Mock Order to Viettel Post
  const handlePushMockOrder = async () => {
    setTestPushLoading(true);
    setTestPushResult(null);
    try {
      const res = await apiFetch('/api/shipping/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'push_mock',
          mockData: mockOrderForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestPushResult(data.data);
        toast.success(
          data.message || `Đẩy đơn thành công! Mã vận đơn: ${data.data?.trackingCode}`,
          { duration: 6000 }
        );
      } else {
        toast.error(data.message || 'Lỗi khi đẩy đơn sang Viettel Post', { duration: 6000 });
      }
    } catch (err: any) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setTestPushLoading(false);
    }
  };

  // Push Existing Order to Viettel Post
  const handlePushExistingOrder = async () => {
    if (!selectedPendingOrderId) {
      toast.error('Vui lòng chọn một đơn hàng để đẩy sang Viettel Post');
      return;
    }
    setTestPushLoading(true);
    setTestPushResult(null);
    try {
      const res = await apiFetch('/api/shipping/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'push_order',
          orderId: selectedPendingOrderId,
          weight: mockOrderForm.weight,
          orderService: mockOrderForm.orderService,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestPushResult(data.data);
        toast.success(data.message, { duration: 6000 });
        loadVtpInfo();
      } else {
        toast.error(data.message || 'Lỗi khi đẩy đơn sang Viettel Post', { duration: 6000 });
      }
    } catch (err: any) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setTestPushLoading(false);
    }
  };

  // Cancel Viettel Post Order
  const handleCancelTestOrder = async (trackingCode: string) => {
    if (!trackingCode) return;
    setTestCancelLoading(true);
    try {
      const res = await apiFetch('/api/shipping/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_order',
          trackingCode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Đã hủy vận đơn thành công trên Viettel Post!');
        setTestPushResult((prev: any) =>
          prev ? { ...prev, autoCancelled: true, cancelled: true } : prev
        );
      } else {
        toast.error(data.message || 'Không thể hủy vận đơn');
      }
    } catch (err: any) {
      toast.error('Lỗi gửi yêu cầu hủy vận đơn');
    } finally {
      setTestCancelLoading(false);
    }
  };

  // Calculate & Compare 3 Carriers (API 8.1 POST)
  const handleCalculateFee = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsCalculating(true);
    try {
      const res = await apiFetch('/api/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calcData),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCalcResults(data.data);
        toast.success('Đã tính và so sánh cước phí 3 hãng!');
      } else {
        toast.error(data.message || 'Lỗi tính cước phí');
      }
    } catch (e) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsCalculating(false);
    }
  };

  // Simulate 3rd-Party Logistics Webhook (GHN / GHTK / Viettel Post)
  const handleSimulateWebhook = async (customStep?: string) => {
    if (!webhookSim.orderCode.trim()) {
      toast.error('Vui lòng nhập mã đơn hàng');
      return;
    }
    const targetStatus = customStep || webhookSim.status;
    setIsSimulating(true);
    try {
      let payload: any = {};
      if (webhookSim.carrier === 'ghn') {
        payload = {
          ClientOrderCode: webhookSim.orderCode.trim().toUpperCase(),
          OrderCode: `GHN-${webhookSim.orderCode.trim().replace(/\D/g, '') || '928371'}`,
          Status: targetStatus,
          Location: webhookSim.location,
          Description: webhookSim.description,
          ShipperName: webhookSim.shipperName,
          ShipperPhone: webhookSim.shipperPhone,
        };
      } else if (webhookSim.carrier === 'ghtk') {
        const statusMap: any = {
          confirmed: 2,
          shipping: 3,
          delivering: 4,
          delivered: 5,
        };
        payload = {
          partner_id: webhookSim.orderCode.trim().toUpperCase(),
          label_id: `GHTK.${webhookSim.orderCode.trim().replace(/\D/g, '') || '839201'}`,
          status_id: statusMap[targetStatus] || 4,
          reason: webhookSim.description,
          address: webhookSim.location,
        };
      } else {
        const vtpStatusMap: any = {
          confirmed: 102,
          shipping: 300,
          delivering: 500,
          delivered: 501,
          cancelled: 107,
        };
        payload = {
          ORDER_REFERENCE: webhookSim.orderCode.trim().toUpperCase(),
          ORDER_NUMBER: `VTP${webhookSim.orderCode.trim().replace(/\D/g, '') || '748291'}`,
          ORDER_STATUS: vtpStatusMap[targetStatus] || 500,
          NOTE: webhookSim.description,
          LOCAL_ADDRESS: webhookSim.location,
        };
      }

      const res = await apiFetch(`/api/webhooks/shipping?carrier=${webhookSim.carrier}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setSimResult(data);
      if (data.success) {
        toast.success(data.message || 'Mô phỏng Webhook vận chuyển thành công!');
      } else {
        toast.error(data.message || 'Lỗi xử lý Webhook');
      }
    } catch (e) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Quản Lý Vận Chuyển & Cước Phí</h1>
          <p className={styles.subtitle}>
            Tích hợp kết nối 3 đơn vị vận chuyển hàng đầu: GHN, GHTK, Viettel Post
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.saveBtn}
            style={{ background: '#00BFA5', borderColor: '#00BFA5' }}
            onClick={() => {
              setActiveModalCarrier('ghn');
              setIsConfigModalOpen(true);
            }}
          >
            <FiSettings /> Cấu Hình Token API & Shop ID (Modal)
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => handleTestConnection('all')}
            disabled={!!testingProvider}
          >
            <FiActivity /> {testingProvider === 'all' ? 'Đang kiểm tra...' : 'Ping kết nối 3 hãng'}
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            <FiSave /> {saving ? 'Đang lưu...' : 'Lưu vào Database'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Skeleton type="rect" height={200} />
          <Skeleton type="rect" height={320} />
        </div>
      ) : (
        <>
          {/* Section 1: So Sánh Cước Phí 3 Hãng (API 8.1) */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              <FiZap style={{ color: 'var(--primary, #3b82f6)' }} />
              Công Cụ So Sánh Cước Phí Trực Tiếp (API 8.1)
            </h3>

            {/* Origin Warehouse Info Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                padding: '10px 14px',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 8,
                marginBottom: 16,
                fontSize: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiHome style={{ color: 'var(--primary, #3b82f6)', fontSize: 16 }} />
                <span>
                  Kho gửi hàng (Origin): <strong>{config.originAddress?.name || 'Kho Tổng'}</strong> — {config.originAddress?.address ? `${config.originAddress.address}, ` : ''}{config.originAddress?.district}, {config.originAddress?.province}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                ● Đã đồng bộ điểm gửi với GHN / GHTK / Viettel Post
              </span>
            </div>

            {/* Province & District Dropdowns */}
            {(() => {
              const selectedProvinceObj =
                vietnamProvinces.find((p) => p.name === calcData.province) || vietnamProvinces[0];

              // Calculate lowest fee among active carriers
              const activeFees: number[] = [];
              if (calcResults?.ghn?.fee) activeFees.push(calcResults.ghn.fee);
              if (calcResults?.ghtk?.fee) activeFees.push(calcResults.ghtk.fee);
              if (calcResults?.viettelpost?.fee) activeFees.push(calcResults.viettelpost.fee);
              const minFee = activeFees.length > 0 ? Math.min(...activeFees) : 0;

              return (
                <form onSubmit={handleCalculateFee}>
                  <div className={styles.calcGrid}>
                    <div className={styles.inputGroup}>
                      <label>Tỉnh / Thành phố nhận</label>
                      <select
                        className={styles.select}
                        value={calcData.province}
                        onChange={(e) => {
                          const newProv = e.target.value;
                          const pData = vietnamProvinces.find((p) => p.name === newProv);
                          const firstDist = pData?.districts?.[0]?.name || '';
                          setCalcData({ ...calcData, province: newProv, district: firstDist });
                        }}
                      >
                        {vietnamProvinces.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Quận / Huyện</label>
                      <select
                        className={styles.select}
                        value={calcData.district}
                        onChange={(e) => setCalcData({ ...calcData, district: e.target.value })}
                      >
                        {selectedProvinceObj?.districts?.map((d) => (
                          <option key={d.name} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Khối lượng (Gram)</label>
                      <input
                        type="number"
                        min="50"
                        step="50"
                        className={styles.input}
                        value={calcData.weight}
                        onChange={(e) => setCalcData({ ...calcData, weight: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Giá trị hàng (VNĐ)</label>
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        className={styles.input}
                        value={calcData.orderValue}
                        onChange={(e) => setCalcData({ ...calcData, orderValue: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <button
                      type="submit"
                      className={styles.saveBtn}
                      style={{ width: '100%', height: 42, justifyContent: 'center' }}
                      disabled={isCalculating}
                    >
                      <FiSend /> {isCalculating ? 'Đang tính...' : 'So sánh'}
                    </button>
                  </div>
                </form>
              );
            })()}

            {/* Results Grid */}
            {calcResults && (() => {
              const activeFees: number[] = [];
              if (calcResults?.ghn?.fee) activeFees.push(calcResults.ghn.fee);
              if (calcResults?.ghtk?.fee) activeFees.push(calcResults.ghtk.fee);
              if (calcResults?.viettelpost?.fee) activeFees.push(calcResults.viettelpost.fee);
              const minFee = activeFees.length > 0 ? Math.min(...activeFees) : 0;

              return (
                <div className={styles.resultCards} style={{ marginTop: 16 }}>
                  {/* GHN */}
                  <div className={`${styles.resultCard} ${calcResults.ghn && calcResults.ghn.fee === minFee ? styles.bestChoice : ''}`}>
                    {calcResults.ghn && calcResults.ghn.fee === minFee && (
                      <div className={styles.bestBadge}>Tiết Kiệm Nhất</div>
                    )}
                    <div className={styles.providerName}>⚡ Giao Hàng Nhanh (GHN)</div>
                    {calcResults.ghn ? (
                      <>
                        <div className={styles.providerFee}>{formatPrice(calcResults.ghn.fee)}</div>
                        <div className={styles.providerTime}>
                          Thời gian: <strong>{calcResults.ghn.estimatedTime || '1-2 ngày'}</strong>
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--text-muted, #94a3b8)', marginTop: 8 }}>
                        Chưa kích hoạt đơn vị này
                      </div>
                    )}
                  </div>

                  {/* GHTK */}
                  <div className={`${styles.resultCard} ${calcResults.ghtk && calcResults.ghtk.fee === minFee ? styles.bestChoice : ''}`}>
                    {calcResults.ghtk && calcResults.ghtk.fee === minFee && (
                      <div className={styles.bestBadge}>Tiết Kiệm Nhất</div>
                    )}
                    <div className={styles.providerName}>📦 Giao Hàng Tiết Kiệm (GHTK)</div>
                    {calcResults.ghtk ? (
                      <>
                        <div className={styles.providerFee}>{formatPrice(calcResults.ghtk.fee)}</div>
                        <div className={styles.providerTime}>
                          Thời gian: <strong>{calcResults.ghtk.estimatedTime || '1-2 ngày'}</strong>
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--text-muted, #94a3b8)', marginTop: 8 }}>
                        Chưa kích hoạt đơn vị này
                      </div>
                    )}
                  </div>

                  {/* Viettel Post */}
                  <div className={`${styles.resultCard} ${calcResults.viettelpost && calcResults.viettelpost.fee === minFee ? styles.bestChoice : ''}`}>
                    {calcResults.viettelpost && calcResults.viettelpost.fee === minFee && (
                      <div className={styles.bestBadge}>Tiết Kiệm Nhất</div>
                    )}
                    <div className={styles.providerName}>🚚 Viettel Post Tiêu Chuẩn</div>
                    {calcResults.viettelpost ? (
                      <>
                        <div className={styles.providerFee}>{formatPrice(calcResults.viettelpost.fee)}</div>
                        <div className={styles.providerTime}>
                          Thời gian: <strong>{calcResults.viettelpost.estimatedTime || '1-2 ngày'}</strong>
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--text-muted, #94a3b8)', marginTop: 8 }}>
                        Chưa kích hoạt đơn vị này
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Section: Cấu Hình Địa Chỉ Kho Hàng Của Shop (Điểm Lấy Hàng) */}
          <div className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 className={styles.cardTitle} style={{ margin: 0 }}>
                  <FiHome style={{ color: 'var(--primary, #3b82f6)' }} />
                  Cấu Hình Địa Chỉ Kho Hàng (Điểm Lấy Hàng Của Shop)
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                  Địa chỉ này được dùng làm điểm gửi hàng khi Shipper bên thứ 3 (GHN, GHTK, Viettel Post) đến lấy hàng
                </p>
              </div>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving}
                style={{ height: 40, padding: '0 20px' }}
              >
                <FiSave /> {saving ? 'Đang lưu...' : 'Lưu Địa Chỉ Kho'}
              </button>
            </div>

            {(() => {
              const warehouseProvObj =
                vietnamProvinces.find((p) => p.name === config.originAddress?.province) || vietnamProvinces[0];

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {/* Tên kho / Người đại diện */}
                  <div className={styles.inputGroup}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiUser style={{ color: 'var(--primary, #3b82f6)' }} /> Tên kho hàng / Người gửi
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="VD: ShopBig Store - Kho Tổng"
                      value={config.originAddress?.name || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          originAddress: {
                            ...config.originAddress,
                            name: e.target.value,
                          },
                        })
                      }
                    />
                  </div>

                  {/* SĐT kho */}
                  <div className={styles.inputGroup}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiPhone style={{ color: 'var(--primary, #3b82f6)' }} /> Số điện thoại liên hệ kho
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="VD: 0364978796"
                      value={config.originAddress?.phone || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          originAddress: {
                            ...config.originAddress,
                            phone: e.target.value,
                          },
                        })
                      }
                    />
                  </div>

                  {/* Tỉnh / Thành phố kho */}
                  <div className={styles.inputGroup}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiMapPin style={{ color: 'var(--primary, #3b82f6)' }} /> Tỉnh / Thành phố kho
                    </label>
                    <select
                      className={styles.select}
                      value={config.originAddress?.province || 'Hà Nội'}
                      onChange={(e) => {
                        const newProv = e.target.value;
                        const pData = vietnamProvinces.find((p) => p.name === newProv);
                        const firstDist = pData?.districts?.[0]?.name || '';
                        setConfig({
                          ...config,
                          originAddress: {
                            ...config.originAddress,
                            province: newProv,
                            district: firstDist,
                            ward: '',
                          },
                        });
                      }}
                    >
                      {vietnamProvinces.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quận / Huyện kho */}
                  <div className={styles.inputGroup}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiMapPin style={{ color: 'var(--primary, #3b82f6)' }} /> Quận / Huyện kho
                    </label>
                    <select
                      className={styles.select}
                      value={config.originAddress?.district || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          originAddress: {
                            ...config.originAddress,
                            district: e.target.value,
                            ward: '',
                          },
                        })
                      }
                    >
                      {warehouseProvObj?.districts?.map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Phường / Xã kho */}
                  <div className={styles.inputGroup}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiMapPin style={{ color: 'var(--primary, #3b82f6)' }} /> Phường / Xã kho
                    </label>
                    <select
                      className={styles.select}
                      value={config.originAddress?.ward || ''}
                      disabled={loadingWarehouseWards}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          originAddress: {
                            ...config.originAddress,
                            ward: e.target.value,
                          },
                        })
                      }
                    >
                      {loadingWarehouseWards ? (
                        <option value="">Đang tải danh sách phường/xã...</option>
                      ) : warehouseWards.length > 0 ? (
                        <>
                          <option value="">-- Chọn Phường / Xã --</option>
                          {warehouseWards.map((w) => (
                            <option key={w} value={w}>
                              {w}
                            </option>
                          ))}
                        </>
                      ) : (
                        <option value={config.originAddress?.ward || ''}>
                          {config.originAddress?.ward || 'Chọn hoặc nhập phường/xã'}
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Địa chỉ chi tiết */}
                  <div className={styles.inputGroup}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiMapPin style={{ color: 'var(--primary, #3b82f6)' }} /> Địa chỉ cụ thể (Số nhà, đường)
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="VD: Số 10 Phạm Hùng"
                      value={config.originAddress?.address || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          originAddress: {
                            ...config.originAddress,
                            address: e.target.value,
                          },
                        })
                      }
                    />
                  </div>

                  {/* Ghi chú lấy hàng */}
                  <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                    <label>Ghi chú lấy hàng cho Shipper (Tùy chọn)</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="VD: Hàng hóa linh kiện điện tử, lấy hàng giờ hành chính, gọi trước khi đến"
                      value={config.originAddress?.pickNote || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          originAddress: {
                            ...config.originAddress,
                            pickNote: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Section 2: Cấu Hình Chi Tiết 3 Đơn Vị Vận Chuyển (API 8.3) */}
          <div className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 className={styles.cardTitle} style={{ margin: 0 }}>
                <FiKey style={{ color: 'var(--primary, #3b82f6)' }} />
                Cấu Hình Token API & Mã Cửa Hàng Từng Hãng
              </h3>
              <button
                type="button"
                className={styles.secondaryBtn}
                style={{ borderColor: '#00BFA5', color: '#00BFA5' }}
                onClick={() => {
                  setActiveModalCarrier('ghn');
                  setIsConfigModalOpen(true);
                }}
              >
                <FiSettings /> Mở Modal Cấu Hình Đầy Đủ (DB)
              </button>
            </div>

            {/* 1. GHN Block */}
            <div className={`${styles.carrierBlock} ${config.carriers.ghn.enabled ? styles.active : ''}`}>
              <div className={styles.carrierHeader}>
                <div className={styles.carrierBrand}>
                  <div className={styles.brandLogo} style={{ backgroundColor: '#ea580c' }}>
                    GHN
                  </div>
                  <div>
                    <h4>Giao Hàng Nhanh (GHN Express)</h4>
                    <p>Kết nối dịch vụ giao hàng thương mại điện tử chuyên nghiệp</p>
                  </div>
                </div>

                <div className={styles.carrierActions}>
                  <button
                    type="button"
                    className={styles.testBadge}
                    style={{ borderColor: '#00BFA5', color: '#00BFA5' }}
                    onClick={() => {
                      setActiveModalCarrier('ghn');
                      setIsConfigModalOpen(true);
                    }}
                  >
                    <FiSettings /> Sửa Token & Shop ID
                  </button>
                  <button
                    type="button"
                    className={styles.testBadge}
                    onClick={() => handleTestConnection('ghn', config.carriers.ghn.token)}
                    disabled={testingProvider === 'ghn'}
                  >
                    <FiCheckCircle /> {testingProvider === 'ghn' ? 'Đang test...' : 'Test API GHN'}
                  </button>

                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={config.carriers.ghn.enabled}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          carriers: {
                            ...config.carriers,
                            ghn: { ...config.carriers.ghn, enabled: e.target.checked },
                          },
                        })
                      }
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>

              {config.carriers.ghn.enabled && (
                <div className={styles.grid3}>
                  <div className={styles.inputGroup}>
                    <label>Token API GHN *</label>
                    <input
                      type="password"
                      className={styles.input}
                      placeholder="Nhập API Token GHN..."
                      value={config.carriers.ghn.token}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          carriers: {
                            ...config.carriers,
                            ghn: { ...config.carriers.ghn, token: e.target.value },
                          },
                        })
                      }
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Shop ID GHN</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="VD: 184920"
                      value={config.carriers.ghn.shopId}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          carriers: {
                            ...config.carriers,
                            ghn: { ...config.carriers.ghn, shopId: e.target.value },
                          },
                        })
                      }
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Môi trường</label>
                    <select
                      className={styles.select}
                      value={config.carriers.ghn.environment}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          carriers: {
                            ...config.carriers,
                            ghn: { ...config.carriers.ghn, environment: e.target.value },
                          },
                        })
                      }
                    >
                      <option value="production">Production (Chính thức)</option>
                      <option value="sandbox">Sandbox (Thử nghiệm)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 2. GHTK Block */}
            <div className={`${styles.carrierBlock} ${config.carriers.ghtk.enabled ? styles.active : ''}`}>
              <div className={styles.carrierHeader}>
                <div className={styles.carrierBrand}>
                  <div className={styles.brandLogo} style={{ backgroundColor: '#15803d' }}>
                    GHTK
                  </div>
                  <div>
                    <h4>Giao Hàng Tiết Kiệm (GHTK)</h4>
                    <p>Phí ship cạnh tranh, tối ưu cho các đơn hàng thời trang toàn quốc</p>
                  </div>
                </div>

                <div className={styles.carrierActions}>
                  <button
                    type="button"
                    className={styles.testBadge}
                    style={{ borderColor: '#00BFA5', color: '#00BFA5' }}
                    onClick={() => {
                      setActiveModalCarrier('ghtk');
                      setIsConfigModalOpen(true);
                    }}
                  >
                    <FiSettings /> Sửa Token & Partner ID
                  </button>
                  <button
                    type="button"
                    className={styles.testBadge}
                    onClick={() => handleTestConnection('ghtk', config.carriers.ghtk.token)}
                    disabled={testingProvider === 'ghtk'}
                  >
                    <FiCheckCircle /> {testingProvider === 'ghtk' ? 'Đang test...' : 'Test API GHTK'}
                  </button>

                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={config.carriers.ghtk.enabled}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          carriers: {
                            ...config.carriers,
                            ghtk: { ...config.carriers.ghtk, enabled: e.target.checked },
                          },
                        })
                      }
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>

              {config.carriers.ghtk.enabled && (
                <div className={styles.grid3}>
                  <div className={styles.inputGroup}>
                    <label>Token API GHTK *</label>
                    <input
                      type="password"
                      className={styles.input}
                      placeholder="Nhập API Token GHTK..."
                      value={config.carriers.ghtk.token}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          carriers: {
                            ...config.carriers,
                            ghtk: { ...config.carriers.ghtk, token: e.target.value },
                          },
                        })
                      }
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Mã Đối Tác (Partner ID)</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="VD: PARTNER_01"
                      value={config.carriers.ghtk.partnerId}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          carriers: {
                            ...config.carriers,
                            ghtk: { ...config.carriers.ghtk, partnerId: e.target.value },
                          },
                        })
                      }
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Môi trường</label>
                    <select
                      className={styles.select}
                      value={config.carriers.ghtk.environment}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          carriers: {
                            ...config.carriers,
                            ghtk: { ...config.carriers.ghtk, environment: e.target.value },
                          },
                        })
                      }
                    >
                      <option value="production">Production (Chính thức)</option>
                      <option value="sandbox">Sandbox (Thử nghiệm)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Viettel Post Block */}
            <div className={`${styles.carrierBlock} ${config.carriers.viettelpost.enabled ? styles.active : ''}`}>
              <div className={styles.carrierHeader}>
                <div className={styles.carrierBrand}>
                  <div className={styles.brandLogo} style={{ backgroundColor: '#dc2626' }}>
                    VTP
                  </div>
                  <div>
                    <h4>Viettel Post (VTP)</h4>
                    <p>Mạng lưới rộng khắp phủ kín 63 tỉnh thành & hải đảo</p>
                  </div>
                </div>

                <div className={styles.carrierActions}>
                  <button
                    type="button"
                    className={styles.testBadge}
                    style={{ borderColor: '#00BFA5', color: '#00BFA5' }}
                    onClick={() => {
                      setActiveModalCarrier('viettelpost');
                      setIsConfigModalOpen(true);
                    }}
                  >
                    <FiSettings /> Sửa Token & Tài Khoản
                  </button>
                  <button
                    type="button"
                    className={styles.testBadge}
                    onClick={() => handleTestConnection('viettelpost', config.carriers.viettelpost.token)}
                    disabled={testingProvider === 'viettelpost'}
                  >
                    <FiCheckCircle /> {testingProvider === 'viettelpost' ? 'Đang test...' : 'Test API VTP'}
                  </button>

                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={config.carriers.viettelpost.enabled}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          carriers: {
                            ...config.carriers,
                            viettelpost: { ...config.carriers.viettelpost, enabled: e.target.checked },
                          },
                        })
                      }
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>

              {config.carriers.viettelpost.enabled && (
                <div className={styles.grid3}>
                  <div className={styles.inputGroup}>
                    <label>Token Secret Viettel Post *</label>
                    <input
                      type="password"
                      className={styles.input}
                      placeholder="Nhập API Secret Token..."
                      value={config.carriers.viettelpost.token}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          carriers: {
                            ...config.carriers,
                            viettelpost: { ...config.carriers.viettelpost, token: e.target.value },
                          },
                        })
                      }
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Tài khoản Doanh Nghiệp (Username)</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="VD: shopbig_vtp"
                      value={config.carriers.viettelpost.username}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          carriers: {
                            ...config.carriers,
                            viettelpost: { ...config.carriers.viettelpost, username: e.target.value },
                          },
                        })
                      }
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Môi trường</label>
                    <select
                      className={styles.select}
                      value={config.carriers.viettelpost.environment}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          carriers: {
                            ...config.carriers,
                            viettelpost: { ...config.carriers.viettelpost, environment: e.target.value },
                          },
                        })
                      }
                    >
                      <option value="production">Production (Chính thức)</option>
                      <option value="sandbox">Sandbox (Thử nghiệm)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3.5: Trung Tâm Kiểm Thử Đẩy Vận Đơn Viettel Post */}
          <div className={styles.card} style={{ border: '2px solid #dc2626', background: 'rgba(220, 38, 38, 0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <h3 className={styles.cardTitle} style={{ margin: 0, color: '#ef4444' }}>
                <FiSend style={{ color: '#ef4444' }} />
                Trung Tâm Kiểm Thử Đẩy Vận Đơn Viettel Post (Live Order Dispatch)
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    background: vtpInfo?.connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: vtpInfo?.connected ? '#10b981' : '#ef4444',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontWeight: 700,
                    border: `1px solid ${vtpInfo?.connected ? '#10b981' : '#ef4444'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: vtpInfo?.connected ? '#10b981' : '#ef4444' }}></span>
                  {vtpInfo?.connected ? 'Live API VTP: Sẵn Sàng Đẩy Đơn' : 'Chưa Kết Nối API Viettel Post'}
                </span>
                <button
                  type="button"
                  onClick={loadVtpInfo}
                  className={styles.secondaryBtn}
                  style={{ padding: '4px 8px', fontSize: 12, height: 28 }}
                  title="Làm mới trạng thái Viettel Post"
                >
                  <FiRefreshCw /> Làm mới
                </button>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted, #94a3b8)', marginBottom: 16 }}>
              Công cụ kiểm thử đẩy đơn hàng thực tế sang hệ thống Viettel Post qua API <code>/v2/order/createOrder</code>, nhận mã vận đơn thật 12 số, tự động tính cước và hỗ trợ hủy đơn kiểm thử tức thì.
            </p>

            {/* Warehouse & Account Info Badge */}
            {vtpInfo?.inventories && vtpInfo.inventories.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                  padding: '12px 16px',
                  backgroundColor: 'rgba(220, 38, 38, 0.06)',
                  border: '1px solid rgba(220, 38, 38, 0.25)',
                  borderRadius: 10,
                  marginBottom: 20,
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div>
                    <strong>Chủ tài khoản VTP:</strong> {vtpInfo.inventories[0].name} (SĐT: {vtpInfo.inventories[0].phone})
                  </div>
                  <div>
                    <strong>Kho xuất hàng mặc định:</strong> {vtpInfo.inventories[0].address}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', background: '#dc2626', color: '#fff', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
                    Mã kho VTP: {vtpInfo.inventories[0].groupaddressId}
                  </span>
                </div>
              </div>
            )}

            {/* Mode Switch Tabs */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              <button
                type="button"
                onClick={() => setTestPushTab('mock')}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  background: testPushTab === 'mock' ? '#dc2626' : 'rgba(255,255,255,0.06)',
                  color: testPushTab === 'mock' ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                  transition: 'all 0.2s',
                }}
              >
                <FiZap /> Đẩy Đơn Thử Nghiệm Tự Động (Mock Order)
              </button>
              <button
                type="button"
                onClick={() => setTestPushTab('order')}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  background: testPushTab === 'order' ? '#dc2626' : 'rgba(255,255,255,0.06)',
                  color: testPushTab === 'order' ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                  transition: 'all 0.2s',
                }}
              >
                <FiPackage /> Đẩy Đơn Thật Trong Shop ({vtpInfo?.pendingOrders?.length || 0} đơn chờ)
              </button>
            </div>

            {/* TAB 1: MOCK ORDER */}
            {testPushTab === 'mock' && (
              <div>
                <div className={styles.grid3}>
                  <div className={styles.inputGroup}>
                    <label>Tên người nhận hàng *</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={mockOrderForm.name}
                      onChange={(e) => setMockOrderForm({ ...mockOrderForm, name: e.target.value })}
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Số điện thoại nhận hàng *</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={mockOrderForm.phone}
                      onChange={(e) => setMockOrderForm({ ...mockOrderForm, phone: e.target.value })}
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Tên mặt hàng gửi</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={mockOrderForm.productName}
                      onChange={(e) => setMockOrderForm({ ...mockOrderForm, productName: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.grid3} style={{ marginTop: 12 }}>
                  <div className={styles.inputGroup}>
                    <label>Tỉnh / Thành phố nhận *</label>
                    <select
                      className={styles.select}
                      value={mockOrderForm.province}
                      onChange={(e) => {
                        const newProv = e.target.value;
                        const pObj = vietnamProvinces.find((p) => p.name === newProv);
                        const firstDist = pObj?.districts?.[0]?.name || '';
                        setMockOrderForm({
                          ...mockOrderForm,
                          province: newProv,
                          district: firstDist,
                          ward: '',
                        });
                      }}
                    >
                      {vietnamProvinces.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Quận / Huyện nhận *</label>
                    {(() => {
                      const curProvObj =
                        vietnamProvinces.find((p) => p.name === mockOrderForm.province) || vietnamProvinces[0];
                      return (
                        <select
                          className={styles.select}
                          value={mockOrderForm.district}
                          onChange={(e) =>
                            setMockOrderForm({
                              ...mockOrderForm,
                              district: e.target.value,
                              ward: '',
                            })
                          }
                        >
                          {curProvObj.districts.map((d) => (
                            <option key={d.name} value={d.name}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Phường / Xã nhận *</label>
                    <select
                      className={styles.select}
                      value={mockOrderForm.ward}
                      disabled={loadingRecipientWards}
                      onChange={(e) => setMockOrderForm({ ...mockOrderForm, ward: e.target.value })}
                    >
                      {loadingRecipientWards ? (
                        <option value="">Đang tải danh sách phường/xã...</option>
                      ) : recipientWards.length > 0 ? (
                        <>
                          <option value="">-- Chọn phường / xã --</option>
                          {recipientWards.map((w) => (
                            <option key={w} value={w}>
                              {w}
                            </option>
                          ))}
                        </>
                      ) : (
                        <option value={mockOrderForm.ward || 'Phường trung tâm'}>
                          {mockOrderForm.ward || 'Phường trung tâm'}
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                <div className={styles.grid3} style={{ marginTop: 12 }}>
                  <div className={styles.inputGroup}>
                    <label>Địa chỉ chi tiết (Số nhà, đường...)</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={mockOrderForm.address}
                      onChange={(e) => setMockOrderForm({ ...mockOrderForm, address: e.target.value })}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Tiền thu hộ COD (₫)</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={formatWithDots(mockOrderForm.codAmount)}
                      onChange={(e) =>
                        setMockOrderForm({ ...mockOrderForm, codAmount: parseFromDots(e.target.value) })
                      }
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Dịch vụ Viettel Post</label>
                    <select
                      className={styles.select}
                      value={mockOrderForm.orderService}
                      onChange={(e) => setMockOrderForm({ ...mockOrderForm, orderService: e.target.value })}
                    >
                      <option value="STK">STK - Chuyển phát Tiêu Chuẩn</option>
                      <option value="NCOD">NCOD - TMĐT Nhanh Thỏa Thuận</option>
                      <option value="LCOD">LCOD - TMĐT Tiết Kiệm Thỏa Thuận</option>
                      <option value="SCN">SCN - Chuyển phát Nhanh</option>
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 14,
                    marginTop: 18,
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 8,
                    border: '1px solid var(--border-color, #232838)',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={mockOrderForm.autoCancel}
                      onChange={(e) => setMockOrderForm({ ...mockOrderForm, autoCancel: e.target.checked })}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#dc2626' }}
                    />
                    <span>
                      <strong style={{ color: '#10b981' }}>Tự động gửi lệnh HỦY sau khi test thành công</strong>{' '}
                      <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
                        (Khuyên dùng: Viettel Post sẽ cấp mã vận đơn thật và tính cước thật, sau đó hệ thống tự hủy đơn để không điều phối bưu tá)
                      </span>
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handlePushMockOrder}
                    disabled={testPushLoading}
                    className={styles.saveBtn}
                    style={{
                      background: '#dc2626',
                      borderColor: '#dc2626',
                      padding: '10px 24px',
                      fontSize: '0.9rem',
                    }}
                  >
                    <FiSend /> {testPushLoading ? 'Đang đẩy đơn sang Viettel Post...' : '🚀 Đẩy Đơn Sang Viettel Post Ngay'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: PUSH EXISTING ORDER */}
            {testPushTab === 'order' && (
              <div>
                {vtpInfo?.pendingOrders && vtpInfo.pendingOrders.length > 0 ? (
                  <div>
                    <div className={styles.grid2}>
                      <div className={styles.inputGroup}>
                        <label>Chọn đơn hàng cần đẩy sang Viettel Post</label>
                        <select
                          className={styles.select}
                          value={selectedPendingOrderId}
                          onChange={(e) => setSelectedPendingOrderId(e.target.value)}
                        >
                          {vtpInfo.pendingOrders.map((ord: any) => (
                            <option key={ord._id} value={ord._id}>
                              #{ord.orderCode} — {ord.customer?.name} ({ord.customer?.phone}) — {formatPrice(ord.totalAmount)} ({ord.status === 'pending' ? 'Chờ xác nhận' : 'Đã xác nhận'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.inputGroup}>
                        <label>Dịch vụ Viettel Post</label>
                        <select
                          className={styles.select}
                          value={mockOrderForm.orderService}
                          onChange={(e) => setMockOrderForm({ ...mockOrderForm, orderService: e.target.value })}
                        >
                          <option value="STK">STK - Chuyển phát Tiêu Chuẩn</option>
                          <option value="NCOD">NCOD - TMĐT Nhanh Thỏa Thuận</option>
                          <option value="LCOD">LCOD - TMĐT Tiết Kiệm Thỏa Thuận</option>
                        </select>
                      </div>
                    </div>

                    {/* Selected Order Summary Card */}
                    {(() => {
                      const curOrd = vtpInfo.pendingOrders.find((o: any) => o._id === selectedPendingOrderId);
                      if (!curOrd) return null;
                      return (
                        <div
                          style={{
                            marginTop: 14,
                            padding: '14px 18px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            borderRadius: 8,
                            border: '1px solid var(--border-color, #232838)',
                            fontSize: '0.875rem',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: 10,
                          }}
                        >
                          <div><strong>Khách hàng:</strong> {curOrd.customer?.name} ({curOrd.customer?.phone})</div>
                          <div><strong>Địa chỉ:</strong> {curOrd.customer?.address || `${curOrd.customer?.ward}, ${curOrd.customer?.district}, ${curOrd.customer?.province}`}</div>
                          <div><strong>Tổng tiền:</strong> {formatPrice(curOrd.totalAmount)} ({curOrd.paymentMethod === 'cod' ? 'Thu COD' : 'Chuyển khoản'})</div>
                          <div><strong>Sản phẩm:</strong> {curOrd.items?.[0]?.name} {curOrd.items?.length > 1 ? `(+${curOrd.items.length - 1} món)` : ''}</div>
                        </div>
                      );
                    })()}

                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={handlePushExistingOrder}
                        disabled={testPushLoading}
                        className={styles.saveBtn}
                        style={{
                          background: '#dc2626',
                          borderColor: '#dc2626',
                          padding: '10px 24px',
                          fontSize: '0.9rem',
                        }}
                      >
                        <FiPackage /> {testPushLoading ? 'Đang tạo vận đơn Viettel Post...' : '📦 Bàn Giao & Đẩy Đơn Sang Viettel Post'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                    Không có đơn hàng nào ở trạng thái chờ gửi (pending/confirmed). Bạn có thể dùng tab <strong>"Đẩy Đơn Thử Nghiệm Tự Động"</strong> bên cạnh để kiểm tra.
                  </div>
                )}
              </div>
            )}

            {/* LIVE RESULT CARD */}
            {testPushResult && (
              <div
                style={{
                  marginTop: 20,
                  padding: '18px 20px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1.5px solid #10b981',
                  borderRadius: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontWeight: 700, fontSize: '1.05rem' }}>
                    <FiCheckCircle /> Đã Tạo Vận Đơn Viettel Post Thành Công!
                  </div>
                  {testPushResult.autoCancelled && (
                    <span style={{ fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                      ● Đã gửi lệnh tự động hủy theo yêu cầu
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: 'var(--bg-main, #090a0f)', padding: '10px 14px', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>MÃ VẬN ĐƠN VIETTEL POST</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3b82f6', letterSpacing: 1, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {testPushResult.trackingCode}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(testPushResult.trackingCode);
                          toast.success('Đã copy mã vận đơn!');
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer', padding: 2 }}
                        title="Copy mã vận đơn"
                      >
                        <FiCopy />
                      </button>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-main, #090a0f)', padding: '10px 14px', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>CƯỚC PHÍ VẬN CHUYỂN</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                      {formatPrice(testPushResult.fee || 0)}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-main, #090a0f)', padding: '10px 14px', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>TIỀN THU HỘ COD</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>
                      {formatPrice(testPushResult.moneyCollection || 0)}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-main, #090a0f)', padding: '10px 14px', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>MÃ ĐƠN HỆ THỐNG</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main, #fff)', marginTop: 4 }}>
                      #{testPushResult.orderCode}
                    </div>
                  </div>
                </div>

                {/* Action Buttons for Result */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <a
                      href={`https://viettelpost.com.vn/tra-cuu-hanh-trinh-don-hang?orderCode=${testPushResult.trackingCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.secondaryBtn}
                      style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                    >
                      <FiExternalLink /> Tra cứu trên Viettel Post Portal
                    </a>

                    {!testPushResult.autoCancelled && !testPushResult.cancelled && (
                      <button
                        type="button"
                        onClick={() => handleCancelTestOrder(testPushResult.trackingCode)}
                        disabled={testCancelLoading}
                        style={{
                          padding: '8px 14px',
                          fontSize: '0.85rem',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <FiX /> {testCancelLoading ? 'Đang hủy...' : 'Hủy Vận Đơn Này Trên Viettel Post'}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowRawJson(!showRawJson)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {showRawJson ? 'Ẩn chi tiết API JSON' : 'Xem chi tiết phản hồi JSON từ Viettel Post'}
                  </button>
                </div>

                {showRawJson && testPushResult.raw && (
                  <pre
                    style={{
                      marginTop: 12,
                      padding: 12,
                      backgroundColor: 'var(--bg-main, #090a0f)',
                      borderRadius: 6,
                      fontSize: '0.75rem',
                      overflowX: 'auto',
                      color: '#a7f3d0',
                    }}
                  >
                    {JSON.stringify(testPushResult.raw, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Trung Tâm Kiểm Thử Webhook Vận Chuyển 3rd-Party */}
          <div className={styles.card} style={{ border: '2px solid #00BFA5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className={styles.cardTitle} style={{ margin: 0 }}>
                <FiActivity style={{ color: '#00BFA5' }} />
                Trung Tâm Kiểm Thử Webhook Vận Chuyển (GHN / GHTK / Viettel Post)
              </h3>
              <span style={{ fontSize: 11, background: '#e6fffa', color: '#00897b', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>
                ⚡ Live Webhook Simulator
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginBottom: 16 }}>
              Mô phỏng dữ liệu Webhook gửi từ các hãng giao hàng để kiểm tra luồng cập nhật trạng thái đơn và thanh tiến trình 5 bước trên trang <code>/tracking</code>.
            </p>

            <div className={styles.grid3}>
              <div className={styles.inputGroup}>
                <label>Hãng vận chuyển gửi Webhook</label>
                <select
                  className={styles.select}
                  value={webhookSim.carrier}
                  onChange={(e) => setWebhookSim({ ...webhookSim, carrier: e.target.value })}
                >
                  <option value="ghn">Giao Hàng Nhanh (GHN)</option>
                  <option value="ghtk">Giao Hàng Tiết Kiệm (GHTK)</option>
                  <option value="viettelpost">Viettel Post</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label>Mã đơn hàng cần test (Order Code)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="VD: ST949668"
                  value={webhookSim.orderCode}
                  onChange={(e) => setWebhookSim({ ...webhookSim, orderCode: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Chọn bước tiến trình cần kích hoạt</label>
                <select
                  className={styles.select}
                  value={webhookSim.status}
                  onChange={(e) => setWebhookSim({ ...webhookSim, status: e.target.value })}
                >
                  <option value="confirmed">Bước 2: Đang xác nhận đơn (Shop chuẩn bị đóng gói)</option>
                  <option value="shipping">Bước 3: Bàn giao vận chuyển (Hãng đã nhận & đang trung chuyển)</option>
                  <option value="delivering">Bước 4: Đang giao hàng (Shipper đang phát tận nơi)</option>
                  <option value="delivered">Bước 5: Đã giao thành công (Đổi COD thành Paid)</option>
                </select>
              </div>
            </div>

            <div className={styles.grid3} style={{ marginTop: 12 }}>
              <div className={styles.inputGroup}>
                <label>Vị trí bưu cục / Kho phát</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="VD: Bưu cục Châu Đốc - An Giang"
                  value={webhookSim.location}
                  onChange={(e) => setWebhookSim({ ...webhookSim, location: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Tên Shipper giao hàng</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="VD: Nguyễn Văn Phát"
                  value={webhookSim.shipperName}
                  onChange={(e) => setWebhookSim({ ...webhookSim, shipperName: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Số điện thoại Shipper</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="VD: 0988.777.666"
                  value={webhookSim.shipperPhone}
                  onChange={(e) => setWebhookSim({ ...webhookSim, shipperPhone: e.target.value })}
                />
              </div>
            </div>

            {/* Quick 1-Click Stepper Action Buttons */}
            <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={styles.saveBtn}
                style={{ background: '#00BFA5', borderColor: '#00BFA5' }}
                onClick={() => handleSimulateWebhook()}
                disabled={isSimulating}
              >
                <FiZap /> {isSimulating ? 'Đang gửi...' : '⚡ Bắn Webhook Trạng Thái Đã Chọn'}
              </button>

              <button
                type="button"
                className={styles.testBtn}
                onClick={() => handleSimulateWebhook('confirmed')}
                disabled={isSimulating}
                title="Kích hoạt bước 2"
              >
                ▶ Test Bước 2 (Xác nhận)
              </button>

              <button
                type="button"
                className={styles.testBtn}
                onClick={() => handleSimulateWebhook('shipping')}
                disabled={isSimulating}
                title="Kích hoạt bước 3"
              >
                ▶ Test Bước 3 (Bàn giao)
              </button>

              <button
                type="button"
                className={styles.testBtn}
                onClick={() => handleSimulateWebhook('delivering')}
                disabled={isSimulating}
                title="Kích hoạt bước 4"
              >
                ▶ Test Bước 4 (Đang phát)
              </button>

              <button
                type="button"
                className={styles.testBtn}
                onClick={() => handleSimulateWebhook('delivered')}
                disabled={isSimulating}
                title="Kích hoạt bước 5"
                style={{ color: '#059669', borderColor: '#059669' }}
              >
                ▶ Test Bước 5 (Đã giao)
              </button>
            </div>

            {simResult && (
              <div style={{ marginTop: 16, padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
                <strong style={{ color: simResult.success ? '#059669' : '#dc2626' }}>
                  {simResult.success ? '✓ Phản hồi Webhook 200 OK:' : '✕ Lỗi:'}
                </strong>{' '}
                {simResult.message}
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL CẤU HÌNH TOKEN & MÃ CỬA HÀNG (DATABASE) */}
      {isConfigModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsConfigModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>
                  <FiSettings style={{ color: 'var(--primary, #3b82f6)' }} />
                  Cấu Hình Token API & Mã Cửa Hàng (Database)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
                  Dữ liệu được lưu động trực tiếp vào cơ sở dữ liệu MongoDB Atlas (không lưu file .env)
                </p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsConfigModalOpen(false)}
                aria-label="Đóng modal"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className={styles.modalTabs}>
              <button
                type="button"
                className={`${styles.modalTab} ${activeModalCarrier === 'ghn' ? styles.modalTabActive : ''}`}
                onClick={() => setActiveModalCarrier('ghn')}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ea580c' }} />
                Giao Hàng Nhanh (GHN)
              </button>
              <button
                type="button"
                className={`${styles.modalTab} ${activeModalCarrier === 'ghtk' ? styles.modalTabActive : ''}`}
                onClick={() => setActiveModalCarrier('ghtk')}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#15803d' }} />
                Giao Hàng Tiết Kiệm (GHTK)
              </button>
              <button
                type="button"
                className={`${styles.modalTab} ${activeModalCarrier === 'viettelpost' ? styles.modalTabActive : ''}`}
                onClick={() => setActiveModalCarrier('viettelpost')}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#dc2626' }} />
                Viettel Post
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* GHN Form */}
              {activeModalCarrier === 'ghn' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main, #090a0f)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-color, #232838)' }}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: 14 }}>Kích hoạt dịch vụ GHN Express</strong>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>Bật để tính phí tự động và đẩy vận đơn trực tiếp sang GHN</p>
                    </div>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={config.carriers.ghn.enabled}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            carriers: {
                              ...config.carriers,
                              ghn: { ...config.carriers.ghn, enabled: e.target.checked },
                            },
                          })
                        }
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Token API GHN (Lấy từ sso.ghn.vn) *</label>
                    <div className={styles.tokenInputWrap}>
                      <input
                        type={showTokens.ghn ? 'text' : 'password'}
                        className={styles.input}
                        placeholder="VD: f49c1538-9a10-11f1-98fd-3649f7abce24"
                        value={config.carriers.ghn.token}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            carriers: {
                              ...config.carriers,
                              ghn: { ...config.carriers.ghn, token: e.target.value },
                            },
                          })
                        }
                      />
                      <button
                        type="button"
                        className={styles.toggleEyeBtn}
                        onClick={() => setShowTokens({ ...showTokens, ghn: !showTokens.ghn })}
                        title={showTokens.ghn ? 'Ẩn Token' : 'Hiện Token'}
                      >
                        {showTokens.ghn ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                    <span className={styles.helperText}>
                      Token API của tài khoản khách hàng GHN dùng để xác thực các yêu cầu tạo đơn và tính phí.
                    </span>
                  </div>

                  <div className={styles.grid2}>
                    <div className={styles.inputGroup}>
                      <label>Mã Cửa Hàng (Shop ID) GHN *</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="VD: 6611723"
                        value={config.carriers.ghn.shopId}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            carriers: {
                              ...config.carriers,
                              ghn: { ...config.carriers.ghn, shopId: e.target.value },
                            },
                          })
                        }
                      />
                      <span className={styles.helperText}>Mã cửa hàng hiển thị góc trên bên phải trang khachhang.ghn.vn</span>
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Môi trường API</label>
                      <select
                        className={styles.select}
                        value={config.carriers.ghn.environment}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            carriers: {
                              ...config.carriers,
                              ghn: { ...config.carriers.ghn, environment: e.target.value },
                            },
                          })
                        }
                      >
                        <option value="production">Production (Chính thức online-gateway.ghn.vn)</option>
                        <option value="sandbox">Sandbox (Thử nghiệm dev-online-gateway.ghn.vn)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* GHTK Form */}
              {activeModalCarrier === 'ghtk' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main, #090a0f)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-color, #232838)' }}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: 14 }}>Kích hoạt dịch vụ GHTK</strong>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>Dịch vụ Giao Hàng Tiết Kiệm</p>
                    </div>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={config.carriers.ghtk.enabled}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            carriers: {
                              ...config.carriers,
                              ghtk: { ...config.carriers.ghtk, enabled: e.target.checked },
                            },
                          })
                        }
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Token API GHTK *</label>
                    <div className={styles.tokenInputWrap}>
                      <input
                        type={showTokens.ghtk ? 'text' : 'password'}
                        className={styles.input}
                        placeholder="Nhập API Token GHTK..."
                        value={config.carriers.ghtk.token}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            carriers: {
                              ...config.carriers,
                              ghtk: { ...config.carriers.ghtk, token: e.target.value },
                            },
                          })
                        }
                      />
                      <button
                        type="button"
                        className={styles.toggleEyeBtn}
                        onClick={() => setShowTokens({ ...showTokens, ghtk: !showTokens.ghtk })}
                        title={showTokens.ghtk ? 'Ẩn Token' : 'Hiện Token'}
                      >
                        {showTokens.ghtk ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.grid2}>
                    <div className={styles.inputGroup}>
                      <label>Mã Đối Tác (Partner ID)</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="VD: PARTNER_SHOPBIG_01"
                        value={config.carriers.ghtk.partnerId}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            carriers: {
                              ...config.carriers,
                              ghtk: { ...config.carriers.ghtk, partnerId: e.target.value },
                            },
                          })
                        }
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Môi trường API</label>
                      <select
                        className={styles.select}
                        value={config.carriers.ghtk.environment}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            carriers: {
                              ...config.carriers,
                              ghtk: { ...config.carriers.ghtk, environment: e.target.value },
                            },
                          })
                        }
                      >
                        <option value="production">Production (services.giaohangtietkiem.vn)</option>
                        <option value="sandbox">Sandbox (services-dev.giaohangtietkiem.vn)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Viettel Post Form */}
              {activeModalCarrier === 'viettelpost' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main, #090a0f)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-color, #232838)' }}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: 14 }}>Kích hoạt dịch vụ Viettel Post</strong>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>Dịch vụ bưu chính Viettel Post</p>
                    </div>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={config.carriers.viettelpost.enabled}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            carriers: {
                              ...config.carriers,
                              viettelpost: { ...config.carriers.viettelpost, enabled: e.target.checked },
                            },
                          })
                        }
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Token Secret Viettel Post</label>
                    <div className={styles.tokenInputWrap}>
                      <input
                        type={showTokens.viettelpost ? 'text' : 'password'}
                        className={styles.input}
                        placeholder="Nhập API Secret Token..."
                        value={config.carriers.viettelpost.token}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            carriers: {
                              ...config.carriers,
                              viettelpost: { ...config.carriers.viettelpost, token: e.target.value },
                            },
                          })
                        }
                      />
                      <button
                        type="button"
                        className={styles.toggleEyeBtn}
                        onClick={() => setShowTokens({ ...showTokens, viettelpost: !showTokens.viettelpost })}
                        title={showTokens.viettelpost ? 'Ẩn Token' : 'Hiện Token'}
                      >
                        {showTokens.viettelpost ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.grid2}>
                    <div className={styles.inputGroup}>
                      <label>Tài khoản Doanh Nghiệp (Username)</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="VD: account.dev.vtp@viettelpost.com"
                        value={config.carriers.viettelpost.username}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            carriers: {
                              ...config.carriers,
                              viettelpost: { ...config.carriers.viettelpost, username: e.target.value },
                            },
                          })
                        }
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Môi trường API</label>
                      <select
                        className={styles.select}
                        value={config.carriers.viettelpost.environment}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            carriers: {
                              ...config.carriers,
                              viettelpost: { ...config.carriers.viettelpost, environment: e.target.value },
                            },
                          })
                        }
                      >
                        <option value="production">Production (partner.viettelpost.vn)</option>
                        <option value="sandbox">Sandbox (partner-dev.viettelpost.vn)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => handleTestConnection(activeModalCarrier, config.carriers[activeModalCarrier]?.token)}
                disabled={testingProvider === activeModalCarrier}
              >
                <FiActivity /> {testingProvider === activeModalCarrier ? 'Đang kiểm tra...' : `Test kết nối ${activeModalCarrier.toUpperCase()}`}
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setIsConfigModalOpen(false)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={async () => {
                    await handleSave();
                    setIsConfigModalOpen(false);
                  }}
                  disabled={saving}
                >
                  <FiSave /> {saving ? 'Đang lưu...' : '💾 Lưu Cấu Hình Vào Database'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

