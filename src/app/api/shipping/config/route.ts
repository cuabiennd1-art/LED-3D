import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Setting from '@/models/Setting';
import { DEFAULT_SHIPPING_CONFIG } from '@/lib/shipping/configHelper';

// GET: Lấy toàn bộ cấu hình 3 hãng vận chuyển, địa chỉ kho & biểu phí
export async function GET() {
  try {
    await connectToDatabase();
    let config = await Setting.findOne({ key: 'shipping_config' });

    if (!config) {
      config = await Setting.create({
        key: 'shipping_config',
        value: DEFAULT_SHIPPING_CONFIG,
      });
    }

    // Merge defaults with saved values
    const mergedData = {
      ...DEFAULT_SHIPPING_CONFIG,
      ...config.value,
      originAddress: {
        ...DEFAULT_SHIPPING_CONFIG.originAddress,
        ...(config.value?.originAddress || {}),
      },
      carriers: {
        ...DEFAULT_SHIPPING_CONFIG.carriers,
        ...(config.value?.carriers || {}),
      },
      rates: {
        ...DEFAULT_SHIPPING_CONFIG.rates,
        ...(config.value?.rates || {}),
      },
    };

    return NextResponse.json({
      success: true,
      data: mergedData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi tải cấu hình vận chuyển' },
      { status: 500 }
    );
  }
}

// POST: Lưu cập nhật cấu hình 3 hãng vận chuyển, địa chỉ kho & Token API
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    // Đồng bộ cả dạng nested và flat field
    const payload = {
      ...body,
      originAddress: {
        ...DEFAULT_SHIPPING_CONFIG.originAddress,
        ...(body.originAddress || {}),
      },
      ghnEnabled: body.carriers?.ghn?.enabled ?? body.ghnEnabled ?? true,
      ghtkEnabled: body.carriers?.ghtk?.enabled ?? body.ghtkEnabled ?? true,
      vtpEnabled: body.carriers?.viettelpost?.enabled ?? body.vtpEnabled ?? true,
      defaultInnerFee: body.rates?.defaultInnerFee ?? body.defaultInnerFee ?? 22000,
      defaultOuterFee: body.rates?.defaultOuterFee ?? body.defaultOuterFee ?? 32000,
      freeShippingThreshold: body.rates?.freeShippingThreshold ?? body.freeShippingThreshold ?? 500000,
    };

    const updated = await Setting.findOneAndUpdate(
      { key: 'shipping_config' },
      { value: payload },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({
      success: true,
      message: 'Đã lưu cấu hình các hãng vận chuyển và địa chỉ kho thành công!',
      data: updated.value,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi lưu cấu hình vận chuyển' },
      { status: 500 }
    );
  }
}