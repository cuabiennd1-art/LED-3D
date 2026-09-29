import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';

export async function GET() {
  return NextResponse.json({
    success: true,
    service: 'ShopBig Logistics 3rd-Party Webhook Listener',
    supportedCarriers: ['GHN (Giao Hàng Nhanh)', 'GHTK (Giao Hàng Tiết Kiệm)', 'Viettel Post'],
    status: 'online',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const queryCarrier = url.searchParams.get('carrier')?.toLowerCase();
    const body = await request.json();

    let orderCode = '';
    let trackingCode = '';
    let carrierName = '';
    let carrierStatus = '';
    let unifiedStatus: 'pending' | 'confirmed' | 'shipping' | 'delivering' | 'delivered' | 'cancelled' | 'returned' = 'shipping';
    let stepNumber = 3;
    let location = '';
    let description = '';
    let shipperName = '';
    let shipperPhone = '';
    let eventTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    // 1. Detect Carrier & Parse GHN Webhook Payload
    if (queryCarrier === 'ghn' || body.OrderCode || body.ClientOrderCode || body.Status) {
      carrierName = 'Giao Hàng Nhanh (GHN)';
      orderCode = (body.ClientOrderCode || body.client_order_code || '').toUpperCase();
      trackingCode = body.OrderCode || body.order_code || '';
      carrierStatus = (body.Status || body.status || '').toLowerCase();
      location = body.Warehouse || body.Location || body.hub_name || 'Bưu cục GHN';
      description = body.Description || body.description || '';
      shipperName = body.ShipperName || body.shipper_name || '';
      shipperPhone = body.ShipperPhone || body.shipper_phone || '';

      switch (carrierStatus) {
        case 'ready_to_pick':
          unifiedStatus = 'confirmed';
          stepNumber = 2;
          description = description || 'GHN đã tiếp nhận yêu cầu lấy hàng từ Shop';
          break;
        case 'picking':
        case 'picked':
        case 'storing':
        case 'transporting':
        case 'sorting':
          unifiedStatus = 'shipping';
          stepNumber = 3;
          description = description || 'Đã bàn giao kiện hàng cho GHN, đang vận chuyển qua trung tâm điều phối';
          break;
        case 'delivering':
        case 'money_collect_delivering':
          unifiedStatus = 'delivering';
          stepNumber = 4;
          description = description || `Shipper ${shipperName ? `${shipperName} ` : ''}đang trên đường giao hàng đến bạn`;
          break;
        case 'delivered':
          unifiedStatus = 'delivered';
          stepNumber = 5;
          description = description || 'Kiện hàng đã được giao thành công tới người nhận';
          break;
        case 'cancel':
          unifiedStatus = 'cancelled';
          description = description || 'Đơn hàng vận chuyển đã bị hủy';
          break;
        case 'return':
        case 'returning':
        case 'returned':
          unifiedStatus = 'returned';
          description = description || 'Giao không thành công, hàng đang được hoàn trả cho Shop';
          break;
        default:
          unifiedStatus = 'shipping';
          stepNumber = 3;
          description = description || `Cập nhật trạng thái vận chuyển: ${carrierStatus}`;
      }
    }
    // 2. Parse GHTK Webhook Payload
    else if (queryCarrier === 'ghtk' || body.partner_id || body.label_id || typeof body.status_id !== 'undefined') {
      carrierName = 'Giao Hàng Tiết Kiệm (GHTK)';
      orderCode = (body.partner_id || body.partner_order_id || '').toUpperCase();
      trackingCode = body.label_id || body.tracking_id || '';
      const statusId = Number(body.status_id);
      location = body.hub_name || body.address || 'Kho trung chuyển GHTK';
      description = body.reason || body.message || '';

      if ([1, 2, 7, 10].includes(statusId)) {
        unifiedStatus = 'confirmed';
        stepNumber = 2;
        description = description || 'GHTK đã tiếp nhận đơn hàng, chuẩn bị lấy hàng';
      } else if ([3, 8, 123].includes(statusId)) {
        unifiedStatus = 'shipping';
        stepNumber = 3;
        description = description || 'GHTK đã nhận hàng từ Shop và đang luân chuyển';
      } else if ([4, 12, 127].includes(statusId)) {
        unifiedStatus = 'delivering';
        stepNumber = 4;
        description = description || 'Shipper GHTK đang đi phát kiện hàng đến bạn';
      } else if ([5, 6, 45].includes(statusId)) {
        unifiedStatus = 'delivered';
        stepNumber = 5;
        description = description || 'GHTK đã giao hàng thành công';
      } else if ([9, 11, 20, 21].includes(statusId)) {
        unifiedStatus = 'returned';
        description = description || 'Đơn hàng không phát được, GHTK đang chuyển hoàn';
      }
    }
    // 3. Parse Viettel Post Webhook Payload
    else if (queryCarrier === 'viettelpost' || queryCarrier === 'vtp' || body.ORDER_NUMBER || body.ORDER_STATUS) {
      carrierName = 'Viettel Post';
      orderCode = (body.ORDER_REFERENCE || body.ORDER_NUMBER || '').toUpperCase();
      trackingCode = body.ORDER_NUMBER || '';
      const vtpStatus = Number(body.ORDER_STATUS);
      location = body.LOCAL_ADDRESS || 'Bưu cục Viettel Post';
      description = body.NOTE || '';

      if ([100, 102, 103].includes(vtpStatus)) {
        unifiedStatus = 'confirmed';
        stepNumber = 2;
        description = description || 'Viettel Post đã tiếp nhận thông tin đơn hàng';
      } else if ([104, 200, 300, 400].includes(vtpStatus)) {
        unifiedStatus = 'shipping';
        stepNumber = 3;
        description = description || 'Bưu tá Viettel Post đã gom hàng và đang phân loại';
      } else if ([500, 506].includes(vtpStatus)) {
        unifiedStatus = 'delivering';
        stepNumber = 4;
        description = description || 'Bưu tá Viettel Post đang giao hàng tận nơi';
      } else if (vtpStatus === 501) {
        unifiedStatus = 'delivered';
        stepNumber = 5;
        description = description || 'Giao hàng thành công tới khách hàng';
      } else if ([502, 504, 505].includes(vtpStatus)) {
        unifiedStatus = 'returned';
        description = description || 'Giao hàng không thành công, bưu cục giữ chờ phát lại hoặc chuyển hoàn';
      } else if ([107, 201, 507].includes(vtpStatus)) {
        unifiedStatus = 'cancelled';
        stepNumber = 0;
        description = description || 'Đơn hàng đã được hủy trên hệ thống Viettel Post';
      }
    }
    // 4. Direct / Generic Simulation Payload
    else {
      orderCode = (body.orderCode || '').toUpperCase();
      trackingCode = body.trackingCode || '';
      carrierName = body.carrier || 'Đơn vị vận chuyển';
      unifiedStatus = body.status || 'shipping';
      stepNumber = Number(body.step || (unifiedStatus === 'delivering' ? 4 : unifiedStatus === 'delivered' ? 5 : 3));
      location = body.location || 'Bưu cục vận chuyển';
      description = body.description || `Cập nhật trạng thái: ${unifiedStatus}`;
      shipperName = body.shipperName || '';
      shipperPhone = body.shipperPhone || '';
    }

    // Search target order
    const searchQuery: any = {};
    if (orderCode) {
      searchQuery.$or = [{ orderCode }, { trackingCode: orderCode }];
    } else if (trackingCode) {
      searchQuery.trackingCode = trackingCode;
    } else {
      return NextResponse.json(
        { success: false, message: 'Thiếu mã đơn hàng (orderCode / ClientOrderCode / trackingCode) trong payload' },
        { status: 400 }
      );
    }

    const order = await Order.findOne(searchQuery);
    if (!order) {
      return NextResponse.json(
        { success: false, message: `Không tìm thấy đơn hàng tương ứng với mã ${orderCode || trackingCode}` },
        { status: 404 }
      );
    }

    // Create new shipping log entry
    const newLog = {
      time: eventTime,
      status:
        unifiedStatus === 'confirmed'
          ? 'Đã xác nhận đơn'
          : unifiedStatus === 'shipping'
          ? 'Bàn giao vận chuyển'
          : unifiedStatus === 'delivering'
          ? 'Đang giao hàng'
          : unifiedStatus === 'delivered'
          ? 'Đã giao thành công'
          : unifiedStatus === 'returned'
          ? 'Chuyển hoàn'
          : 'Hủy đơn',
      location,
      description,
      shipperName,
      shipperPhone,
      carrier: carrierName,
      createdAt: new Date(),
    };

    // Update order
    order.status = unifiedStatus;
    if (carrierName) order.shippingCarrier = carrierName;
    if (trackingCode && !order.trackingCode) order.trackingCode = trackingCode;
    order.shippingStatus = carrierStatus || unifiedStatus;

    if (!order.shippingLogs) {
      order.shippingLogs = [];
    }
    order.shippingLogs.push(newLog);

    // If order is COD and delivered -> mark payment as paid
    if (unifiedStatus === 'delivered' && order.paymentMethod === 'cod') {
      order.paymentStatus = 'paid';
    }

    await order.save();

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật tiến trình vận chuyển thành công cho đơn #${order.orderCode} (${newLog.status} - Bước ${stepNumber}/5)`,
      data: {
        orderCode: order.orderCode,
        trackingCode: order.trackingCode,
        status: order.status,
        stepNumber,
        carrier: carrierName,
        latestLog: newLog,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi xử lý webhook vận chuyển' },
      { status: 500 }
    );
  }
}
