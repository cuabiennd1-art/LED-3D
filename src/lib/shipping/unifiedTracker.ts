import connectToDatabase from '@/lib/mongodb';
import Setting from '@/models/Setting';
import Order from '@/models/Order';
import { trackGHNOrder } from './ghn';
import { trackGHTKOrder } from './ghtk';
import { trackViettelPostOrder } from './viettelpost';
import { resolveCoordinates, LOGISTICS_HUBS } from './vietnamCoordinates';

export interface TrackingStep {
  time: string;
  title: string;
  desc: string;
  location?: string;
  coordinates?: [number, number];
  status: 'completed' | 'current' | 'pending';
}

export interface RoutePoint {
  id: string;
  name: string;
  title: string;
  desc: string;
  time: string;
  lat: number;
  lng: number;
  type: 'origin' | 'hub' | 'station' | 'destination';
  status: 'completed' | 'current' | 'pending';
}

export interface UnifiedTrackingResult {
  success: boolean;
  orderCode?: string;
  trackingCode: string;
  carrierName: string;
  carrierCode: 'ghn' | 'ghtk' | 'viettelpost' | 'standard';
  currentStatus: string;
  statusText: string;
  statusCode: 'pending' | 'confirmed' | 'shipping' | 'delivering' | 'delivered' | 'cancelled';
  estimatedDelivery?: string;
  isLive: boolean; // True if fetched from 3rd party live API
  customerInfo?: {
    name: string;
    phone: string;
    address: string;
  };
  timeline: TrackingStep[];
  routePoints: RoutePoint[];
}

