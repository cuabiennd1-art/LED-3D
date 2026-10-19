'use client';

import React, { useRef, useMemo, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FiChevronLeft,
  FiChevronRight,
  FiStar,
  FiPlus,
  FiShoppingBag,
} from 'react-icons/fi';
import { RiFireFill } from 'react-icons/ri';
import { getProductCoverImage } from '@/lib/utils';
import { ProductItem } from './StoreProductCard';
import styles from './RecommendedProductScroller.module.css';

export interface RecommendedProductScrollerProps {
  products: ProductItem[];
  onQuickAdd: (e: React.MouseEvent, product: ProductItem) => void;
  onSeeAll?: () => void;
  title?: string;
  subtitle?: string;
  badgeText?: string;
  maxItems?: number;
  sortBy?: 'sold' | 'discount' | 'newest' | 'price-asc' | 'price-desc';
}

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

function formatSold(count?: number) {
  if (!count) return '0';
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace('.0', '')}k`;
  }
  return String(count);
}

function getProductDiscountPercent(product: ProductItem): number {
  if (product.discountPercent !== undefined && product.discountPercent > 0) {
    return product.discountPercent;
  }
  const effectivePrice = product.flashPrice || product.salePrice || product.price;
  const originalPrice =
    product.price > effectivePrice
      ? product.price
      : (product.salePrice && product.salePrice > effectivePrice ? product.salePrice : 0);

  if (originalPrice > effectivePrice) {
    return calcDiscount(originalPrice, effectivePrice);
  }
  return 0;
}

function getProductDiscountAmount(product: ProductItem): number {
  const effectivePrice = product.flashPrice || product.salePrice || product.price;
  const originalPrice =
    product.price > effectivePrice
      ? product.price
      : (product.salePrice && product.salePrice > effectivePrice ? product.salePrice : 0);

  if (originalPrice > effectivePrice) {
    return originalPrice - effectivePrice;
  }
  return 0;
}

const RecommendedProductScrollerComponent: React.FC<RecommendedProductScrollerProps> = ({
  products,
  onQuickAdd,
  onSeeAll,
  title = 'Gợi ý dành cho bạn',
  subtitle,
  badgeText = 'Sale Khủng Nhất',
  maxItems = 15,
  sortBy = 'discount',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sắp xếp danh sách sản phẩm theo tiêu chí
  const sortedProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    const list = [...products];

    if (sortBy === 'sold') {
      list.sort((a, b) => ((b.soldCount ?? b.sold ?? 0) - (a.soldCount ?? a.sold ?? 0)));
    } else if (sortBy === 'discount') {
      list.sort((a, b) => {
        const discB = getProductDiscountPercent(b);
        const discA = getProductDiscountPercent(a);
        if (discB !== discA) return discB - discA;
        return getProductDiscountAmount(b) - getProductDiscountAmount(a);
      });
    } else if (sortBy === 'price-asc') {
      list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    }

    return list.slice(0, maxItems);
  }, [products, sortBy, maxItems]);

  if (sortedProducts.length === 0) return null;

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 480;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className={styles.scrollerSection}>
      {/* HEADER BAR */}
      <div className={styles.scrollerHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIconWrap}>
            <RiFireFill size={18} />
          </div>
          <div className={styles.titleInfo}>
            <div className={styles.titleRow}>
              <h2 className={styles.sectionTitle}>{title}</h2>
              {badgeText && <span className={styles.badgeHighlight}>{badgeText}</span>}
            </div>
            {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.navControls}>
            <button
              type="button"
              className={styles.navArrowBtn}
              onClick={() => handleScroll('left')}
              aria-label="Cuộn sang trái"
            >
              <FiChevronLeft size={18} />
            </button>
            <button
              type="button"
              className={styles.navArrowBtn}
              onClick={() => handleScroll('right')}
              aria-label="Cuộn sang phải"
            >
              <FiChevronRight size={18} />
            </button>
          </div>

          {onSeeAll && (
            <button
              type="button"
              className={styles.seeAllBtn}
              onClick={onSeeAll}
            >
              <span>Xem tất cả</span>
              <FiChevronRight size={15} />
            </button>
          )}
        </div>
      </div>

      {/* HORIZONTAL PRODUCT SCROLL TRACK */}
      <div ref={scrollRef} className={styles.scrollTrack}>
        {sortedProducts.map((product, idx) => {
          const effectivePrice = product.flashPrice || product.salePrice || product.price;
          const effectiveOriginalPrice =
            product.price > effectivePrice
              ? product.price
              : (product.salePrice && product.salePrice > effectivePrice ? product.salePrice : 0);

          const discount =
            effectiveOriginalPrice > effectivePrice
              ? calcDiscount(effectiveOriginalPrice, effectivePrice)
              : (product.discountPercent || null);

          const displayImage = getProductCoverImage(
            product,
            'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500'
          );

          const rating = product.rating || (product as any).ratingAverage || 5;
          const soldCount = product.soldCount ?? product.sold ?? 0;

          return (
            <div key={product._id || idx} className={styles.largeProductCard}>
              <Link href={`/product/${product.slug || product._id}`} className={styles.cardImageLink}>
                <div className={styles.imageContainer}>
                  <Image
                    src={displayImage}
                    alt={product.name || 'Sản phẩm'}
                    fill
                    sizes="(max-width: 599px) 180px, 230px"
                    className={styles.productImg}
                    loading="lazy"
                  />
                  {discount && discount > 0 ? (
                    <div className={styles.discountBadge}>
                      <span className={styles.discountPercent}>-{discount}%</span>
                      <span className={styles.discountLabel}>GIẢM</span>
                    </div>
                  ) : null}
                  <div className={styles.hoverOverlay}>
                    <span>Xem chi tiết</span>
                  </div>
                </div>
              </Link>

              {/* PRODUCT INFO CONTAINER */}
              <div className={styles.cardContent}>
                <Link href={`/product/${product.slug || product._id}`} className={styles.productNameLink}>
                  <h3 className={styles.productName} title={product.name}>
                    {product.name}
                  </h3>
                </Link>

                {/* PRICE ROW */}
                <div className={styles.priceRow}>
                  <span className={styles.currentPrice}>
                    {formatPrice(effectivePrice)}
                  </span>
                  {effectiveOriginalPrice > effectivePrice && (
                    <span className={styles.originalPrice}>
                      {formatPrice(effectiveOriginalPrice)}
                    </span>
                  )}
                </div>

                {/* RATING & SOLD STATS */}
                <div className={styles.statsRow}>
                  <div className={styles.ratingBadge}>
                    <FiStar className={styles.starIconFilled} />
                    <span>{rating.toFixed(1)}</span>
                  </div>
                  <div className={styles.soldBadge}>
                    <span>🔥 Đã bán {formatSold(soldCount)}</span>
                  </div>
                </div>

                {/* QUICK ADD BUTTON */}
                <button
                  type="button"
                  className={styles.quickAddBtn}
                  onClick={(e) => onQuickAdd(e, product)}
                  aria-label="Thêm vào giỏ hàng"
                >
                  <FiShoppingBag size={14} />
                  <span>Thêm Vào Giỏ</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export const RecommendedProductScroller = memo(RecommendedProductScrollerComponent);
export default RecommendedProductScroller;
