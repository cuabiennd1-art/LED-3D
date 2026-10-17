'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiX, FiExternalLink, FiEdit2, FiBox, FiTag, FiCalendar, FiDollarSign } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatPrice, formatDate } from '@/lib/utils';
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

  if (!productId) return null;

  const discountPercent =
    product?.salePrice && product.salePrice < product.price
      ? Math.round(((product.price - product.salePrice) / product.price) * 100)
      : null;

  const imagesList = product?.images && product.images.length > 0 ? product.images : ['/file.svg'];
  const activeImage = imagesList[selectedImgIndex] || imagesList[0];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h2 className={styles.title}>{loading ? 'Đang tải thông tin...' : product?.name}</h2>
            {product && (
              <>
                <span className={product.status === 'active' ? styles.badgeActive : styles.badgeHidden}>
                  {product.status === 'active' ? 'Đang mở bán' : 'Đã ẩn'}
                </span>
                {product.isFeatured && <span className={styles.badgeFeatured}>★ Nổi bật</span>}
              </>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Đóng">
            <FiX />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.body}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
                <Skeleton type="rect" height={320} borderRadius="10px" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Skeleton type="text" height={30} width="80%" />
                  <Skeleton type="rect" height={80} borderRadius="10px" />
                  <Skeleton type="rect" height={100} borderRadius="10px" />
                </div>
              </div>
              <Skeleton type="table-row" count={3} />
            </div>
          ) : product ? (
            <>
              {/* Top Grid: Gallery & Information */}
              <div className={styles.topGrid}>
                {/* Left: Image Gallery */}
                <div className={styles.gallery}>
                  <div className={styles.mainImageWrapper}>
                    <LazyImage
                      src={activeImage}
                      alt={product.name}
                      aspectRatio="1 / 1"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  {imagesList.length > 1 && (
                    <div className={styles.thumbList}>
                      {imagesList.map((img: string, idx: number) => (
                        <div
                          key={idx}
                          className={`${styles.thumbItem} ${selectedImgIndex === idx ? styles.activeThumb : ''}`}
                          onClick={() => setSelectedImgIndex(idx)}
                        >
                          <img
                            src={img}
                            alt={`Thumbnail ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Info Column */}
                <div className={styles.infoCol}>
                  {/* Price Card */}
                  <div className={styles.priceCard}>
                    <span className={styles.currentPrice}>
                      {formatPrice(product.salePrice || product.price)}
                    </span>
                    {product.salePrice && (
                      <>
                        <span className={styles.oldPrice}>{formatPrice(product.price)}</span>
                        {discountPercent && <span className={styles.discountBadge}>Tiết kiệm {discountPercent}%</span>}
                      </>
                    )}
                  </div>

                  {/* Meta Details */}
                  <div className={styles.metaList}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Mã định danh (ID)</span>
                      <span className={styles.metaValue} style={{ fontSize: '0.8125rem' }}>{product._id}</span>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Đường dẫn (Slug)</span>
                      <span className={styles.metaValue} style={{ color: 'var(--primary, #3b82f6)' }}>
                        {product.slug || '-'}
                      </span>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Danh mục</span>
                      <span className={styles.metaValue}>
                        {product.category?.name || product.category || 'Chưa phân loại'}
                      </span>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Ngày khởi tạo</span>
                      <span className={styles.metaValue}>
                        {product.createdAt ? formatDate(product.createdAt) : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className={styles.statsRow}>
                    <div className={styles.statBox}>
                      {(() => {
                        const totalStock =
                          Array.isArray(product.variants) && product.variants.length > 0
                            ? product.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0)
                            : Number(product.stock) || 0;
                        return (
                          <span className={styles.statNum} style={{ color: totalStock < 10 ? '#ef4444' : '#10b981' }}>
                            {totalStock}
                          </span>
                        );
                      })()}
                      <span className={styles.statTitle}>Tồn kho hiện tại</span>
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
                      <span className={styles.statTitle}>Phân loại biến thể</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variants Section */}
              {product.variants && product.variants.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Bảng Chi Tiết Biến Thể Sản Phẩm ({product.variants.length})</h3>
                  <div className={styles.tableWrap}>
                    <table className={styles.variantTable}>
                      <thead>
                        <tr>
                          <th>Tên phân loại / Biến thể</th>
                          <th>Mã SKU</th>
                          <th>Giá biến thể</th>
                          <th>Tồn kho</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.variants.map((v: any, i: number) => {
                          const attrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || {});
                          const title = v.title || v.name || Object.values(attrs).filter(Boolean).join(' / ') || [v.color, v.size].filter(Boolean).join(' / ') || `Biến thể ${i + 1}`;

                          return (
                            <tr key={i}>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                  <strong className={styles.variantTitle}>{title}</strong>
                                  {Object.keys(attrs).length > 0 ? (
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                      {Object.entries(attrs).map(([k, val]: any) => (
                                        <span key={k} className={styles.attributeBadge}>
                                          {k}: {val}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (v.color || v.size) ? (
                                    <span className={styles.attributeFallback}>
                                      {[v.color, v.size].filter(Boolean).join(' - ')}
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className={styles.skuCell}>
                                {v.sku || '-'}
                              </td>
                              <td style={{ color: 'var(--primary, #3b82f6)', fontWeight: 600 }}>
                                {formatPrice(v.salePrice || v.price || product.salePrice || product.price)}
                                {v.salePrice && v.price && v.salePrice < v.price && (
                                  <span style={{ textDecoration: 'line-through', color: 'var(--text-muted, #64748b)', fontSize: '0.75rem', marginLeft: 6 }}>
                                    {formatPrice(v.price)}
                                  </span>
                                )}
                              </td>
                              <td>
                                <span style={{ color: (v.stock || 0) < 5 ? '#ef4444' : 'var(--text-main, #ffffff)', fontWeight: 600 }}>
                                  {v.stock ?? 0} sản phẩm
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Description Section */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Mô Tả Sản Phẩm</h3>
                {product.description?.trim() ? (
                  /<\/?(p|div|br|img|video|source|iframe|h[1-6]|ul|ol|li|span|table|hr|s|blockquote|strong|b|em|i)\b/i.test(product.description) ? (
                    <div
                      className={styles.descriptionBox}
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                  ) : (
                    <div className={styles.descriptionBox} style={{ whiteSpace: 'pre-line' }}>
                      {product.description}
                    </div>
                  )
                ) : (
                  <div className={styles.descriptionBox} style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Chưa có mô tả chi tiết cho sản phẩm này.
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        {product && (
          <div className={styles.footer}>
            <Link
              href={`/product/${product.slug || product._id}`}
              target="_blank"
              className={styles.viewStoreBtn}
            >
              <FiExternalLink /> Xem trên Cửa Hàng
            </Link>

            <div className={styles.btnGroup}>
              <Link href={`/admin/products/${product._id}/edit`} className={styles.editBtn}>
                <FiEdit2 /> Chỉnh Sửa Sản Phẩm
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
