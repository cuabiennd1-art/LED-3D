'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiTruck, FiPlus, FiShoppingCart } from 'react-icons/fi';
import styles from '@/app/(store)/demo/page.module.css';

export interface ProductItem {
  _id: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  flashPrice?: number;
  images: string[];
  image?: string;
  rating: number;
  soldCount?: number;
  sold?: number;
  reviewCount?: number;
  isFeatured?: boolean;
  isFlashSale?: boolean;
  discountPercent?: number;
  tags?: string[];
  category?: any;
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price || 0);
}

export function calcDiscount(price: number, salePrice: number) {
  if (!price || !salePrice || price <= salePrice) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}

export function formatSold(sold?: number) {
  const num = sold ?? 0;
  if (!num) return '0';
  if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'k';
  return num.toString();
}

export function StarRating({ rating, size = 11 }: { rating: number; size?: number }) {
  const safeRating = Math.round(rating || 5);
  return (
    <span className={styles.stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={i <= safeRating ? styles.starFilled : styles.starEmpty}
          style={{ fontSize: size }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

interface StoreProductCardProps {
  product: ProductItem;
  viewMode?: 'grid' | 'list';
  onQuickAdd: (e: React.MouseEvent, product: ProductItem) => void;
  loading?: boolean;
}

const StoreProductCardComponent: React.FC<StoreProductCardProps> = ({
  product,
  viewMode = 'grid',
  onQuickAdd,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className={styles.shopeeCard}>
        <div className={styles.cardImgWrap}>
          <div className={styles.skeleton} />
        </div>
        <div className={styles.cardBody}>
          <p className={styles.cardName}>Đang tải...</p>
          <div className={styles.cardPriceRow}>
            <span className={styles.cardCurrentPrice}>...</span>
          </div>
        </div>
      </div>
    );
  }

  const isFlash = Boolean(product.isFlashSale || (product.flashPrice && product.flashPrice > 0));
  const effectivePrice = product.flashPrice || product.salePrice || product.price;
  const effectiveOriginalPrice =
    product.price > effectivePrice
      ? product.price
      : (product.salePrice && product.salePrice > effectivePrice ? product.salePrice : 0);

  const discount =
    effectiveOriginalPrice > effectivePrice
      ? calcDiscount(effectiveOriginalPrice, effectivePrice)
      : (product.discountPercent || null);

  const displayImage =
    product.images?.[0] || product.image || 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400';

  if (viewMode === 'list') {
    return (
      <Link href={`/product/${product.slug || product._id}`} className={styles.listCard}>
        <div className={styles.listImgWrap}>
          <Image
            src={displayImage}
            alt={product.name || ''}
            fill
            sizes="72px"
            className={styles.listImg}
            loading="lazy"
          />
          {isFlash ? (
            <div className={styles.cardFlashBadge} style={{ transform: 'scale(0.85)', transformOrigin: 'top right' }}>
              <span className={styles.cardFlashPercent}>-{product.discountPercent || discount || 20}%</span>
              <span className={styles.cardFlashLabel}>⚡ SALE</span>
            </div>
          ) : discount ? (
            <div className={styles.listDiscountBadge}>
              -{discount}%
            </div>
          ) : null}
        </div>

        <div className={styles.listInfo}>
          {isFlash && (
            <div className={styles.cardFlashPill}>
              <span>⚡ FLASH SALE</span>
            </div>
          )}
          <p className={styles.listName}>{product.name}</p>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <StarRating rating={product.rating || 5} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Đã bán {formatSold(product.soldCount ?? product.sold ?? 0)}
            </span>
          </div>
          <div className={styles.listPriceRow}>
            <span className={styles.listPrice}>
              {formatPrice(effectivePrice)}
            </span>
            {effectiveOriginalPrice > effectivePrice && (
              <span className={styles.listOldPrice}>{formatPrice(effectiveOriginalPrice)}</span>
            )}
          </div>
        </div>

        <button
          type="button"
          className={styles.buyBtn}
          onClick={(e) => onQuickAdd(e, product)}
          aria-label="Mua nhanh"
        >
          <FiShoppingCart size={13} />
          <span>Mua</span>
        </button>
      </Link>
    );
  }

  return (
    <Link href={`/product/${product.slug || product._id}`} className={styles.shopeeCard}>
      <div className={styles.cardImgWrap}>
        <Image
          src={displayImage}
          alt={product.name || ''}
          fill
          sizes="(max-width: 599px) 50vw, (max-width: 1199px) 25vw, 16vw"
          className={styles.cardImg}
          loading="lazy"
        />
        <div className={styles.favoriteBadge}>Yêu Thích+</div>
        {isFlash ? (
          <div className={styles.cardFlashBadge}>
            <span className={styles.cardFlashPercent}>-{product.discountPercent || discount || 20}%</span>
            <span className={styles.cardFlashLabel}>⚡ FLASH SALE</span>
          </div>
        ) : discount ? (
          <div className={styles.discountBadge}>
            <span className={styles.discountBadgePercent}>{discount}%</span>
            <span className={styles.discountBadgeLabel}>GIẢM</span>
          </div>
        ) : null}
        <div className={styles.freeshipBanner}>
          <FiTruck size={10} /> Freeship XTRA
        </div>
      </div>

      <div className={styles.cardBody}>
        <div>
          {isFlash && (
            <div className={styles.cardFlashPill}>
              <span>⚡ FLASH SALE</span>
            </div>
          )}
          <p className={styles.cardName}>{product.name}</p>
          <div className={styles.cardPriceRow}>
            <span className={styles.cardCurrentPrice}>
              {formatPrice(effectivePrice)}
            </span>
            {effectiveOriginalPrice > effectivePrice && (
              <span className={styles.cardOldPrice}>
                {formatPrice(effectiveOriginalPrice)}
              </span>
            )}
          </div>
        </div>

        <div className={styles.cardFooter}>
          <div className={styles.cardRatingWrap}>
            <StarRating rating={product.rating || 5} />
            <span className={styles.cardSold}>
              Đã bán {formatSold(product.soldCount ?? product.sold ?? 0)}
            </span>
          </div>
          <button
            type="button"
            className={styles.cardAddBtn}
            onClick={(e) => onQuickAdd(e, product)}
            title="Thêm vào giỏ"
            aria-label="Thêm vào giỏ"
          >
            <FiPlus size={14} />
          </button>
        </div>
      </div>
    </Link>
  );
};

export const StoreProductCard = memo(StoreProductCardComponent);
export default StoreProductCard;
