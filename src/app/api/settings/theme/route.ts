import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import connectToDatabase from '@/lib/mongodb';
import Setting from '@/models/Setting';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface IBannerSlide {
  tag: string;
  title: string;
  image: string;
  link?: string;
}

export interface IThemeConfig {
  // 1. Theme & Mode
  themeName: string; // 'default' | 'modern-blue' | 'emerald-luxury' | 'sunset-amber' | 'minimal-light'
  mode: 'dark' | 'light'; // 'dark' (Tối) | 'light' (Sáng)

  // 2. Title Pages & SEO & Logo
  pageTitles: {
    siteTitle: string; // "ShopBig - Cửa Hàng Thời Trang & Phụ Kiện Cao Cấp"
    homeTitle: string; // "Trang Chủ | ShopBig"
    adminTitle: string; // "ShopBig Admin Portal"
    logoText: string; // "ShopBig"
    logoUrl: string; // URL hình ảnh logo
    faviconUrl: string; // URL favicon tab trình duyệt
    metaDescription: string; // "Trải nghiệm mua sắm thời trang trực tuyến thời thượng"
    bannerNotice: string; // "🔥 Miễn phí vận chuyển toàn quốc cho đơn hàng từ 500.000đ"
    showBannerNotice: boolean;
  };

  // 3. Banner Slides Carousel
  banners: IBannerSlide[];
  // 3.1. Sub Banners (2 side banners for PC desktop)
  subBanners?: IBannerSlide[];

  // 4. Social Links (TikTok, Facebook, Zalo)
  socialLinks: {
    tiktokUrl: string; // Link kênh TikTok
    facebookUrl: string; // Link Fanpage Facebook
    zaloPhone?: string; // Số điện thoại Zalo Chat 1:1
  };

  // 5. Màu sắc Button (Nút bấm)
  buttonColors: {
    primaryBg: string; // Màu nền nút chính (vd: #3b82f6)
    primaryText: string; // Màu chữ nút chính (vd: #ffffff)
    primaryHover: string; // Màu khi hover nút chính (vd: #2563eb)
    secondaryBg: string; // Màu nền nút phụ (vd: #1a1e2b)
    secondaryText: string; // Màu chữ nút phụ (vd: #94a3b8)
    borderRadius: string; // Bo góc nút: '6px' | '8px' | '12px' | '999px'
  };

  // 6. Màu sắc Text (Văn bản)
  textColors: {
    textPrimary: string; // Màu chữ tiêu đề/chính (vd: #f8fafc hoặc #0f172a)
    textSecondary: string; // Màu chữ nội dung phụ (vd: #94a3b8 hoặc #64748b)
    textMuted: string; // Màu chữ ghi chú/mờ (vd: #64748b hoặc #94a3b8)
    textAccent: string; // Màu chữ nổi bật (vd: #3b82f6)
  };

  // 7. Màu sắc Component (Thành phần giao diện)
  componentColors: {
    background: string; // Màu nền toàn trang (vd: #090a0f hoặc #f8fafc)
    cardBackground: string; // Màu nền thẻ card / modal (vd: #13161f hoặc #ffffff)
    cardHoverBg: string; // Màu nền khi hover thẻ (vd: #1a1e2b)
    navbarBg: string; // Màu nền header/navbar (vd: #090a0f hoặc #ffffff)
    sidebarBg: string; // Màu nền sidebar admin (vd: #131826)
    borderColor: string; // Màu đường viền khung viền (vd: #232838 hoặc #e2e8f0)
    accentColor: string; // Màu điểm nhấn (vd: #10b981)
  };
}

export const defaultSubBanners: IBannerSlide[] = [
  {
    tag: '9.9 Siêu Sale',
    title: 'Ăn Sáng Ngon Rẻ - Chỉ từ 10.000đ',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80',
    link: '/?tab=products',
  },
  {
    tag: 'Hàng Việt Tôi Yêu',
    title: 'Chất Lượng Chính Hãng - Freeship 0Đ',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80',
    link: '/?tab=products&filter=flash-sale',
  },
];

