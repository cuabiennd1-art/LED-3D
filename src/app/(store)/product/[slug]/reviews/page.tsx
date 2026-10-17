'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FiArrowLeft,
  FiChevronLeft,
  FiStar,
  FiThumbsUp,
  FiUploadCloud,
  FiX,
  FiCheckCircle,
  FiEdit3,
  FiCamera,
  FiMessageSquare,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api';
import { compressImage } from '@/lib/image-utils';
import styles from './page.module.css';

interface ReviewItem {
  _id: string;
  author: string;
  avatar?: string;
  rating: number;
  variantTitle?: string;
  comment: string;
  images?: string[];
  likes: number;
  verified: boolean;
  reply?: {
    content: string;
    createdAt: string;
  };
  createdAt: string;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  countByStar: Record<string, number>;
  withImagesCount: number;
  productName: string;
}

const EMOTION_LABELS: Record<number, string> = {
  1: '1★ Rất không hài lòng',
  2: '2★ Không hài lòng',
  3: '3★ Bình thường',
  4: '4★ Hài lòng',
  5: '5★ Rất tuyệt vời',
};

const QUICK_TAGS = [
  'Chất lượng sản phẩm tuyệt vời 🌟',
  'Đóng gói hàng cẩn thận 📦',
  'Giao hàng siêu nhanh chóng 🚀',
  'Đáng tiền 💯',
  'Tư vấn nhiệt tình 💬',
];

