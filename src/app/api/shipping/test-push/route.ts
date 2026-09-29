import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import { getDBShippingConfig } from '@/lib/shipping/configHelper';
import {
  createViettelPostOrder,
  cancelViettelPostOrder,
  getViettelPostInventories,
  getViettelPostAuthToken,
} from '@/lib/shipping/viettelpost';

export async function GET() {
  try {
    await connectToDatabase();
    const dbConfig = await getDBShippingConfig();
    const vtpConfig = dbConfig.carriers.viettelpost;

    if (!vtpConfig.token) {
      return NextResponse.json({
        success: false,
        message: 'Chưa cấu hình Token API Viettel Post',
        connected: false,
      });
    }

    // Verify token & retrieve warehouse inventory list
    let inventories: any[] = [];
    let tokenValid = false;
    try {
      const jwt = await getViettelPostAuthToken(vtpConfig.token);
      if (jwt) {
        tokenValid = true;
        inventories = await getViettelPostInventories(vtpConfig.token);
      }
    } catch (e: any) {
      console.warn('Error verifying Viettel Post token:', e.message);
    }

    // Fetch up to 10 recent pending / confirmed orders for testing
    const pendingOrders = await Order.find({
      status: { $in: ['pending', 'confirmed'] },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('_id orderCode customer totalAmount paymentMethod items createdAt status')
      .lean();

    return NextResponse.json({
      success: true,
      connected: tokenValid,
      username: vtpConfig.username || '0364978796',
      environment: vtpConfig.environment || 'production',
      inventories,
      pendingOrders,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi kiểm tra thông tin Viettel Post' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json().catch(() => ({}));
    const { action, orderId, mockData, trackingCode } = body;

    // 1. ACTION: CANCEL AN ORDER ON VIETTEL POST
    if (action === 'cancel_order') {
      const targetTrackingCode = trackingCode || body.ORDER_NUMBER;
      if (!targetTrackingCode) {
        return NextResponse.json(
          { success: false, message: 'Vui lòng cung cấp mã vận đơn cần hủy' },
          { status: 400 }
        );
      }

      const cancelResult = await cancelViettelPostOrder(
        targetTrackingCode,
        body.note || 'Hủy đơn kiểm thử hệ thống'
      );

      // If orderId is provided, also update DB status
      if (orderId && cancelResult.success) {
        await Order.findByIdAndUpdate(orderId, {
          shippingStatus: 'cancelled',
          $push: {
            shippingLogs: {
              time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              status: 'Hủy vận đơn',
              location: 'Hệ thống Shop',
              description: `Đã hủy vận đơn Viettel Post (${targetTrackingCode}) thành công.`,
              carrier: 'viettelpost',
              createdAt: new Date(),
            },
          },
        });
      }

      return NextResponse.json({
        success: cancelResult.success,
        message: cancelResult.message,
        trackingCode: targetTrackingCode,
      });
    }

    // 2. ACTION: PUSH AN EXISTING SHOP ORDER TO VIETTEL POST
    if (action === 'push_order') {
      if (!orderId) {
        return NextResponse.json(
          { success: false, message: 'Vui lòng chọn đơn hàng cần đẩy sang Viettel Post' },
          { status: 400 }
        );
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy đơn hàng trong hệ thống' },
          { status: 404 }
        );
      }

      const orderData = {
        orderCode: order.orderCode,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount,
        cod_amount: order.paymentMethod === 'cod' ? order.totalAmount : 0,
        customer: order.customer,
        items: order.items,
        notes: order.notes || 'CHO XEM HÀNG KHÔNG THỬ',
        weight: body.weight || 500,
        orderService: body.orderService || 'STK',
      };

      const result = await createViettelPostOrder(orderData);

      // Update Order in MongoDB
      const initialLog = {
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        status: 'Bàn giao vận chuyển',
        location: 'Kho tổng Viettel Post',
        description: `Đã tạo vận đơn thành công với Viettel Post. Mã vận đơn: ${result.trackingCode}. Cước phí: ${(result.fee || 0).toLocaleString('vi-VN')}₫`,
        carrier: 'viettelpost',
        createdAt: new Date(),
      };

      await Order.findByIdAndUpdate(orderId, {
        status: 'shipping',
        shippingProvider: 'viettelpost',
        shippingCarrier: 'Viettel Post',
        trackingCode: result.trackingCode,
        shippingStatus: 'picking',
        $push: { shippingLogs: initialLog },
      });

      return NextResponse.json({
        success: true,
        message: `Đã tạo vận đơn Viettel Post thành công cho đơn #${order.orderCode}! Mã vận đơn: ${result.trackingCode}`,
        data: {
          orderCode: order.orderCode,
          trackingCode: result.trackingCode,
          fee: result.fee,
          carrier: 'Viettel Post',
          raw: result.raw,
        },
      });
    }

    // 3. ACTION: PUSH MOCK / TEST ORDER TO VIETTEL POST
    const testOrderCode = `TEST_${Date.now().toString().slice(-6)}`;
    const sampleCustomer = mockData?.customer || {
      name: mockData?.name || 'Nguyễn Văn Test',
      phone: mockData?.phone || '0988776655',
      email: mockData?.email || 'test@gmail.com',
      province: mockData?.province || 'Hà Nội',
      district: mockData?.district || 'Quận Cầu Giấy',
      ward: mockData?.ward || 'Phường Dịch Vọng Hậu',
      address: mockData?.address || 'Số 10 Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội',
    };

    const testPayload = {
      orderCode: testOrderCode,
      paymentMethod: mockData?.paymentMethod || 'cod',
      totalAmount: Number(mockData?.totalAmount || 150000),
      cod_amount: mockData?.paymentMethod === 'cod' ? Number(mockData?.codAmount || 150000) : 0,
      notes: mockData?.notes || 'ĐƠN TEST HỆ THỐNG - CHO XEM HÀNG',
      weight: Number(mockData?.weight || 500),
      orderService: mockData?.orderService || 'STK',
      customer: sampleCustomer,
      items: mockData?.items || [
        {
          name: mockData?.productName || 'Áo Thun Cotton Kiểm Thử',
          price: Number(mockData?.totalAmount || 150000),
          quantity: 1,
          weight: Number(mockData?.weight || 500),
        },
      ],
    };

    const pushResult = await createViettelPostOrder(testPayload);

    let cancelInfo: any = null;
    // If autoCancel requested, wait 1.5 seconds and cancel to prevent real dispatch
    if (mockData?.autoCancel) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      cancelInfo = await cancelViettelPostOrder(
        pushResult.trackingCode,
        'Tự động hủy đơn hàng kiểm thử hệ thống'
      );
    }

    return NextResponse.json({
      success: true,
      message: `Đẩy đơn thử nghiệm sang Viettel Post thành công! Mã vận đơn: ${pushResult.trackingCode}`,
      data: {
        orderCode: testOrderCode,
        trackingCode: pushResult.trackingCode,
        fee: pushResult.fee,
        moneyCollection: pushResult.moneyCollection,
        serviceName: pushResult.serviceName,
        carrier: 'Viettel Post',
        autoCancelled: !!mockData?.autoCancel,
        cancelStatus: cancelInfo,
        raw: pushResult.raw,
      },
    });
  } catch (error: any) {
    console.error('Test push Viettel Post error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Lỗi khi đẩy đơn sang Viettel Post',
      },
      { status: 400 }
    );
  }
}
