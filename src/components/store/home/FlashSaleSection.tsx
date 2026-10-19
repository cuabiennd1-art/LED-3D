'use client';

import React, { useState, useEffect, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiChevronRight, FiArrowRight } from 'react-icons/fi';
import { RiFlashlightFill } from 'react-icons/ri';
import { getProductCoverImage } from '@/lib/utils';
import styles from './FlashSaleSection.module.css';

function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price || 0);
}

function calcDiscount(price: number, salePrice: number) {
  if (!price || !salePrice || price <= salePrice) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}

function getSlotStatus(slot: any): 'live' | 'upcoming' | 'passed' {
  if (!slot?.startTime || !slot?.endTime) return 'upcoming';
  const now = new Date();
  const curTotalMin = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = slot.startTime.split(':').map((n: string) => parseInt(n, 10) || 0);
  const [eh, em] = slot.endTime.split(':').map((n: string) => parseInt(n, 10) || 0);
  const startTotal = sh * 60 + (sm || 0);
  const endTotal = eh * 60 + (em || 0);

  if (curTotalMin >= endTotal) return 'passed';
  if (curTotalMin >= startTotal && curTotalMin < endTotal) return 'live';
  return 'upcoming';
}

interface FlashSaleCountdownProps {
  slots?: any[];
  selectedSlotId?: string | null;
}

