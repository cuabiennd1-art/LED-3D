import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { generateSlug, getProductCoverImage } from '@/lib/utils';

export async function GET() {
  try {
    await connectToDatabase();
    const categories = await Category.find({}).sort({ order: 1, createdAt: -1 });

    // Fetch all products to reliably match category images
    const allProducts = await Product.find({
      status: 'active',
      images: { $exists: true, $ne: [] },
    }).select('category images name').lean();

    const categoriesWithCount = categories.map((cat) => {
      const catObj = cat.toObject();
      const catIdStr = cat._id.toString();
      const catSlug = (cat.slug || '').toLowerCase().trim();
      const catName = (cat.name || '').toLowerCase().trim();

      // Find all products matching this category
      const matchedProducts = allProducts.filter((p: any) => {
        if (!p.category) return false;
        const pCatStr = (typeof p.category === 'object' ? p.category._id || p.category.toString() : p.category).toString();
        const pCatSlug = (p.category.slug || p.category || '').toString().toLowerCase().trim();
        const pCatName = (p.category.name || '').toString().toLowerCase().trim();

        return (
          pCatStr === catIdStr ||
          pCatSlug === catSlug ||
          pCatName === catName ||
          pCatStr === catSlug ||
          pCatStr === catName
        );
      });

      // Lấy ảnh của 1 sản phẩm bất kỳ thuộc danh mục đó (bỏ qua video)
      let sampleProductImg = '';
      if (matchedProducts.length > 0) {
        for (const prod of matchedProducts) {
          const cover = getProductCoverImage(prod, '');
          if (cover) {
            sampleProductImg = cover;
            break;
          }
        }
      }

      catObj.productCount = matchedProducts.length;
      // Ưu tiên 100% ảnh sản phẩm thực tế của danh mục
      catObj.sampleImage = sampleProductImg;
      catObj.image = sampleProductImg || catObj.image || '';
      return catObj;
    });

    return NextResponse.json(
      {
        success: true,
        data: categoriesWithCount,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi tải danh mục' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { success: false, message: 'Tên danh mục là bắt buộc' },
        { status: 400 }
      );
    }

    const slug = body.slug || generateSlug(body.name);
    const newCategory = await Category.create({
      ...body,
      slug,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Thêm danh mục thành công',
        data: newCategory,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi thêm danh mục' },
      { status: 500 }
    );
  }
}