export async function getUnifiedOrderTracking(query: {
  orderCode?: string;
  trackingCode?: string;
  carrier?: string;
}): Promise<UnifiedTrackingResult> {
  await connectToDatabase();

  let order: any = null;

  // 1. If orderCode provided, lookup in MongoDB
  if (query.orderCode) {
    order = await Order.findOne({
      $or: [
        { orderCode: query.orderCode.trim() },
        { trackingCode: query.orderCode.trim() },
      ],
    });
  } else if (query.trackingCode) {
    order = await Order.findOne({ trackingCode: query.trackingCode.trim() });
  }

  const effectiveOrderCode = order?.orderCode || query.orderCode || 'ST' + Date.now().toString().slice(-6);
  const effectiveCarrier = (order?.shippingProvider || order?.shippingCarrier || query.carrier || 'ghtk').toLowerCase();
  const effectiveTrackingCode = order?.trackingCode || query.trackingCode || generateTrackingCode(effectiveCarrier, effectiveOrderCode);

  let carrierCode: 'ghn' | 'ghtk' | 'viettelpost' | 'standard' = 'ghtk';
  let carrierName = 'Giao Hàng Tiết Kiệm (GHTK)';

  if (effectiveCarrier.includes('ghn') || effectiveTrackingCode.startsWith('GHN')) {
    carrierCode = 'ghn';
    carrierName = 'Giao Hàng Nhanh (GHN)';
  } else if (
    effectiveCarrier.includes('viettel') ||
    effectiveCarrier.includes('vtp') ||
    effectiveTrackingCode.startsWith('VTP') ||
    /^\d{11,13}$/.test(effectiveTrackingCode)
  ) {
    carrierCode = 'viettelpost';
    carrierName = 'Viettel Post';
  } else if (effectiveCarrier.includes('standard') || effectiveCarrier.includes('tiêu chuẩn')) {
    carrierCode = 'standard';
    carrierName = 'Giao Hàng Tiêu Chuẩn';
  }

  // 2. Try fetching from 3rd-party Live API
  let liveData: any = null;
  try {
    if (carrierCode === 'ghn') {
      liveData = await trackGHNOrder(effectiveTrackingCode);
    } else if (carrierCode === 'ghtk') {
      liveData = await trackGHTKOrder(effectiveTrackingCode);
    } else if (carrierCode === 'viettelpost') {
      liveData = await trackViettelPostOrder(effectiveTrackingCode);
    }
  } catch (e) {
    console.error('3rd party live tracking fetch failed:', e);
  }

  // If live data returned with valid logs
  if (liveData && liveData.success && liveData.logs && liveData.logs.length > 0) {
    const isVtpCancelled = liveData.orderStatus === 107 || liveData.status_id === 107;
    const isVtpDelivered = liveData.orderStatus === 106 || liveData.orderStatus === 501;

    // Automatically synchronize DB order status if carrier reports delivered or cancelled
    if (order) {
      let shouldSave = false;
      if (isVtpDelivered && order.status !== 'delivered') {
        order.status = 'delivered';
        order.shippingStatus = 'delivered';
        if (order.paymentMethod === 'cod') {
          order.paymentStatus = 'paid';
        }
        if (!order.shippingLogs) order.shippingLogs = [];
        order.shippingLogs.push({
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          status: 'Đã giao thành công',
          location: 'Bưu cục Viettel Post',
          description: `Hãng vận chuyển Viettel Post xác nhận đã giao hàng thành công tới người nhận (Mã trạng thái: ${liveData.orderStatus}).`,
          carrier: 'Viettel Post',
          createdAt: new Date(),
        });
        shouldSave = true;
      } else if (isVtpCancelled && order.status !== 'cancelled') {
        order.status = 'cancelled';
        order.shippingStatus = 'cancelled';
        if (!order.shippingLogs) order.shippingLogs = [];
        order.shippingLogs.push({
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          status: 'Hủy đơn hàng',
          location: 'Hệ thống Viettel Post',
          description: `Đơn hàng đã được hủy trên hệ thống Viettel Post (Mã trạng thái: 107).`,
          carrier: 'Viettel Post',
          createdAt: new Date(),
        });
        shouldSave = true;
      }

      if (shouldSave) {
        order.save().catch((err: any) => console.error('Lỗi tự động lưu đơn từ Live Tracking:', err.message));
      }
    }

    const timeline: TrackingStep[] = liveData.logs.map((log: any, index: number) => {
      const loc = log.location || log.warehouse || 'Bưu cục trung chuyển';
      const coords = resolveCoordinates(loc, order?.customer?.province, order?.customer?.district);
      return {
        time: log.time || log.updated_date || log.created_at || new Date().toLocaleString('vi-VN'),
        title: log.status_name || log.title || 'Cập nhật trạng thái',
        desc: log.description || log.desc || log.note || 'Kiện hàng đang được xử lý',
        location: loc,
        coordinates: coords,
        status: (index === 0 ? 'current' : 'completed') as 'completed' | 'current' | 'pending',
      };
    });

    const effectiveStatus = isVtpCancelled ? 'cancelled' : isVtpDelivered ? 'delivered' : (order?.status || 'shipping');
    const routePoints: RoutePoint[] = buildRoutePointsFromTimeline(timeline, order?.customer, carrierName, effectiveStatus);

    return {
      success: true,
      orderCode: effectiveOrderCode,
      trackingCode: effectiveTrackingCode,
      carrierName,
      carrierCode,
      currentStatus: effectiveStatus,
      statusText: liveData.statusName || liveData.statusText || (isVtpCancelled ? 'Đã hủy đơn hàng' : isVtpDelivered ? 'Đã giao thành công' : mapStatusToText(effectiveStatus)),
      statusCode: effectiveStatus,
      isLive: true,
      customerInfo: order?.customer ? {
        name: order.customer.name,
        phone: order.customer.phone,
        address: order.customer.address,
      } : undefined,
      timeline,
      routePoints,
    };
  }

  // 3. Fallback: Generate structured realistic timeline according to Order status & timestamps
  const baseTime = order?.createdAt ? new Date(order.createdAt).getTime() : Date.now() - 3600 * 1000 * 24;
  const orderStatus = order?.status || 'shipping';

  const timeline = generateRealisticTimeline(orderStatus, baseTime, carrierName, order?.customer);
  const routePoints: RoutePoint[] = buildRoutePointsFromTimeline(timeline, order?.customer, carrierName, orderStatus);

  return {
    success: true,
    orderCode: effectiveOrderCode,
    trackingCode: effectiveTrackingCode,
    carrierName,
    carrierCode,
    currentStatus: orderStatus,
    statusText: mapStatusToText(orderStatus),
    statusCode: orderStatus,
    estimatedDelivery: new Date(baseTime + 2 * 24 * 3600 * 1000).toLocaleDateString('vi-VN'),
    isLive: false,
    customerInfo: order?.customer ? {
      name: order.customer.name,
      phone: order.customer.phone,
      address: order.customer.address,
    } : undefined,
    timeline,
    routePoints,
  };
}

