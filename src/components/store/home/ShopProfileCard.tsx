'use client';

import React, { useState, useEffect, memo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  FiTruck,
  FiMessageSquare,
  FiShoppingBag,
  FiUsers,
  FiUserCheck,
  FiStar,
  FiMessageCircle,
  FiCalendar,
  FiMapPin,
  FiBriefcase,
} from 'react-icons/fi';
import ZaloIcon from '@/components/ui/ZaloIcon';
import { useTheme } from '@/contexts/ThemeContext';
import styles from '@/app/(store)/demo/page.module.css';

interface ShopProfileCardProps {
  shopDisplayName: string;
  logoUrl?: string;
  avatarInitials: string;
  productCount?: number;
  coverImage?: string;
  coverImages?: string[];
  socialLinks?: {
    tiktokUrl?: string;
    facebookUrl?: string;
  };
}

const ShopProfileCardComponent: React.FC<ShopProfileCardProps> = ({
  shopDisplayName = '',
  logoUrl,
  avatarInitials = 'ST',
  productCount = 4,
  coverImage,
  coverImages,
}) => {
  const router = useRouter();
  const { theme } = useTheme();
  const [avatarError, setAvatarError] = useState(false);

  const cleanZaloPhone = (theme?.socialLinks?.zaloPhone || '').replace(/[^0-9]/g, '');

  useEffect(() => {
    setAvatarError(false);
  }, [logoUrl]);

  // Consolidate banner images for the mobile background carousel
  const bannerList = React.useMemo(() => {
    const rawList =
      coverImages && coverImages.length > 0
        ? coverImages
        : coverImage
        ? [coverImage]
        : [];

    return rawList.filter(
      (img) => Boolean(img && typeof img === 'string' && img.trim().length > 0)
    );
  }, [coverImages, coverImage]);

  const [currentSlide, setCurrentSlide] = useState(0);

  // Keep current slide within bounds
  useEffect(() => {
    if (currentSlide >= bannerList.length && bannerList.length > 0) {
      setCurrentSlide(0);
    }
  }, [bannerList.length, currentSlide]);

  // Auto-slide every 4 seconds on mobile
  useEffect(() => {
    if (bannerList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerList.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [bannerList.length]);

  // Touch Swipe Gesture Handlers
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null || bannerList.length <= 1) return;
    const diff = touchStartX - touchEndX;
    if (diff > 45) {
      // Swiped Left -> Next Image
      setCurrentSlide((prev) => (prev + 1) % bannerList.length);
    } else if (diff < -45) {
      // Swiped Right -> Previous Image
      setCurrentSlide((prev) => (prev - 1 + bannerList.length) % bannerList.length);
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  return (
    <div className={styles.shopeeShopCardWrapper}>
      {/* LEFT BOX: DARK SHOP HERO CARD WITH SLIDING BANNER BACKGROUND */}
      <div
        className={styles.shopeeShopIdentityCard}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {bannerList.length > 0 && (
          <div className={styles.shopCoverBackground}>
            <div
              className={styles.shopCoverTrack}
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {bannerList.map((imgUrl, idx) => (
                <div key={idx} className={styles.shopCoverSlide}>
                  <img
                    src={imgUrl}
                    alt={`${shopDisplayName} banner ${idx + 1}`}
                    className={styles.shopCoverImg}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>

            {bannerList.length > 1 && (
              <div className={styles.shopCoverDots}>
                {bannerList.map((_, idx) => (
                  <span
                    key={idx}
                    className={`${styles.shopCoverDot} ${idx === currentSlide ? styles.shopCoverDotActive : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide(idx);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        <div className={styles.shopeeShopCoverOverlay} />

        <div className={styles.shopeeShopIdentityContent}>
          {/* Header Row: Avatar + Shop Title & Online Status */}
          <div className={styles.shopeeIdentityHeaderRow}>
            <div className={styles.shopeeAvatarWrap}>
              {logoUrl && !avatarError ? (
                <img
                  src={logoUrl}
                  alt={shopDisplayName}
                  className={styles.shopeeAvatarImg}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', background: '#fff' }}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className={styles.shopeeAvatarPlaceholder}>{avatarInitials}</div>
              )}
              <span className={styles.shopeeOfficialBadge}>Chính Hãng</span>
            </div>

            <div className={styles.shopeeShopIdentityInfo}>
              <h1 className={styles.shopeeShopTitle}>{shopDisplayName}</h1>
              <p className={styles.shopeeShopStatus}>
                <span className={styles.onlineDot} /> Online 18 phút trước
              </p>
            </div>
          </div>

          {/* 2 Action Buttons: Theo Dõi Đơn & Chat */}
          <div className={styles.shopeeShopActions}>
            <button
              type="button"
              className={styles.btnShopeeFollow}
              onClick={() => router.push('/tracking')}
            >
              <FiTruck size={14} />
              <span>Theo Dõi Đơn</span>
            </button>

            <button
              type="button"
              className={styles.btnShopeeChat}
              onClick={() => {
                if (cleanZaloPhone) {
                  window.open(`https://zalo.me/${cleanZaloPhone}`, '_blank', 'noopener,noreferrer');
                } else {
                  router.push('/chat');
                }
              }}
              title={cleanZaloPhone ? `Chat Zalo (${cleanZaloPhone})` : 'Chat với Shop'}
            >
              {cleanZaloPhone ? <ZaloIcon size={14} /> : <FiMessageSquare size={13} />}
              <span>{cleanZaloPhone ? 'Chat Zalo' : 'Chat'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT BOX: 8 METRICS GRID (2 COLUMNS X 4 ROWS) */}
      <div className={styles.shopeeMetricsGrid}>
        {/* Column 1 */}
        <div className={styles.metricItem}>
          <span className={styles.metricIcon}><FiShoppingBag size={14} /></span>
          <span className={styles.metricLabel}>Sản phẩm:</span>
          <span className={styles.metricValueHighlight}>{productCount}</span>
        </div>

        <div className={styles.metricItem}>
          <span className={styles.metricIcon}><FiUsers size={14} /></span>
          <span className={styles.metricLabel}>Người theo dõi:</span>
          <span className={styles.metricValueHighlight}>7.3k</span>
        </div>

        <div className={styles.metricItem}>
          <span className={styles.metricIcon}><FiUserCheck size={14} /></span>
          <span className={styles.metricLabel}>Đang theo dõi:</span>
          <span className={styles.metricValueHighlight}>8</span>
        </div>

        <div className={styles.metricItem}>
          <span className={styles.metricIcon}><FiStar size={14} color="#f59e0b" /></span>
          <span className={styles.metricLabel}>Đánh giá:</span>
          <span className={styles.metricValueHighlight}>4.9 (15.4k Đánh giá)</span>
        </div>

        <div className={styles.metricItem}>
          <span className={styles.metricIcon}><FiMessageCircle size={14} /></span>
          <span className={styles.metricLabel}>Tỉ lệ phản hồi Chat:</span>
          <span className={styles.metricValueHighlight}>98% (Trong vài giờ)</span>
        </div>

        <div className={styles.metricItem}>
          <span className={styles.metricIcon}><FiCalendar size={14} /></span>
          <span className={styles.metricLabel}>Tham gia:</span>
          <span className={styles.metricValueHighlight}>5 năm trước</span>
        </div>

        <div className={styles.metricItem}>
          <span className={styles.metricIcon}><FiMapPin size={14} /></span>
          <span className={styles.metricLabel}>Địa chỉ:</span>
          <span className={styles.metricValueHighlight}>Hà Nội, Việt Nam</span>
        </div>

        <div className={styles.metricItem}>
          <span className={styles.metricIcon}><FiBriefcase size={14} /></span>
          <span className={styles.metricLabel}>Tên doanh nghiệp:</span>
          <span className={styles.metricValueHighlight}>{shopDisplayName} Store</span>
        </div>
      </div>
    </div>
  );
};

export const ShopProfileCard = memo(ShopProfileCardComponent);
export default ShopProfileCard;
