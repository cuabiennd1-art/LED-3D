'use client';

import React, { memo, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiChevronRight, FiShoppingCart, FiStar } from 'react-icons/fi';
import { getProductCoverImage } from '@/lib/utils';
import { ProductItem, formatPrice, calcDiscount, formatSold, StarRating } from './StoreProductCard';
import styles from './TopBestSellersSection.module.css';

interface TopBestSellersSectionProps {
  products: ProductItem[];
  onQuickAdd: (e: React.MouseEvent, product: ProductItem) => void;
  onSeeAll: () => void;
}

const MEDAL_CONFIGS = [
  {
    rank: 1,
    title: 'TOP 1',
    badgeClass: styles.medal1,
    cardClass: styles.rank1Card,
    icon: '🥇',
    text: '#1 BÁN CHẠY',
  },
  {
    rank: 2,
    title: 'TOP 2',
    badgeClass: styles.medal2,
    cardClass: styles.rank2Card,
    icon: '🥈',
    text: '#2 NỔI BẬT',
  },
  {
    rank: 3,
    title: 'TOP 3',
    badgeClass: styles.medal3,
    cardClass: styles.rank3Card,
    icon: '🥉',
    text: '#3 YÊU THÍCH',
  },
];

const TopBestSellersSectionComponent: React.FC<TopBestSellersSectionProps> = ({
  products,
  onQuickAdd,
  onSeeAll,
}) => {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  if (!products || products.length === 0) return null;

  // Lấy top 3 sản phẩm bán chạy nhất
  const top3 = products.slice(0, 3);

  // Tính toán chỉ số chấm tròn khi vuốt trên mobile
  const handleScroll = () => {
    if (!trackRef.current) return;
    const { scrollLeft, clientWidth } = trackRef.current;
    if (clientWidth <= 0) return;
    const index = Math.round(scrollLeft / (clientWidth * 0.74));
    setActiveSlideIndex(Math.min(top3.length - 1, Math.max(0, index)));
  };

  return (
    <section className={styles.sectionContainer}>
      {/* 1. Header Row */}
      <div className={styles.sectionHeader}>
        <div className={styles.headerTitleGroup}>
          <span className={styles.crownIconBadge}>👑</span>
          <h2 className={styles.sectionTitle}>
            <span className={styles.highlightText}>TOP 3 BÁN CHẠY</span> NHẤT
          </h2>
        </div>

        <button
          type="button"
          className={styles.seeAllBtn}
          onClick={onSeeAll}
        >
          <span>Xem tất cả</span>
          <FiChevronRight size={13} />
        </button>
      </div>

      {/* 2. Track & Grid Wrapper */}
      <div className={styles.trackWrapper}>
        <div
          ref={trackRef}
          className={styles.topGrid}
          onScroll={handleScroll}
        >
          {top3.map((product, index) => {
            const medal = MEDAL_CONFIGS[index] || MEDAL_CONFIGS[2];
            const effectivePrice = product.flashPrice || product.salePrice || product.price;
            const effectiveOriginalPrice =
              product.price > effectivePrice
                ? product.price
                : product.salePrice && product.salePrice > effectivePrice
                  ? product.salePrice
                  : 0;

            const discount = calcDiscount(effectiveOriginalPrice, effectivePrice);
            const soldCount = product.soldCount ?? product.sold ?? 0;
            const rating = product.rating || 5;
            const imageSrc = getProductCoverImage(
              product,
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'
            );

            const categoryName =
              typeof product.category === 'object'
                ? product.category?.name
                : product.category || 'Hot Trend';

            const heatPercent = Math.min(96, Math.max(50, 95 - index * 15));

            return (
              <div
                key={product._id || index}
                className={`${styles.topCard} ${medal.cardClass}`}
              >
                {/* Huy hiệu Xếp Hạng */}
                <div className={`${styles.rankRibbon} ${medal.badgeClass}`}>
                  <span className={styles.medalEmoji} aria-hidden="true">{medal.icon}</span>
                  <span className={styles.medalLabel}>{medal.text}</span>
                </div>

                {/* Ảnh Sản Phẩm */}
                <Link href={`/product/${product.slug || product._id}`} className={styles.imgContainer}>
                  <Image
                    src={imageSrc}
                    alt={product.name}
                    fill
                    sizes="(max-width: 767px) 240px, (max-width: 1200px) 33vw, 360px"
                    className={styles.productImg}
                    loading="lazy"
                  />
                  {discount > 0 && (
                    <div className={styles.discountBadge}>
                      -{discount}%
                    </div>
                  )}
                </Link>

                {/* Nội Dung Card */}
                <div className={styles.cardBody}>
                  <span className={styles.categoryTag}>{categoryName}</span>

                  <Link
                    href={`/product/${product.slug || product._id}`}
                    className={styles.productName}
                    title={product.name}
                  >
                    {product.name}
                  </Link>

                  {/* Đánh Giá Sao */}
                  <div className={styles.statsRow}>
                    <div className={styles.ratingGroup}>
                      <StarRating rating={rating} size={11} />
                      <span>{rating.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Thanh Nhiệt Doanh Số Shopee Fire Bar */}
                  <div className={styles.fireSoldBar}>
                    <div
                      className={styles.fireFill}
                      style={{ width: `${heatPercent}%` }}
                    />
                    <span className={styles.fireText}>
                      <span className={styles.fireIcon} aria-hidden="true">🔥</span>
                      <span className={styles.fireLabel}>ĐÃ BÁN {formatSold(soldCount)}</span>
                    </span>
                  </div>

                  {/* Giá Bán */}
                  <div className={styles.priceSection}>
                    <span className={styles.currentPrice}>
                      {formatPrice(effectivePrice)}
                    </span>
                    {effectiveOriginalPrice > effectivePrice && (
                      <span className={styles.oldPrice}>
                        {formatPrice(effectiveOriginalPrice)}
                      </span>
                    )}
                  </div>

                  {/* Nút Thao Tác Mua Sắm */}
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.btnQuickBuy}
                      onClick={(e) => onQuickAdd(e, product)}
                    >
                      <FiShoppingCart size={13} />
                      <span>Chọn mua</span>
                    </button>

                    <Link
                      href={`/product/${product.slug || product._id}`}
                      className={styles.btnDetailLink}
                    >
                      <span>Chi tiết</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chấm Chỉ Báo Vuốt Trang Trên Mobile */}
        <div className={styles.mobileDotsRow}>
          {top3.map((_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${activeSlideIndex === i ? styles.dotActive : ''}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export const TopBestSellersSection = memo(TopBestSellersSectionComponent);
export default TopBestSellersSection;