export const defaultThemeConfig: IThemeConfig = {
  themeName: 'modern-blue',
  mode: 'dark',
  pageTitles: {
    siteTitle: '',
    homeTitle: '',
    adminTitle: '',
    logoText: '',
    logoUrl: '',
    faviconUrl: '',
    metaDescription: '',
    bannerNotice: '🔥 Miễn phí vận chuyển toàn quốc cho đơn hàng từ 500.000đ',
    showBannerNotice: true,
  },
  banners: [
    {
      tag: 'Siêu Sale Shopee',
      title: '🔥 Giảm Đến 50% & Freeship 0Đ Toàn Quốc',
      image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=900&auto=format&fit=crop&q=80',
      link: '/?tab=products&filter=flash-sale',
    },
    {
      tag: 'Hàng Hiệu Mall',
      title: '⭐ Bộ Sưu Tập Thể Thao Mùa Giải Mới 2026',
      image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&auto=format&fit=crop&q=80',
      link: '/?tab=products',
    },
    {
      tag: 'Flash Sale Giờ Vàng',
      title: '⚡ Săn Deal Chớp Nhoáng - Số Lượng Có Hạn',
      image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=900&auto=format&fit=crop&q=80',
      link: '/?tab=products&filter=flash-sale',
    },
    {
      tag: 'Quà Tặng Độc Quyền',
      title: '🎁 Mua 1 Tặng 1 - Tặng Kèm Phụ Kiện Thể Thao',
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&auto=format&fit=crop&q=80',
      link: '/?tab=products',
    },
  ],
  subBanners: defaultSubBanners,
  socialLinks: {
    tiktokUrl: '',
    facebookUrl: '',
    zaloPhone: '',
  },
  buttonColors: {
    primaryBg: '#3b82f6',
    primaryText: '#ffffff',
    primaryHover: '#2563eb',
    secondaryBg: '#1a1e2b',
    secondaryText: '#94a3b8',
    borderRadius: '10px',
  },
  textColors: {
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    textAccent: '#3b82f6',
  },
  componentColors: {
    background: '#090a0f',
    cardBackground: '#13161f',
    cardHoverBg: '#1a1e2b',
    navbarBg: '#090a0f',
    sidebarBg: '#131826',
    borderColor: '#232838',
    accentColor: '#10b981',
  },
};

export async function GET() {
  try {
    await connectToDatabase();
    const setting = await Setting.findOne({ key: 'theme_settings' });

    if (!setting || !setting.value) {
      return NextResponse.json({
        success: true,
        data: defaultThemeConfig,
      });
    }

    // Merge with defaults to ensure all fields exist
    const mergedData: IThemeConfig = {
      ...defaultThemeConfig,
      ...setting.value,
      pageTitles: { ...defaultThemeConfig.pageTitles, ...(setting.value.pageTitles || {}) },
      banners: Array.isArray(setting.value.banners) ? setting.value.banners : defaultThemeConfig.banners,
      subBanners: Array.isArray(setting.value.subBanners) ? setting.value.subBanners : [],
      socialLinks: { ...defaultThemeConfig.socialLinks, ...(setting.value.socialLinks || {}) },
      buttonColors: { ...defaultThemeConfig.buttonColors, ...(setting.value.buttonColors || {}) },
      textColors: { ...defaultThemeConfig.textColors, ...(setting.value.textColors || {}) },
      componentColors: { ...defaultThemeConfig.componentColors, ...(setting.value.componentColors || {}) },
    };

    return NextResponse.json(
      {
        success: true,
        data: mergedData,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi tải cấu hình theme giao diện' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    // Validate and merge with existing configuration
    const existing = await Setting.findOne({ key: 'theme_settings' });
    const currentVal = existing?.value || defaultThemeConfig;

    const updatedConfig: IThemeConfig = {
      themeName: body.themeName || currentVal.themeName || 'default',
      mode: body.mode === 'light' ? 'light' : 'dark',
      pageTitles: {
        ...currentVal.pageTitles,
        ...(body.pageTitles || {}),
      },
      banners: Array.isArray(body.banners) ? body.banners : (currentVal.banners || defaultThemeConfig.banners),
      subBanners: Array.isArray(body.subBanners) ? body.subBanners : (currentVal.subBanners || []),
      socialLinks: {
        ...currentVal.socialLinks,
        ...(body.socialLinks || {}),
      },
      buttonColors: {
        ...currentVal.buttonColors,
        ...(body.buttonColors || {}),
      },
      textColors: {
        ...currentVal.textColors,
        ...(body.textColors || {}),
      },
      componentColors: {
        ...currentVal.componentColors,
        ...(body.componentColors || {}),
      },
    };

    const updated = await Setting.findOneAndUpdate(
      { key: 'theme_settings' },
      { value: updatedConfig },
      { upsert: true, new: true }
    );

    // Revalidate Next.js Server-Side Layouts & Metadata cache immediately
    try {
      revalidatePath('/', 'layout');
    } catch (revalErr) {
      console.warn('Revalidate layout path failed:', revalErr);
    }

    // Regenerate PWA and favicon assets in the background if logo/favicon exists
    try {
      const { fork } = require('child_process');
      const path = require('path');
      const scriptPath = path.join(process.cwd(), 'scripts', 'generate-pwa-icons.js');
      const iconUrl = updatedConfig.pageTitles?.faviconUrl || updatedConfig.pageTitles?.logoUrl;
      const child = fork(scriptPath, iconUrl ? [path.join(process.cwd(), 'public', iconUrl.replace(/^\//, ''))] : []);
      child.unref();
    } catch (iconGenErr) {
      console.warn('PWA icon generation background process error:', iconGenErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật cấu hình theme & giao diện thành công!',
      data: updated.value,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi lưu cấu hình theme' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  return POST(request);
}