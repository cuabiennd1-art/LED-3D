'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api';

export interface BannerSlide {
  tag: string;
  title: string;
  image: string;
  link?: string;
}

export interface ThemeConfig {
  themeName: string;
  mode: 'dark' | 'light';
  pageTitles: {
    siteTitle: string;
    homeTitle: string;
    adminTitle: string;
    logoText: string;
    logoUrl: string;
    faviconUrl: string;
    metaDescription: string;
    bannerNotice: string;
    showBannerNotice: boolean;
  };
  banners: BannerSlide[];
  subBanners?: BannerSlide[];
  socialLinks: {
    tiktokUrl: string;
    facebookUrl: string;
    zaloPhone?: string;
  };
  buttonColors: {
    primaryBg: string;
    primaryText: string;
    primaryHover: string;
    secondaryBg: string;
    secondaryText: string;
    borderRadius: string;
  };
  textColors: {
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textAccent: string;
  };
  componentColors: {
    background: string;
    cardBackground: string;
    cardHoverBg: string;
    navbarBg: string;
    sidebarBg: string;
    borderColor: string;
    accentColor: string;
  };
}

export const defaultSubBanners: BannerSlide[] = [
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

export const defaultBanners: BannerSlide[] = [
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
];

export const defaultTheme: ThemeConfig = {
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
  banners: defaultBanners,
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

const THEME_CACHE_KEY = 'store_cached_theme_config_v2';

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: React.Dispatch<React.SetStateAction<ThemeConfig>>;
  saveTheme: (newConfig?: ThemeConfig) => Promise<boolean>;
  resetToDefault: () => Promise<void>;
  toggleThemeMode: (mode: 'dark' | 'light') => void;
  isLoading: boolean;
  applyCSSVariables: (config: ThemeConfig) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function isColorLight(colorStr?: string): boolean {
  if (!colorStr) return false;
  const str = colorStr.trim().toLowerCase();
  if (['white', '#fff', '#ffffff', '#f8fafc', '#f1f5f9', '#f5f5f5', '#fafafa', '#fefefe', 'transparent'].includes(str)) {
    return true;
  }
  if (['black', '#000', '#000000', '#090a0f', '#121212', '#13161f'].includes(str)) {
    return false;
  }
  if (str.startsWith('rgb')) {
    const m = str.match(/\d+/g);
    if (m && m.length >= 3) {
      const yiq = (parseInt(m[0], 10) * 299 + parseInt(m[1], 10) * 587 + parseInt(m[2], 10) * 114) / 1000;
      return yiq >= 165;
    }
  }
  let hex = str.replace('#', '');
  if (hex.length === 3 || hex.length === 4) {
    hex = hex.substring(0, 3).split('').map((c) => c + c).join('');
  }
  if (hex.length >= 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 165;
    }
  }
  return false;
}

export function updateDocumentFavicon(rawUrl?: string) {
  if (typeof document === 'undefined') return;
  const url = rawUrl?.trim();
  if (!url) return;

  const validUrl = url.startsWith('http') || url.startsWith('/') || url.startsWith('data:') ? url : `/${url}`;
  const cacheBustedUrl = validUrl.includes('?') ? validUrl : `${validUrl}?v=${Date.now()}`;

  try {
    // Determine MIME type
    let type = 'image/png';
    const lower = validUrl.toLowerCase();
    if (lower.endsWith('.ico') || lower.includes('.ico?') || lower.includes('.ico#')) {
      type = 'image/x-icon';
    } else if (lower.endsWith('.svg') || lower.includes('.svg?')) {
      type = 'image/svg+xml';
    } else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      type = 'image/jpeg';
    } else if (lower.endsWith('.webp')) {
      type = 'image/webp';
    }

    // 1. Update any existing icon link elements without removing them from DOM (prevent React removeChild crash)
    const existingIcons = document.querySelectorAll<HTMLLinkElement>(
      "link[rel~='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']"
    );

    if (existingIcons.length > 0) {
      existingIcons.forEach((link) => {
        link.href = cacheBustedUrl;
        if (link.type) link.type = type;
        if (link.hasAttribute('sizes') && !validUrl.includes('icon-192') && !validUrl.includes('icon-512')) {
          link.removeAttribute('sizes');
        }
      });
    }

    // 2. Ensure dedicated dynamic favicon links exist
    let dynamicFavicon = document.getElementById('store-dynamic-favicon') as HTMLLinkElement | null;
    if (!dynamicFavicon) {
      dynamicFavicon = document.createElement('link');
      dynamicFavicon.id = 'store-dynamic-favicon';
      dynamicFavicon.rel = 'icon';
      document.head.appendChild(dynamicFavicon);
    }
    dynamicFavicon.type = type;
    dynamicFavicon.href = cacheBustedUrl;

    let dynamicShortcut = document.getElementById('store-dynamic-shortcut') as HTMLLinkElement | null;
    if (!dynamicShortcut) {
      dynamicShortcut = document.createElement('link');
      dynamicShortcut.id = 'store-dynamic-shortcut';
      dynamicShortcut.rel = 'shortcut icon';
      document.head.appendChild(dynamicShortcut);
    }
    dynamicShortcut.type = type;
    dynamicShortcut.href = cacheBustedUrl;
  } catch (err) {
    console.warn('Error updating document favicon:', err);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  // Loading state: true until API /api/settings/theme completes
  const [isLoading, setIsLoading] = useState(true);

  // Apply CSS variables to :root and html element
  const applyCSSVariables = useCallback((config: ThemeConfig) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // Set data-theme attribute on <html>
    root.setAttribute('data-theme', config.mode);

    // Buttons
    const primaryColor = config.buttonColors?.primaryBg || '#ee4d2d';
    root.style.setProperty('--primary', primaryColor);
    root.style.setProperty('--primary-hover', config.buttonColors?.primaryHover || '#d73211');
    root.style.setProperty('--primary-text', config.buttonColors?.primaryText || '#ffffff');
    root.style.setProperty('--secondary-btn-bg', config.buttonColors?.secondaryBg || '#1a1e2b');
    root.style.setProperty('--secondary-btn-text', config.buttonColors?.secondaryText || '#94a3b8');
    root.style.setProperty('--radius-md', config.buttonColors?.borderRadius || '10px');

    const isDark = config.mode === 'dark';

    // Texts
    let textMain = config.textColors?.textPrimary || (isDark ? '#f8fafc' : '#0f172a');
    let textMuted = config.textColors?.textSecondary || (isDark ? '#94a3b8' : '#475569');
    let textDim = config.textColors?.textMuted || (isDark ? '#64748b' : '#94a3b8');
    let textAccent = config.textColors?.textAccent || primaryColor;

    // Components & Backgrounds - Mode Harmony Check
    let bgMain = config.componentColors?.background || (isDark ? '#090a0f' : '#f8fafc');
    let bgCard = config.componentColors?.cardBackground || (isDark ? '#13161f' : '#ffffff');
    let bgCardHover = config.componentColors?.cardHoverBg || (isDark ? '#1a1e2b' : '#f1f5f9');
    let borderColor = config.componentColors?.borderColor || (isDark ? '#232838' : '#e2e8f0');
    let navbarBg = config.componentColors?.navbarBg || (isDark ? '#090a0f' : '#ffffff');
    let sidebarBg = config.componentColors?.sidebarBg || (isDark ? '#131826' : '#ffffff');
    let accentColor = config.componentColors?.accentColor || '#10b981';

    // Auto-harmonize if mode was toggled but componentColors had light/dark values
    if (isDark) {
      if (isColorLight(bgMain)) bgMain = '#090a0f';
      if (isColorLight(bgCard)) bgCard = '#13161f';
      if (isColorLight(bgCardHover)) bgCardHover = '#1a1e2b';
      if (isColorLight(borderColor)) borderColor = '#232838';
      if (isColorLight(sidebarBg)) sidebarBg = '#131826';
      if (isColorLight(navbarBg)) navbarBg = '#090a0f';
      if (!isColorLight(textMain)) textMain = '#f8fafc';
      if (!isColorLight(textMuted)) textMuted = '#94a3b8';
    } else {
      if (!isColorLight(bgMain)) bgMain = '#f8fafc';
      if (!isColorLight(bgCard)) bgCard = '#ffffff';
      if (!isColorLight(bgCardHover)) bgCardHover = '#f1f5f9';
      if (!isColorLight(borderColor)) borderColor = '#e2e8f0';
      if (!isColorLight(sidebarBg)) sidebarBg = '#ffffff';
      if (navbarBg === '#090a0f' || !isColorLight(navbarBg)) navbarBg = '#ffffff';
      if (isColorLight(textMain)) textMain = '#0f172a';
      if (isColorLight(textMuted)) textMuted = '#475569';
    }

    root.style.setProperty('--text-main', textMain);
    root.style.setProperty('--text-muted', textMuted);
    root.style.setProperty('--text-dim', textDim);
    root.style.setProperty('--text-accent', textAccent);

    root.style.setProperty('--bg-main', bgMain);
    root.style.setProperty('--bg-card', bgCard);
    root.style.setProperty('--bg-card-hover', bgCardHover);
    root.style.setProperty('--navbar-bg', navbarBg);
    root.style.setProperty('--admin-sidebar-bg', sidebarBg);
    root.style.setProperty('--border-color', borderColor);
    root.style.setProperty('--accent', accentColor);

    // Also directly set body and html styles to guarantee 100% viewport coverage
    if (document.body) {
      document.body.style.backgroundColor = bgMain;
      document.body.style.color = textMain;
    }
    if (document.documentElement) {
      document.documentElement.style.backgroundColor = bgMain;
      document.documentElement.style.color = textMain;
    }

    // Dynamic contrast-aware navbar text & elements
    const currentNavbarBg = navbarBg;
    const isNavbarLight = isColorLight(currentNavbarBg);
    const navbarText = isNavbarLight ? '#0f172a' : '#ffffff';
    const navbarTextMuted = isNavbarLight ? '#64748b' : 'rgba(255, 255, 255, 0.85)';
    const navbarBorder = isNavbarLight ? (borderColor || '#e2e8f0') : 'rgba(255, 255, 255, 0.15)';
    const navbarBtnHover = isNavbarLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.15)';
    const navbarLogoColor = isNavbarLight ? primaryColor : '#ffffff';
    const navbarBadgeBg = isNavbarLight ? primaryColor : '#ffffff';
    const navbarBadgeText = isNavbarLight ? '#ffffff' : primaryColor;

    root.style.setProperty('--navbar-text', navbarText);
    root.style.setProperty('--navbar-text-muted', navbarTextMuted);
    root.style.setProperty('--navbar-border', navbarBorder);
    root.style.setProperty('--navbar-btn-hover', navbarBtnHover);
    root.style.setProperty('--navbar-logo-color', navbarLogoColor);
    root.style.setProperty('--navbar-badge-bg', navbarBadgeBg);
    root.style.setProperty('--navbar-badge-text', navbarBadgeText);

    // Admin Theme specific variables
    root.style.setProperty('--admin-bg', bgMain);
    root.style.setProperty('--admin-card', bgCard);
    root.style.setProperty('--admin-border', borderColor);
    root.style.setProperty('--admin-text', textMain);
    root.style.setProperty('--admin-text-muted', textMuted);
    root.style.setProperty('--admin-accent', primaryColor);

    // 100% Dynamic Page Title from API / Theme Settings
    const dynamicTitle = config.pageTitles?.siteTitle?.trim() || config.pageTitles?.logoText?.trim() || '';
    if (dynamicTitle) {
      document.title = dynamicTitle;
    }

    // Dynamic Favicon & Browser Tab Icon Synchronization (Forces browser to repaint tab icon)
    const rawFavicon = config.pageTitles?.faviconUrl?.trim();
    const rawLogo = config.pageTitles?.logoUrl?.trim();
    const faviconToUse = rawFavicon || rawLogo;

    if (faviconToUse) {
      updateDocumentFavicon(faviconToUse);
    }

    // Meta Description
    if (config.pageTitles?.metaDescription) {
      let meta: HTMLMetaElement | null = document.querySelector("meta[name='description']");
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.getElementsByTagName('head')[0]?.appendChild(meta);
      }
      meta.content = config.pageTitles.metaDescription;
    }
  }, []);

  // 1. Mount & Live Synchronization
  useEffect(() => {
    // Clear any obsolete legacy local storage keys
    try {
      localStorage.removeItem('shopbig_cached_theme_config');
    } catch (e) {}

    // A. Apply cached theme first to prevent flash
    try {
      const cached = localStorage.getItem(THEME_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          const merged = { ...defaultTheme, ...parsed };
          setTheme(merged);
          applyCSSVariables(merged);
        }
      } else {
        applyCSSVariables(defaultTheme);
      }
    } catch (e) {
      applyCSSVariables(defaultTheme);
    }

    // B. Immediately fetch fresh theme from API (ensuring new preset from Admin applies instantly)
    async function loadFreshTheme() {
      try {
        const res = await apiFetch(`/api/settings/theme?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        const data = await res.json();
        if (data?.success && data?.data) {
          const merged: ThemeConfig = {
            ...defaultTheme,
            ...data.data,
            pageTitles: { ...defaultTheme.pageTitles, ...(data.data.pageTitles || {}) },
            banners: Array.isArray(data.data.banners) ? data.data.banners : defaultTheme.banners,
            subBanners: Array.isArray(data.data.subBanners) ? data.data.subBanners : [],
            socialLinks: { ...defaultTheme.socialLinks, ...(data.data.socialLinks || {}) },
            buttonColors: { ...defaultTheme.buttonColors, ...(data.data.buttonColors || {}) },
            textColors: { ...defaultTheme.textColors, ...(data.data.textColors || {}) },
            componentColors: { ...defaultTheme.componentColors, ...(data.data.componentColors || {}) },
          };
          setTheme(merged);
          applyCSSVariables(merged);
          try {
            localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(merged));
          } catch (storageErr) {}
        }
      } catch (e) {
        console.warn('Fresh theme refresh failed, keeping current theme.');
      } finally {
        setIsLoading(false);
      }
    }
    loadFreshTheme();

    // C. Cross-Tab and In-App Live Theme Event Listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_CACHE_KEY && e.newValue) {
        try {
          const fresh = JSON.parse(e.newValue);
          const merged = { ...defaultTheme, ...fresh };
          setTheme(merged);
          applyCSSVariables(merged);
        } catch (err) {}
      }
    };

    const handleCustom = (e: any) => {
      if (e.detail) {
        const merged = { ...defaultTheme, ...e.detail };
        setTheme(merged);
        applyCSSVariables(merged);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('store_theme_updated', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('store_theme_updated', handleCustom);
    };
  }, [applyCSSVariables]);

  // Toggle Theme Mode between Dark and Light
  const toggleThemeMode = useCallback((mode: 'dark' | 'light') => {
    setTheme((prevTheme) => {
      let updated: ThemeConfig;
      if (mode === 'dark') {
        updated = {
          ...prevTheme,
          mode: 'dark',
          componentColors: {
            ...prevTheme.componentColors,
            background: '#090a0f',
            cardBackground: '#13161f',
            cardHoverBg: '#1a1e2b',
            navbarBg: '#090a0f',
            sidebarBg: '#131826',
            borderColor: '#232838',
          },
          textColors: {
            ...prevTheme.textColors,
            textPrimary: '#f8fafc',
            textSecondary: '#94a3b8',
            textMuted: '#64748b',
          },
          buttonColors: {
            ...prevTheme.buttonColors,
            secondaryBg: '#1a1e2b',
            secondaryText: '#94a3b8',
          },
        };
      } else {
        updated = {
          ...prevTheme,
          mode: 'light',
          componentColors: {
            ...prevTheme.componentColors,
            background: '#f8fafc',
            cardBackground: '#ffffff',
            cardHoverBg: '#f1f5f9',
            navbarBg: '#ffffff',
            sidebarBg: '#ffffff',
            borderColor: '#e2e8f0',
          },
          textColors: {
            ...prevTheme.textColors,
            textPrimary: '#0f172a',
            textSecondary: '#475569',
            textMuted: '#94a3b8',
          },
          buttonColors: {
            ...prevTheme.buttonColors,
            secondaryBg: '#f1f5f9',
            secondaryText: '#475569',
          },
        };
      }
      applyCSSVariables(updated);
      try {
        localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('store_theme_updated', { detail: updated }));
      } catch (err) {}
      return updated;
    });
  }, [applyCSSVariables]);

  // Save theme to MongoDB Atlas via API
  const saveTheme = async (newConfig?: ThemeConfig): Promise<boolean> => {
    const configToSave = newConfig || theme;
    try {
      applyCSSVariables(configToSave);
      const res = await apiFetch('/api/settings/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSave),
      });
      const data = await res.json();
      if (data.success) {
        setTheme(data.data);
        try {
          localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(data.data));
          window.dispatchEvent(new CustomEvent('store_theme_updated', { detail: data.data }));
        } catch (err) {}
        toast.success('Đã lưu cấu hình giao diện thành công!');
        return true;
      } else {
        toast.error(data.message || 'Lỗi lưu cấu hình');
        return false;
      }
    } catch (e) {
      toast.error('Lỗi kết nối máy chủ');
      return false;
    }
  };

  const resetToDefault = async () => {
    setTheme(defaultTheme);
    applyCSSVariables(defaultTheme);
    try {
      localStorage.removeItem(THEME_CACHE_KEY);
    } catch (err) {}
    await saveTheme(defaultTheme);
    toast.success('Đã khôi phục giao diện mặc định');
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        saveTheme,
        resetToDefault,
        toggleThemeMode,
        isLoading,
        applyCSSVariables,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
