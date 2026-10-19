import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import FlashSale from '@/models/FlashSale';

export const dynamic = 'force-dynamic';

// GET /api/settings/fomo - Lấy cấu hình FOMO hiện tại
export async function GET() {
  try {
    await connectToDatabase();
    const flashSale = await FlashSale.findOne().select('fomoSettings isActive');

    const fomoSettings = flashSale?.fomoSettings || {
      enableLivePurchasePopup: true,
      popupIntervalSeconds: 25,
      enableCheckoutTimer: true,
      checkoutTimerMinutes: 15,
      enableViewerCount: true,
      enableProductTimer: true,
      productTimerMinutes: 10,
    };

    return NextResponse.json(
      {
        success: true,
        data: fomoSettings,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching FOMO settings:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi lấy cấu hình FOMO' },
      { status: 500 }
    );
  }
}
