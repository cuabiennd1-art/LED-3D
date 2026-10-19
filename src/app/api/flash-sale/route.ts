import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import FlashSale from '@/models/FlashSale';
import { getProductCoverImage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function parseTimeToMinutes(timeStr: string = '00:00'): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map((p) => parseInt(p, 10) || 0);
  return parts[0] * 60 + (parts[1] || 0);
}

function getVietnamDateString(date: Date = new Date()): string {
  const vnOffset = 7 * 60; // in minutes
  const localOffset = date.getTimezoneOffset();
  const vnTime = new Date(date.getTime() + (vnOffset + localOffset) * 60 * 1000);
  const y = vnTime.getFullYear();
  const m = String(vnTime.getMonth() + 1).padStart(2, '0');
  const d = String(vnTime.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// GET /api/flash-sale - Lấy dữ liệu Flash Sale public cho Storefront
export async function GET() {
  try {
    await connectToDatabase();

    const flashSale = await FlashSale.findOne()
      .populate({
        path: 'items.productId',
        select: 'name slug price salePrice images stock soldCount category status variants options',
      })
      .populate({
        path: 'slots.items.productId',
        select: 'name slug price salePrice images stock soldCount category status variants options',
      });

    if (!flashSale) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Nếu Flash Sale bị tắt, vẫn trả về fomoSettings chính xác để các module FOMO hoạt động theo cấu hình độc lập
    if (!flashSale.isActive) {
      return NextResponse.json(
        {
          success: true,
          data: {
            _id: flashSale._id,
            title: flashSale.title,
            subtitle: flashSale.subtitle,
            isActive: false,
            isLive: false,
            activeSlot: null,
            nextSlot: null,
            slots: [],
            timeRemainingSeconds: 0,
            items: [],
            fomoSettings: flashSale.fomoSettings,
          },
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    const now = new Date();
    const vnOffset = 7 * 60;
    const localOffset = now.getTimezoneOffset();
    const vnTime = new Date(now.getTime() + (vnOffset + localOffset) * 60 * 1000);
    const todayStr = getVietnamDateString(now);
    const currentHour = vnTime.getHours();
    const currentMinute = vnTime.getMinutes();
    const currentSecond = vnTime.getSeconds();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    const enabledSlots = (flashSale.slots || [])
      .filter((s) => s.enabled !== false)
      .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

    let isLive = false;
    let activeSlot: any = null;
    let nextUpcomingSlot: any = null;
    let timeRemainingSeconds = 0;

    // 1. Find the active live slot right now
    for (const slot of enabledSlots) {
      // Check date matching
      let isDateMatch = true;
      if (slot.dateType === 'specific_date' && slot.specificDate) {
        isDateMatch = todayStr === slot.specificDate;
      } else if (slot.dateType === 'date_range') {
        if (slot.startDate && todayStr < slot.startDate) isDateMatch = false;
        if (slot.endDate && todayStr > slot.endDate) isDateMatch = false;
      }

      if (!isDateMatch) continue;

      const startMin = parseTimeToMinutes(slot.startTime);
      const endMin = parseTimeToMinutes(slot.endTime);

      if (currentTotalMinutes >= startMin && currentTotalMinutes < endMin) {
        isLive = true;
        activeSlot = slot;
        timeRemainingSeconds = Math.max(0, (endMin - currentTotalMinutes) * 60 - currentSecond);
        break;
      } else if (currentTotalMinutes < startMin && !nextUpcomingSlot) {
        nextUpcomingSlot = slot;
      }
    }

    // 2. If no live slot, calculate countdown to next upcoming slot
    if (!isLive && nextUpcomingSlot) {
      const startMin = parseTimeToMinutes(nextUpcomingSlot.startTime);
      timeRemainingSeconds = Math.max(0, (startMin - currentTotalMinutes) * 60 - currentSecond);
    }

    // Determine products to show: ONLY return active Flash Sale items when slot is actively LIVE!
    let activeItems: any[] = [];
    if (isLive && activeSlot) {
      const rawItems =
        activeSlot.items && activeSlot.items.length > 0
          ? activeSlot.items
          : flashSale.items || [];

      activeItems = rawItems
        .filter((item: any) => item.isActive && item.productId && item.productId.status !== 'hidden')
        .map((item: any) => {
          const product = item.productId;
          const origPrice = Number(product.price) || Number(item.originalPrice) || 0;
          const normalSalePrice = (Number(product.salePrice) && Number(product.salePrice) > 0 && Number(product.salePrice) < origPrice)
            ? Number(product.salePrice)
            : (Number(item.salePrice) && Number(item.salePrice) > 0 && Number(item.salePrice) < origPrice ? Number(item.salePrice) : origPrice);
          const productSalePct = origPrice > normalSalePrice
            ? Math.round(((origPrice - normalSalePrice) / origPrice) * 100)
            : 0;

          const flashDiscountPercent =
            (Number(item.flashPercent) && Number(item.flashPercent) > 0)
              ? Number(item.flashPercent)
              : (normalSalePrice > item.flashPrice && item.flashPrice > 0
                ? Math.max(0, Math.round(((normalSalePrice - item.flashPrice) / normalSalePrice) * 100))
                : 10);

          let safeFlashPrice = (item.flashPrice && item.flashPrice > 0 && item.flashPrice < normalSalePrice)
            ? item.flashPrice
            : Math.max(1000, Math.round((normalSalePrice * (1 - flashDiscountPercent / 100)) / 1000) * 1000);

          const totalDiscountPct = Math.min(99, productSalePct + flashDiscountPercent);

          let updatedVariants = product.variants;
          let minFlash = safeFlashPrice;
          let maxFlash = minFlash;

          if (Array.isArray(product.variants) && product.variants.length > 0) {
            updatedVariants = product.variants.map((v: any) => {
              const vObj = v.toObject ? v.toObject() : (v._doc ? v._doc : v);
              const vOrig = Number(vObj.price) || origPrice;
              const vBaseSale = (Number(vObj.salePrice) && Number(vObj.salePrice) > 0 && Number(vObj.salePrice) < vOrig)
                ? Number(vObj.salePrice)
                : vOrig;
              const vFlash = flashDiscountPercent > 0
                ? Math.round((vBaseSale * (1 - flashDiscountPercent / 100)) / 1000) * 1000
                : (Number(vObj.flashPrice) && Number(vObj.flashPrice) > 0 ? Number(vObj.flashPrice) : vBaseSale);
              const vProdSalePct = vOrig > vBaseSale
                ? Math.round(((vOrig - vBaseSale) / vOrig) * 100)
                : 0;
              const vTotalDiscount = Math.min(99, vProdSalePct + flashDiscountPercent);

              return {
                ...vObj,
                originalPrice: vOrig,
                price: vOrig,
                flashPrice: vFlash,
                salePrice: vFlash,
                discountPercent: vTotalDiscount,
              };
            });
            const vPrices = updatedVariants.map((v: any) => v.flashPrice).filter((p: number) => p > 0);
            if (vPrices.length > 0) {
              minFlash = Math.min(...vPrices);
              maxFlash = Math.max(...vPrices);
            }
          }

          const stock = item.flashStock || 50;
          const sold = Math.min(stock, item.soldCount || 0);
          const soldPercent = stock > 0 ? Math.min(98, Math.round((sold / stock) * 100)) : 0;

          return {
            _id: item._id,
            productId: product._id,
            name: product.name,
            slug: product.slug,
            image: getProductCoverImage(product, ''),
            images: product.images || [],
            originalPrice: origPrice,
            salePrice: minFlash,
            flashPrice: minFlash,
            minPrice: minFlash,
            maxPrice: maxFlash,
            discountPercent: totalDiscountPct,
            flashPercent: flashDiscountPercent,
            flashStock: stock,
            soldCount: sold,
            soldPercent: Math.max(15, soldPercent),
            variants: updatedVariants,
            options: product.options || [],
          };
        });
    }

    // Format all slots for frontend timeline navigation
    const formattedSlots = enabledSlots.map((s) => {
      const startMin = parseTimeToMinutes(s.startTime);
      const endMin = parseTimeToMinutes(s.endTime);
      let status: 'passed' | 'live' | 'upcoming' = 'upcoming';

      let isDateMatch = true;
      if (s.dateType === 'specific_date' && s.specificDate) {
        isDateMatch = todayStr === s.specificDate;
      } else if (s.dateType === 'date_range') {
        if (s.startDate && todayStr < s.startDate) isDateMatch = false;
        if (s.endDate && todayStr > s.endDate) isDateMatch = false;
      }

      if (!isDateMatch) {
        if (s.dateType === 'specific_date' && s.specificDate && todayStr > s.specificDate) {
          status = 'passed';
        } else if (s.dateType === 'date_range' && s.endDate && todayStr > s.endDate) {
          status = 'passed';
        } else {
          status = 'upcoming';
        }
      } else {
        if (currentTotalMinutes >= endMin) {
          status = 'passed';
        } else if (currentTotalMinutes >= startMin && currentTotalMinutes < endMin) {
          status = 'live';
        } else {
          status = 'upcoming';
        }
      }

      // Slot items preview
      const slotItemCount = s.items?.filter((it: any) => it.isActive)?.length || 0;

      return {
        id: s.id,
        name: s.name || `${s.startTime} - ${s.endTime}`,
        startTime: s.startTime,
        endTime: s.endTime,
        dateType: s.dateType,
        specificDate: s.specificDate,
        startDate: s.startDate,
        endDate: s.endDate,
        status,
        itemCount: slotItemCount,
        items: (s.items || [])
          .filter((it: any) => it.isActive && it.productId)
          .map((it: any) => {
            const product = it.productId;
            const origPrice = Number(product.price) || Number(it.originalPrice) || 0;
            const normalSalePrice = (Number(product.salePrice) && Number(product.salePrice) > 0 && Number(product.salePrice) < origPrice)
              ? Number(product.salePrice)
              : (Number(it.salePrice) && Number(it.salePrice) > 0 && Number(it.salePrice) < origPrice ? Number(it.salePrice) : origPrice);
            const productSalePct = origPrice > normalSalePrice
              ? Math.round(((origPrice - normalSalePrice) / origPrice) * 100)
              : 0;

            const flashDiscountPercent =
              (Number(it.flashPercent) && Number(it.flashPercent) > 0)
                ? Number(it.flashPercent)
                : (normalSalePrice > it.flashPrice && it.flashPrice > 0
                  ? Math.max(0, Math.round(((normalSalePrice - it.flashPrice) / normalSalePrice) * 100))
                  : 10);

            let safeFlashPrice = (it.flashPrice && it.flashPrice > 0 && it.flashPrice < normalSalePrice)
              ? it.flashPrice
              : Math.max(1000, Math.round((normalSalePrice * (1 - flashDiscountPercent / 100)) / 1000) * 1000);

            const totalDiscountPct = Math.min(99, productSalePct + flashDiscountPercent);

            let updatedVariants = product.variants;
            let minFlash = safeFlashPrice;
            let maxFlash = minFlash;

            if (Array.isArray(product.variants) && product.variants.length > 0) {
              updatedVariants = product.variants.map((v: any) => {
                const vObj = v.toObject ? v.toObject() : (v._doc ? v._doc : v);
                const vOrig = Number(vObj.price) || origPrice;
                const vBaseSale = (Number(vObj.salePrice) && Number(vObj.salePrice) > 0 && Number(vObj.salePrice) < vOrig)
                  ? Number(vObj.salePrice)
                  : vOrig;
                const vFlash = flashDiscountPercent > 0
                  ? Math.round((vBaseSale * (1 - flashDiscountPercent / 100)) / 1000) * 1000
                  : (Number(vObj.flashPrice) && Number(vObj.flashPrice) > 0 ? Number(vObj.flashPrice) : vBaseSale);
                const vProdSalePct = vOrig > vBaseSale
                  ? Math.round(((vOrig - vBaseSale) / vOrig) * 100)
                  : 0;
                const vTotalDiscount = Math.min(99, vProdSalePct + flashDiscountPercent);

                return {
                  ...vObj,
                  originalPrice: vOrig,
                  price: vOrig,
                  flashPrice: vFlash,
                  salePrice: vFlash,
                  discountPercent: vTotalDiscount,
                };
              });
              const vPrices = updatedVariants.map((v: any) => v.flashPrice).filter((p: number) => p > 0);
              if (vPrices.length > 0) {
                minFlash = Math.min(...vPrices);
                maxFlash = Math.max(...vPrices);
              }
            }

            return {
              _id: it._id,
              productId: product._id || it.productId,
              name: product.name,
              slug: product.slug,
              image: getProductCoverImage(product, ''),
              images: product.images || [],
              originalPrice: origPrice,
              salePrice: minFlash,
              flashPrice: minFlash,
              minPrice: minFlash,
              maxPrice: maxFlash,
              discountPercent: totalDiscountPct,
              flashPercent: flashDiscountPercent,
              flashStock: it.flashStock,
              soldCount: it.soldCount,
              soldPercent: it.flashStock > 0 ? Math.min(98, Math.round(((it.soldCount || 0) / it.flashStock) * 100)) : 20,
              variants: updatedVariants,
              options: product.options || [],
            };
          }),
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: flashSale._id,
          title: flashSale.title,
          subtitle: flashSale.subtitle,
          isActive: flashSale.isActive,
          isLive,
          activeSlot: isLive ? activeSlot : null,
          nextSlot: nextUpcomingSlot,
          slots: formattedSlots,
          timeRemainingSeconds,
          items: activeItems,
          fomoSettings: flashSale.fomoSettings,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching public flash sale:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi lấy dữ liệu Flash Sale' },
      { status: 500 }
    );
  }
}
