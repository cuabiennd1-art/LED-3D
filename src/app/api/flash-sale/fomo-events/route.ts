import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import FlashSale from '@/models/FlashSale';
import { getProductCoverImage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const CITIES = [
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'Bình Dương',
  'Đồng Nai',
  'Quảng Ninh',
  'Bắc Ninh',
  'Thái Nguyên',
  'Nghệ An',
  'Thanh Hóa',
];

const BUYER_NAMES = [
  'Anh Tuấn',
  'Chị Mai',
  'Anh Minh',
  'Chị Linh',
  'Anh Dũng',
  'Chị Hương',
  'Anh Hoàng',
  'Chị Trang',
  'Anh Đức',
  'Chị Lan',
  'Anh Nam',
  'Chị Ngọc',
  'Anh Khánh',
  'Chị Hằng',
];

// GET /api/flash-sale/fomo-events - Lấy danh sách sự kiện mua hàng thực tế / mô phỏng
export async function GET() {
  try {
    await connectToDatabase();

    // 0. Kiểm tra nếu popup mua hàng đã bị tắt trong cấu hình FOMO
    const flashSale = await FlashSale.findOne().select('fomoSettings');
    if (flashSale?.fomoSettings && flashSale.fomoSettings.enableLivePurchasePopup === false) {
      return NextResponse.json(
        { success: true, data: [] },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // 1. Check if there are real recent orders in DB (only COD or paid bank transfers)
    const recentOrders = await Order.find({
      $or: [
        { paymentMethod: { $nin: ['bank_transfer', 'online'] } },
        { paymentStatus: { $in: ['paid', 'refunded'] } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .select('customer items createdAt orderCode');

    const events: any[] = [];

    if (recentOrders && recentOrders.length > 0) {
      for (const order of recentOrders) {
        if (order.items && order.items.length > 0) {
          const item = order.items[0];
          const name = order.customer?.name || 'Khách hàng';
          // Obfuscate last name for privacy: "Nguyễn Văn A" -> "Nguyễn Văn ***"
          const nameParts = name.split(' ');
          const formattedName =
            nameParts.length > 1
              ? `${nameParts[0]} ${nameParts.slice(1).join(' ').substring(0, 1)}***`
              : name;

          const address = order.customer?.address || '';
          let city = 'Hà Nội';
          for (const c of CITIES) {
            if (address.toLowerCase().includes(c.toLowerCase())) {
              city = c;
              break;
            }
          }

          events.push({
            id: order._id,
            buyer: formattedName,
            location: city,
            productName: item.name,
            productImage: item.image || '/file.svg',
            timeAgo: 'Vừa xong',
            quantity: item.quantity || 1,
          });
        }
      }
    }

    // 2. If not enough real orders, supplement with products from DB
    if (events.length < 6) {
      const products = await Product.find({ status: 'active' }).limit(10);

      products.forEach((p, idx) => {
        const buyer = BUYER_NAMES[idx % BUYER_NAMES.length];
        const city = CITIES[idx % CITIES.length];
        const minutesAgo = (idx + 1) * 3 + 2;

        events.push({
          id: `sim_${p._id}_${idx}`,
          buyer: buyer,
          location: city,
          productName: p.name,
          productImage: getProductCoverImage(p, '/file.svg'),
          timeAgo: `${minutesAgo} phút trước`,
          quantity: (idx % 2) + 1,
        });
      });
    }

    return NextResponse.json({
      success: true,
      data: events.slice(0, 12),
    });
  } catch (error: any) {
    console.error('Error fetching fomo events:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi lấy dữ liệu FOMO' },
      { status: 500 }
    );
  }
}
