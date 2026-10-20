'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiX, FiExternalLink, FiEdit2, FiBox, FiTag, FiCalendar, FiDollarSign } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatPrice, formatDate, sanitizeAndTransformRichDescription, isVideoUrl } from '@/lib/utils';
import LazyImage from '@/components/common/LazyImage';
import Skeleton from '@/components/common/Skeleton';
import { apiFetch } from '@/lib/api';
import styles from './ProductDetailModal.module.css';

interface ProductDetailModalProps {
  productId: string | null;
  onClose: () => void;
}

export default function ProductDetailModal({ productId, onClose }: ProductDetailModalProps) {
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setSelectedImgIndex(0);
        const res = await apiFetch(`/api/products/${productId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setProduct(data.data);
        } else {
          toast.error(data.message || 'Không tìm thấy thông tin sản phẩm');
          onClose();
        }
      } catch (e) {
        toast.error('Lỗi khi tải chi tiết sản phẩm');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [productId]);

  const handleCopySku = (sku: string) => {
    if (!sku) return;
    navigator.clipboard.writeText(sku);
    toast.success(`Đã sao chép SKU: ${sku}`);
  };

  if (!productId) return null;

  const discountPercent =
    product?.salePrice && product.salePrice < product.price
      ? Math.round(((product.price - product.salePrice) / product.price) * 100)
      : null;

  const imagesList = product?.images && product.images.length > 0 ? product.images : ['/file.svg'];
  const activeImage = imagesList[selectedImgIndex] || imagesList[0];

  const totalStock =
    Array.isArray(product?.variants) && product.variants.length > 0
      ? product.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0)
      : Number(product?.stock) || 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header: Clean 1-line bar */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerTitle}>Chi tiết sản phẩm</span>
            {product && (
              <span className={product.status === 'active' ? styles.badgeActive : styles.badgeHidden}>
                {product.status === 'active' ? 'Đang mở bán' : 'Đã ẩn'}
              </span>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Đóng">
            <FiX size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.body}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Skeleton type="text" height={28} width="70%" />
              <div className={styles.topGrid}>
                <Skeleton type="rect" height={220} borderRadius="10px" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Skeleton type="rect" height={60} borderRadius="8px" />
                  <Skeleton type="rect" height={70} borderRadius="8px" />
                  <Skeleton type="rect" height={80} borderRadius="8px" />
                </div>
              </div>
              <Skeleton type="table-row" count={3} />
            </div>
          ) : product ? (
            <>
              {/* Product Heading: Name + Category badge */}
              <div className={styles.productHeading}>
                <h2 className={styles.productName}>{product.name}</h2>
                <div className={styles.productBadges}>
                  {product.category && (
                    <span className={styles.categoryBadge}>
                      📁 {product.category?.name || product.category}
                    </span>
                  )}
                  {product.isFeatured && (
                    <span className={styles.badgeFeatured}>★ Nổi bật</span>
                  )}
                </div>
              </div>

              {/* Top Grid: Gallery & Information */}
              <div className={styles.topGrid}>
                {/* Left: Image / Video Gallery */}
                <div className={styles.gallery}>
                  <div className={styles.mainImageWrapper}>
                    {isVideoUrl(activeImage) ? (
                      <video
                        src={activeImage}
                        controls
                        autoPlay
                        muted
                        playsInline
                        className={styles.mainVideo}
                      />
                    ) : (
                      <LazyImage
                        src={activeImage}
                        alt={product.name}
                        aspectRatio="1 / 1"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    )}
                  </div>

                  {imagesList.length > 1 && (
                    <div className={styles.thumbList}>
                      {imagesList.map((img: string, idx: number) => (
                        <div
                          key={idx}
                          className={`${styles.thumbItem} ${selectedImgIndex === idx ? styles.activeThumb : ''}`}
                          onClick={() => setSelectedImgIndex(idx)}
                        >
                          {isVideoUrl(img) ? (
                            <div className={styles.videoThumbBadge}>▶ Video</div>
                          ) : (
                            <img
                              src={img}
                              alt={`Thumbnail ${idx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Info Column */}
                <div className={styles.infoCol}>
                  {/* Price Card */}
                  <div className={styles.priceCard}>
                    <div className={styles.priceRow}>
                      <span className={styles.currentPrice}>
                        {formatPrice(product.salePrice || product.price)}
                      </span>
                      {product.salePrice && product.salePrice < product.price && (
                        <span className={styles.oldPrice}>{formatPrice(product.price)}</span>
                      )}
                    </div>
                    {discountPercent && (
                      <span className={styles.discountBadge}>Tiết kiệm {discountPercent}%</span>
                    )}
                  </div>

                  {/* Stats Row */}
                  <div className={styles.statsRow}>
                    <div className={styles.statBox}>
                      <span className={styles.statNum} style={{ color: totalStock < 10 ? '#ef4444' : '#10b981' }}>
                        {totalStock}
                      </span>
                      <span className={styles.statTitle}>Tồn kho</span>
                    </div>

                    <div className={styles.statBox}>
                      <span className={styles.statNum} style={{ color: 'var(--primary, #3b82f6)' }}>
                        {product.soldCount ?? 0}
                      </span>
                      <span className={styles.statTitle}>Đã bán</span>
                    </div>

                    <div className={styles.statBox}>
                      <span className={styles.statNum}>
                        {product.variants ? product.variants.length : 0}
                      </span>
                      <span className={styles.statTitle}>Biến thể</span>
                    </div>
                  </div>

                  {/* Meta Details */}
                  <div className={styles.metaList}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Danh mục</span>
                      <span className={styles.metaValue}>
                        {product.category?.name || product.category || 'Chưa phân loại'}
                      </span>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Ngày tạo</span>
                      <span className={styles.metaValue}>
                        {product.createdAt ? formatDate(product.createdAt) : '-'}
                      </span>
                    </div>

                    <div className={styles.metaItemFull}>
                      <span className={styles.metaLabel}>Đường dẫn (Slug)</span>
                      <span className={styles.slugValue} title={product.slug}>
                        /{product.slug || product._id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variants Section */}
              {product.variants && product.variants.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    Bảng phân loại biến thể ({product.variants.length})
                  </h3>

                  {/* Desktop Table View (>= 769px) */}
                  <div className={styles.desktopTableWrap}>
                    <table className={styles.variantTable}>
                      <thead>
                        <tr>
                          <th style={{ width: '40%' }}>Tên biến thể</th>
                          <th style={{ width: '30%' }}>Mã SKU</th>
                          <th style={{ width: '18%', textAlign: 'right' }}>Giá bán</th>
                          <th style={{ width: '12%', textAlign: 'center' }}>Tồn kho</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.variants.map((v: any, i: number) => {
                          const attrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || {});
                          const title = v.title || v.name || Object.values(attrs).filter(Boolean).join(' / ') || [v.color, v.size].filter(Boolean).join(' / ') || `Biến thể ${i + 1}`;
                          const stockCount = Number(v.stock) || 0;
                          const variantPrice = v.salePrice || v.price || product.salePrice || product.price;

                          // Deduplicate attrs if only 1 attr and val === title
                          const showAttrs = Object.entries(attrs).filter(([k, val]: any) => {
                            if (Object.keys(attrs).length === 1 && String(val).trim() === String(title).trim()) {
                              return false;
                            }
                            return true;
                          });

                          return (
                            <tr key={i}>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                  <strong className={styles.variantTitle}>{title}</strong>
                                  {showAttrs.length > 0 && (
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                      {showAttrs.map(([k, val]: any) => (
                                        <span key={k} className={styles.attributeBadge}>
                                          {k}: {val}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>
                                {v.sku ? (
                                  <span
                                    className={styles.skuBadge}
                                    title={`Bấm để sao chép SKU: ${v.sku}`}
                                    onClick={() => handleCopySku(v.sku)}
                                  >
                                    {v.sku}
                                  </span>
                                ) : (
                                  <span className={styles.skuEmpty}>-</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <span className={styles.tablePrice}>
                                  {formatPrice(variantPrice)}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span
                                  className={
                                    stockCount <= 0
                                      ? styles.tableStockOut
                                      : stockCount < 5
                                        ? styles.tableStockLow
                                        : styles.tableStockOk
                                  }
                                >
                                  {stockCount}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Fluid Cards View (<= 768px - ZERO horizontal scroll) */}
                  <div className={styles.mobileVariantList}>
                    {product.variants.map((v: any, i: number) => {
                      const attrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || {});
                      const title = v.title || v.name || Object.values(attrs).filter(Boolean).join(' / ') || [v.color, v.size].filter(Boolean).join(' / ') || `Biến thể ${i + 1}`;
                      const stockCount = Number(v.stock) || 0;
                      const variantPrice = v.salePrice || v.price || product.salePrice || product.price;

                      return (
                        <div key={i} className={styles.mobileVariantCard}>
                          <div className={styles.mobileVariantTop}>
                            <span className={styles.mobileVariantName}>{title}</span>
                            <span
                              className={
                                stockCount <= 0
                                  ? styles.mobileStockOut
                                  : stockCount < 5
                                    ? styles.mobileStockLow
                                    : styles.mobileStockOk
                              }
                            >
                              {stockCount <= 0 ? 'Hết hàng' : `Kho: ${stockCount}`}
                            </span>
                          </div>

                          {Object.keys(attrs).length > 0 && (
                            <div className={styles.mobileVariantAttrs}>
                              {Object.entries(attrs).map(([k, val]: any) => (
                                <span key={k} className={styles.attributeBadge}>
                                  {k}: {val}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className={styles.mobileVariantBottom}>
                            <div className={styles.mobileVariantSku}>
                              <span className={styles.mobileSkuLabel}>SKU:</span>
                              <span className={styles.mobileSkuCode}>{v.sku || '-'}</span>
                            </div>
                            <div className={styles.mobileVariantPrice}>
                              {formatPrice(variantPrice)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description Section */}
              {product.description?.trim() && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Mô tả sản phẩm</h3>
                  <div
                    className={styles.descriptionBox}
                    dangerouslySetInnerHTML={{ __html: sanitizeAndTransformRichDescription(product.description) }}
                  />
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer: Compact 1-Row */}

      </div>
    </div>
  );
}
