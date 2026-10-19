import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import FlashSale from '@/models/FlashSale';
import Product from '@/models/Product';

// Helper to sanitize items and filter out missing/null productIds
function sanitizeItems(items: any[]): any[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((it: any) => {
      const pid = it?.productId?._id || it?.productId;
      return pid && typeof pid.toString === 'function' && pid.toString().trim().length > 0 && pid.toString() !== 'null';
    })
    .map((it: any) => ({
      productId: it.productId?._id || it.productId,
      originalPrice: Number(it.originalPrice) || 0,
      salePrice: Number(it.salePrice) || 0,
      flashPrice: Number(it.flashPrice) || 0,
      discountPercent: Number(it.discountPercent) || 0,
      flashPercent: Number(it.flashPercent) || 0,
      flashStock: Math.max(1, Number(it.flashStock) || 50),
      soldCount: Number(it.soldCount) || 0,
      isActive: it.isActive !== undefined ? it.isActive : true,
    }));
}

// GET /api/admin/flash-sale - Lấy cấu hình Flash Sale hiện tại
export async function GET() {
  try {
    await connectToDatabase();

    let flashSale = await FlashSale.findOne()
      .populate({
        path: 'items.productId',
        select: 'name slug price salePrice images stock soldCount category variants',
      })
      .populate({
        path: 'slots.items.productId',
        select: 'name slug price salePrice images stock soldCount category variants',
      });

    // 1. Nếu chưa có, tự động tạo cấu hình mẫu ban đầu với sản phẩm active hiện có
    if (!flashSale) {
      const sampleProducts = await Product.find({ status: 'active' }).limit(6);

      const defaultItems = sampleProducts.map((p) => {
        const origPrice = p.price || 300000;
        const normSale = p.salePrice && p.salePrice > 0 && p.salePrice < origPrice ? p.salePrice : origPrice;
        const prodSalePct = origPrice > normSale ? Math.round(((origPrice - normSale) / origPrice) * 100) : 0;
        const flashPct = 15;
        const fPrice = Math.max(1000, Math.round((normSale * (1 - flashPct / 100)) / 1000) * 1000);
        return {
          productId: p._id,
          originalPrice: origPrice,
          salePrice: normSale,
          flashPrice: fPrice,
          flashPercent: flashPct,
          discountPercent: Math.min(99, prodSalePct + flashPct),
          flashStock: Math.max(20, Math.min(100, p.stock || 50)),
          soldCount: Math.floor(Math.random() * 15) + 8,
          isActive: true,
        };
      });

      flashSale = await FlashSale.create({
        title: '⚡ SIÊU SALE GIỜ VÀNG - GIẢM TỚI 50%',
        subtitle: 'Săn deal chớp nhoáng • Số lượng có hạn • Giá rẻ vô địch',
        isActive: true,
        slots: [
          {
            id: 'slot_1',
            name: 'Săn Sale Sáng',
            startTime: '09:00',
            endTime: '12:00',
            dateType: 'all_days',
            enabled: true,
            items: defaultItems.slice(0, 3),
          },
          {
            id: 'slot_2',
            name: 'Giờ Vàng Nửa Giá',
            startTime: '12:00',
            endTime: '18:00',
            dateType: 'all_days',
            enabled: true,
            items: defaultItems,
          },
          {
            id: 'slot_3',
            name: 'Flash Deal Tối',
            startTime: '18:00',
            endTime: '21:00',
            dateType: 'all_days',
            enabled: true,
            items: defaultItems.slice(2, 6),
          },
          {
            id: 'slot_4',
            name: 'Xả Kho Đêm',
            startTime: '21:00',
            endTime: '23:59',
            dateType: 'all_days',
            enabled: true,
            items: defaultItems.slice(0, 4),
          },
        ],
        items: defaultItems,
        fomoSettings: {
          enableLivePurchasePopup: true,
          popupIntervalSeconds: 25,
          enableCheckoutTimer: true,
          checkoutTimerMinutes: 15,
          enableViewerCount: true,
        },
      });

      flashSale = await FlashSale.findById(flashSale._id)
        .populate({
          path: 'items.productId',
          select: 'name slug price salePrice images stock soldCount category variants',
        })
        .populate({
          path: 'slots.items.productId',
          select: 'name slug price salePrice images stock soldCount category variants',
        });
    } else {
      // 2. Tự phục hồi & dọn dẹp nếu có sản phẩm cũ đã bị xóa khỏi database (productId === null)
      const hasNullInSlots = flashSale.slots.some((s: any) =>
        s.items.some((it: any) => !it.productId)
      );
      const hasNullInItems = flashSale.items.some((it: any) => !it.productId);

      if (hasNullInSlots || hasNullInItems) {
        const activeProducts = await Product.find({ status: 'active' }).limit(6);

        const defaultItems = activeProducts.map((p) => {
          const origPrice = p.price || 300000;
          const normSale = p.salePrice && p.salePrice > 0 && p.salePrice < origPrice ? p.salePrice : origPrice;
          const prodSalePct = origPrice > normSale ? Math.round(((origPrice - normSale) / origPrice) * 100) : 0;
          const flashPct = 15;
          const fPrice = Math.max(1000, Math.round((normSale * (1 - flashPct / 100)) / 1000) * 1000);
          return {
            productId: p._id,
            originalPrice: origPrice,
            salePrice: normSale,
            flashPrice: fPrice,
            flashPercent: flashPct,
            discountPercent: Math.min(99, prodSalePct + flashPct),
            flashStock: Math.max(20, Math.min(100, p.stock || 50)),
            soldCount: Math.floor(Math.random() * 15) + 8,
            isActive: true,
          };
        });

        flashSale.slots.forEach((s: any, idx: number) => {
          const validExisting = (s.items || []).filter((it: any) => it && it.productId);
          if (validExisting.length > 0) {
            s.items = validExisting.map((it: any) => ({
              ...it.toObject(),
              productId: it.productId._id || it.productId,
            }));
          } else if (defaultItems.length > 0) {
            s.items = defaultItems.slice(0, Math.min(defaultItems.length, idx === 0 ? 3 : 6));
          } else {
            s.items = [];
          }
        });

        const validRoot = (flashSale.items || []).filter((it: any) => it && it.productId);
        flashSale.items = validRoot.length > 0
          ? validRoot.map((it: any) => ({
              ...it.toObject(),
              productId: it.productId._id || it.productId,
            }))
          : defaultItems;

        await flashSale.save();

        flashSale = await FlashSale.findById(flashSale._id)
          .populate({
            path: 'items.productId',
            select: 'name slug price salePrice images stock soldCount category variants',
          })
          .populate({
            path: 'slots.items.productId',
            select: 'name slug price salePrice images stock soldCount category variants',
          });
      }
    }

    return NextResponse.json({
      success: true,
      data: flashSale,
    });
  } catch (error: any) {
    console.error('Error fetching admin flash sale:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi lấy thông tin Flash Sale' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/flash-sale - Lưu & cập nhật cấu hình Flash Sale
export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    let flashSale = await FlashSale.findOne();

    // Lọc sạch sản phẩm không có productId hợp lệ trước khi lưu Mongoose
    const cleanSlots = (body.slots || []).map((s: any) => ({
      id: s.id || `slot_${Date.now()}`,
      name: s.name || 'Khung Giờ Flash Sale',
      startTime: s.startTime || '12:00',
      endTime: s.endTime || '18:00',
      dateType: s.dateType || 'all_days',
      specificDate: s.specificDate || '',
      startDate: s.startDate || '',
      endDate: s.endDate || '',
      enabled: s.enabled !== undefined ? s.enabled : true,
      items: sanitizeItems(s.items),
    }));

    const cleanItems = sanitizeItems(body.items);

    const updateData: any = {
      title: body.title || '⚡ SIÊU SALE GIỜ VÀNG - GIẢM TỚI 50%',
      subtitle: body.subtitle || '',
      isActive: body.isActive !== undefined ? body.isActive : true,
      slots: cleanSlots,
      items: cleanItems,
      fomoSettings: body.fomoSettings || {
        enableLivePurchasePopup: true,
        popupIntervalSeconds: 25,
        enableCheckoutTimer: true,
        checkoutTimerMinutes: 15,
        enableViewerCount: true,
      },
    };

    if (flashSale) {
      flashSale = await FlashSale.findByIdAndUpdate(flashSale._id, updateData, {
        new: true,
        runValidators: true,
      })
        .populate({
          path: 'items.productId',
          select: 'name slug price salePrice images stock soldCount category variants',
        })
        .populate({
          path: 'slots.items.productId',
          select: 'name slug price salePrice images stock soldCount category variants',
        });
    } else {
      flashSale = await FlashSale.create(updateData);
      flashSale = await FlashSale.findById(flashSale._id)
        .populate({
          path: 'items.productId',
          select: 'name slug price salePrice images stock soldCount category variants',
        })
        .populate({
          path: 'slots.items.productId',
          select: 'name slug price salePrice images stock soldCount category variants',
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật cấu hình Flash Sale thành công!',
      data: flashSale,
    });
  } catch (error: any) {
    console.error('Error updating admin flash sale:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi cập nhật cấu hình Flash Sale' },
      { status: 500 }
    );
  }
}
