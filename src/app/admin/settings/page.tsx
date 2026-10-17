'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FiSave,
  FiRotateCcw,
  FiMoon,
  FiSun,
  FiLayout,
  FiType,
  FiBox,
  FiImage,
  FiUploadCloud,
  FiCheck,
  FiEye,
  FiLock,
  FiMail,
  FiSend,
  FiHelpCircle,
  FiLayers,
  FiPlus,
  FiTrash2,
  FiArrowUp,
  FiArrowDown,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useTheme, ThemeConfig, BannerSlide, defaultTheme, defaultBanners, defaultSubBanners } from '@/contexts/ThemeContext';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

// Preset Themes for 1-click styling
const PRESET_THEMES: { id: string; name: string; primaryColor: string; bg: string; config: Partial<ThemeConfig> }[] = [
  {
    id: 'shopee-orange',
    name: 'Shopee (Cam Shopee)',
    primaryColor: '#ee4d2d',
    bg: '#f5f5f5',
    config: {
      themeName: 'shopee-orange',
      mode: 'light',
      buttonColors: {
        primaryBg: '#ee4d2d',
        primaryText: '#ffffff',
        primaryHover: '#d73211',
        secondaryBg: '#fef0ed',
        secondaryText: '#ee4d2d',
        borderRadius: '6px',
      },
      textColors: {
        textPrimary: '#222222',
        textSecondary: '#666666',
        textMuted: '#999999',
        textAccent: '#ee4d2d',
      },
      componentColors: {
        background: '#f5f5f5',
        cardBackground: '#ffffff',
        cardHoverBg: '#fafafa',
        navbarBg: '#ee4d2d',
        sidebarBg: '#ffffff',
        borderColor: '#e8e8e8',
        accentColor: '#ff5722',
      },
    },
  },
  {
    id: 'tiktok-dark',
    name: 'TikTok Shop (Đỏ Hồng & Neon)',
    primaryColor: '#fe2c55',
    bg: '#121212',
    config: {
      themeName: 'tiktok-dark',
      mode: 'dark',
      buttonColors: {
        primaryBg: '#fe2c55',
        primaryText: '#ffffff',
        primaryHover: '#e01a44',
        secondaryBg: '#242424',
        secondaryText: '#ffffff',
        borderRadius: '8px',
      },
      textColors: {
        textPrimary: '#ffffff',
        textSecondary: '#a6a6a6',
        textMuted: '#757575',
        textAccent: '#25f4ee',
      },
      componentColors: {
        background: '#121212',
        cardBackground: '#1e1e1e',
        cardHoverBg: '#282828',
        navbarBg: '#121212',
        sidebarBg: '#181818',
        borderColor: '#2f2f2f',
        accentColor: '#25f4ee',
      },
    },
  },
  {
    id: 'modern-blue',
    name: 'Modern Blue (Mặc định)',
    primaryColor: '#3b82f6',
    bg: '#090a0f',
    config: {
      themeName: 'modern-blue',
      mode: 'dark',
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
    },
  },
  {
    id: 'emerald-luxury',
    name: 'Emerald Luxury (Xanh Lục Bảo)',
    primaryColor: '#10b981',
    bg: '#06130e',
    config: {
      themeName: 'emerald-luxury',
      mode: 'dark',
      buttonColors: {
        primaryBg: '#10b981',
        primaryText: '#ffffff',
        primaryHover: '#059669',
        secondaryBg: '#0e261e',
        secondaryText: '#a7f3d0',
        borderRadius: '12px',
      },
      textColors: {
        textPrimary: '#f0fdf4',
        textSecondary: '#a7f3d0',
        textMuted: '#6ee7b7',
        textAccent: '#34d399',
      },
      componentColors: {
        background: '#06130e',
        cardBackground: '#0d221b',
        cardHoverBg: '#123026',
        navbarBg: '#06130e',
        sidebarBg: '#0a1d17',
        borderColor: '#193f32',
        accentColor: '#fbbf24',
      },
    },
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon (Tím Dạ Quang)',
    primaryColor: '#8b5cf6',
    bg: '#0c071e',
    config: {
      themeName: 'cyberpunk-neon',
      mode: 'dark',
      buttonColors: {
        primaryBg: '#8b5cf6',
        primaryText: '#ffffff',
        primaryHover: '#7c3aed',
        secondaryBg: '#1f133d',
        secondaryText: '#c4b5fd',
        borderRadius: '8px',
      },
      textColors: {
        textPrimary: '#faf5ff',
        textSecondary: '#c4b5fd',
        textMuted: '#a78bfa',
        textAccent: '#ec4899',
      },
      componentColors: {
        background: '#0c071e',
        cardBackground: '#170d38',
        cardHoverBg: '#21134e',
        navbarBg: '#0c071e',
        sidebarBg: '#130a2e',
        borderColor: '#2e1c6b',
        accentColor: '#ec4899',
      },
    },
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber (Cam Hoàng Hôn)',
    primaryColor: '#f97316',
    bg: '#140c06',
    config: {
      themeName: 'sunset-amber',
      mode: 'dark',
      buttonColors: {
        primaryBg: '#f97316',
        primaryText: '#ffffff',
        primaryHover: '#ea580c',
        secondaryBg: '#26170d',
        secondaryText: '#fed7aa',
        borderRadius: '10px',
      },
      textColors: {
        textPrimary: '#fff7ed',
        textSecondary: '#fed7aa',
        textMuted: '#fdba74',
        textAccent: '#f97316',
      },
      componentColors: {
        background: '#140c06',
        cardBackground: '#24140a',
        cardHoverBg: '#331c0e',
        navbarBg: '#140c06',
        sidebarBg: '#1c0f08',
        borderColor: '#432311',
        accentColor: '#ef4444',
      },
    },
  },
  {
    id: 'minimal-light',
    name: 'Minimal Clean (Sáng Tinh Tế)',
    primaryColor: '#2563eb',
    bg: '#f8fafc',
    config: {
      themeName: 'minimal-light',
      mode: 'light',
      buttonColors: {
        primaryBg: '#2563eb',
        primaryText: '#ffffff',
        primaryHover: '#1d4ed8',
        secondaryBg: '#f1f5f9',
        secondaryText: '#475569',
        borderRadius: '8px',
      },
      textColors: {
        textPrimary: '#0f172a',
        textSecondary: '#475569',
        textMuted: '#94a3b8',
        textAccent: '#2563eb',
      },
      componentColors: {
        background: '#f8fafc',
        cardBackground: '#ffffff',
        cardHoverBg: '#f1f5f9',
        navbarBg: '#ffffff',
        sidebarBg: '#f1f5f9',
        borderColor: '#e2e8f0',
        accentColor: '#10b981',
      },
    },
  },
];

