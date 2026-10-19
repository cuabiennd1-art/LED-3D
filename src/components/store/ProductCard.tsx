'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FiPlus } from 'react-icons/fi';
import { formatPrice, getProductCoverImage } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import LazyImage from '@/components/common/LazyImage';
import ProductDetailModal from '@/components/store/ProductDetailModal';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: any;
  onQuickView?: (product: any) => void;
}

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const { addToCart } = useCart();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isFlash = Boolean(product.isFlashSale || (product.flashPrice && Number(product.flashPrice) > 0));
  const effectivePrice = product.flashPrice || product.salePrice || product.price;
  const effectiveOriginalPrice = product.price > effectivePrice ? product.price : (product.originalPrice || 0);

  const discountPercent =
    product.discountPercent ||
    (effectiveOriginalPrice > effectivePrice
      ? Math.round(((effectiveOriginalPrice - effectivePrice) / effectiveOriginalPrice) * 100)
      : null);

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onQuickView) {
      onQuickView(product);
      return;
    }

    // Mở bước chọn loại sản phẩm (variant modal)
    setIsModalOpen(true);
  };

  return (
    <>
      <div className={styles.card}>
        <Link href={`/product/${product.slug || product._id}`} className={styles.imageWrapper}>
          <LazyImage
            src={getProductCoverImage(product, '/file.svg')}
            alt={product.name}
            className={styles.productImg}
          />
          {discountPercent && (
            <span
              className={styles.saleBadge}
              style={isFlash ? { background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: '#fff', fontWeight: 800 } : undefined}
            >
              {isFlash ? '⚡ ' : ''}-{discountPercent}%
            </span>
          )}
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
              onClick={handleAddClick}
            >
              <FiPlus />
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ProductDetailModal
          product={product}
          onClose={() => setIsModalOpen(false)}
          mode="all"
        />
      )}
    </>
  );
}