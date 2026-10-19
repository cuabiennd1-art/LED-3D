import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import FlashSale from '@/models/FlashSale';
import { generateSlug } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'active';
    const sort = searchParams.get('sort') || 'newest';
    const flashSaleOnly = searchParams.get('flashSale') === 'true' || searchParams.get('filter') === 'flash-sale';

    const filter: any = {};

    if (status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    if (category && category !== 'all') {
      const decodedCategory = decodeURIComponent(category).trim();
      // Check if category is valid MongoDB ObjectId
      if (decodedCategory.match(/^[0-9a-fA-F]{24}$/)) {
        filter.category = decodedCategory;
      } else {
        const catDoc = await Category.findOne({
          $or: [
            { slug: decodedCategory },
            { slug: category },
            { name: decodedCategory },
            { name: category },
          ],
        });
        if (catDoc) {
          filter.category = catDoc._id;
        } else {
          // If category not found, ensure no products match rather than all
          filter.category = new mongoose.Types.ObjectId();
        }
      }
    }

    let sortOption: any = { createdAt: -1 };
    if (sort === 'price-asc') sortOption = { price: 1 };
    else if (sort === 'price-desc') sortOption = { price: -1 };
    else if (sort === 'popular') sortOption = { soldCount: -1 };

    const total = await Product.countDocuments(filter);
    let products = await Product.find(filter)
      .select('name slug price salePrice images rating soldCount sold reviewCount isFeatured tags category status stock variants options')
      .populate('category', 'name slug')
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Accurately calculate total stock as sum of variants
    products = products.map((p: any) => {
      let finalStock = Number(p.stock) || 0;
      if (Array.isArray(p.variants) && p.variants.length > 0) {
        finalStock = p.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
      }
      return {
        ...p,
        stock: finalStock,
      };
    });

    // Check if there is an active live flash sale
    try {
      const flashSale = await FlashSale.findOne({ isActive: true }).lean();
      if (flashSale) {
        const now = new Date();
        const vnOffset = 7 * 60;
        const localOffset = now.getTimezoneOffset();
        const vnTime = new Date(now.getTime() + (vnOffset + localOffset) * 60 * 1000);
        const todayStr = `${vnTime.getFullYear()}-${String(vnTime.getMonth() + 1).padStart(2, '0')}-${String(vnTime.getDate()).padStart(2, '0')}`;
        const curMin = vnTime.getHours() * 60 + vnTime.getMinutes();

        const liveSlot = (flashSale.slots || []).find((slot: any) => {
          if (slot.enabled === false) return false;
          let isDateMatch = true;
          if (slot.dateType === 'specific_date' && slot.specificDate) {
            isDateMatch = todayStr === slot.specificDate;
          } else if (slot.dateType === 'date_range') {
            if (slot.startDate && todayStr < slot.startDate) isDateMatch = false;
            if (slot.endDate && todayStr > slot.endDate) isDateMatch = false;
          }
          if (!isDateMatch) return false;

          const [sh, sm] = (slot.startTime || '00:00').split(':').map((n: string) => parseInt(n, 10) || 0);
          const [eh, em] = (slot.endTime || '00:00').split(':').map((n: string) => parseInt(n, 10) || 0);
          const startTotal = sh * 60 + sm;
          const endTotal = eh * 60 + em;

          return curMin >= startTotal && curMin < endTotal;
        });

        if (liveSlot && Array.isArray(liveSlot.items)) {
          const liveItemMap = new Map();
          liveSlot.items.forEach((it: any) => {
            if (it.isActive) {
              const pId = it.productId?.toString() || it.productId?._id?.toString();
              if (pId) liveItemMap.set(pId, it);
            }
          });

          products = products.map((p: any) => {
            const pIdStr = p._id.toString();
            const fsItem = liveItemMap.get(pIdStr);
            if (fsItem) {
              const origPrice = Number(p.price) || 0;
              const normalSalePrice = (Number(p.salePrice) && Number(p.salePrice) > 0 && Number(p.salePrice) < origPrice)
                ? Number(p.salePrice)
                : origPrice;
              const productSalePct = origPrice > normalSalePrice
                ? Math.round(((origPrice - normalSalePrice) / origPrice) * 100)
                : 0;

              // % Flash sale (giảm thêm từ giá sale)
              const flashDiscountPercent =
                (Number(fsItem.flashPercent) && Number(fsItem.flashPercent) > 0)
                  ? Number(fsItem.flashPercent)
                  : (normalSalePrice > fsItem.flashPrice && fsItem.flashPrice > 0
                    ? Math.max(0, Math.round(((normalSalePrice - fsItem.flashPrice) / normalSalePrice) * 100))
                    : 10);

              // Tổng % giảm hiển thị: (sale của sản phẩm + flash sale)
              const totalDiscountPercent = Math.min(99, productSalePct + flashDiscountPercent);

              let safeFlashPrice = (fsItem.flashPrice && fsItem.flashPrice > 0 && fsItem.flashPrice < normalSalePrice)
                ? fsItem.flashPrice
                : Math.max(1000, Math.round((normalSalePrice * (1 - flashDiscountPercent / 100)) / 1000) * 1000);

              let updatedVariants = p.variants;
              let minFlash = safeFlashPrice;
              let maxFlash = minFlash;

              if (Array.isArray(p.variants) && p.variants.length > 0) {
                const flashVariants = p.variants.map((v: any) => {
                  const vOrigPrice = Number(v.price) || origPrice;
                  const vBaseSale = (Number(v.salePrice) && Number(v.salePrice) > 0 && Number(v.salePrice) < vOrigPrice)
                    ? Number(v.salePrice)
                    : vOrigPrice;
                  const vFlashPrice = flashDiscountPercent > 0
                    ? Math.round((vBaseSale * (1 - flashDiscountPercent / 100)) / 1000) * 1000
                    : (Number(v.flashPrice) && Number(v.flashPrice) > 0 ? Number(v.flashPrice) : vBaseSale);
                  const vProdSalePct = vOrigPrice > vBaseSale
                    ? Math.round(((vOrigPrice - vBaseSale) / vOrigPrice) * 100)
                    : 0;
                  const vTotalDiscount = Math.min(99, vProdSalePct + flashDiscountPercent);

                  return {
                    ...v,
                    originalPrice: vOrigPrice,
                    price: vOrigPrice,
                    flashPrice: vFlashPrice,
                    salePrice: vFlashPrice,
                    discountPercent: vTotalDiscount,
                  };
                });

                updatedVariants = flashVariants;
                const vPrices = flashVariants.map((v: any) => v.flashPrice).filter((pr: number) => pr > 0);
                if (vPrices.length > 0) {
                  minFlash = Math.min(...vPrices);
                  maxFlash = Math.max(...vPrices);
                }
              }

              const baseFlash = fsItem.flashPrice || minFlash;

              return {
                ...p,
                isFlashSale: true,
                flashPrice: minFlash || baseFlash,
                salePrice: minFlash || baseFlash,
                minPrice: minFlash || baseFlash,
                maxPrice: maxFlash || baseFlash,
                discountPercent: totalDiscountPercent,
                flashPercent: flashDiscountPercent,
                variants: updatedVariants,
              };
            }
            return p;
          });
        }
      }
    } catch (e) {
      console.error('Error attaching flash sale in /api/products:', e);
    }

    if (flashSaleOnly) {
      products = products.filter(
        (p: any) => Boolean(p.isFlashSale) || (Boolean(p.flashPrice) && Number(p.flashPrice) > 0)
      );
    }

    if (sort === 'flash-sale' || sort === 'discount-desc') {
      products = [...products].sort((a: any, b: any) => {
        const discA = a.salePrice && a.salePrice < a.price ? (a.price - a.salePrice) / a.price : 0;
        const discB = b.salePrice && b.salePrice < b.price ? (b.price - b.salePrice) / b.price : 0;
        return discB - discA;
      });
    } else if (sort === 'price-asc') {
      products = [...products].sort((a: any, b: any) => {
        const pA = a.salePrice && a.salePrice > 0 ? a.salePrice : a.price;
        const pB = b.salePrice && b.salePrice > 0 ? b.salePrice : b.price;
        return pA - pB;
      });
    } else if (sort === 'price-desc') {
      products = [...products].sort((a: any, b: any) => {
        const pA = a.salePrice && a.salePrice > 0 ? a.salePrice : a.price;
        const pB = b.salePrice && b.salePrice > 0 ? b.salePrice : b.price;
        return pB - pA;
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi tải danh sách sản phẩm' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    if (!body.name || !body.price || !body.category) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng cung cấp tên, giá và danh mục' },
        { status: 400 }
      );
    }

    let slug = body.slug || generateSlug(body.name);
    const existing = await Product.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    let variants = body.variants;
    if (variants && Array.isArray(variants)) {
      variants = variants.map((v: any, idx: number) => {
        const parsedSalePrice =
          v.salePrice !== undefined && v.salePrice !== null && v.salePrice !== ''
            ? Number(v.salePrice)
            : 0;

        const colorVal = v.color || v.attributes?.['Màu sắc'] || v.attributes?.['Màu'];
        const sizeVal = v.size || v.attributes?.['Kích cỡ'] || v.attributes?.['Size'] || v.attributes?.['Kích thước'];
        const title =
          v.title ||
          v.name ||
          (v.attributes ? Object.values(v.attributes).filter(Boolean).join(' / ') : '') ||
          [colorVal, sizeVal].filter(Boolean).join(' / ') ||
          `Biến thể ${idx + 1}`;

        return {
          ...v,
          sku: v.sku?.trim() || `${slug.toUpperCase()}-${idx + 1}`,
          title,
          name: title,
          color: colorVal,
          size: sizeVal,
          attributes: v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || {}),
          price: Number(v.price) || Number(body.price) || 0,
          salePrice: parsedSalePrice,
          stock: Math.max(0, Number(v.stock) || 0),
          image: v.image || '',
        };
      });
    }

    const newProduct = await Product.create({
      ...body,
      slug,
      variants,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Thêm sản phẩm thành công',
        data: newProduct,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi thêm sản phẩm' },
      { status: 500 }
    );
  }
}