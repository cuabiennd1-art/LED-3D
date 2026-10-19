'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FiHome,
  FiPackage,
  FiFolder,
  FiShoppingCart,
  FiUsers,
  FiBarChart2,
  FiTruck,
  FiTarget,
  FiCreditCard,
  FiSettings,
  FiMenu,
  FiBell,
  FiUser,
  FiLogOut,
  FiZap,
  FiGift,
  FiExternalLink,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import {
  getStoredToken,
  getStoredUser,
  isTokenExpired,
  logoutAdmin,
  StoredAdminUser,
} from '@/lib/auth-client';
import { apiFetch } from '@/lib/api';
import AdminPWAInstallButton from '@/components/pwa/AdminPWAInstallButton';
import styles from './layout.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<StoredAdminUser | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();

  const menuItems = [
    { name: 'Dashboard', icon: FiHome, path: '/admin' },
    { name: 'Sản phẩm', icon: FiPackage, path: '/admin/products' },
    { name: 'Danh mục', icon: FiFolder, path: '/admin/categories' },
    { name: 'Đơn hàng', icon: FiShoppingCart, path: '/admin/orders' },
    { name: '⚡ Flash Sale & FOMO', icon: FiZap, path: '/admin/marketing/flash-sale' },
    { name: '🎟️ Mã Giảm Giá', icon: FiGift, path: '/admin/marketing/vouchers' },
    { name: 'Khách hàng', icon: FiUsers, path: '/admin/customers' },
    { name: 'Báo cáo', icon: FiBarChart2, path: '/admin/reports' },
    { name: 'Vận chuyển', icon: FiTruck, path: '/admin/shipping' },
    { name: 'Marketing', icon: FiTarget, path: '/admin/marketing' },
    { name: 'Thanh toán', icon: FiCreditCard, path: '/admin/payment' },
    { name: 'Cài đặt giao diện', icon: FiSettings, path: '/admin/settings' },
  ];

  // 1. Authentication Guard & Token Expiry Check
  useEffect(() => {
    if (pathname === '/admin/login') {
      setIsAuthChecked(true);
      return;
    }

    const token = getStoredToken();
    if (!token || isTokenExpired(token)) {
      toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      logoutAdmin(true);
      return;
    }

    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
    }
    setIsAuthChecked(true);

    // 2. Periodic Token Expiration Watchdog (runs every 15s)
    const interval = setInterval(() => {
      const activeToken = getStoredToken();
      if (!activeToken || isTokenExpired(activeToken)) {
        toast.error('Phiên làm việc đã hết hạn. Đang tự động đăng xuất...', { id: 'auth_expired' });
        logoutAdmin(true);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) { }

    toast.success('Đã đăng xuất tài khoản thành công!');
    logoutAdmin(true);
  };

  // If on login page, render directly without admin frame
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Prevent flashing unauthenticated content before auth check
  if (!isAuthChecked) {
    return null;
  }

  const userInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A';
  const roleLabel = currentUser?.role === 'staff' ? 'Nhân viên' : 'Quản trị viên';
  const currentMenuItem = menuItems.find(
    (item) => item.path === pathname || (item.path !== '/admin' && pathname.startsWith(item.path))
  );

  return (
    <div className={`admin-theme ${styles.adminLayout}`}>
      {/* Sidebar Navigation */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/admin" className={styles.sidebarLogoLink}>
            <div className={styles.sidebarLogoIconBox}>
              {theme.pageTitles?.logoUrl ? (
                <img
                  src={theme.pageTitles.logoUrl}
                  alt={theme.pageTitles?.logoText || 'Logo'}
                  className={styles.sidebarLogoImg}
                />
              ) : (
                <span className={styles.sidebarFallbackIcon}>
                  {theme.pageTitles?.logoText ? theme.pageTitles.logoText.substring(0, 2).toUpperCase() : 'AD'}
                </span>
              )}
            </div>
            <div className={styles.sidebarLogoTexts}>
              <h2 className={styles.sidebarBrandTitle}>
                {theme.pageTitles?.logoText || 'Cửa Hàng'}
              </h2>
              <span className={styles.sidebarAdminSubtitle}>Hệ Thống Quản Trị</span>
            </div>
          </Link>
        </div>
        <nav className={styles.sidebarNav}>
          {menuItems.map((item) => {
            const isExactMatch = pathname === item.path;
            const isChildMatch = pathname.startsWith(item.path + '/');

            // Check if there is another menu item that has a more specific path match
            const hasMoreSpecificMatch = menuItems.some(
              (other) =>
                other.path !== item.path &&
                other.path.startsWith(item.path + '/') &&
                (pathname === other.path || pathname.startsWith(other.path + '/'))
            );

            const isActive =
              item.path === '/admin'
                ? pathname === '/admin'
                : isExactMatch || (isChildMatch && !hasMoreSpecificMatch);

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className={styles.icon} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User & Logout */}
        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarUserWrap}>
            <div className={styles.userAvatarCircle}>{userInitial}</div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{currentUser?.name || 'Admin'}</span>
              <span className={styles.userRoleBadge}>{roleLabel}</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.sidebarLogoutBtn}
            onClick={handleLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <FiLogOut />
          </button>
        </div>
      </aside>

      {/* Main Content View */}
      <div className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              className={styles.menuToggle}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Mở Menu"
            >
              <FiMenu />
            </button>
            <div className={styles.headerBreadcrumbs}>
              <span className={styles.breadcrumbStore}>{theme.pageTitles?.logoText || 'Cửa Hàng'}</span>
              <span className={styles.breadcrumbSep}>/</span>
              <span className={styles.breadcrumbActive}>
                {currentMenuItem?.name || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className={styles.headerRight}>
            <AdminPWAInstallButton />
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.viewStoreBtn}
              title="Mở giao diện bán hàng khách hàng"
            >
              <FiExternalLink size={14} />
              <span>Xem Cửa Hàng</span>
            </Link>

            <button className={styles.iconButton} aria-label="Thông báo" title="Thông báo hệ thống">
              <FiBell />
            </button>

            {/* Current User Badge */}
            <div className={styles.userInfo}>
              <div className={styles.userAvatarCircle}>{userInitial}</div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{currentUser?.name || 'Admin'}</span>
                <span className={styles.userRoleBadge}>{roleLabel}</span>
              </div>
            </div>

            {/* Logout Action Button */}
            <button
              type="button"
              className={styles.logoutBtnHeader}
              onClick={handleLogout}
              title="Đăng xuất khỏi hệ thống"
            >
              <FiLogOut size={14} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        <main className={styles.content}>
          {children}
        </main>
      </div>

      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
}
