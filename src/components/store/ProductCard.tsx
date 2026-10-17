'use client';

import React from 'react';
import Link from 'next/link';
import { FiPlus } from 'react-icons/fi';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import LazyImage from '@/components/common/LazyImage';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: any;
  onQuickView?: (product: any) => void;
}

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const { addToCart } = useCart();

  const discountPercent =
    product.salePrice && product.salePrice < product.price
      ? Math.round(((product.price - product.salePrice) / product.price) * 100)
      : null;

  return (
    <div className={styles.card}>
      <Link href={`/product/${product.slug || product._id}`} className={styles.imageWrapper}>
        <LazyImage
          src={(product.images && product.images[0]) || '/file.svg'}
          alt={product.name}
          className={styles.productImg}
        />
        {discountPercent && <span className={styles.saleBadge}>-{discountPercent}%</span>}
      </Link>

      <div className={styles.info}>
        {product.category && (
          <span className={styles.categoryName}>
            {product.category.name || product.category}
          </span>
        )}

        <Link href={`/product/${product.slug || product._id}`}>
          <h3 className={styles.title}>{product.name}</h3>
        </Link>

        <div className={styles.priceRow}>
          <span className={styles.currentPrice}>
            {formatPrice(product.salePrice || product.price)}
          </span>
          {product.salePrice && (
            <span className={styles.oldPrice}>{formatPrice(product.price)}</span>
          )}
        </div>

        <div className={styles.bottomRow}>
          <span className={styles.soldCount}>Đã bán {Number(product.soldCount ?? product.sold ?? 0).toLocaleString('vi-VN')}</span>
          <button
            className={styles.addBtn}
            title="Thêm vào giỏ"
            onClick={(e) => {
              e.preventDefault();
              if (product.variants && product.variants.length > 0 && onQuickView) {
                onQuickView(product);
              } else {
                addToCart(product);
              }
            }}
          >
            <FiPlus />
          </button>
        </div>
      </div>
    </div>
  );
}