// Subcomponent that isolates countdown timer tick
const FlashSaleCountdown: React.FC<FlashSaleCountdownProps> = memo(({ slots, selectedSlotId }) => {
  const [countdown, setCountdown] = useState({ hours: '00', minutes: '00', seconds: '00' });

  useEffect(() => {
    if (!slots || slots.length === 0) return;

    const updateTimer = () => {
      const now = new Date();
      const curHour = now.getHours();
      const curMin = now.getMinutes();
      const curSec = now.getSeconds();
      const currentTotalMinutes = curHour * 60 + curMin;
      const curTotalSeconds = curHour * 3600 + curMin * 60 + curSec;

      // 1. Check target slot: either currently selected live slot, or any live slot
      const selectedSlot = slots.find((s: any) => s.id === selectedSlotId);
      const liveSlot =
        selectedSlot && getSlotStatus(selectedSlot) === 'live'
          ? selectedSlot
          : slots.find((s: any) => getSlotStatus(s) === 'live');

      if (liveSlot) {
        const [eh, em] = liveSlot.endTime.split(':').map((n: string) => parseInt(n, 10) || 0);
        const endTotalSeconds = eh * 3600 + (em || 0) * 60;
        const diffSeconds = Math.max(0, endTotalSeconds - curTotalSeconds);

        const h = String(Math.floor(diffSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((diffSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(diffSeconds % 60).padStart(2, '0');
        setCountdown({ hours: h, minutes: m, seconds: s });
        return;
      }

      // 2. If no live slot, countdown to the next UPCOMING slot
      const sortedSlots = [...slots].sort((a: any, b: any) => {
        const [ah, am] = (a.startTime || '00:00').split(':').map((n: string) => parseInt(n, 10) || 0);
        const [bh, bm] = (b.startTime || '00:00').split(':').map((n: string) => parseInt(n, 10) || 0);
        return ah * 60 + am - (bh * 60 + bm);
      });

      const upcomingSlot = sortedSlots.find((s: any) => {
        if (!s.startTime) return false;
        const [sh, sm] = s.startTime.split(':').map((n: string) => parseInt(n, 10) || 0);
        return sh * 60 + (sm || 0) > currentTotalMinutes;
      });

      if (upcomingSlot) {
        const [sh, sm] = upcomingSlot.startTime.split(':').map((n: string) => parseInt(n, 10) || 0);
        const startTotalSeconds = sh * 3600 + (sm || 0) * 60;
        const diffSeconds = Math.max(0, startTotalSeconds - curTotalSeconds);

        const h = String(Math.floor(diffSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((diffSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(diffSeconds % 60).padStart(2, '0');
        setCountdown({ hours: h, minutes: m, seconds: s });
      } else {
        setCountdown({ hours: '00', minutes: '00', seconds: '00' });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [slots, selectedSlotId]);

  return (
    <div className={styles.flashCountdownBox}>
      <div className={styles.countdownTimer}>
        <span className={styles.countdownDigit}>{countdown.hours}</span>
        <span className={styles.countdownColon}>:</span>
        <span className={styles.countdownDigit}>{countdown.minutes}</span>
        <span className={styles.countdownColon}>:</span>
        <span className={styles.countdownDigit}>{countdown.seconds}</span>
      </div>
    </div>
  );
});

FlashSaleCountdown.displayName = 'FlashSaleCountdown';

interface FlashSaleSectionProps {
  flashSaleConfig: any;
  onSeeAll: () => void;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}

const FlashSaleSectionComponent: React.FC<FlashSaleSectionProps> = ({
  flashSaleConfig,
  onSeeAll,
  sectionRef,
}) => {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  useEffect(() => {
    if (!flashSaleConfig?.slots || flashSaleConfig.slots.length === 0) return;

    // 1. Prefer selecting the LIVE slot
    const live = flashSaleConfig.slots.find((s: any) => getSlotStatus(s) === 'live');
    if (live) {
      setSelectedSlotId(live.id);
      return;
    }

    // 2. Otherwise select next UPCOMING slot
    const upcoming = flashSaleConfig.slots.find((s: any) => getSlotStatus(s) === 'upcoming');
    if (upcoming) {
      setSelectedSlotId(upcoming.id);
      return;
    }

    // 3. Otherwise default to first slot
    setSelectedSlotId(flashSaleConfig.slots[0].id);
  }, [flashSaleConfig?.slots]);

  const hasFlashContent = Boolean(
    flashSaleConfig &&
    flashSaleConfig.isActive &&
    (
      (flashSaleConfig.slots && flashSaleConfig.slots.some((s: any) => s.items && s.items.length > 0)) ||
      (flashSaleConfig.items && flashSaleConfig.items.length > 0)
    )
  );

  if (!hasFlashContent) return null;

  const selectedSlot = flashSaleConfig?.slots?.find((s: any) => s.id === selectedSlotId);
  const selectedStatus = selectedSlot ? getSlotStatus(selectedSlot) : 'upcoming';
  const isLiveSlot = selectedStatus === 'live';
  const isUpcomingSlot = selectedStatus === 'upcoming';

  const rawItems =
    selectedSlot && selectedSlot.items && selectedSlot.items.length > 0
      ? selectedSlot.items
      : flashSaleConfig?.items && flashSaleConfig.items.length > 0
        ? flashSaleConfig.items
        : [];

  const displayItems = rawItems.slice(0, 5);
  const remainingCount = Math.max(0, rawItems.length - displayItems.length);

  return (
    <div ref={sectionRef} className={styles.flashSaleSection}>
      {/* 1. FLASH SALE HEADER: Logo + Countdown Clock + "Xem tất cả" */}
      <div className={styles.flashHeader}>
        <div className={styles.flashHeaderTop}>
          <div className={styles.flashTitleGroup}>
            <span className={styles.flashLogo}>
              <RiFlashlightFill size={21} color="var(--primary, #ee4d2d)" /> FLASH SALE
            </span>
            <FlashSaleCountdown
              slots={flashSaleConfig.slots}
              selectedSlotId={selectedSlotId}
            />
          </div>

          <button
            type="button"
            className={styles.seeAllBtn}
            onClick={onSeeAll}
          >
            <span>Xem tất cả</span>
            <FiChevronRight size={14} />
          </button>
        </div>

        {/* Optional Campaign Tagline Banner */}
        {(flashSaleConfig.title || flashSaleConfig.subtitle) && (
          <div className={styles.flashCampaignBanner}>
            {flashSaleConfig.title && (
              <span className={styles.flashCampaignTitle}>
                ⚡ {flashSaleConfig.title}
              </span>
            )}
            {flashSaleConfig.subtitle && (
              <span className={styles.flashCampaignSubtitle}>
                {flashSaleConfig.title ? '• ' : ''}{flashSaleConfig.subtitle}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. SHOPEE TIME SLOTS TABS */}
      {flashSaleConfig?.slots && flashSaleConfig.slots.length > 0 && (
        <div className={styles.flashSlotTabs}>
          {flashSaleConfig.slots.map((slot: any) => {
            const isSelected = selectedSlotId === slot.id;
            const status = getSlotStatus(slot);
            const statusText =
              status === 'live'
                ? '🔥 Đang diễn ra'
                : status === 'passed'
                  ? 'Đã kết thúc'
                  : 'Sắp diễn ra';

            return (
              <div
                key={slot.id}
                className={`${styles.flashSlotTab} ${isSelected ? styles.flashSlotTabActive : ''}`}
                onClick={() => setSelectedSlotId(slot.id)}
              >
                <span className={styles.slotTime}>
                  {slot.startTime || '12:00'} - {slot.endTime || '18:00'}
                </span>
                <span className={styles.slotStatus}>
                  {statusText}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. PRODUCT CAROUSEL GRID (Clean 6-Column Layout) */}
      <div className={styles.carouselWrapper}>
        <div className={styles.flashCarousel}>
          {displayItems.map((item: any, i: number) => {
            const hasRange = item.minPrice && item.maxPrice && item.minPrice < item.maxPrice;
            const originalPrice = item.originalPrice || item.price || 0;
            const salePrice = item.flashPrice || item.salePrice || item.price || 0;
            const discount =
              item.discountPercent ||
              (originalPrice > salePrice ? calcDiscount(originalPrice, salePrice) : 0);
            const soldPercent =
              item.soldPercent ||
              Math.min(95, Math.max(25, ((i + 3) * 18) % 100));
            const soldText = item.soldCount ? `Đã bán ${item.soldCount}` : 'Đang bán chạy';

            return (
              <Link
                href={`/product/${item.slug || item.productId || item._id || ''}`}
                key={item._id || item.productId || i}
                className={styles.flashCard}
              >
                {/* 1:1 Image with Zoom */}
                <div className={styles.flashImgWrap}>
                  <Image
                    src={getProductCoverImage(item, 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400')}
                    alt={item.name || 'Sản phẩm Flash Sale'}
                    fill
                    sizes="(max-width: 599px) 50vw, (max-width: 1199px) 25vw, 16vw"
                    className={styles.flashImg}
                    loading="lazy"
                  />
                  {discount > 0 && (
                    <div className={styles.shopeeDiscountFlag}>
                      -{discount}%
                    </div>
                  )}
                </div>

                {/* Info: Price + Shopee Fire Bar */}
                <div className={styles.flashInfo}>
                  <div className={styles.flashPrice}>
                    {hasRange ? `Từ ${formatPrice(item.minPrice)}` : formatPrice(salePrice)}
                  </div>
                  {originalPrice > salePrice && (
                    <div className={styles.flashOldPrice}>
                      {formatPrice(originalPrice)}
                    </div>
                  )}

                  {/* Thanh nhiệt theo trạng thái Slot */}
                  {isLiveSlot ? (
                    <div className={styles.fireProgressBar}>
                      <div
                        className={styles.fireFill}
                        style={{ width: `${soldPercent}%` }}
                      />
                      <span className={styles.fireText}>
                        🔥 {soldText}
                      </span>
                    </div>
                  ) : isUpcomingSlot ? (
                    <div className={styles.upcomingPill}>
                      ⏰ SẮP MỞ BÁN
                    </div>
                  ) : (
                    <div className={styles.passedPill}>
                      ĐÃ KẾT THÚC
                    </div>
                  )}
                </div>
              </Link>
            );
          })}

          {/* Shopee "Xem tất cả" Card at the end */}
          <div
            className={styles.flashSeeAllCard}
            onClick={onSeeAll}
            role="button"
            tabIndex={0}
          >
            <div className={styles.flashSeeAllCircle}>
              <FiArrowRight size={18} />
            </div>
            <span className={styles.flashSeeAllText}>Xem tất cả</span>
            <span className={styles.flashSeeAllSubText}>
              {remainingCount > 0 ? `+${remainingCount} deal nữa` : 'Flash Sale'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FlashSaleSection = memo(FlashSaleSectionComponent);
export default FlashSaleSection;
