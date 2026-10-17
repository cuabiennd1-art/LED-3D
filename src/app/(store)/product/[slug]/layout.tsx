import type { Metadata } from 'next';
import { headers } from 'next/headers';
import connectToDatabase from '@/lib/mongodb';
import Product from '@/models/Product';
import Setting from '@/models/Setting';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    if (!slug || slug === 'undefined' || slug === 'null') return {};

    const rawSlug = String(slug).trim();
    let decodedSlug = rawSlug;
    try {
      decodedSlug = decodeURIComponent(rawSlug).trim();
    } catch (_) {
      decodedSlug = rawSlug;
    }

    await connectToDatabase();
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let product: any = null;
    if (rawSlug.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(rawSlug).lean();
    }
    if (!product) {
      product = await Product.findOne({
        $or: [{ slug: decodedSlug }, { slug: rawSlug }],
      }).lean();
    }
    if (!product) {
      product = await Product.findOne({
        slug: { $regex: new RegExp(`^${escapeRegex(decodedSlug)}$`, 'i') },
      }).lean();
    }

    const setting = (await Setting.findOne({ key: 'theme_settings' }).lean()) as any;

    if (!product) {
      return {
        title: 'Chi tiết sản phẩm',
      };
    }

    const themeConfig = setting?.value || {};
    const pageTitles = themeConfig?.pageTitles || {};
    const shopName = pageTitles.logoText || pageTitles.siteTitle || 'ShopBig';

    // Resolve base url dynamically from request headers
    const headersList = await headers();
    const host = headersList.get('host') || 'webbanhang.io';
    const proto =
      headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${proto}://${host}`;

    // Resolve primary image
    let rawImage = product.images?.[0] || product.image || '';
    let absoluteImageUrl = rawImage;
    if (rawImage && !rawImage.startsWith('http://') && !rawImage.startsWith('https://')) {
      absoluteImageUrl = `${baseUrl}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;
    }

    // Format price
    const currentPrice = product.salePrice ?? product.price ?? 0;
    const priceFormatted = currentPrice
      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentPrice)
      : '';

    // Clean plain-text description (strip HTML tags)
    const rawDesc = product.description || '';
    const plainDesc = rawDesc.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const metaDescription = priceFormatted
      ? `Giá chỉ: ${priceFormatted}. ${plainDesc ? plainDesc.substring(0, 150) : 'Sản phẩm chính hãng chất lượng cao, giao hàng toàn quốc.'}`
      : plainDesc
      ? plainDesc.substring(0, 160)
      : `${product.name} chính hãng chất lượng cao.`;

    const canonicalUrl = `${baseUrl}/product/${slug}`;

    return {
      title: `${product.name} | ${shopName}`,
      description: metaDescription,
      openGraph: {
        title: `${product.name} ${priceFormatted ? `- ${priceFormatted}` : ''}`,
        description: metaDescription,
        url: canonicalUrl,
        siteName: shopName,
        images: absoluteImageUrl
          ? [
              {
                url: absoluteImageUrl,
                width: 800,
                height: 800,
                alt: product.name,
              },
            ]
          : [],
        type: 'website',
        locale: 'vi_VN',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${product.name} ${priceFormatted ? `- ${priceFormatted}` : ''}`,
        description: metaDescription,
        images: absoluteImageUrl ? [absoluteImageUrl] : [],
      },
    };
  } catch (error) {
    console.error('Error generating metadata for product:', error);
    return {
      title: 'Chi tiết sản phẩm',
    };
  }
}

export default function ProductSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
