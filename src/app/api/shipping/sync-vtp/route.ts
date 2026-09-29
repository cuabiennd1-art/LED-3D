import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import { trackViettelPostOrder } from '@/lib/shipping/viettelpost';

export const dynamic = 'force-dynamic';

/**
 * Sync active shipping orders with Viettel Post live API
 */
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json().catch(() => ({}));
    const targetOrderId = body.orderId;

    const query: any = targetOrderId
      ? { _id: targetOrderId }
      : {
          status: { $in: ['shipping', 'confirmed'] },
          trackingCode: { $exists: true, $ne: '' },
        };

    const orders = await Order.find(query);
    if (!orders || orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không có đơn hàng nào cần đồng bộ từ Viettel Post',
        syncedCount: 0,
        updatedCount: 0,
      });
    }

    let updatedCount = 0;
    const updates: any[] = [];

    for (const order of orders) {
      const code = (order.trackingCode || '').trim();
      const carrier = (order.shippingCarrier || order.shippingProvider || '').toLowerCase();

      // Only sync Viettel Post orders (identified by carrier name or 11-13 digits or VTP prefix)
      const isVtp =
        carrier.includes('viettel') ||
        carrier.includes('vtp') ||
        code.startsWith('VTP') ||
        /^\d{11,13}$/.test(code);

      if (!isVtp || !code) continue;

      try {
        const live = await trackViettelPostOrder(code);
        if (!live || !live.success) continue;

        const vtpStatusCode = live.orderStatus ? Number(live.orderStatus) : 0;
        let isChanged = false;

        // 1. Viettel Post: Giao thành công (106) hoặc Thành công chờ đối soát COD (501)
        if ([106, 501].includes(vtpStatusCode) && order.status !== 'delivered') {
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
            description: `Viettel Post xác nhận đã giao hàng thành công tới khách hàng (Mã trạng thái: ${vtpStatusCode}).`,
            carrier: 'Viettel Post',
            createdAt: new Date(),
          });
          isChanged = true;
          updates.push({ orderCode: order.orderCode, trackingCode: code, newStatus: 'delivered', vtpStatusCode });
        }
        // 2. Viettel Post: Hủy đơn hàng (107, 201, 507)
        else if ([107, 201, 507].includes(vtpStatusCode) && order.status !== 'cancelled') {
          order.status = 'cancelled';
          order.shippingStatus = 'cancelled';
          if (!order.shippingLogs) order.shippingLogs = [];
          order.shippingLogs.push({
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            status: 'Hủy đơn hàng',
            location: 'Hệ thống Viettel Post',
            description: `Đơn hàng đã được hủy trên hệ thống Viettel Post (Mã trạng thái: ${vtpStatusCode}).`,
            carrier: 'Viettel Post',
            createdAt: new Date(),
          });
          isChanged = true;
          updates.push({ orderCode: order.orderCode, trackingCode: code, newStatus: 'cancelled', vtpStatusCode });
        }

        if (isChanged) {
          await order.save();
          updatedCount++;
        }
      } catch (err: any) {
        console.error(`Lỗi đồng bộ đơn #${order.orderCode} từ VTP:`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã kiểm tra đồng bộ ${orders.length} đơn hàng. Cập nhật mới: ${updatedCount} đơn hàng thành công!`,
      syncedCount: orders.length,
      updatedCount,
      updates,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi khi đồng bộ đơn từ Viettel Post' },
      { status: 500 }
    );
  }
}
