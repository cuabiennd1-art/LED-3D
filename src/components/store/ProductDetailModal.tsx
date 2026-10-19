'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiX,
  FiPlus,
  FiMinus,
  FiShoppingCart,
  FiZap,
  FiCheck,
  FiMaximize2,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatPrice, isVideoUrl } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import {
  IProductOption,
  IVariantItem,
  findMatchingVariant,
} from '@/lib/variant-helper';
import styles from './ProductDetailModal.module.css';

interface ProductDetailModalProps {
  product: any | null;
  onClose: () => void;
  initialAttributes?: Record<string, string>;
  initialQuantity?: number;
  mode?: 'all' | 'cart' | 'buy';
  onSuccess?: (action: 'cart' | 'buy', selectedVariant: any, qty: number) => void;
}

export default function ProductDetailModal({
  product,
  onClose,
  initialAttributes,
  initialQuantity,
  mode = 'all',
  onSuccess,
}: ProductDetailModalProps) {
  const router = useRouter();
  const { addToCart, buyNow } = useCart();

  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);



  // Extract options
  const options: IProductOption[] = useMemo(() => {
    if (!product) return [];
    if (product.options && Array.isArray(product.options) && product.options.length > 0) {
      return product.options.filter((o: any) => o.name && o.values && o.values.length > 0);
    }
    if (product.variants && product.variants.length > 0) {
      const attrMap: Record<string, Set<string>> = {};
      product.variants.forEach((v: any) => {
        if (v.attributes) {
          const attrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : v.attributes;
          Object.entries(attrs).forEach(([k, val]: any) => {
            if (typeof val === 'string' && val.trim()) {
              if (!attrMap[k]) attrMap[k] = new Set();
              attrMap[k].add(val.trim());
            }
          });
        } else {
          if (v.color?.trim()) {
            if (!attrMap['Màu sắc']) attrMap['Màu sắc'] = new Set();
            attrMap['Màu sắc'].add(v.color.trim());
          }
          if (v.size?.trim()) {
            if (!attrMap['Kích cỡ']) attrMap['Kích cỡ'] = new Set();
            attrMap['Kích cỡ'].add(v.size.trim());
          }
        }
      });

      return Object.entries(attrMap).map(([name, set]) => ({
        name,
        values: Array.from(set),
      }));
    }
    return [];
  }, [product]);

  // Extract normalized variants
  const variants: IVariantItem[] = useMemo(() => {
    if (!product || !product.variants) return [];
    return product.variants.map((v: any, idx: number) => {
      let attrs: Record<string, string> = {};
      if (v.attributes) {
        attrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : v.attributes;
      } else {
        if (v.color) attrs['Màu sắc'] = v.color;
        if (v.size) attrs['Kích cỡ'] = v.size;
      }
      return {
        _id: v._id,
        sku: v.sku || `SKU-${idx + 1}`,
        title: v.title || v.name || Object.values(attrs).filter(Boolean).join(' / ') || `Biến thể ${idx + 1}`,
        attributes: attrs,
        price: v.price !== undefined ? v.price : (product.salePrice || product.price),
        salePrice: v.salePrice,
        stock: v.stock ?? 0,
        image: v.image || '',
      };
    });
  }, [product]);

  // Initialize selections when product opens
  useEffect(() => {
    if (product) {
      setQuantity(initialQuantity && initialQuantity > 0 ? initialQuantity : 1);
      setActiveImageIndex(0);

      const initialSelection: Record<string, string> = {};
      if (initialAttributes && Object.keys(initialAttributes).length > 0) {
        Object.assign(initialSelection, initialAttributes);
      }
      setSelectedAttributes(initialSelection);
    }
  }, [product, initialAttributes, initialQuantity]);

  // Resolve matching variant
  const matchedVariant = useMemo(() => {
    if (variants.length === 0) return null;
    return findMatchingVariant(variants, selectedAttributes);
  }, [variants, selectedAttributes]);

  const flashPrice =
    product?.flashPrice && Number(product.flashPrice) > 0 ? Number(product.flashPrice) : null;

  const currentPrice = flashPrice
    ? flashPrice
    : matchedVariant
    ? (matchedVariant.salePrice && matchedVariant.salePrice > 0
        ? matchedVariant.salePrice
        : (product?.salePrice && product.salePrice > 0 && product.salePrice < (matchedVariant.price || product.price)
            ? product.salePrice
            : matchedVariant.price))
    : (product?.salePrice && product.salePrice > 0 ? product.salePrice : (product?.price || 0));

  const originalPrice = flashPrice
    ? (matchedVariant?.price || product?.originalPrice || product?.price || flashPrice)
    : matchedVariant
    ? (matchedVariant.originalPrice || matchedVariant.price)
    : (product?.originalPrice || product?.price || 0);

  const hasDiscount = originalPrice > currentPrice;

  const discountPercent = hasDiscount && originalPrice > 0
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : null;

  const hasOptions = options.length > 0 || (variants && variants.length > 1);

  const isAllOptionsSelected = useMemo(() => {
    if (!hasOptions) return true;
    if (options.length > 0) {
      return options.every((opt) => Boolean(selectedAttributes[opt.name]));
    }
    if (variants.length > 1) {
      return Boolean(matchedVariant);
    }
    return true;
  }, [hasOptions, options, selectedAttributes, matchedVariant]);

  const priceRange = useMemo(() => {
    if (!variants || variants.length === 0) {
      const p = product?.salePrice && product.salePrice > 0 ? product.salePrice : (product?.price || 0);
      return { min: p, max: p, hasRange: false };
    }
    const prices = variants.map((v) => {
      if (typeof v.salePrice === 'number' && v.salePrice > 0) return v.salePrice;
      if (typeof v.price === 'number' && v.price > 0) return v.price;
      return (product?.salePrice && product.salePrice > 0) ? product.salePrice : (product?.price || 0);
    });
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max, hasRange: min < max && isFinite(min) && isFinite(max) };
  }, [variants, product]);

  const originalPriceRange = useMemo(() => {
    if (!variants || variants.length === 0) {
      const orig = product?.originalPrice || (product?.salePrice && product.price > product.salePrice ? product.price : null);
      return { min: orig, max: orig, hasRange: false };
    }
    const origPrices = variants.map((v) => {
      if (typeof v.originalPrice === 'number' && v.originalPrice > 0) return v.originalPrice;
      if (typeof v.price === 'number' && v.price > 0) return v.price;
      return product?.originalPrice || product?.price || 0;
    });
    const min = Math.min(...origPrices);
    const max = Math.max(...origPrices);
    return { min, max, hasRange: min < max && isFinite(min) && isFinite(max) };
  }, [variants, product]);

  const shouldShowPriceRange = hasOptions && !isAllOptionsSelected && priceRange.hasRange;

  const displayPriceText = useMemo(() => {
    if (shouldShowPriceRange) {
      return `${formatPrice(priceRange.min)} - ${formatPrice(priceRange.max)}`;
    }
    return formatPrice(currentPrice);
  }, [shouldShowPriceRange, priceRange, currentPrice]);

  const displayOriginalPriceText = useMemo(() => {
    if (shouldShowPriceRange) {
      if (originalPriceRange.hasRange) {
        return `${formatPrice(originalPriceRange.min)} - ${formatPrice(originalPriceRange.max)}`;
      }
      return originalPriceRange.max && originalPriceRange.max > priceRange.min ? formatPrice(originalPriceRange.max) : null;
    }
    return hasDiscount ? formatPrice(originalPrice) : null;
  }, [shouldShowPriceRange, originalPriceRange, priceRange, hasDiscount, originalPrice]);

  const totalStock = useMemo(() => {
    if (variants && variants.length > 0) {
      return variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    }
    return product?.stock ?? 0;
  }, [variants, product]);

  const currentStock = matchedVariant
    ? (matchedVariant.stock ?? 0)
    : (variants.length > 0 ? totalStock : (product?.stock ?? 0));

  const isOutOfStock = currentStock <= 0;
  const isProductOutOfStock = totalStock <= 0;

  // Auto adjust quantity
  useEffect(() => {
    if (currentStock > 0 && quantity > currentStock) {
      setQuantity(currentStock);
    } else if (currentStock === 0) {
      setQuantity(1);
    }
  }, [currentStock]);

  // Switch image if variant has dedicated image
  useEffect(() => {
    if (matchedVariant?.image && product?.images) {
      const idx = product.images.findIndex((img: string) => img === matchedVariant.image);
      if (idx > -1) {
        setActiveImageIndex(idx);
      }
    }
  }, [matchedVariant]);

  if (!product) return null;

  const images: string[] = useMemo(() => {
    let list: string[] = [];
    if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
      list = [...product.images];
    }
    if (product?.video && !list.includes(product.video)) {
      list.push(product.video);
    }
    return list.length > 0
      ? list
      : ['https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400'];
  }, [product?.images, product?.video]);

  // Close lightbox on Escape, navigate with arrow keys
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, images.length]);

  const isOptionValueAvailable = (optionName: string, value: string): boolean => {
    if (variants.length === 0) return true;
    const trialSelection = { ...selectedAttributes, [optionName]: value };
    return variants.some((v) => {
      const attrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : v.attributes;
      const isMatch = Object.keys(trialSelection).every((key) => attrs[key] === trialSelection[key]);
      return isMatch && v.stock > 0;
    });
  };

  const handleSelectAttribute = (optionName: string, value: string) => {
    if (!isOptionValueAvailable(optionName, value)) return;
    setSelectedAttributes((prev) => {
      if (prev[optionName] === value) {
        const next = { ...prev };
        delete next[optionName];
        return next;
      }
      return {
        ...prev,
        [optionName]: value,
      };
    });
  };

  const handleSelectGenericVariant = (v: any) => {
    const isSelected = matchedVariant?._id === v._id || matchedVariant?.sku === v.sku;
    if (isSelected) {
      setSelectedAttributes({});
    } else {
      const rawAttrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || { 'Phân loại': v.title });
      setSelectedAttributes(rawAttrs);
    }
  };

  const validateSelection = (): boolean => {
    if (options.length > 0) {
      for (const opt of options) {
        if (!selectedAttributes[opt.name]) {
          toast.error(`Vui lòng chọn ${opt.name}!`);
          return false;
        }
      }
    }

    if (variants.length > 0 && !matchedVariant) {
      toast.error('Phiên bản phân loại đã chọn không tồn tại!');
      return false;
    }

    if (isOutOfStock) {
      toast.error('Phiên bản này hiện đã tạm hết hàng!');
      return false;
    }

    if (quantity > currentStock) {
      toast.error(`Chỉ còn ${currentStock} sản phẩm trong kho!`);
      setQuantity(currentStock);
      return false;
    }

    return true;
  };

  const handleAddToCart = () => {
    if (!validateSelection()) return;
    const productToAdd = {
      ...product,
      price: originalPrice,
      salePrice: currentPrice,
      flashPrice: product.flashPrice || currentPrice,
    };
    addToCart(productToAdd, quantity, matchedVariant || undefined);
    if (onSuccess) {
      onSuccess('cart', matchedVariant, quantity);
    }
    onClose();
  };

  const handleBuyNow = () => {
    if (!validateSelection()) return;
    const productToBuy = {
      ...product,
      price: originalPrice,
      salePrice: currentPrice,
      flashPrice: product.flashPrice || currentPrice,
    };
    buyNow(productToBuy, quantity, matchedVariant || undefined);
    if (onSuccess) {
      onSuccess('buy', matchedVariant, quantity);
    }
    onClose();
    router.push('/checkout');
  };

  // Selected label summary
  const selectedValuesList = Object.values(selectedAttributes).filter(Boolean);
  const selectedSummary = selectedValuesList.length > 0 ? selectedValuesList.join(', ') : '';

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          {/* ===== 1. SHOPEE COMPACT PRODUCT HEADER ===== */}
          <div className={styles.headerSummary}>
            <div
              className={styles.thumbnailBox}
              onClick={() => setIsLightboxOpen(true)}
              role="button"
              tabIndex={0}
              title="Bấm để xem ảnh to full màn hình"
              aria-label="Xem ảnh phóng to full màn hình"
            >
              {isVideoUrl(images[activeImageIndex] || images[0]) ? (
                <>
                  <video
                    src={images[activeImageIndex] || images[0]}
                    muted
                    playsInline
                    className={styles.thumbnailImg}
                    style={{ objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#fff',
                      fontSize: 16,
                    }}
                  >
                    ▶
                  </div>
                </>
              ) : (
                <img
                  src={images[activeImageIndex] || images[0]}
                  alt={product.name}
                  className={styles.thumbnailImg}
                />
              )}
              {discountPercent && (
                <span className={styles.thumbnailBadge}>-{discountPercent}%</span>
              )}
              <div className={styles.zoomHintIcon} title="Phóng to">
                <FiMaximize2 size={12} />
              </div>
            </div>

          <div className={styles.headerInfo}>
            <div className={styles.priceRow}>
              <span className={styles.currentPrice}>{displayPriceText}</span>
              {displayOriginalPriceText && (
                <span className={styles.oldPrice}>{displayOriginalPriceText}</span>
              )}
            </div>

            <div className={styles.stockText}>
              {isOutOfStock ? (
                <span className={styles.outOfStockText}>Tạm hết hàng</span>
              ) : (
                <span>Kho: <strong style={{ color: 'var(--text-main, #fff)' }}>{currentStock}</strong></span>
              )}
            </div>

            <div className={styles.selectedLabel}>
              {isAllOptionsSelected && selectedSummary ? (
                <span>Đã chọn: <strong style={{ color: 'var(--primary, #3b82f6)' }}>{selectedSummary}</strong></span>
              ) : (
                <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Vui lòng chọn phân loại</span>
              )}
            </div>
          </div>

          <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
            <FiX size={18} />
          </button>
        </div>

        {/* ===== 2. SCROLLABLE OPTIONS BODY ===== */}
        <div className={styles.scrollBody}>
          <h3 className={styles.productTitle}>{product.name}</h3>

          {/* DYNAMIC MULTI-DIMENSIONAL OPTIONS */}
          {options.map((opt) => (
            <div key={opt.name} className={styles.variantBlock}>
              <div className={styles.variantTitle}>
                <span>{opt.name}:</span>
                {selectedAttributes[opt.name] && (
                  <span className={styles.activeVariantText}>
                    {selectedAttributes[opt.name]}
                  </span>
                )}
              </div>
              <div className={styles.variantChips}>
                {opt.values.map((val) => {
                  const isSelected = selectedAttributes[opt.name] === val;
                  const isAvail = isOptionValueAvailable(opt.name, val);

                  return (
                    <button
                      key={val}
                      type="button"
                      disabled={!isAvail}
                      className={`${styles.variantChip} ${isSelected ? styles.variantChipActive : ''} ${!isAvail ? styles.variantChipDisabled : ''}`}
                      onClick={() => isAvail && handleSelectAttribute(opt.name, val)}
                      title={!isAvail ? 'Tùy chọn này tạm hết hàng' : undefined}
                    >
                      {val}
                      {isSelected && <FiCheck size={12} className={styles.checkIcon} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Fallback generic variants */}
          {options.length === 0 && variants.length > 0 && (
            <div className={styles.variantBlock}>
              <div className={styles.variantTitle}>Phân loại:</div>
              <div className={styles.variantChips}>
                {variants.map((v, idx) => {
                  const isSelected = matchedVariant?._id === v._id || matchedVariant?.sku === v.sku;
                  const isAvail = v.stock > 0;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!isAvail}
                      className={`${styles.variantChip} ${isSelected ? styles.variantChipActive : ''} ${!isAvail ? styles.variantChipDisabled : ''}`}
                      onClick={() => isAvail && handleSelectGenericVariant(v)}
                    >
                      {v.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className={styles.quantityRow}>
            <span className={styles.qtyLabel}>Số lượng</span>
            <div className={styles.stepperWrap}>
              <div className={styles.stepper}>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                >
                  <FiMinus size={13} />
                </button>
                <span className={styles.stepperVal}>{isOutOfStock ? 0 : quantity}</span>
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                  disabled={quantity >= currentStock || isOutOfStock}
                >
                  <FiPlus size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 3. FIXED BOTTOM ACTION BAR ===== */}
        <div className={styles.footerActions}>
          {(mode === 'all' || mode === 'cart') && (
            <button
              type="button"
              className={`${styles.addCartBtn} ${mode === 'cart' ? styles.fullWidthBtn : ''}`}
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              <FiShoppingCart size={16} />
              <span>{isOutOfStock ? 'Hết hàng' : mode === 'cart' ? 'Thêm vào giỏ hàng' : 'Thêm giỏ'}</span>
            </button>
          )}

          {(mode === 'all' || mode === 'buy') && (
            <button
              type="button"
              className={`${styles.buyNowBtn} ${mode === 'buy' ? styles.fullWidthBtn : ''}`}
              onClick={handleBuyNow}
              disabled={isOutOfStock}
            >
              <FiZap size={16} />
              <span>{isOutOfStock ? 'Tạm hết hàng' : 'Mua ngay'}</span>
            </button>
          )}
        </div>
      </div>
    </div>

      {/* ===== FULLSCREEN LIGHTBOX MODAL ===== */}
      {isLightboxOpen && (
        <div
          className={styles.lightboxOverlay}
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            type="button"
            className={styles.closeLightboxBtn}
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Đóng ảnh phóng to"
            title="Đóng (Esc)"
          >
            <FiX size={24} />
          </button>

          <div
            className={styles.lightboxContent}
            onClick={(e) => e.stopPropagation()}
          >
            {isVideoUrl(images[activeImageIndex] || images[0]) ? (
              <video
                src={images[activeImageIndex] || images[0]}
                controls
                autoPlay
                playsInline
                className={styles.lightboxImg}
                style={{ maxHeight: '90vh', maxWidth: '90vw' }}
              />
            ) : (
              <img
                src={images[activeImageIndex] || images[0]}
                alt={product.name}
                className={styles.lightboxImg}
              />
            )}

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className={`${styles.lightboxNavBtn} ${styles.lightboxNavPrev}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                  }}
                  aria-label="Ảnh trước"
                  title="Ảnh trước"
                >
                  <FiChevronLeft size={24} />
                </button>

                <button
                  type="button"
                  className={`${styles.lightboxNavBtn} ${styles.lightboxNavNext}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                  }}
                  aria-label="Ảnh sau"
                  title="Ảnh sau"
                >
                  <FiChevronRight size={24} />
                </button>

                <div className={styles.lightboxIndicator}>
                  {activeImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}