function generateTrackingCode(carrier: string, orderCode: string): string {
  const hash = orderCode.replace(/\D/g, '') || String(Math.floor(100000 + Math.random() * 900000));
  if (carrier.includes('ghn')) return `GHN${hash}VN`;
  if (carrier.includes('viettel')) return `VTP${hash}POST`;
  return `GHTK.${hash}.HN`;
}

function mapStatusToText(status: string): string {
  switch (status) {
    case 'pending': return 'Đã tiếp nhận - Chờ đóng gói';
    case 'confirmed': return 'Đã xác nhận đơn - Đang đóng gói';
    case 'shipping': return 'Đang vận chuyển liên tỉnh';
    case 'delivering': return 'Shipper đang giao hàng';
    case 'delivered': return 'Đã giao hàng thành công';
    case 'cancelled': return 'Đơn hàng đã hủy';
    default: return 'Đang xử lý đơn hàng';
  }
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${hours}:${minutes} - ${day}/${month}/${year}`;
}

function generateRealisticTimeline(status: string, baseTime: number, carrierName: string, customer?: any): TrackingStep[] {
  const customerLoc = customer?.district ? `${customer.district}, ${customer.province || 'Hà Nội'}` : 'Địa chỉ người nhận';
  const customerCoords = resolveCoordinates(customerLoc, customer?.province, customer?.district);

  const allSteps: Array<{ title: string; desc: string; location: string; coordinates: [number, number]; offsetHours: number; activeAt: string[] }> = [
    {
      title: 'Đơn hàng đã được đặt thành công',
      desc: 'Hệ thống ShopBig đã tiếp nhận đơn hàng của quý khách.',
      location: 'Hệ thống ShopBig Store',
      coordinates: LOGISTICS_HUBS.kho_shopbig,
      offsetHours: 0,
      activeAt: ['pending', 'confirmed', 'shipping', 'delivering', 'delivered'],
    },
    {
      title: 'Shop đã đóng gói & Bàn giao bưu tá',
      desc: `Đơn hàng đã bàn giao cho đơn vị vận chuyển ${carrierName}.`,
      location: 'Kho hàng ShopBig (Mỹ Đình, Nam Từ Liêm)',
      coordinates: LOGISTICS_HUBS.kho_shopbig,
      offsetHours: 3,
      activeAt: ['confirmed', 'shipping', 'delivering', 'delivered'],
    },
    {
      title: 'Kiện hàng nhập kho trung chuyển tổng',
      desc: `${carrierName} đã tiếp nhận tại bưu cục và đang phân loại luân chuyển.`,
      location: 'Trung tâm khai thác Bắc Ninh',
      coordinates: LOGISTICS_HUBS.kho_bac_ninh,
      offsetHours: 12,
      activeAt: ['shipping', 'delivering', 'delivered'],
    },
    {
      title: 'Đang vận chuyển đến bưu cục phát',
      desc: 'Kiện hàng đang được trung chuyển tới bưu cục phụ trách địa bàn người nhận.',
      location: `Bưu cục phát (${customerLoc})`,
      coordinates: [customerCoords[0] + 0.015, customerCoords[1] - 0.015],
      offsetHours: 28,
      activeAt: ['delivering', 'delivered'],
    },
    {
      title: 'Shipper đang trên đường giao hàng',
      desc: 'Nhân viên giao hàng đang liên hệ để giao kiện hàng tới quý khách.',
      location: customerLoc,
      coordinates: [customerCoords[0] + 0.005, customerCoords[1] - 0.005],
      offsetHours: 34,
      activeAt: ['delivering', 'delivered'],
    },
    {
      title: 'Giao hàng thành công',
      desc: 'Người nhận đã nhận kiện hàng nguyên vẹn và hoàn tất đơn hàng.',
      location: customerLoc,
      coordinates: customerCoords,
      offsetHours: 36,
      activeAt: ['delivered'],
    },
  ];

  if (status === 'cancelled') {
    return [
      {
        time: formatTime(baseTime),
        title: 'Đơn hàng đã đặt',
        desc: 'Hệ thống ghi nhận đơn hàng.',
        location: 'ShopBig Store',
        coordinates: LOGISTICS_HUBS.kho_shopbig,
        status: 'completed',
      },
      {
        time: formatTime(baseTime + 3600 * 1000),
        title: 'Đơn hàng đã bị hủy',
        desc: 'Đơn hàng đã hủy theo yêu cầu hoặc quá hạn xử lý.',
        location: 'Hệ thống',
        coordinates: LOGISTICS_HUBS.kho_shopbig,
        status: 'current',
      },
    ];
  }

  const reachedSteps = allSteps.filter((s) => s.activeAt.includes(status));

  return reachedSteps.map((step, idx) => {
    const isLast = idx === reachedSteps.length - 1;
    return {
      time: formatTime(baseTime + step.offsetHours * 3600 * 1000),
      title: step.title,
      desc: step.desc,
      location: step.location,
      coordinates: step.coordinates,
      status: (isLast ? 'current' : 'completed') as 'completed' | 'current' | 'pending',
    };
  }).reverse(); // Most recent on top
}

function buildRoutePointsFromTimeline(
  timeline: TrackingStep[],
  customer?: any,
  carrierName = 'GHTK',
  orderStatus = 'shipping'
): RoutePoint[] {
  const customerLoc = customer?.address || customer?.district || 'Địa chỉ khách hàng';
  const destCoords = resolveCoordinates(customerLoc, customer?.province, customer?.district);

  // Status mappings to match 5 steps
  const isOriginDone = orderStatus !== 'pending';

  const isHubDone = ['shipping', 'delivering', 'delivered'].includes(orderStatus);
  const isHubCurrent = orderStatus === 'confirmed';

  const isStationDone = ['delivering', 'delivered'].includes(orderStatus);
  const isStationCurrent = orderStatus === 'shipping';

  const isDestDone = orderStatus === 'delivered';
  const isDestCurrent = orderStatus === 'delivering';

  // Point 1: Kho Shop (Xuất phát)
  const origin: RoutePoint = {
    id: 'pt_origin',
    name: 'Kho ShopBig Store',
    title: 'Điểm xuất phát (Kho Shop)',
    desc: 'Số 10 Phạm Hùng, Mỹ Đình, Hà Nội',
    time: timeline[timeline.length - 1]?.time || '09:00',
    lat: LOGISTICS_HUBS.kho_shopbig[0],
    lng: LOGISTICS_HUBS.kho_shopbig[1],
    type: 'origin',
    status: isOriginDone ? 'completed' : 'current',
  };

  // Point 2: Kho Tổng Trung Chuyển
  const hub: RoutePoint = {
    id: 'pt_hub',
    name: `Kho Tổng Khai Thác ${carrierName}`,
    title: 'Trung tâm phân loại trung chuyển',
    desc: 'Kho tổng phân loại liên tỉnh',
    time: timeline[Math.max(0, timeline.length - 2)]?.time || '14:00',
    lat: LOGISTICS_HUBS.kho_bac_ninh[0],
    lng: LOGISTICS_HUBS.kho_bac_ninh[1],
    type: 'hub',
    status: isHubDone ? 'completed' : (isHubCurrent ? 'current' : 'pending'),
  };

  // Point 3: Bưu Cục Phát Hàng
  const station: RoutePoint = {
    id: 'pt_station',
    name: `Bưu Cục Phát ${carrierName}`,
    title: 'Bưu cục phụ trách giao hàng',
    desc: `Bưu cục ${customer?.district || 'khu vực người nhận'}`,
    time: timeline[1]?.time || '08:00',
    lat: destCoords[0] + 0.012,
    lng: destCoords[1] - 0.012,
    type: 'station',
    status: isStationDone ? 'completed' : (isStationCurrent ? 'current' : 'pending'),
  };

  // Point 4: Địa Chỉ Khách Hàng (Người Nhận)
  const destination: RoutePoint = {
    id: 'pt_dest',
    name: customer?.name || 'Địa Chỉ Người Nhận',
    title: 'Điểm nhận hàng',
    desc: customer?.address || 'Địa chỉ giao hàng của quý khách',
    time: timeline[0]?.time || 'Dự kiến',
    lat: destCoords[0],
    lng: destCoords[1],
    type: 'destination',
    status: isDestDone ? 'completed' : (isDestCurrent ? 'current' : 'pending'),
  };

  return [origin, hub, station, destination];
}