export default function ProductReviewsPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    averageRating: 5.0,
    totalReviews: 0,
    countByStar: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
    withImagesCount: 0,
    productName: '',
  });

  const [loading, setLoading] = useState(true);
  const [activeFilterStar, setActiveFilterStar] = useState<string>('all'); // 'all' | '5' | '4' | '3' | '2' | '1' | 'hasImage'

  // Handle Safe Back Navigation
  const handleBack = () => {
    const fallbackUrl = slug ? `/product/${slug}` : '/';
    if (typeof window !== 'undefined') {
      const hasSameOriginReferrer =
        Boolean(document.referrer) &&
        (document.referrer.startsWith(window.location.origin) ||
          document.referrer.includes(window.location.host));

      if (hasSameOriginReferrer) {
        router.back();
        return;
      }

      const isExternalReferrer =
        Boolean(document.referrer) &&
        !document.referrer.includes(window.location.host);

      if (isExternalReferrer || window.history.length <= 1) {
        router.push(fallbackUrl);
        return;
      }

      router.back();
      return;
    }
    router.push(fallbackUrl);
  };

  // Modal State
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [authorInput, setAuthorInput] = useState('');
  const [variantInput, setVariantInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Fetch Product Data
  useEffect(() => {
    async function loadProduct() {
      if (!slug) return;
      try {
        const res = await apiFetch(`/api/products/${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (data.success && data.data) {
          setProduct(data.data);
        } else {
          const sRes = await apiFetch(`/api/products?limit=1&search=${encodeURIComponent(slug)}`);
          const sData = await sRes.json();
          if (sData.success && Array.isArray(sData.data) && sData.data.length > 0) {
            setProduct(sData.data[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching product for reviews:', err);
      }
    }
    loadProduct();
  }, [slug]);

  // Fetch Reviews Data
  const loadReviews = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      let url = `/api/reviews?slug=${encodeURIComponent(slug)}&limit=50`;
      if (activeFilterStar === 'hasImage') {
        url += '&hasImage=true';
      } else if (['1', '2', '3', '4', '5'].includes(activeFilterStar)) {
        url += `&star=${activeFilterStar}`;
      }

      const res = await apiFetch(url);
      const data = await res.json();

      if (data.success) {
        setReviews(data.data || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [slug, activeFilterStar]);

  // Handle Photo Upload (Hỗ trợ nhiều ảnh, nén ảnh nhẹ, fallback tức thì)
  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const remainingSlots = 5 - uploadedImages.length;
    if (remainingSlots <= 0) {
      toast.error('Bạn chỉ có thể tải lên tối đa 5 hình ảnh');
      return;
    }

    const filesToUpload = Array.from(fileList).slice(0, remainingSlots);
    setIsUploading(true);

    try {
      const newUrls: string[] = [];

      for (const file of filesToUpload) {
        let clientDataUrl = '';
        let uploadBlob: Blob = file;

        try {
          const compressed = await compressImage(file, 1200, 0.8);
          clientDataUrl = compressed.dataUrl;
          uploadBlob = compressed.blob;
        } catch (compErr) {
          console.warn('Image compression skipped:', compErr);
        }

        let uploadedUrl = '';

        try {
          const formData = new FormData();
          formData.append('file', uploadBlob, file.name);

          const res = await apiFetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data?.url) {
              uploadedUrl = data.data.url;
            }
          }
        } catch (netErr) {
          console.warn('Direct upload fetch failed, fallback to client preview:', netErr);
        }

        const finalUrl = uploadedUrl || clientDataUrl;
        if (finalUrl) {
          newUrls.push(finalUrl);
        }
      }

      if (newUrls.length > 0) {
        setUploadedImages((prev) => [...prev, ...newUrls].slice(0, 5));
        toast.success(`Đã thêm ${newUrls.length} hình ảnh thành công!`);
      } else {
        toast.error('Không thể tải ảnh lên. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Có lỗi xảy ra khi tải ảnh lên');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authorInput.trim()) {
      toast.error('Vui lòng nhập tên của bạn');
      return;
    }

    if (!commentInput.trim()) {
      toast.error('Vui lòng nhập nội dung đánh giá nhận xét');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          author: authorInput.trim(),
          rating: ratingInput,
          variantTitle: variantInput.trim(),
          comment: commentInput.trim(),
          images: uploadedImages,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Gửi đánh giá thành công! Cảm ơn nhận xét của bạn.');
        setIsWriteModalOpen(false);
        setCommentInput('');
        setUploadedImages([]);
        loadReviews();
      } else {
        toast.error(data.message || 'Gửi đánh giá thất bại');
      }
    } catch (err) {
      toast.error('Lỗi kết nối khi gửi đánh giá');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Like Review
  const handleLikeReview = async (reviewId: string) => {
    try {
      const res = await apiFetch('/api/reviews/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId }),
      });
      const data = await res.json();
      if (data.success) {
        setReviews((prev) =>
          prev.map((r) => (r._id === reviewId ? { ...r, likes: r.likes + 1 } : r))
        );
        toast.success('Cảm ơn bạn đã thích đánh giá này!');
      }
    } catch (err) {
      console.error('Error liking review:', err);
    }
  };

  // Format Helpers
  const formatSold = (num: number) => {
    if (!num) return '0';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(num);
  };

  const maskName = (name: string) => {
    if (!name) return 'Khách hàng';
    const trimmed = name.trim();
    if (trimmed.length <= 2) return trimmed + '***';
    return trimmed[0] + '***' + trimmed[trimmed.length - 1];
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. TOP NAV */}
      <div className={styles.topNav}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={handleBack}
          aria-label="Quay lại"
          title="Quay lại"
        >
          <FiChevronLeft size={22} />
        </button>
        <h1 className={styles.pageTitle}>Đánh Giá Sản Phẩm</h1>
        <div className={styles.headerSpacer} />
      </div>

      {/* 2. PRODUCT MINI BAR */}
      {product && (
        <div
          className={styles.productBar}
          onClick={() => router.push(`/product/${slug}`)}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          aria-label={`Xem chi tiết ${product.name}`}
          title="Bấm để xem chi tiết sản phẩm"
        >
          <img
            src={product.images?.[0] || 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400'}
            alt={product.name}
            className={styles.productThumb}
          />
          <div className={styles.productBarInfo}>
            <p className={styles.productBarName}>{product.name}</p>
            <span className={styles.productBarPrice}>
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                product.salePrice || product.price
              )}
            </span>
          </div>
        </div>
      )}

      {/* 3. SCORE SUMMARY & RATING BREAKDOWN CARD */}
      <div className={styles.scoreCard}>
        <div className={styles.scoreHero}>
          <div className={styles.bigScore}>
            {stats.averageRating || '5.0'}
            <span className={styles.scoreMax}>/5</span>
          </div>
          <div className={styles.scoreDetails}>
            <div className={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <FiStar
                  key={i}
                  size={16}
                  style={{
                    fill: i <= Math.round(stats.averageRating) ? '#fbbf24' : 'none',
                    color: '#fbbf24',
                  }}
                />
              ))}
            </div>
            <span className={styles.totalReviewsText}>
              Dựa trên {stats.totalReviews} đánh giá thực tế
            </span>
          </div>
        </div>

        {/* 4. FILTER PILLS */}
        <div className={styles.filterPills}>
          <button
            type="button"
            className={`${styles.filterPill} ${activeFilterStar === 'all' ? styles.activeFilterPill : ''}`}
            onClick={() => setActiveFilterStar('all')}
          >
            Tất cả ({stats.totalReviews})
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${activeFilterStar === '5' ? styles.activeFilterPill : ''}`}
            onClick={() => setActiveFilterStar('5')}
          >
            5 Sao ({stats.countByStar?.['5'] || 0})
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${activeFilterStar === '4' ? styles.activeFilterPill : ''}`}
            onClick={() => setActiveFilterStar('4')}
          >
            4 Sao ({stats.countByStar?.['4'] || 0})
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${activeFilterStar === '3' ? styles.activeFilterPill : ''}`}
            onClick={() => setActiveFilterStar('3')}
          >
            3 Sao ({stats.countByStar?.['3'] || 0})
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${activeFilterStar === '2' ? styles.activeFilterPill : ''}`}
            onClick={() => setActiveFilterStar('2')}
          >
            2 Sao ({stats.countByStar?.['2'] || 0})
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${activeFilterStar === '1' ? styles.activeFilterPill : ''}`}
            onClick={() => setActiveFilterStar('1')}
          >
            1 Sao ({stats.countByStar?.['1'] || 0})
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${activeFilterStar === 'hasImage' ? styles.activeFilterPill : ''}`}
            onClick={() => setActiveFilterStar('hasImage')}
          >
            Có Hình Ảnh ({stats.withImagesCount || 0})
          </button>
        </div>

        {/* Primary Write Review CTA Button */}
        <button
          type="button"
          className={styles.primaryWriteBtn}
          onClick={() => setIsWriteModalOpen(true)}
        >
          <FiEdit3 size={16} />
          <span>Viết Đánh Giá Sản Phẩm</span>
        </button>
      </div>

      {/* 5. REVIEWS LIST */}
      {loading ? (
        <div className={styles.emptyBox}>
          <p>Đang tải danh sách đánh giá...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className={styles.emptyBox}>
          <FiMessageSquare className={styles.emptyIcon} />
          <p style={{ margin: 0, fontWeight: 600 }}>Chưa có đánh giá nào phù hợp với bộ lọc này.</p>
          <p style={{ fontSize: '0.8125rem', margin: 0 }}>Hãy là người đầu tiên để lại nhận xét cho sản phẩm nhé!</p>
        </div>
      ) : (
        <div className={styles.reviewsList}>
          {reviews.map((rev) => (
            <div key={rev._id} className={styles.reviewItem}>
              <div className={styles.reviewHeader}>
                <img
                  src={
                    rev.avatar ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(rev.author)}`
                  }
                  alt={rev.author}
                  className={styles.avatar}
                />
                <div className={styles.authorMeta}>
                  <div className={styles.authorName}>
                    <span>{maskName(rev.author)}</span>
                    {rev.verified && (
                      <span className={styles.verifiedBadge}>
                        <FiCheckCircle size={11} /> Đã mua hàng
                      </span>
                    )}
                  </div>
                  <span className={styles.reviewDate}>{formatDate(rev.createdAt)}</span>
                </div>
              </div>

              {/* Stars & Variant */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <FiStar
                      key={s}
                      size={13}
                      style={{
                        fill: s <= rev.rating ? '#fbbf24' : 'none',
                        color: '#fbbf24',
                      }}
                    />
                  ))}
                </div>
              </div>

              {rev.variantTitle && (
                <div className={styles.variantTag}>Phân loại: {rev.variantTitle}</div>
              )}

              {/* Comment Text */}
              <p className={styles.commentBody}>{rev.comment}</p>

              {/* Attached Photos Grid */}
              {Array.isArray(rev.images) && rev.images.length > 0 && (
                <div className={styles.reviewImagesGrid}>
                  {rev.images.map((imgUrl, imgIdx) => (
                    <img
                      key={imgIdx}
                      src={imgUrl}
                      alt={`Ảnh đánh giá ${imgIdx + 1}`}
                      className={styles.reviewImgThumb}
                      onClick={() => setLightboxImage(imgUrl)}
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Shop Official Response */}
              {rev.reply?.content && (
                <div className={styles.shopReplyBox}>
                  <span className={styles.shopReplyTitle}>Phản hồi của Người Bán:</span>
                  <p className={styles.shopReplyContent}>{rev.reply.content}</p>
                </div>
              )}

              {/* Helpful Like Button */}
              <div className={styles.reviewFooter}>
                <button
                  type="button"
                  className={styles.likeBtn}
                  onClick={() => handleLikeReview(rev._id)}
                >
                  <FiThumbsUp size={12} />
                  <span>Hữu ích ({rev.likes || 0})</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WRITE REVIEW MODAL */}
      {isWriteModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsWriteModalOpen(false)}>
          <div className={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Đánh Giá Sản Phẩm</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsWriteModalOpen(false)}
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className={styles.modalBody}>
              {/* Interactive Star Rating Selector */}
              <div className={styles.ratingSelectorWrap}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Chất lượng sản phẩm
                </span>
                <div className={styles.starPicker}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`${styles.starBtn} ${star <= ratingInput ? styles.starBtnFilled : ''}`}
                      onClick={() => setRatingInput(star)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <span className={styles.ratingEmotionLabel}>{EMOTION_LABELS[ratingInput]}</span>
              </div>

              {/* Author Name */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Họ và tên của bạn *</label>
                <input
                  type="text"
                  className={styles.inputField}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={authorInput}
                  onChange={(e) => setAuthorInput(e.target.value)}
                  required
                />
              </div>

              {/* Variant Selector */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Phân loại hàng đã mua (tùy chọn)</label>
                {product?.variants && product.variants.length > 0 ? (
                  <select
                    className={styles.inputField}
                    value={variantInput}
                    onChange={(e) => setVariantInput(e.target.value)}
                  >
                    <option value="">-- Chọn phân loại sản phẩm --</option>
                    {product.variants.map((v: any, idx: number) => (
                      <option key={idx} value={v.title || v.name || `Phân loại ${idx + 1}`}>
                        {v.title || v.name || `Phân loại ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className={styles.inputField}
                    placeholder="Ví dụ: Màu Đen, Size L..."
                    value={variantInput}
                    onChange={(e) => setVariantInput(e.target.value)}
                  />
                )}
              </div>

              {/* Quick Tags Suggestions */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Gợi ý nhận xét nhanh</label>
                <div className={styles.quickTags}>
                  {QUICK_TAGS.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={styles.quickTagBtn}
                      onClick={() => {
                        setCommentInput((prev) => (prev ? `${prev}. ${tag}` : tag));
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment Textarea */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nhận xét chi tiết *</label>
                <textarea
                  className={styles.textareaField}
                  placeholder="Hãy chia sẻ trải nghiệm sử dụng thực tế của bạn về sản phẩm này nhé..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  required
                />
              </div>

              {/* Upload Photos */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Thêm hình ảnh thực tế ({uploadedImages.length}/5)
                </label>
                <div className={styles.uploadedPhotosGrid}>
                  {uploadedImages.map((url, i) => (
                    <div key={i} className={styles.uploadedThumbWrap}>
                      <img src={url} alt={`Upload ${i + 1}`} className={styles.uploadedThumb} />
                      <button
                        type="button"
                        className={styles.removeThumbBtn}
                        onClick={() => handleRemovePhoto(i)}
                        title="Xóa ảnh"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {uploadedImages.length < 5 && (
                    <label
                      htmlFor="allReviewsPhotoInput"
                      className={styles.uploadPhotoBtn}
                      style={{
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                        opacity: isUploading ? 0.7 : 1,
                      }}
                      title="Thêm ảnh chụp thực tế (tối đa 5 ảnh)"
                    >
                      <FiCamera size={18} />
                      <span>{isUploading ? 'Đang tải...' : 'Thêm ảnh'}</span>
                    </label>
                  )}
                  <input
                    id="allReviewsPhotoInput"
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    multiple
                    disabled={isUploading}
                    onClick={(e) => {
                      (e.target as HTMLInputElement).value = '';
                    }}
                    onChange={handleUploadPhoto}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi Đánh Giá Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. LIGHTBOX MODAL */}
      {lightboxImage && (
        <div className={styles.lightboxOverlay} onClick={() => setLightboxImage(null)}>
          <button
            type="button"
            className={styles.closeLightboxBtn}
            onClick={() => setLightboxImage(null)}
          >
            ✕
          </button>
          <img src={lightboxImage} alt="Ảnh phóng to" className={styles.lightboxImg} />
        </div>
      )}
    </div>
  );
}