export default function AdminSettingsPage() {
  const { theme, setTheme, saveTheme, resetToDefault, toggleThemeMode, applyCSSVariables } = useTheme();
  const [activeTab, setActiveTab] = useState<'titles' | 'banners' | 'mode' | 'buttons' | 'texts' | 'components' | 'email' | 'password'>('titles');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [uploadingBannerIdx, setUploadingBannerIdx] = useState<number | null>(null);
  const [uploadingSubBannerIdx, setUploadingSubBannerIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const subBannerInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Email SMTP Settings State
  const [emailForm, setEmailForm] = useState({
    enabled: true,
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: '',
    pass: '',
    senderName: 'ShopBig Store',
    senderEmail: '',
    adminNotificationEmail: '',
    sendToCustomer: true,
    sendToAdmin: true,
  });
  const [loadingEmailConfig, setLoadingEmailConfig] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);

  // Fetch Email Config
  useEffect(() => {
    async function fetchEmailConfig() {
      try {
        setLoadingEmailConfig(true);
        const res = await apiFetch('/api/settings/email');
        const data = await res.json();
        if (data.success && data.data) {
          setEmailForm(data.data);
          if (data.data.adminNotificationEmail || data.data.user) {
            setTestEmailTarget(data.data.adminNotificationEmail || data.data.user);
          }
        }
      } catch (err) {
        console.error('Error loading email settings:', err);
      } finally {
        setLoadingEmailConfig(false);
      }
    }
    fetchEmailConfig();
  }, []);

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    try {
      const res = await apiFetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã lưu cấu hình Email SMTP thành công!');
        if (data.data) {
          setEmailForm((prev) => ({ ...prev, ...data.data }));
        }
      } else {
        toast.error(data.message || 'Lỗi lưu cấu hình email');
      }
    } catch (err: any) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailTarget || !testEmailTarget.includes('@')) {
      toast.error('Vui lòng nhập địa chỉ email nhận thư thử nghiệm');
      return;
    }
    setTestingEmail(true);
    try {
      const res = await apiFetch('/api/settings/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...emailForm,
          targetEmail: testEmailTarget,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message, { duration: 6000 });
      } else {
        toast.error(data.message || 'Gửi email thử nghiệm thất bại', { duration: 6000 });
      }
    } catch (err: any) {
      toast.error('Lỗi khi gửi email test');
    } finally {
      setTestingEmail(false);
    }
  };

  // Change Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setChangingPassword(true);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(passwordForm),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Đổi mật khẩu tài khoản Admin thành công!');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.message || 'Lỗi khi đổi mật khẩu');
      }
    } catch (err: any) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setChangingPassword(false);
    }
  };

  // Quick preset apply
  const handleApplyPreset = (preset: typeof PRESET_THEMES[0]) => {
    const updated: ThemeConfig = {
      ...theme,
      ...preset.config,
      buttonColors: { ...theme.buttonColors, ...(preset.config.buttonColors || {}) },
      textColors: { ...theme.textColors, ...(preset.config.textColors || {}) },
      componentColors: { ...theme.componentColors, ...(preset.config.componentColors || {}) },
    };
    setTheme(updated);
    applyCSSVariables(updated);
    toast.success(`Đã chọn theme ${preset.name}!`);
  };

  // Upload logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        const updated: ThemeConfig = {
          ...theme,
          pageTitles: {
            ...theme.pageTitles,
            logoUrl: data.data.url,
          },
        };
        setTheme(updated);
        applyCSSVariables(updated);
        toast.success('Upload Logo thành công! Hãy bấm "Lưu Cấu Hình" để lưu lại.');
      } else {
        toast.error(data.message || 'Lỗi upload ảnh logo');
      }
    } catch (err) {
      toast.error('Lỗi khi tải ảnh logo lên');
    } finally {
      setIsUploading(false);
    }
  };

  // Upload favicon
  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploadingFavicon(true);
    try {
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        const updated: ThemeConfig = {
          ...theme,
          pageTitles: {
            ...theme.pageTitles,
            faviconUrl: data.data.url,
          },
        };
        setTheme(updated);
        applyCSSVariables(updated);
        toast.success('Upload Favicon thành công! Hãy bấm "Lưu Cấu Hình" để lưu lại.');
      } else {
        toast.error(data.message || 'Lỗi upload favicon');
      }
    } catch (err) {
      toast.error('Lỗi khi tải favicon lên');
    } finally {
      setIsUploadingFavicon(false);
    }
  };

  // Banner Handlers
  const handleBannerChange = (index: number, field: keyof BannerSlide, value: string) => {
    const currentBanners = theme.banners && theme.banners.length > 0 ? theme.banners : defaultBanners;
    const updated = [...currentBanners];
    updated[index] = { ...updated[index], [field]: value };
    setTheme({ ...theme, banners: updated });
  };

  const handleAddBanner = () => {
    const currentBanners = theme.banners && theme.banners.length > 0 ? theme.banners : defaultBanners;
    const newBanner: BannerSlide = {
      tag: 'Khuyến Mãi Mới',
      title: '🔥 Siêu Ưu Đãi Đặc Biệt Hôm Nay',
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&auto=format&fit=crop&q=80',
      link: '/?tab=products',
    };
    setTheme({ ...theme, banners: [...currentBanners, newBanner] });
    toast.success('Đã thêm 1 banner mới!');
  };

  const handleRemoveBanner = (index: number) => {
    const currentBanners = theme.banners && theme.banners.length > 0 ? theme.banners : defaultBanners;
    if (currentBanners.length <= 1) {
      toast.error('Cửa hàng cần ít nhất 1 banner!');
      return;
    }
    const updated = currentBanners.filter((_, idx) => idx !== index);
    setTheme({ ...theme, banners: updated });
    toast.success('Đã xóa banner!');
  };

  const handleMoveBanner = (index: number, direction: 'up' | 'down') => {
    const currentBanners = theme.banners && theme.banners.length > 0 ? theme.banners : defaultBanners;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentBanners.length) return;
    const updated = [...currentBanners];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setTheme({ ...theme, banners: updated });
  };

  const handleBannerUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingBannerIdx(index);
    try {
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        handleBannerChange(index, 'image', data.data.url);
        toast.success(`Upload ảnh banner #${index + 1} thành công!`);
      } else {
        toast.error(data.message || 'Lỗi upload ảnh banner');
      }
    } catch (err) {
      toast.error('Lỗi khi tải ảnh banner lên');
    } finally {
      setUploadingBannerIdx(null);
    }
  };

  // Sub Banner Handlers (Dynamic sub-banners under main banner)
  const handleSubBannerChange = (index: number, field: keyof BannerSlide, value: string) => {
    const currentSubBanners = Array.isArray(theme.subBanners) ? theme.subBanners : defaultSubBanners;
    const updated = [...currentSubBanners];
    if (!updated[index]) {
      updated[index] = { tag: '', title: '', image: '', link: '/?tab=products' };
    }
    updated[index] = { ...updated[index], [field]: value };
    setTheme({ ...theme, subBanners: updated });
  };

  const handleAddSubBanner = () => {
    const currentSubBanners = Array.isArray(theme.subBanners) ? theme.subBanners : defaultSubBanners;
    const newSubBanner: BannerSlide = {
      tag: 'Khuyến Mãi',
      title: 'Khuyến Mãi Đặc Biệt',
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80',
      link: '/?tab=products',
    };
    setTheme({ ...theme, subBanners: [...currentSubBanners, newSubBanner] });
    toast.success('Đã thêm 1 banner phụ mới!');
  };

  const handleRemoveSubBanner = (index: number) => {
    const currentSubBanners = Array.isArray(theme.subBanners) ? theme.subBanners : defaultSubBanners;
    const updated = currentSubBanners.filter((_, idx) => idx !== index);
    setTheme({ ...theme, subBanners: updated });
    toast.success('Đã xóa banner phụ!');
  };

  const handleMoveSubBanner = (index: number, direction: 'up' | 'down') => {
    const currentSubBanners = Array.isArray(theme.subBanners) ? theme.subBanners : defaultSubBanners;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentSubBanners.length) return;
    const updated = [...currentSubBanners];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setTheme({ ...theme, subBanners: updated });
  };

  const handleSubBannerUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingSubBannerIdx(index);
    try {
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        handleSubBannerChange(index, 'image', data.data.url);
        toast.success(`Upload ảnh Banner Phụ #${index + 1} thành công!`);
      } else {
        toast.error(data.message || 'Lỗi upload ảnh banner phụ');
      }
    } catch (err) {
      toast.error('Lỗi khi tải ảnh banner phụ lên');
    } finally {
      setUploadingSubBannerIdx(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await saveTheme(theme);
    setIsSaving(false);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleBox}>
          <h1>Cấu Hình Giao Diện & Theme Hệ Thống</h1>
          <p>Tùy biến màu sắc, thương hiệu, font chữ và chế độ hiển thị toàn bộ cửa hàng</p>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.resetBtn} onClick={resetToDefault} title="Đặt lại về ban đầu">
            <FiRotateCcw /> Khôi phục mặc định
          </button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
            <FiSave /> {isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
          </button>
        </div>
      </div>

      {/* Preset Themes Selector */}
      <div className={styles.presetsCard}>
        <span className={styles.presetLabel}>Bộ Theme có sẵn:</span>
        <div className={styles.presetList}>
          {PRESET_THEMES.map((preset) => (
            <button
              key={preset.id}
              className={`${styles.presetBtn} ${theme.themeName === preset.id ? styles.activePreset : ''}`}
              onClick={() => handleApplyPreset(preset)}
            >
              <span className={styles.colorDot} style={{ background: preset.primaryColor }}></span>
              <span>{preset.name}</span>
              {theme.themeName === preset.id && <FiCheck style={{ color: '#10b981' }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Form Settings & Live Preview */}
      <div className={styles.mainGrid}>
        {/* Left Column: Tabbed Settings */}
        <div className={styles.tabsContainer}>
          <div className={styles.tabHeader}>
            <button
              className={`${styles.tabBtn} ${activeTab === 'titles' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('titles')}
            >
              <FiImage /> Tiêu Đề & Logo
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'banners' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('banners')}
            >
              <FiLayers /> Banner Trang Chủ ({(theme.banners || defaultBanners).length})
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'mode' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('mode')}
            >
              <FiMoon /> Chế Độ Sáng / Tối
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'buttons' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('buttons')}
            >
              <FiBox /> Màu Button (Nút)
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'texts' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('texts')}
            >
              <FiType /> Màu Chữ (Text)
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'components' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('components')}
            >
              <FiLayout /> Màu Component
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'email' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('email')}
            >
              <FiMail /> Cấu Hình Email (SMTP)
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'password' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('password')}
            >
              <FiLock /> Đổi Mật Khẩu
            </button>
          </div>

          <div className={styles.tabContent}>
            {/* TAB 1: TITLES & LOGO */}
            {activeTab === 'titles' && (
              <>
                <div className={styles.sectionHeader}>
                  <h3>Thương Hiệu & Tiêu Đề Trang</h3>
                  <p>Cài đặt tên shop, tiêu đề SEO và hình ảnh Logo hiển thị trên Header</p>
                </div>

                <div className={styles.fieldGrid}>
                  <div className={styles.formGroup}>
                    <label>Tiêu đề Website chính (Meta Title)</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Ví dụ: Cửa Hàng Thời Trang & Phụ Kiện Cao Cấp"
                      value={theme.pageTitles?.siteTitle || ''}
                      onChange={(e) => {
                        const updated: ThemeConfig = {
                          ...theme,
                          pageTitles: { ...theme.pageTitles, siteTitle: e.target.value },
                        };
                        setTheme(updated);
                        applyCSSVariables(updated);
                      }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 4 }}>
                      Hiển thị trên thanh tiêu đề tab trình duyệt và công cụ tìm kiếm Google
                    </span>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Tên chữ hiển thị Logo (Logo Text)</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Ví dụ: MyStore"
                      value={theme.pageTitles?.logoText || ''}
                      onChange={(e) => {
                        const updated: ThemeConfig = {
                          ...theme,
                          pageTitles: { ...theme.pageTitles, logoText: e.target.value },
                        };
                        setTheme(updated);
                        applyCSSVariables(updated);
                      }}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Hình ảnh Logo (URL hoặc Upload)</label>
                  <div className={styles.uploadRow}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="https://... hoặc /uploads/logo.png"
                      value={theme.pageTitles?.logoUrl || ''}
                      onChange={(e) => {
                        const updated: ThemeConfig = {
                          ...theme,
                          pageTitles: { ...theme.pageTitles, logoUrl: e.target.value },
                        };
                        setTheme(updated);
                        applyCSSVariables(updated);
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className={styles.uploadBtn}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FiUploadCloud /> {isUploading ? 'Đang tải...' : 'Upload ảnh'}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                  </div>
                  {theme.pageTitles?.logoUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>Logo xem trước:</span>
                      <img
                        src={theme.pageTitles.logoUrl}
                        alt="Logo Preview"
                        style={{ height: 32, maxWidth: 160, objectFit: 'contain', background: '#090a0f', border: '1px solid var(--border-color, #232838)', padding: '2px 6px', borderRadius: 6 }}
                      />
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Favicon trình duyệt (Icon tab - URL hoặc Upload)</label>
                  <div className={styles.uploadRow}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="URL favicon icon (PNG, ICO, SVG) hoặc bấm Upload icon"
                      value={theme.pageTitles?.faviconUrl || ''}
                      onChange={(e) => {
                        const updated: ThemeConfig = {
                          ...theme,
                          pageTitles: { ...theme.pageTitles, faviconUrl: e.target.value },
                        };
                        setTheme(updated);
                        applyCSSVariables(updated);
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className={styles.uploadBtn}
                      onClick={() => faviconInputRef.current?.click()}
                    >
                      <FiUploadCloud /> {isUploadingFavicon ? 'Đang tải...' : 'Upload icon'}
                    </button>
                    <input
                      type="file"
                      ref={faviconInputRef}
                      style={{ display: 'none' }}
                      accept="image/*,.ico"
                      onChange={handleFaviconUpload}
                    />
                  </div>
                  {theme.pageTitles?.faviconUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>Icon tab xem trước:</span>
                      <img
                        src={theme.pageTitles.faviconUrl}
                        alt="Favicon Preview"
                        style={{ width: 28, height: 28, objectFit: 'contain', background: '#1e293b', border: '1px solid var(--border-color, #232838)', padding: 3, borderRadius: 6 }}
                      />
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Thông báo khuyến mãi đầu trang (Banner Notice)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={theme.pageTitles?.bannerNotice || ''}
                    onChange={(e) => {
                      const updated: ThemeConfig = {
                        ...theme,
                        pageTitles: { ...theme.pageTitles, bannerNotice: e.target.value },
                      };
                      setTheme(updated);
                      applyCSSVariables(updated);
                    }}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Mô tả ngắn trang (Meta Description SEO)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={theme.pageTitles?.metaDescription || ''}
                    onChange={(e) =>
                      setTheme({
                        ...theme,
                        pageTitles: { ...theme.pageTitles, metaDescription: e.target.value },
                      })
                    }
                  />
                </div>

                {/* Social Links & Zalo Contact Section */}
                <div className={styles.sectionHeader} style={{ marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--border-color, #232838)' }}>
                  <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>💬</span>
                      <span>Kênh Liên Hệ & Chat Zalo 1:1</span>
                    </h3>
                    <p>Cài đặt số điện thoại Zalo để khách hàng bấm Chat 1:1 trực tiếp từ trang chi tiết sản phẩm</p>
                  </div>
                </div>

                <div className={styles.fieldGrid}>
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                        📱 Số điện thoại Zalo (Chat 1:1)
                      </span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#0284c7', color: '#fff', fontWeight: 600 }}>
                        Khuyên dùng
                      </span>
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Ví dụ: 0988888888 (Khách bấm Chat sẽ mở Zalo nhắn tin trực tiếp)"
                      value={theme.socialLinks?.zaloPhone || ''}
                      onChange={(e) => {
                        const updated: ThemeConfig = {
                          ...theme,
                          socialLinks: { ...theme.socialLinks, zaloPhone: e.target.value },
                        };
                        setTheme(updated);
                      }}
                    />
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted, #94a3b8)', marginTop: 4 }}>
                      Khi khách hàng xem sản phẩm và bấm nút <strong>&quot;Chat&quot; / &quot;Chat Zalo&quot;</strong> trên cả điện thoại và máy tính, hệ thống sẽ mở trực tiếp khung chat Zalo 1:1 với số này (link <code>https://zalo.me/số_điện_thoại</code>).
                    </span>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Link Fanpage Facebook (Tùy chọn)</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="https://facebook.com/ten-trang"
                      value={theme.socialLinks?.facebookUrl || ''}
                      onChange={(e) => {
                        const updated: ThemeConfig = {
                          ...theme,
                          socialLinks: { ...theme.socialLinks, facebookUrl: e.target.value },
                        };
                        setTheme(updated);
                      }}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Link Kênh TikTok (Tùy chọn)</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="https://tiktok.com/@ten-kenh"
                      value={theme.socialLinks?.tiktokUrl || ''}
                      onChange={(e) => {
                        const updated: ThemeConfig = {
                          ...theme,
                          socialLinks: { ...theme.socialLinks, tiktokUrl: e.target.value },
                        };
                        setTheme(updated);
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* TAB: BANNERS CAROUSEL */}
            {activeTab === 'banners' && (
              <>
                <div className={styles.sectionHeader}>
                  <div>
                    <h3>Quản Lý Banner Quảng Cáo Trang Chủ</h3>
                    <p>Tùy biến banner trượt Carousel chính và 2 banner phụ xếp thành 1 hàng nằm bên dưới ảnh chính trên máy tính</p>
                  </div>
                </div>

                {/* ===== PHẦN 1: BANNER CHÍNH (CAROUSEL TRƯỢT) ===== */}
                <div style={{ marginBottom: 12 }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: theme.textColors?.textPrimary || '#fff', marginBottom: 4 }}>
                    1. Danh Sách Banner Chính (Carousel Trượt Tự Động)
                  </h4>
                  <p style={{ fontSize: '0.8125rem', color: theme.textColors?.textSecondary || '#94a3b8', margin: 0 }}>
                    Hiển thị trượt tự động với các nút điều hướng, trải rộng 100% phía trên trong khung 70% trên máy tính và trượt gọn gàng trên điện thoại.
                  </p>
                </div>

                <div className={styles.bannerList}>
                  {(theme.banners && theme.banners.length > 0 ? theme.banners : defaultBanners).map((banner, index) => (
                    <div key={index} className={styles.bannerCard}>
                      <div className={styles.bannerCardHeader}>
                        <span className={styles.bannerBadge}>
                          <FiLayers size={14} /> Banner Chính #{index + 1}
                        </span>
                        <div className={styles.bannerCardActions}>
                          <button
                            type="button"
                            className={styles.iconActionBtn}
                            disabled={index === 0}
                            onClick={() => handleMoveBanner(index, 'up')}
                            title="Di chuyển lên trên"
                          >
                            <FiArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            className={styles.iconActionBtn}
                            disabled={index === (theme.banners || defaultBanners).length - 1}
                            onClick={() => handleMoveBanner(index, 'down')}
                            title="Di chuyển xuống dưới"
                          >
                            <FiArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            className={styles.deleteIconBtn}
                            onClick={() => handleRemoveBanner(index)}
                            title="Xóa banner này"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className={styles.bannerCardGrid}>
                        <div className={styles.bannerInputs}>
                          <div className={styles.formGroup}>
                            <label>Nhãn / Tag nổi bật (góc trên trái)</label>
                            <input
                              type="text"
                              className={styles.input}
                              placeholder="Ví dụ: Siêu Sale Shopee, Flash Sale..."
                              value={banner.tag || ''}
                              onChange={(e) => handleBannerChange(index, 'tag', e.target.value)}
                            />
                          </div>

                          <div className={styles.formGroup}>
                            <label>Tiêu đề Banner</label>
                            <input
                              type="text"
                              className={styles.input}
                              placeholder="Ví dụ: 🔥 Giảm Đến 50% & Freeship 0Đ"
                              value={banner.title || ''}
                              onChange={(e) => handleBannerChange(index, 'title', e.target.value)}
                            />
                          </div>

                          <div className={styles.formGroup}>
                            <label>Đường dẫn khi click vào banner (Link URL)</label>
                            <input
                              type="text"
                              className={styles.input}
                              placeholder="/?tab=products&filter=flash-sale"
                              value={banner.link || ''}
                              onChange={(e) => handleBannerChange(index, 'link', e.target.value)}
                            />
                          </div>

                          <div className={styles.formGroup}>
                            <label>Hình ảnh Banner (URL hoặc Upload từ máy tính)</label>
                            <div className={styles.uploadRow}>
                              <input
                                type="text"
                                className={styles.input}
                                placeholder="https://images.unsplash.com/... hoặc /uploads/banner.jpg"
                                value={banner.image || ''}
                                onChange={(e) => handleBannerChange(index, 'image', e.target.value)}
                                style={{ flex: 1 }}
                              />
                              <button
                                type="button"
                                className={styles.uploadBtn}
                                onClick={() => bannerInputRefs.current[index]?.click()}
                                disabled={uploadingBannerIdx === index}
                              >
                                <FiUploadCloud /> {uploadingBannerIdx === index ? 'Đang tải...' : 'Upload ảnh'}
                              </button>
                              <input
                                type="file"
                                ref={(el) => { bannerInputRefs.current[index] = el; }}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={(e) => handleBannerUpload(index, e)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className={styles.bannerLivePreviewWrap}>
                          <span className={styles.previewLabel}>Xem trước hiển thị:</span>
                          <div className={styles.bannerLivePreview}>
                            <img
                              src={banner.image || 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=900&auto=format&fit=crop&q=80'}
                              alt={banner.title || 'Preview'}
                              className={styles.bannerLiveImg}
                            />
                            {(banner.tag || banner.title) && (
                              <div className={styles.bannerLiveOverlay}>
                                {banner.tag && <span className={styles.bannerLiveTag}>{banner.tag}</span>}
                                {banner.title && <h4 className={styles.bannerLiveTitle}>{banner.title}</h4>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className={styles.addBannerBtn}
                  onClick={handleAddBanner}
                >
                  <FiPlus size={18} /> Thêm Banner Chính Mới
                </button>

                {/* ===== PHẦN 2: BANNER PHỤ XẾP THÀNH 1 HÀNG DƯỚI ẢNH CHÍNH ===== */}
                <div className={styles.bannerSectionDivider}>
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: theme.textColors?.textPrimary || '#fff', marginBottom: 4 }}>
                        2. Cấu Hình Banner Phụ (Sắp Xếp Thành 1 Hàng Dọc Nằm Dưới Ảnh Chính)
                      </h4>
                      <p style={{ fontSize: '0.8125rem', color: theme.textColors?.textSecondary || '#94a3b8', margin: 0 }}>
                        Hiển thị theo hàng dọc tuần tự bên dưới Banner chính trên giao diện PC / Desktop. Bạn có thể thêm không giới hạn, hoặc xóa hết nếu không muốn hiển thị banner phụ.
                      </p>
                    </div>
                  </div>

                  <div className={styles.subBannerAlertBox}>
                    <FiHelpCircle className={styles.subBannerAlertIcon} />
                    <div>
                      <strong>Linh hoạt số lượng:</strong> Hiện tại đang có <strong>{(Array.isArray(theme.subBanners) ? theme.subBanners : defaultSubBanners).length}</strong> banner phụ. Nếu không muốn hiển thị banner phụ nào, bạn chỉ cần bấm nút xóa thùng rác trên từng thẻ.
                    </div>
                  </div>

                  {(() => {
                    const currentSubBanners = Array.isArray(theme.subBanners) ? theme.subBanners : defaultSubBanners;

                    if (currentSubBanners.length === 0) {
                      return (
                        <div style={{
                          padding: '32px 20px',
                          textAlign: 'center',
                          borderRadius: 10,
                          border: '1px dashed #334155',
                          background: 'rgba(15, 23, 42, 0.4)',
                          color: '#94a3b8',
                          margin: '14px 0',
                        }}>
                          <p style={{ margin: '0 0 14px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                            Hiện không có banner phụ nào (khu vực bên dưới Banner chính sẽ không hiển thị banner phụ).
                          </p>
                          <button
                            type="button"
                            className={styles.addBannerBtn}
                            onClick={handleAddSubBanner}
                            style={{ margin: '0 auto', display: 'inline-flex' }}
                          >
                            <FiPlus size={16} /> Thêm Banner Phụ Đầu Tiên
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className={styles.bannerList}>
                        {currentSubBanners.map((subBanner, subIdx) => (
                          <div key={subIdx} className={styles.bannerCard}>
                            <div className={styles.bannerCardHeader}>
                              <span className={styles.bannerBadge} style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
                                <FiLayers size={14} /> Banner Phụ #{subIdx + 1}
                              </span>
                              <div className={styles.bannerCardActions}>
                                <button
                                  type="button"
                                  className={styles.iconActionBtn}
                                  disabled={subIdx === 0}
                                  onClick={() => handleMoveSubBanner(subIdx, 'up')}
                                  title="Di chuyển lên trên"
                                >
                                  <FiArrowUp size={14} />
                                </button>
                                <button
                                  type="button"
                                  className={styles.iconActionBtn}
                                  disabled={subIdx === currentSubBanners.length - 1}
                                  onClick={() => handleMoveSubBanner(subIdx, 'down')}
                                  title="Di chuyển xuống dưới"
                                >
                                  <FiArrowDown size={14} />
                                </button>
                                <button
                                  type="button"
                                  className={styles.deleteIconBtn}
                                  onClick={() => handleRemoveSubBanner(subIdx)}
                                  title="Xóa banner phụ này"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </div>
                            </div>

                            <div className={styles.bannerCardGrid}>
                              <div className={styles.bannerInputs}>
                                <div className={styles.formGroup}>
                                  <label>Nhãn / Tag nổi bật</label>
                                  <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Ví dụ: 9.9 Siêu Sale, Hàng Việt Tôi Yêu..."
                                    value={subBanner.tag || ''}
                                    onChange={(e) => handleSubBannerChange(subIdx, 'tag', e.target.value)}
                                  />
                                </div>

                                <div className={styles.formGroup}>
                                  <label>Tiêu đề Banner phụ</label>
                                  <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Ví dụ: Ăn Sáng Ngon Rẻ - Chỉ từ 10.000đ"
                                    value={subBanner.title || ''}
                                    onChange={(e) => handleSubBannerChange(subIdx, 'title', e.target.value)}
                                  />
                                </div>

                                <div className={styles.formGroup}>
                                  <label>Đường dẫn liên kết (Link URL)</label>
                                  <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="/?tab=products"
                                    value={subBanner.link || ''}
                                    onChange={(e) => handleSubBannerChange(subIdx, 'link', e.target.value)}
                                  />
                                </div>

                                <div className={styles.formGroup}>
                                  <label>Hình ảnh Banner phụ (URL hoặc Upload từ máy tính)</label>
                                  <div className={styles.uploadRow}>
                                    <input
                                      type="text"
                                      className={styles.input}
                                      placeholder="https://images.unsplash.com/... hoặc /uploads/sub-banner.jpg"
                                      value={subBanner.image || ''}
                                      onChange={(e) => handleSubBannerChange(subIdx, 'image', e.target.value)}
                                      style={{ flex: 1 }}
                                    />
                                    <button
                                      type="button"
                                      className={styles.uploadBtn}
                                      onClick={() => subBannerInputRefs.current[subIdx]?.click()}
                                      disabled={uploadingSubBannerIdx === subIdx}
                                    >
                                      <FiUploadCloud /> {uploadingSubBannerIdx === subIdx ? 'Đang tải...' : 'Upload ảnh'}
                                    </button>
                                    <input
                                      type="file"
                                      ref={(el) => { subBannerInputRefs.current[subIdx] = el; }}
                                      style={{ display: 'none' }}
                                      accept="image/*"
                                      onChange={(e) => handleSubBannerUpload(subIdx, e)}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className={styles.bannerLivePreviewWrap}>
                                <span className={styles.previewLabel}>Xem trước hiển thị:</span>
                                <div className={styles.bannerLivePreview} style={{ aspectRatio: '16 / 7.5' }}>
                                  <img
                                    src={subBanner.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80'}
                                    alt={subBanner.title || `Sub-Banner ${subIdx + 1}`}
                                    className={styles.bannerLiveImg}
                                  />
                                  {(subBanner.tag || subBanner.title) && (
                                    <div className={styles.bannerLiveOverlay}>
                                      {subBanner.tag && <span className={styles.bannerLiveTag} style={{ background: '#10b981' }}>{subBanner.tag}</span>}
                                      {subBanner.title && <h4 className={styles.bannerLiveTitle}>{subBanner.title}</h4>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {(Array.isArray(theme.subBanners) ? theme.subBanners : defaultSubBanners).length > 0 && (
                    <button
                      type="button"
                      className={styles.addBannerBtn}
                      onClick={handleAddSubBanner}
                      style={{ marginTop: 14 }}
                    >
                      <FiPlus size={18} /> Thêm Banner Phụ Mới
                    </button>
                  )}
                </div>

                {/* ===== PHẦN 3: MOCKUP TRỰC QUAN BỐ CỤC PC SHOPEE ===== */}

              </>
            )}

            {/* TAB 2: MODE (DARK / LIGHT) */}
            {activeTab === 'mode' && (
              <>
                <div className={styles.sectionHeader}>
                  <h3>Chế Độ Giao Diện (Theme Mode)</h3>
                  <p>Lựa chọn tông màu tối hiện đại hoặc tông sáng thanh lịch</p>
                </div>

                <div className={styles.modeSelector}>
                  <div
                    className={`${styles.modeCard} ${theme.mode === 'dark' ? styles.activeMode : ''}`}
                    onClick={() => {
                      toggleThemeMode('dark');
                      toast.success('Đã chuyển sang Chế độ Tối (Dark Mode)');
                    }}
                  >
                    <FiMoon className={styles.modeIcon} />
                    <div>
                      <strong style={{ color: theme.textColors?.textPrimary || '#fff', display: 'block' }}>
                        Chế độ Tối (Dark Mode)
                      </strong>
                      <span style={{ color: theme.textColors?.textSecondary || '#94a3b8', fontSize: '0.8125rem' }}>
                        Bảo vệ mắt, thiết kế công nghệ cao cấp
                      </span>
                    </div>
                  </div>

                  <div
                    className={`${styles.modeCard} ${theme.mode === 'light' ? styles.activeMode : ''}`}
                    onClick={() => {
                      toggleThemeMode('light');
                      toast.success('Đã chuyển sang Chế độ Sáng (Light Mode)');
                    }}
                  >
                    <FiSun className={styles.modeIcon} style={{ color: '#f59e0b' }} />
                    <div>
                      <strong style={{ color: theme.textColors?.textPrimary || '#fff', display: 'block' }}>
                        Chế độ Sáng (Light Mode)
                      </strong>
                      <span style={{ color: theme.textColors?.textSecondary || '#94a3b8', fontSize: '0.8125rem' }}>
                        Gọn gàng, sạch sẽ, độ tương phản cao
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB 3: BUTTON COLORS */}
            {activeTab === 'buttons' && (
              <>
                <div className={styles.sectionHeader}>
                  <h3>Màu Sắc Nút Bấm (Button Styles)</h3>
                  <p>Tùy chỉnh màu nút Mua ngay, Thêm vào giỏ và độ bo góc</p>
                </div>

                <div className={styles.fieldGrid}>
                  <div className={styles.formGroup}>
                    <label>Màu nền nút chính (Primary Button Bg)</label>
                    <div className={styles.colorPickerRow}>
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={theme.buttonColors.primaryBg}
                        onChange={(e) => {
                          const updated = {
                            ...theme,
                            buttonColors: { ...theme.buttonColors, primaryBg: e.target.value },
                          };
                          setTheme(updated);
                          applyCSSVariables(updated);
                        }}
                      />
                      <span className={styles.colorHex}>{theme.buttonColors.primaryBg}</span>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Màu chữ nút chính (Primary Button Text)</label>
                    <div className={styles.colorPickerRow}>
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={theme.buttonColors.primaryText}
                        onChange={(e) => {
                          const updated = {
                            ...theme,
                            buttonColors: { ...theme.buttonColors, primaryText: e.target.value },
                          };
                          setTheme(updated);
                          applyCSSVariables(updated);
                        }}
                      />
                      <span className={styles.colorHex}>{theme.buttonColors.primaryText}</span>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Màu khi Hover nút chính</label>
                    <div className={styles.colorPickerRow}>
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={theme.buttonColors.primaryHover}
                        onChange={(e) =>
                          setTheme({
                            ...theme,
                            buttonColors: { ...theme.buttonColors, primaryHover: e.target.value },
                          })
                        }
                      />
                      <span className={styles.colorHex}>{theme.buttonColors.primaryHover}</span>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Màu nền nút phụ (Secondary Button)</label>
                    <div className={styles.colorPickerRow}>
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={theme.buttonColors.secondaryBg}
                        onChange={(e) =>
                          setTheme({
                            ...theme,
                            buttonColors: { ...theme.buttonColors, secondaryBg: e.target.value },
                          })
                        }
                      />
                      <span className={styles.colorHex}>{theme.buttonColors.secondaryBg}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Độ bo góc nút (Border Radius)</label>
                  <select
                    className={styles.input}
                    value={theme.buttonColors.borderRadius}
                    onChange={(e) => {
                      const updated = {
                        ...theme,
                        buttonColors: { ...theme.buttonColors, borderRadius: e.target.value },
                      };
                      setTheme(updated);
                      applyCSSVariables(updated);
                    }}
                  >
                    <option value="4px">Góc vuông nhẹ (4px)</option>
                    <option value="8px">Bo góc tiêu chuẩn (8px)</option>
                    <option value="12px">Bo góc hiện đại (12px)</option>
                    <option value="999px">Bo tròn viên thuốc (Pill - 999px)</option>
                  </select>
                </div>
              </>
            )}

            {/* TAB 4: TEXT COLORS */}
            {activeTab === 'texts' && (
              <>
                <div className={styles.sectionHeader}>
                  <h3>Màu Sắc Văn Bản (Typography Colors)</h3>
                  <p>Tùy biến màu tiêu đề chính, màu đoạn văn và màu ghi chú</p>
                </div>

                <div className={styles.fieldGrid}>
                  <div className={styles.formGroup}>
                    <label>Màu chữ tiêu đề / Chính (Text Primary)</label>
                    <div className={styles.colorPickerRow}>
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={theme.textColors.textPrimary}
                        onChange={(e) => {
                          const updated = {
                            ...theme,
                            textColors: { ...theme.textColors, textPrimary: e.target.value },
                          };
                          setTheme(updated);
                          applyCSSVariables(updated);
                        }}
                      />
                      <span className={styles.colorHex}>{theme.textColors.textPrimary}</span>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Màu chữ nội dung phụ (Text Secondary)</label>
                    <div className={styles.colorPickerRow}>
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={theme.textColors.textSecondary}
                        onChange={(e) => {
                          const updated = {
                            ...theme,
                            textColors: { ...theme.textColors, textSecondary: e.target.value },
                          };
                          setTheme(updated);
                          applyCSSVariables(updated);
                        }}
                      />
                      <span className={styles.colorHex}>{theme.textColors.textSecondary}</span>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Màu chữ làm mờ (Text Muted / Dim)</label>
                    <div className={styles.colorPickerRow}>
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={theme.textColors.textMuted}
                        onChange={(e) => {
                          const updated = {
                            ...theme,
                            textColors: { ...theme.textColors, textMuted: e.target.value },
                          };
                          setTheme(updated);
                          applyCSSVariables(updated);
                        }}
                      />
                      <span className={styles.colorHex}>{theme.textColors.textMuted}</span>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Màu chữ nổi bật (Text Accent)</label>
                    <div className={styles.colorPickerRow}>
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={theme.textColors.textAccent}
                        onChange={(e) => {
                          const updated = {
                            ...theme,
                            textColors: { ...theme.textColors, textAccent: e.target.value },
                          };
                          setTheme(updated);
                          applyCSSVariables(updated);
                        }}
                      />
                      <span className={styles.colorHex}>{theme.textColors.textAccent}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB 5: COMPONENT COLORS */}
            {activeTab === 'components' && (
              <>
                <div className={styles.sectionHeader}>
                  <h3>Màu Sắc Khung & Thành Phần (Component Colors)</h3>
                  <p>Tùy chỉnh màu nền trang, thẻ sản phẩm, thanh menu và viền</p>
                </div>

                <div className={styles.fieldGrid}>
                  <div className={styles.formGroup}>
                    <label>Màu nền toàn bộ trang (Body Background)</label>
                    <div className={styles.colorPickerRow}>
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={theme.componentColors.background}
                        onChange={(e) => {
                          const updated = {
                            ...theme,
                            componentColors: { ...theme.componentColors, background: e.target.value },
                          };
                          setTheme(updated);
                          applyCSSVariables(updated);
                        }}
                      />
                      <span className={styles.colorHex}>{theme.componentColors.background}</span>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Màu nền thẻ Card / Box (Card Background)</label>
                    <div className={styles.colorPickerRow}>
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={theme.componentColors.cardBackground}
                        onChange={(e) => {
                          const updated = {
                            ...theme,
                            componentColors: { ...theme.componentColors, cardBackground: e.target.value },
                          };
                          setTheme(updated);
                          applyCSSVariables(updated);
                        }}
                      />
                      <span className={styles.colorHex}>{theme.componentColors.cardBackground}</span>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Màu nền Thanh Menu Header (Navbar)</label>
                    <div className={styles.colorPickerRow}>
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={theme.componentColors.navbarBg}
                        onChange={(e) => {
                          const updated = {
                            ...theme,
                            componentColors: { ...theme.componentColors, navbarBg: e.target.value },
                          };
                          setTheme(updated);
                          applyCSSVariables(updated);
                        }}
                      />
                      <span className={styles.colorHex}>{theme.componentColors.navbarBg}</span>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Màu đường viền khung (Border Color)</label>
                    <div className={styles.colorPickerRow}>
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={theme.componentColors.borderColor}
                        onChange={(e) => {
                          const updated = {
                            ...theme,
                            componentColors: { ...theme.componentColors, borderColor: e.target.value },
                          };
                          setTheme(updated);
                          applyCSSVariables(updated);
                        }}
                      />
                      <span className={styles.colorHex}>{theme.componentColors.borderColor}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB 6: EMAIL SMTP SETTINGS */}
            {activeTab === 'email' && (
              <form onSubmit={handleSaveEmail} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className={styles.sectionHeader}>
                  <h3>Cấu Hình Email Thông Báo (SMTP)</h3>
                  <p>Tự động gửi email xác nhận cho khách hàng và thông báo đơn mới cho Admin qua Gmail / SMTP</p>
                </div>

                {/* Enable Switch Box */}
                <div
                  style={{
                    background: 'var(--bg-card, #131826)',
                    border: '1px solid var(--border-color, #1e2638)',
                    borderRadius: 12,
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main, #f8fafc)' }}>
                      Kích hoạt gửi Email tự động
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                      Tự động gửi email khi khách hàng hoàn tất đặt hàng trên website
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={emailForm.enabled}
                      onChange={(e) => setEmailForm({ ...emailForm, enabled: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: 'var(--primary, #3b82f6)', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 600, fontSize: 13, color: emailForm.enabled ? '#10b981' : '#64748b' }}>
                      {emailForm.enabled ? 'Đang Bật' : 'Đang Tắt'}
                    </span>
                  </label>
                </div>

                {/* Basic SMTP Credentials */}
                <div className={styles.fieldGrid}>
                  <div className={styles.formGroup}>
                    <label>Tài khoản Email gửi (Gmail / SMTP User) *</label>
                    <input
                      type="email"
                      required
                      className={styles.input}
                      placeholder="vd: cuahang.shopbig@gmail.com"
                      value={emailForm.user}
                      onChange={(e) => setEmailForm({ ...emailForm, user: e.target.value })}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 4 }}>
                      Địa chỉ Gmail bạn dùng để phát thư đi
                    </span>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Mật khẩu ứng dụng SMTP (Google App Password) *</label>
                    <input
                      type="password"
                      required
                      className={styles.input}
                      placeholder="16 ký tự mã ứng dụng (vd: abcd efgh ijkl mnop)"
                      value={emailForm.pass}
                      onChange={(e) => setEmailForm({ ...emailForm, pass: e.target.value })}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 4 }}>
                      Mật khẩu ứng dụng 16 ký tự (Không phải mật khẩu đăng nhập Gmail thường)
                    </span>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Tên người gửi hiển thị (Sender Name)</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="vd: ShopBig Store"
                      value={emailForm.senderName}
                      onChange={(e) => setEmailForm({ ...emailForm, senderName: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Email Admin nhận thông báo đơn mới *</label>
                    <input
                      type="email"
                      required
                      className={styles.input}
                      placeholder="vd: admin@shopbig.vn"
                      value={emailForm.adminNotificationEmail}
                      onChange={(e) => setEmailForm({ ...emailForm, adminNotificationEmail: e.target.value })}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 4 }}>
                      Hộp thư nhận thông báo khi có khách hàng vừa đặt đơn mới
                    </span>
                  </div>
                </div>

                {/* Recipient Toggles */}
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={emailForm.sendToCustomer}
                      onChange={(e) => setEmailForm({ ...emailForm, sendToCustomer: e.target.checked })}
                      style={{ accentColor: 'var(--primary, #3b82f6)' }}
                    />
                    <span>Gửi email hóa đơn xác nhận cho <strong>Khách hàng</strong></span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={emailForm.sendToAdmin}
                      onChange={(e) => setEmailForm({ ...emailForm, sendToAdmin: e.target.checked })}
                      style={{ accentColor: 'var(--primary, #3b82f6)' }}
                    />
                    <span>Gửi email cảnh báo đơn mới cho <strong>Admin / Chủ Shop</strong></span>
                  </label>
                </div>

                {/* Advanced Server Details */}
                <div
                  style={{
                    background: 'var(--bg-card, #131826)',
                    border: '1px solid var(--border-color, #1e2638)',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main, #f8fafc)', marginBottom: 12 }}>
                    ⚙️ Cấu Hình Máy Chủ Nâng Cao (Mặc định Gmail)
                  </div>
                  <div className={styles.fieldGrid}>
                    <div className={styles.formGroup}>
                      <label>SMTP Host</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={emailForm.host}
                        onChange={(e) => setEmailForm({ ...emailForm, host: e.target.value })}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>SMTP Port (465 SSL hoặc 587 TLS)</label>
                      <input
                        type="number"
                        className={styles.input}
                        value={emailForm.port}
                        onChange={(e) => setEmailForm({ ...emailForm, port: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                {/* Save Config Button */}
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={savingEmail}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <FiSave /> {savingEmail ? 'Đang lưu...' : 'Lưu Cấu Hình Email'}
                </button>

                {/* Test Email Section Box */}
                <div
                  style={{
                    marginTop: 10,
                    background: 'var(--bg-card, #131826)',
                    border: '1px dashed var(--primary, #3b82f6)',
                    borderRadius: 12,
                    padding: 18,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary, #3b82f6)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <FiSend size={15} /> Kiểm Tra Kết Nối Gửi Thư (Send Test Email)
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', margin: '0 0 12px 0' }}>
                    Nhập địa chỉ email của bạn để gửi một bức thư thử nghiệm và đảm bảo cấu hình hoạt động hoàn hảo.
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <input
                      type="email"
                      className={styles.input}
                      placeholder="Nhập email nhận thư test..."
                      value={testEmailTarget}
                      onChange={(e) => setTestEmailTarget(e.target.value)}
                      style={{ flex: 1, minWidth: 240 }}
                    />
                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={testingEmail || !emailForm.user || !emailForm.pass}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        opacity: testingEmail || !emailForm.user || !emailForm.pass ? 0.6 : 1,
                      }}
                    >
                      <FiSend /> {testingEmail ? 'Đang gửi test...' : 'Gửi Thử Email'}
                    </button>
                  </div>
                </div>

                {/* Google App Password Guide Alert */}
                <div
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 12,
                    padding: 16,
                    color: '#1e3a8a',
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiHelpCircle size={15} /> Hướng dẫn tạo Mật khẩu ứng dụng Gmail (3 bước nhanh):
                  </div>
                  <ol style={{ margin: 0, paddingLeft: 18 }}>
                    <li>Đăng nhập tài khoản Gmail gửi thư và <strong>Bật xác thực 2 bước (2-Step Verification)</strong>.</li>
                    <li>
                      Truy cập trang tạo mật khẩu ứng dụng Google:{' '}
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'underline' }}
                      >
                        https://myaccount.google.com/apppasswords
                      </a>
                    </li>
                    <li>Đặt tên ứng dụng (vd: <em>ShopBig Web</em>) ➔ Bấm <strong>Tạo</strong> ➔ Sao chép mã 16 chữ cái màu vàng và dán vào ô <strong>Mật khẩu ứng dụng SMTP</strong> ở trên.</li>
                  </ol>
                </div>
              </form>
            )}

            {/* TAB 7: CHANGE PASSWORD */}
            {activeTab === 'password' && (
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div className={styles.sectionHeader}>
                  <h3>Đổi Mật Khẩu Quản Trị</h3>
                  <p>Cập nhật mật khẩu bảo mật cho tài khoản Quản trị đang đăng nhập</p>
                </div>

                <div className={styles.formGroup}>
                  <label>Mật khẩu hiện tại *</label>
                  <input
                    type="password"
                    required
                    className={styles.input}
                    placeholder="Nhập mật khẩu hiện tại"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Mật khẩu mới *</label>
                  <input
                    type="password"
                    required
                    className={styles.input}
                    placeholder="Tối thiểu 6 ký tự"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Xác nhận mật khẩu mới *</label>
                  <input
                    type="password"
                    required
                    className={styles.input}
                    placeholder="Nhập lại mật khẩu mới"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={changingPassword}
                  style={{ alignSelf: 'flex-start', marginTop: 8 }}
                >
                  <FiLock /> {changingPassword ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Live Interactive Preview */}
        <div className={styles.previewSticky}>
          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>
              <h3>
                <FiEye style={{ color: '#3b82f6' }} /> Xem Trước Trực Tiếp (Live Preview)
              </h3>
              <span className={styles.badgeLive}>Realtime</span>
            </div>

            <div
              className={styles.previewContainer}
              style={{
                backgroundColor: theme.componentColors.background,
                color: theme.textColors.textPrimary,
              }}
            >
              {/* Mock Banner */}
              {theme.pageTitles.showBannerNotice && (
                <div
                  className={styles.mockBanner}
                  style={{
                    backgroundColor: theme.buttonColors.primaryBg,
                    color: theme.buttonColors.primaryText,
                  }}
                >
                  {theme.pageTitles.bannerNotice}
                </div>
              )}

              {/* Mock Header */}
              <div
                className={styles.mockHeader}
                style={{
                  backgroundColor: theme.componentColors.navbarBg,
                  borderColor: theme.componentColors.borderColor,
                }}
              >
                <div className={styles.mockLogo} style={{ color: theme.textColors.textPrimary }}>
                  {theme.pageTitles.logoUrl ? (
                    <img
                      src={theme.pageTitles.logoUrl}
                      alt="Logo"
                      style={{ height: 28, objectFit: 'contain' }}
                    />
                  ) : (
                    <span>
                      {theme.pageTitles.logoText || 'Cửa Hàng'}
                      <span style={{ color: theme.buttonColors.primaryBg }}>.vn</span>
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: theme.textColors.textSecondary,
                    padding: '4px 10px',
                    borderRadius: theme.buttonColors.borderRadius,
                    backgroundColor: theme.buttonColors.secondaryBg,
                    border: `1px solid ${theme.componentColors.borderColor}`,
                  }}
                >
                  Giỏ hàng (2)
                </span>
              </div>

              {/* Mock Product Card */}
              <div
                className={styles.mockProductCard}
                style={{
                  backgroundColor: theme.componentColors.cardBackground,
                  borderColor: theme.componentColors.borderColor,
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=200&q=80"
                  alt="Mock Product"
                  className={styles.mockImg}
                />
                <div className={styles.mockProductInfo}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: theme.buttonColors.primaryBg,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    Thời Trang Nam
                  </span>
                  <h4 className={styles.mockTitle} style={{ color: theme.textColors.textPrimary }}>
                    Áo Polo Phối Bo Cổ Cao Cấp
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span
                      className={styles.mockPrice}
                      style={{ color: theme.buttonColors.primaryBg }}
                    >
                      189.000đ
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: theme.textColors.textMuted,
                        textDecoration: 'line-through',
                      }}
                    >
                      250.000đ
                    </span>
                  </div>
                </div>
              </div>

              {/* Mock Action Buttons */}
              <div className={styles.mockButtonsRow}>
                <button
                  className={styles.mockPrimaryBtn}
                  style={{
                    backgroundColor: theme.buttonColors.primaryBg,
                    color: theme.buttonColors.primaryText,
                    borderRadius: theme.buttonColors.borderRadius,
                  }}
                >
                  Mua Ngay
                </button>
                <button
                  className={styles.mockSecondaryBtn}
                  style={{
                    backgroundColor: theme.buttonColors.secondaryBg,
                    color: theme.buttonColors.secondaryText,
                    borderColor: theme.componentColors.borderColor,
                    borderRadius: theme.buttonColors.borderRadius,
                  }}
                >
                  Chi Tiết
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
