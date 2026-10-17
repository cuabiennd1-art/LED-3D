import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Review from '@/models/Review';
import Product from '@/models/Product';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const productId = searchParams.get('productId');
    const slug = searchParams.get('slug');
    const star = searchParams.get('star');
    const hasImage = searchParams.get('hasImage');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '10', 10)));

    let targetProductId = productId;
    let productDoc: any = null;

    if (!targetProductId && slug) {
      productDoc = await Product.findOne({ slug });
      if (productDoc) {
        targetProductId = productDoc._id.toString();
      }
    } else if (targetProductId && mongoose.Types.ObjectId.isValid(targetProductId)) {
      productDoc = await Product.findById(targetProductId);
    }

    if (!targetProductId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin productId hoặc slug sản phẩm' },
        { status: 400 }
      );
    }

    // Build filter - Chấp nhận cả status: 'approved' và các đánh giá chưa gắn status (chỉ loại trừ 'hidden')
    const query: any = {
      product: new mongoose.Types.ObjectId(targetProductId),
      status: { $ne: 'hidden' },
    };

    if (star && ['1', '2', '3', '4', '5'].includes(star)) {
      query.rating = parseInt(star, 10);
    }

    if (hasImage === 'true') {
      query.images = { $exists: true, $not: { $size: 0 } };
    }

    // Fetch all reviews for calculating real-time statistics
    const allReviews = await Review.find({
      product: new mongoose.Types.ObjectId(targetProductId),
      status: { $ne: 'hidden' },
    }).select('rating images');

    const totalReviews = allReviews.length;
    let sumRating = 0;
    const countByStar: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    let withImagesCount = 0;

    for (const r of allReviews) {
      const rRating = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
      countByStar[String(rRating)] = (countByStar[String(rRating)] || 0) + 1;
      sumRating += r.rating || 5;
      if (Array.isArray(r.images) && r.images.length > 0) {
        withImagesCount += 1;
      }
    }

    const averageRating = totalReviews > 0 ? Number((sumRating / totalReviews).toFixed(1)) : 5.0;

    const sortBy = searchParams.get('sortBy') || 'newest';
    let sortOptions: any = { createdAt: -1 };
    if (sortBy === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sortBy === 'rating_desc') {
      sortOptions = { rating: -1, createdAt: -1 };
    } else if (sortBy === 'rating_asc') {
      sortOptions = { rating: 1, createdAt: -1 };
    } else {
      sortOptions = { createdAt: -1 };
    }

    // Fetch paginated filtered reviews (mặc định 10 đánh giá mới nhất trước)
    const totalFiltered = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: reviews,
      stats: {
        averageRating,
        totalReviews,
        countByStar,
        withImagesCount,
        productName: productDoc?.name || '',
      },
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages: Math.max(1, Math.ceil(totalFiltered / limit)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi khi tải danh sách đánh giá' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const { productId, slug, productSlug, author, rating, variantTitle, comment, images, avatar, orderId } = body;

    let targetProductId = productId;
    let productDoc: any = null;
    const lookupSlug = slug || productSlug;

    if (targetProductId && mongoose.Types.ObjectId.isValid(targetProductId)) {
      productDoc = await Product.findById(targetProductId);
    }

    if (!productDoc && lookupSlug) {
      productDoc = await Product.findOne({ slug: lookupSlug });
      if (productDoc) {
        targetProductId = productDoc._id.toString();
      }
    }

    if (!targetProductId || !productDoc) {
      return NextResponse.json(
        { success: false, message: 'Sản phẩm được đánh giá không tồn tại' },
        { status: 404 }
      );
    }

    if (!author || typeof author !== 'string' || !author.trim()) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập họ và tên người đánh giá' },
        { status: 400 }
      );
    }

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { success: false, message: 'Số sao đánh giá phải từ 1 đến 5 sao' },
        { status: 400 }
      );
    }

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập nội dung nhận xét đánh giá' },
        { status: 400 }
      );
    }

    // Create the review
    const newReview = await Review.create({
      product: productDoc._id,
      orderId: orderId || null,
      author: author.trim(),
      avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(author.trim())}`,
      rating: numRating,
      variantTitle: variantTitle ? String(variantTitle).trim() : '',
      comment: comment.trim(),
      images: Array.isArray(images) ? images.filter(Boolean) : [],
      likes: 0,
      verified: true,
      status: 'approved',
    });

    // Update Product average rating and reviewCount
    const allApproved = await Review.find({ product: productDoc._id, status: 'approved' }).select('rating');
    const totalCount = allApproved.length;
    const sumRatings = allApproved.reduce((acc, r) => acc + (r.rating || 5), 0);
    const newAvg = totalCount > 0 ? Number((sumRatings / totalCount).toFixed(1)) : numRating;

    await Product.findByIdAndUpdate(productDoc._id, {
      rating: newAvg,
      reviewCount: totalCount,
    });

    return NextResponse.json({
      success: true,
      message: 'Gửi đánh giá sản phẩm thành công! Cảm ơn nhận xét của bạn.',
      data: newReview,
      newAverageRating: newAvg,
      totalReviews: totalCount,
    });
  } catch (error: any) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi khi gửi đánh giá sản phẩm' },
      { status: 500 }
    );
  }
}
