import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { checkOrderLowStock, deductOrderInventory, restoreOrderInventory } from '@/lib/inventory-helper';
import { createGHNOrder, cancelGHNOrder } from '@/lib/shipping/ghn';
import { createGHTKOrder, cancelGHTKOrder } from '@/lib/shipping/ghtk';
import { createViettelPostOrder, cancelViettelPostOrder } from '@/lib/shipping/viettelpost';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    let order;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(id);
    } else {
      order = await Order.findOne({ orderCode: id.toUpperCase() });
    }

    if (!order) {
      return NextResponse.json(
        { success: false, message: `Không tìm thấy đơn hàng #${id.toUpperCase()}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi tải đơn hàng' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    let order;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(id);
    } else {
      order = await Order.findOne({ orderCode: id.toUpperCase() });
    }

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy đơn hàng để cập nhật' },
        { status: 404 }
      );
    }

    const previousStatus = order.status;
    const newStatus = body.status || previousStatus;

    // TỰ ĐỘNG ĐẨY ĐƠN SANG HÃNG VẬN CHUYỂN BÊN THỨ 3 KHI ADMIN CHUYỂN SANG "ĐANG GIAO HÀNG" (NẾU CHƯA CÓ MÃ VẬN ĐƠN)
    if (
      (newStatus === 'shipping' || newStatus === 'delivering') &&
      !body.trackingCode &&
      (!order.trackingCode || order.trackingCode.startsWith('TEMP-')) &&
      body.shippingProvider !== 'internal'
    ) {
      const rawProvider = (body.shippingProvider || order.shippingProvider || order.shippingCarrier || 'ghn').toLowerCase();
      let provider = 'ghn';
      if (rawProvider.includes('ghtk') || rawProvider.includes('tiết kiệm') || rawProvider.includes('tiet kiem')) {
        provider = 'ghtk';
      } else if (rawProvider.includes('viettel') || rawProvider.includes('vtp')) {
        provider = 'viettelpost';
      } else {
        provider = 'ghn';
      }

      try {
        const orderData = {
          orderCode: order.orderCode,
          paymentMethod: order.paymentMethod,
          totalAmount: order.totalAmount,
          to_name: order.customer?.name,
          to_phone: order.customer?.phone,
          to_address: order.customer?.address,
          province: order.customer?.province,
          district: order.customer?.district,
          ward: order.customer?.ward,
          customer: order.customer,
          items: order.items,
          cod_amount: order.paymentStatus === 'paid' ? 0 : order.totalAmount,
          weight: 500,
        };

        let result: { trackingCode: string; fee: number };
        if (provider === 'ghtk') {
          result = await createGHTKOrder(orderData);
        } else if (provider === 'viettelpost') {
          result = await createViettelPostOrder(orderData);
        } else {
          result = await createGHNOrder(orderData);
        }

        if (result && result.trackingCode) {
          order.trackingCode = result.trackingCode;
          order.shippingProvider = provider;
          order.shippingCarrier =
            provider === 'ghtk'
              ? 'Giao Hàng Tiết Kiệm (GHTK)'
              : provider === 'viettelpost'
              ? 'Viettel Post'
              : 'Giao Hàng Nhanh (GHN)';
          order.shippingStatus = 'ready_to_pick';

          const newLog = {
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            status: 'Bàn giao vận chuyển',
            location: 'Kho tổng ShopBig Store',
            description: `Admin đã chuyển đơn sang Đang Giao Hàng. Hệ thống đã đẩy đơn sang ${order.shippingCarrier} (Mã vận đơn: ${result.trackingCode}) để Shipper đến lấy hàng.`,
            carrier: order.shippingCarrier,
            createdAt: new Date(),
          };

          if (!order.shippingLogs) order.shippingLogs = [];
          order.shippingLogs.push(newLog);
        }
      } catch (shippingErr: any) {
        console.error('Tự động đẩy đơn sang hãng vận chuyển gặp sự cố:', shippingErr.message);
      }
    }

    // TỰ ĐỘNG HỦY VẬN ĐƠN PHÍA HÃNG KHI ADMIN HỦY ĐƠN (CANCELLED)
    let cancelShippingResult: { success: boolean; message: string } | null = null;
    if (newStatus === 'cancelled') {
      order.shippingStatus = 'cancelled';
      if (order.trackingCode) {
        try {
          if ((order.shippingProvider || '').includes('ghtk') || (order.shippingCarrier || '').includes('GHTK')) {
            cancelShippingResult = await cancelGHTKOrder(order.trackingCode);
          } else if ((order.shippingProvider || '').includes('ghn') || (order.shippingCarrier || '').includes('GHN')) {
            cancelShippingResult = await cancelGHNOrder(order.trackingCode);
          } else if (
            (order.shippingProvider || '').toLowerCase().includes('viettel') ||
            (order.shippingCarrier || '').toLowerCase().includes('viettel') ||
            (order.trackingCode || '').startsWith('VTP') ||
            /^\d{11,13}$/.test(order.trackingCode || '')
          ) {
            cancelShippingResult = await cancelViettelPostOrder(order.trackingCode);
          }

          if (cancelShippingResult) {
            if (!order.shippingLogs) order.shippingLogs = [];
            order.shippingLogs.push({
              time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              status: cancelShippingResult.success ? 'Hủy vận đơn thành công' : 'Yêu cầu hủy vận đơn thất bại',
              location: 'Hệ thống vận chuyển',
              description: cancelShippingResult.success
                ? `Đã gửi lệnh hủy vận đơn sang ${order.shippingCarrier || 'Viettel Post'} thành công (Mã vận đơn: ${order.trackingCode}). Phản hồi: ${cancelShippingResult.message}`
                : `Hãng vận chuyển ${order.shippingCarrier || 'Viettel Post'} từ chối hủy hoặc có lỗi: ${cancelShippingResult.message}`,
              carrier: order.shippingCarrier || order.shippingProvider,
              createdAt: new Date(),
            });
          }
        } catch (err: any) {
          console.error('Lỗi khi gửi yêu cầu hủy vận đơn sang hãng:', err.message);
          if (!order.shippingLogs) order.shippingLogs = [];
          order.shippingLogs.push({
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            status: 'Lỗi hủy vận đơn',
            location: 'Hệ thống vận chuyển',
            description: `Không thể kết nối tới ${order.shippingCarrier || 'hãng'} để hủy mã ${order.trackingCode}: ${err.message}`,
            carrier: order.shippingCarrier || order.shippingProvider,
            createdAt: new Date(),
          });
        }
      }
    }

    // TỰ ĐỘNG TRỪ HOẶC HOÀN TRẢ TỒN KHO THEO TRẠNG THÁI ĐƠN HÀNG
    const isNowActive = ['confirmed', 'shipping', 'delivering', 'delivered'].includes(newStatus);
    const isNowInactive = ['cancelled', 'returned'].includes(newStatus);

    // 1. KIỂM TRA CẢNH BÁO TỒN KHO TRƯỚC KHI DUYỆT ĐƠN (NẾU CHƯA FORCE)
    if (isNowActive && !order.inventoryDeducted && Array.isArray(order.items) && order.items.length > 0 && !body.forceConfirm) {
      const lowStockItems = await checkOrderLowStock(order);

      if (lowStockItems.length > 0) {
        const lowStockWarnings = lowStockItems.map(
          (it) => `"${it.productName}" (${it.variantTitle || 'Phân loại'}) chỉ còn ${it.availableStock} cái trong kho (đơn đặt: ${it.orderedQuantity})`
        );

        return NextResponse.json({
          success: false,
          requiresConfirmation: true,
          lowStockItems,
          lowStockWarnings,
          message: `Cảnh báo tồn kho không đủ: ${lowStockWarnings.join('; ')}`,
        }, { status: 409 });
      }
    }

    // 2. TRỪ TỒN KHO KHI DUYỆT ĐƠN
    if (isNowActive && !order.inventoryDeducted && Array.isArray(order.items) && order.items.length > 0) {
      await deductOrderInventory(order);
    } else if (isNowInactive && order.inventoryDeducted && Array.isArray(order.items) && order.items.length > 0) {
      // 3. HOÀN TRẢ TỒN KHO KHI HỦY ĐƠN HOẶC HOÀN HÀNG
      await restoreOrderInventory(order);
    }

    // Cập nhật các trường khác
    Object.assign(order, body);
    await order.save();

    let responseMessage = 'Cập nhật trạng thái đơn hàng thành công';
    if (newStatus === 'cancelled') {
      if (cancelShippingResult) {
        if (cancelShippingResult.success) {
          responseMessage = `Đã hủy đơn hàng #${order.orderCode} và hủy thành công vận đơn ${order.trackingCode} bên ${order.shippingCarrier || 'hãng vận chuyển'}!`;
        } else {
          responseMessage = `Đã chuyển đơn hàng #${order.orderCode} sang Đã Hủy, nhưng hãng ${order.shippingCarrier || 'Viettel Post'} báo: "${cancelShippingResult.message}". Vui lòng kiểm tra lại bưu cục!`;
        }
      } else {
        responseMessage = `Đã hủy đơn hàng #${order.orderCode} thành công!`;
      }
    } else if (newStatus === 'shipping' || newStatus === 'delivering') {
      responseMessage = order.trackingCode
        ? `Đã chuyển sang Đang Giao Hàng và đẩy vận đơn sang ${order.shippingCarrier || 'hãng vận chuyển'} (Mã vận đơn: ${order.trackingCode})!`
        : 'Đã chuyển trạng thái sang Đang Giao Hàng';
    } else if (newStatus === 'confirmed') {
      responseMessage = `Đã duyệt xác nhận đơn hàng #${order.orderCode} thành công!`;
    }

    return NextResponse.json({
      success: true,
      message: responseMessage,
      data: order,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi cập nhật đơn hàng' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    let orderToDelete;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      orderToDelete = await Order.findById(id);
    } else {
      orderToDelete = await Order.findOne({ orderCode: id.toUpperCase() });
    }

    if (!orderToDelete) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    // Tự động hủy vận đơn bên phía hãng nếu đơn này có mã vận đơn
    if (orderToDelete.trackingCode) {
      try {
        if ((orderToDelete.shippingProvider || '').includes('ghtk') || (orderToDelete.shippingCarrier || '').includes('GHTK')) {
          await cancelGHTKOrder(orderToDelete.trackingCode);
        } else if ((orderToDelete.shippingProvider || '').includes('ghn') || (orderToDelete.shippingCarrier || '').includes('GHN')) {
          await cancelGHNOrder(orderToDelete.trackingCode);
        } else if (
          (orderToDelete.shippingProvider || '').toLowerCase().includes('viettel') ||
          (orderToDelete.shippingCarrier || '').toLowerCase().includes('viettel') ||
          (orderToDelete.trackingCode || '').startsWith('VTP') ||
          /^\d{11,13}$/.test(orderToDelete.trackingCode || '')
        ) {
          await cancelViettelPostOrder(orderToDelete.trackingCode);
        }
      } catch (err: any) {
        console.error('Lỗi khi gửi lệnh hủy vận đơn khi xóa đơn:', err.message);
      }
    }

    await Order.findByIdAndDelete(orderToDelete._id);

    return NextResponse.json({
      success: true,
      message: `Đã xóa đơn hàng #${orderToDelete.orderCode} thành công${orderToDelete.trackingCode ? ` và gửi lệnh hủy sang ${orderToDelete.shippingCarrier || 'hãng vận chuyển'}` : ''}!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi xóa đơn hàng' },
      { status: 500 }
    );
  }
}