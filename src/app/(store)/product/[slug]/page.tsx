'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiChevronLeft,
  FiChevronRight,
  FiShare2,
  FiShoppingCart,
  FiStar,
  FiPlus,
  FiMinus,
  FiMessageSquare,
  FiTruck,
  FiTag,
  FiShield,
  FiCheck,
  FiAlertCircle,
  FiEdit3,
  FiX,
  FiCamera,
  FiCheckCircle,
  FiZap,
  FiChevronDown,
  FiChevronUp,
  FiPackage,
  FiRefreshCw,
  FiMaximize2,
  FiUser,
  FiHome,
} from 'react-icons/fi';
import ZaloIcon from '@/components/ui/ZaloIcon';
import toast from 'react-hot-toast';
import { formatPrice, sanitizeAndTransformRichDescription } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import StoreLoading from '@/components/store/StoreLoading';
import BannerNotice from '@/components/common/BannerNotice';
import VoucherCollectionBar from '@/components/store/VoucherCollectionBar';
import StoreProductCard, { ProductItem } from '@/components/store/home/StoreProductCard';
import ProductDetailModal from '@/components/store/ProductDetailModal';
import { apiFetch } from '@/lib/api';
import { compressImage } from '@/lib/image-utils';
import {
  IProductOption,
  IVariantItem,
  findMatchingVariant,
} from '@/lib/variant-helper';
import styles from './page.module.css';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { cartCount, addToCart, buyNow } = useCart();
  const { theme } = useTheme();
  const { user } = useCustomerAuth();

  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Format Zalo 1:1 Chat URL from Admin Settings
  const cleanZaloPhone = useMemo(() => {
    return (theme?.socialLinks?.zaloPhone || '').replace(/[^0-9]/g, '');
  }, [theme?.socialLinks?.zaloPhone]);

  const zaloChatUrl = cleanZaloPhone
    ? `https://zalo.me/${cleanZaloPhone}`
    : `/chat?product=${product?.slug || ''}`;

  // Handle Safe Back Navigation
  const handleBack = () => {
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
        router.push('/');
        return;
      }

      router.back();
      return;
    }
    router.push('/');
  };

  // Dynamic Selected Attributes state: { [optionName: string]: string }
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isGalleryPaused, setIsGalleryPaused] = useState(false);



  // Variant Selection Step Modal (Thêm bước chọn loại sản phẩm)
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [variantModalMode, setVariantModalMode] = useState<'all' | 'cart' | 'buy'>('all');
  const [selectedProductForModal, setSelectedProductForModal] = useState<any | null>(null);

  // Related products state ("Có thể bạn cũng thích")
  const [relatedProducts, setRelatedProducts] = useState<ProductItem[]>([]);

  // Expand Modal State (For full description & full reviews view on PC)
  const [isExpandModalOpen, setIsExpandModalOpen] = useState(false);
  const [expandModalTab, setExpandModalTab] = useState<'desc' | 'reviews' | 'related'>('desc');

  // Flash Sale & FOMO state
  const [flashSaleItem, setFlashSaleItem] = useState<any | null>(null);
  const [flashCountdown, setFlashCountdown] = useState({ hours: '00', minutes: '00', seconds: '00' });
  const [fomoSettings, setFomoSettings] = useState<any>(null);

  // Reviews preview state
  const [reviewsPreview, setReviewsPreview] = useState<any[]>([]);
  const [reviewsStats, setReviewsStats] = useState<{ averageRating: number; totalReviews: number }>({
    averageRating: 5.0,
    totalReviews: 0,
  });
  const [isReviewsExpanded, setIsReviewsExpanded] = useState(false);

  // Chỉ hiển thị 10 đánh giá mới nhất (ưu tiên số sao cao), bấm Xem thêm để mở rộng
  const displayedReviews = useMemo(() => {
    if (isReviewsExpanded) return reviewsPreview;
    return reviewsPreview.slice(0, 10);
  }, [isReviewsExpanded, reviewsPreview]);

  // Write Review Modal State
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [authorInput, setAuthorInput] = useState('');
  const [variantInput, setVariantInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const reviewFileInputRef = React.useRef<HTMLInputElement | null>(null);

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

  const loadReviewsPreview = async () => {
    if (!params.slug) return;
    try {
      const res = await apiFetch(`/api/reviews?slug=${encodeURIComponent(params.slug as string)}&limit=100`);
      const data = await res.json();
      if (data.success) {
        // Sắp xếp ưu tiên số sao cao nhất trước (5 -> 1), nếu bằng sao thì ưu tiên mới nhất
        const sorted = (data.data || []).sort((a: any, b: any) => {
          const starDiff = (Number(b.rating) || 5) - (Number(a.rating) || 5);
          if (starDiff !== 0) return starDiff;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setReviewsPreview(sorted);
        if (data.stats) {
          setReviewsStats({
            averageRating: data.stats.averageRating || 5.0,
            totalReviews: data.stats.totalReviews || sorted.length,
          });
        }
      }
    } catch (e) {
      console.error('Error loading reviews preview:', e);
    }
  };

  useEffect(() => {
    loadReviewsPreview();
  }, [params.slug]);

  // Handle Photo Upload in Review (Hỗ trợ nhiều ảnh, nén ảnh nhẹ, fallback tức thì)
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
      if (reviewFileInputRef.current) reviewFileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorInput.trim()) {
      toast.error('Vui lòng nhập tên của bạn');
      return;
    }
    if (!commentInput.trim()) {
      toast.error('Vui lòng nhập nội dung đánh giá');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product?._id,
          slug: (params.slug as string) || product?.slug,
          productSlug: product?.slug || (params.slug as string),
          productName: product?.name,
          productImage: product?.images?.[0] || product?.image,
          author: authorInput.trim(),
          rating: ratingInput,
          comment: commentInput.trim(),
          variantTitle: variantInput.trim() || undefined,
          images: uploadedImages,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Cảm ơn bạn! Đánh giá đã được gửi thành công.');
        setIsWriteModalOpen(false);
        setCommentInput('');
        setUploadedImages([]);
        loadReviewsPreview();
      } else {
        toast.error(data.message || 'Không thể gửi đánh giá');
      }
    } catch (err) {
      toast.error('Có lỗi xảy ra khi gửi đánh giá');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch product data & flash sale status
  // Fetch product data & flash sale status
  useEffect(() => {
    const rawSlug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
    if (!rawSlug) return;

    const cleanSlug = String(rawSlug).trim();
    if (cleanSlug === 'undefined' || cleanSlug === 'null' || cleanSlug === '') {
      router.push('/');
      return;
    }

    let isMounted = true;
    setLoading(true);

    const loadData = async (retryCount = 0) => {
      try {
        const [prodRes, fsData, fomoData] = await Promise.all([
          apiFetch(`/api/products/${encodeURIComponent(cleanSlug)}`).catch(() => null),
          apiFetch(`/api/flash-sale`).then((r) => r.json()).catch(() => null),
          apiFetch(`/api/settings/fomo`).then((r) => r.json()).catch(() => null),
        ]);

        let prodData: any = null;
        if (prodRes && prodRes.ok) {
          prodData = await prodRes.json().catch(() => null);
        }

        // Tự động thử lại 1 lần nếu mạng lag hoặc server cold-start
        if ((!prodData || !prodData.success) && retryCount === 0) {
          await new Promise((res) => setTimeout(res, 800));
          if (isMounted) return loadData(1);
        }

        if (!isMounted) return;

        if (prodData && prodData.success && prodData.data) {
          const p = prodData.data;
          setProduct(p);

          // 1. Check if the product itself from API has an active LIVE flash sale
          if (p.flashSale && p.flashSale.isLive) {
            setFlashSaleItem(p.flashSale);
          } else if (p.flashPrice && p.isFlashSale) {
            setFlashSaleItem({
              flashPrice: p.flashPrice,
              originalPrice: p.price,
              isLive: true,
            });
          } else {
            setFlashSaleItem(null);
          }

          // Khách lần đầu vào trang sẽ KHÔNG chọn phân loại luôn
          setSelectedAttributes({});

          // 2. Cross-verify with live /api/flash-sale data
          if (fsData && fsData.success && fsData.data && fsData.data.isActive && fsData.data.isLive) {
            const pIdStr = String(p._id);
            let liveFsProduct: any = null;

            // Check live items in active slot
            if (Array.isArray(fsData.data.items) && fsData.data.items.length > 0) {
              liveFsProduct = fsData.data.items.find(
                (item: any) =>
                  String(item.productId?._id || item.productId || item._id) === pIdStr ||
                  item.slug === p.slug
              );
            }

            // Check active live slot if available
            if (!liveFsProduct && fsData.data.activeSlot && Array.isArray(fsData.data.activeSlot.items)) {
              liveFsProduct = fsData.data.activeSlot.items.find(
                (item: any) =>
                  (item.isActive ?? true) &&
                  (String(item.productId?._id || item.productId || item._id) === pIdStr ||
                    item.slug === p.slug)
              );
            }

            if (liveFsProduct) {
              const activeEndTime =
                fsData.data.activeSlot?.endTime ||
                fsData.data.slots?.find((s: any) => s.status === 'live')?.endTime ||
                '23:59';

              setFlashSaleItem({
                ...liveFsProduct,
                isLive: true,
                endTime: activeEndTime,
              });
            } else {
              setFlashSaleItem(null);
            }
          } else {
            setFlashSaleItem(null);
          }

          // Set FOMO settings accurately from fsData or fomoData
          const fomo = fsData?.data?.fomoSettings || (fomoData?.success ? fomoData.data : null);
          if (fomo) {
            setFomoSettings(fomo);
          } else {
            setFomoSettings({ enableViewerCount: false });
          }
        } else {
          setProduct(null);
        }
      } catch (err) {
        console.error('Error fetching product detail:', err);
        if (isMounted) setProduct(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [params.slug, router]);

  // Flash sale countdown timer
  useEffect(() => {
    if (!flashSaleItem) return;

    const updateCountdown = () => {
      const now = new Date();
      const curHour = now.getHours();
      const curMin = now.getMinutes();
      const curSec = now.getSeconds();
      const curTotalSec = curHour * 3600 + curMin * 60 + curSec;

      let endTotalSec = 24 * 3600;
      if (flashSaleItem.endTime) {
        const [eh, em] = flashSaleItem.endTime.split(':').map((n: string) => parseInt(n, 10) || 0);
        endTotalSec = eh * 3600 + (em || 0) * 60;
      }

      const diff = Math.max(0, endTotalSec - curTotalSec);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      setFlashCountdown({
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
      });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [flashSaleItem]);

  // Fetch related products ("Có thể bạn cũng thích" - CHỈ HIỂN THỊ SẢN PHẨM CÙNG LOẠI DANH MỤC)
  useEffect(() => {
    if (!product?._id) return;

    const categoryId = product.category?._id ? String(product.category._id) : (typeof product.category === 'string' ? product.category : '');
    const categorySlug = product.category?.slug || '';
    const catParam = categoryId || categorySlug;

    async function loadRelated() {
      if (!catParam || catParam === 'all') {
        setRelatedProducts([]);
        return;
      }

      const currentIdStr = String(product._id);
      try {
        const res = await apiFetch(`/api/products?category=${encodeURIComponent(catParam)}&limit=24&status=active`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          // Lọc chính xác chỉ lấy các sản phẩm cùng danh mục, trừ sản phẩm hiện tại
          const sameCategoryProducts = data.data.filter((p: any) => {
            if (String(p._id) === currentIdStr || p.slug === product.slug) return false;
            const pCatId = p.category?._id ? String(p.category._id) : (typeof p.category === 'string' ? p.category : '');
            const pCatSlug = p.category?.slug || '';
            if (categoryId && pCatId) return pCatId === categoryId;
            if (categorySlug && pCatSlug) return pCatSlug === categorySlug;
            return true;
          });
          setRelatedProducts(sameCategoryProducts.slice(0, 12));
          return;
        }
      } catch (e) {
        console.error('Error fetching related products:', e);
      }
      setRelatedProducts([]);
    }

    loadRelated();
  }, [product?._id, product?.category, product?.slug]);

  const handleQuickAddRelated = (e: React.MouseEvent, relProd: ProductItem) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProductForModal(relProd);
  };

  // Derive Options and Variants from Product Data
  const options: IProductOption[] = useMemo(() => {
    if (product?.options && Array.isArray(product.options) && product.options.length > 0) {
      return product.options;
    }
    return [];
  }, [product]);

  const variants: IVariantItem[] = useMemo(() => {
    if (product?.variants && Array.isArray(product.variants) && product.variants.length > 0) {
      return product.variants;
    }
    return [];
  }, [product]);

  // Match current selected attributes to a variant
  const matchedVariant: IVariantItem | null = useMemo(() => {
    if (!variants.length) return null;
    return findMatchingVariant(variants, selectedAttributes);
  }, [variants, selectedAttributes]);

  // Pricing calculation
  const basePrice = product?.price || 0;
  const baseOriginalPrice = product?.originalPrice || (product?.comparePrice ?? null);

  const currentPrice = useMemo(() => {
    if (flashSaleItem?.flashPrice && flashSaleItem?.isLive) {
      return flashSaleItem.flashPrice;
    }
    if (matchedVariant) {
      if (typeof matchedVariant.salePrice === 'number' && matchedVariant.salePrice > 0) {
        return matchedVariant.salePrice;
      }
      if (typeof product?.salePrice === 'number' && product.salePrice > 0 && product.salePrice < (matchedVariant.price || basePrice)) {
        return product.salePrice;
      }
      if (typeof matchedVariant.price === 'number' && matchedVariant.price > 0) {
        return matchedVariant.price;
      }
    }
    if (typeof product?.salePrice === 'number' && product.salePrice > 0) {
      return product.salePrice;
    }
    return basePrice;
  }, [flashSaleItem, matchedVariant, product, basePrice]);

  const originalPrice = useMemo(() => {
    if (flashSaleItem?.originalPrice && flashSaleItem?.isLive) {
      return flashSaleItem.originalPrice;
    }
    if (flashSaleItem?.flashPrice && flashSaleItem?.isLive && (product?.originalPrice || product?.price)) {
      return product?.originalPrice || product?.price;
    }
    if (matchedVariant) {
      if (
        typeof matchedVariant.salePrice === 'number' &&
        matchedVariant.salePrice > 0 &&
        matchedVariant.price > matchedVariant.salePrice
      ) {
        return matchedVariant.price;
      }
      if (matchedVariant.originalPrice && matchedVariant.originalPrice > currentPrice) {
        return matchedVariant.originalPrice;
      }
      if (matchedVariant.price && matchedVariant.price > currentPrice) {
        return matchedVariant.price;
      }
    }
    if (baseOriginalPrice && baseOriginalPrice > currentPrice) {
      return baseOriginalPrice;
    }
    if (product?.salePrice && product.price > product.salePrice) {
      return product.price;
    }
    return null;
  }, [flashSaleItem, matchedVariant, baseOriginalPrice, currentPrice, product]);

  const hasDiscount = originalPrice !== null && originalPrice > currentPrice;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : null;

  // Check if product has multi-variants/options
  const hasOptions = options.length > 0 || (variants && variants.length > 1);

  // Check if user has explicitly selected all options
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

  // Price range calculation when variant is not yet selected (Giá lớn nhất và nhỏ nhất)
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
    return {
      min,
      max,
      hasRange: min < max && isFinite(min) && isFinite(max),
    };
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
    return {
      min,
      max,
      hasRange: min < max && isFinite(min) && isFinite(max),
    };
  }, [variants, product]);

  const maxDiscountPercent = useMemo(() => {
    if (!variants || variants.length === 0) return discountPercent;
    const discounts = variants.map((v) => {
      const eff = (typeof v.salePrice === 'number' && v.salePrice > 0) ? v.salePrice : (v.price || 0);
      const orig = (typeof v.originalPrice === 'number' && v.originalPrice > eff)
        ? v.originalPrice
        : (v.price && v.price > eff ? v.price : 0);
      if (orig > eff) {
        return Math.round(((orig - eff) / orig) * 100);
      }
      return 0;
    });
    const max = Math.max(...discounts, 0);
    return max > 0 ? max : null;
  }, [variants, discountPercent]);

  // Khi chưa chọn phân loại: hiển thị khoảng giá min - max
  // Khi đã chọn phân loại: hiển thị đúng giá của phân loại đó
  const shouldShowPriceRange = hasOptions && !isAllOptionsSelected && priceRange.hasRange;

  const displayCurrentPriceText = useMemo(() => {
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
      if (originalPriceRange.max && originalPriceRange.max > priceRange.min) {
        return formatPrice(originalPriceRange.max);
      }
      return null;
    }
    return hasDiscount ? formatPrice(originalPrice) : null;
  }, [shouldShowPriceRange, originalPriceRange, priceRange, hasDiscount, originalPrice]);

  const displayDiscountBadge = useMemo(() => {
    if (shouldShowPriceRange) {
      return maxDiscountPercent ? `-${maxDiscountPercent}%` : null;
    }
    return hasDiscount && discountPercent ? `-${discountPercent}%` : null;
  }, [shouldShowPriceRange, maxDiscountPercent, hasDiscount, discountPercent]);

  // Stock Calculation
  const totalStock = useMemo(() => {
    if (variants && variants.length > 0) {
      return variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
    }
    if (typeof product?.stock === 'number') {
      return product.stock;
    }
    return 0;
  }, [variants, product]);

  const currentStock = useMemo(() => {
    if (matchedVariant && typeof matchedVariant.stock === 'number') {
      return matchedVariant.stock;
    }
    if (variants && variants.length > 0) {
      return totalStock;
    }
    if (typeof product?.stock === 'number') {
      return product.stock;
    }
    return 0;
  }, [matchedVariant, variants, totalStock, product]);

  const isOutOfStock = currentStock <= 0;
  const isProductOutOfStock = totalStock <= 0;

  const images =
    product?.images && product.images.length > 0
      ? product.images
      : ['https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600'];

  // Auto adjust quantity when selected variant's stock changes
  useEffect(() => {
    if (currentStock > 0 && quantity > currentStock) {
      setQuantity(currentStock);
    } else if (currentStock === 0) {
      setQuantity(1);
    }
  }, [currentStock]);

  // Switch image if variant has dedicated image
  useEffect(() => {
    if (matchedVariant?.image && images.length > 0) {
      const idx = images.findIndex((img: string) => img === matchedVariant.image);
      if (idx > -1) {
        setActiveImageIndex(idx);
      }
    }
  }, [matchedVariant, images]);

  // Check if an option value is available given current selections
  const isOptionValueAvailable = (optName: string, val: string) => {
    if (!variants.length) return true;
    const testAttrs = { ...selectedAttributes, [optName]: val };
    const matching = variants.find((v: any) => {
      const rawAttrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || {});
      const isMatch = Object.entries(testAttrs).every(([k, vVal]) => {
        if (!vVal) return true;
        return rawAttrs[k] === vVal || (k === 'Màu sắc' && v.color === vVal) || (k === 'Kích cỡ' && v.size === vVal);
      });
      return isMatch && (v.stock ?? 1) > 0;
    });
    return !!matching;
  };

  const handleSelectAttribute = (optName: string, val: string) => {
    setSelectedAttributes((prev) => {
      if (prev[optName] === val) {
        const next = { ...prev };
        delete next[optName];
        return next;
      }
      return {
        ...prev,
        [optName]: val,
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

  const handleAddToCart = () => {
    if (!product) return;
    if (isOutOfStock) {
      toast.error('Sản phẩm tạm thời hết hàng');
      return;
    }

    const hasOptions = options.length > 0 || (variants && variants.length > 1);
    const isAllOptionsSelected = options.length > 0
      ? options.every((opt) => Boolean(selectedAttributes[opt.name]))
      : Boolean(matchedVariant || (variants && variants.length <= 1));

    if (hasOptions && !isAllOptionsSelected) {
      toast.error('Vui lòng chọn phân loại sản phẩm!');
      setVariantModalMode('cart');
      setIsVariantModalOpen(true);
      return;
    }

    const prodWithFlash = (flashSaleItem?.flashPrice && flashSaleItem?.isLive)
      ? { ...product, flashPrice: flashSaleItem.flashPrice, isFlashSale: true }
      : product;

    addToCart(prodWithFlash, quantity, matchedVariant || undefined);
    toast.success(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (isOutOfStock) {
      toast.error('Sản phẩm tạm thời hết hàng');
      return;
    }

    const hasOptions = options.length > 0 || (variants && variants.length > 1);
    const isAllOptionsSelected = options.length > 0
      ? options.every((opt) => Boolean(selectedAttributes[opt.name]))
      : Boolean(matchedVariant || (variants && variants.length <= 1));

    if (hasOptions && !isAllOptionsSelected) {
      toast.error('Vui lòng chọn phân loại sản phẩm!');
      setVariantModalMode('buy');
      setIsVariantModalOpen(true);
      return;
    }

    const prodWithFlash = (flashSaleItem?.flashPrice && flashSaleItem?.isLive)
      ? { ...product, flashPrice: flashSaleItem.flashPrice, isFlashSale: true }
      : product;

    buyNow(prodWithFlash, quantity, matchedVariant || undefined);
    router.push('/checkout');
  };

  const handleAddToCartMobile = () => {
    if (!product) return;
    if (isOutOfStock) {
      toast.error('Sản phẩm tạm thời hết hàng');
      return;
    }
    const hasOptions = options.length > 0 || (variants && variants.length > 0);
    if (hasOptions) {
      setVariantModalMode('cart');
      setIsVariantModalOpen(true);
    } else {
      handleAddToCart();
    }
  };

  const handleBuyNowMobile = () => {
    if (!product) return;
    if (isOutOfStock) {
      toast.error('Sản phẩm tạm thời hết hàng');
      return;
    }
    const hasOptions = options.length > 0 || (variants && variants.length > 0);
    if (hasOptions) {
      setVariantModalMode('buy');
      setIsVariantModalOpen(true);
    } else {
      handleBuyNow();
    }
  };

  const handleVariantModalSuccess = (action: 'cart' | 'buy', matchedV: any, qty: number) => {
    if (matchedV?.attributes) {
      const rawAttrs = matchedV.attributes instanceof Map ? Object.fromEntries(matchedV.attributes) : matchedV.attributes;
      setSelectedAttributes(rawAttrs);
    }
    setQuantity(qty);
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Đã sao chép liên kết sản phẩm!');
    }
  };

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  // Tự động chuyển cuộn ảnh chính sản phẩm sau 3 giây
  useEffect(() => {
    if (!images || images.length <= 1 || isGalleryPaused) return;

    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [images, isGalleryPaused]);

  const handleOpenExpandModal = (tab: 'desc' | 'reviews') => {
    setExpandModalTab(tab);
    setIsExpandModalOpen(true);
  };

  // Handle click on images inside product description to open Lightbox
  const handleDescriptionImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target && target.tagName === 'IMG') {
      const src = (target as HTMLImageElement).src;
      if (src) {
        e.stopPropagation();
        setLightboxImage(src);
      }
    }
  };

  // Tự động phát video trong phần Chi Tiết Sản Phẩm khi lướt tới, dừng khi lướt qua
  useEffect(() => {
    if (loading || !product?.description) return;

    let observer: IntersectionObserver | null = null;
    let timer: NodeJS.Timeout | null = null;
    let rafId: number | null = null;
    const visibleMap = new WeakMap<HTMLVideoElement, boolean>();

    const checkAllVideos = () => {
      const selector = `.${styles.richDescription} video, .${styles.descContent} video, .${styles.fullDescText} video`;
      const videoElements = Array.from(document.querySelectorAll<HTMLVideoElement>(selector));
      if (videoElements.length === 0) return;

      const windowHeight = window.innerHeight || document.documentElement.clientHeight;

      videoElements.forEach((video) => {
        // Bỏ qua các video thuộc view đang bị ẩn (mobileView vs pcView display: none)
        if (video.offsetParent === null && video.offsetWidth === 0 && video.offsetHeight === 0) {
          return;
        }

        const rect = video.getBoundingClientRect();
        // Video được coi là trong tầm mắt khi chiếm phần nhìn từ 15% đến 85% chiều cao màn hình
        const isVisible = rect.top < windowHeight * 0.85 && rect.bottom > windowHeight * 0.15;
        const wasVisible = visibleMap.get(video) || false;

        if (isVisible && !wasVisible) {
          visibleMap.set(video, true);
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              video.muted = true;
              video.play().catch(() => {});
            });
          }
        } else if (!isVisible && wasVisible) {
          visibleMap.set(video, false);
          if (!video.paused) {
            video.pause();
          }
        }
      });
    };

    const setupObserver = () => {
      const selector = `.${styles.richDescription} video, .${styles.descContent} video, .${styles.fullDescText} video`;
      const videoElements = Array.from(document.querySelectorAll<HTMLVideoElement>(selector));

      if (videoElements.length === 0) return;

      if (observer) {
        observer.disconnect();
        observer = null;
      }

      // Cấu hình các video: muted, playsinline, loop, preload="auto", #t=0.001
      videoElements.forEach((vid) => {
        vid.muted = true;
        vid.defaultMuted = true;
        vid.playsInline = true;
        vid.setAttribute('playsinline', '');
        vid.setAttribute('muted', '');
        vid.loop = true;
        vid.setAttribute('loop', '');
        vid.preload = 'auto';
        vid.setAttribute('preload', 'auto');
        if (vid.src && vid.src.includes('.mp4') && !vid.src.includes('#')) {
          vid.src = vid.src + '#t=0.001';
        }
      });

      // 1. IntersectionObserver tiêu chuẩn
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const video = entry.target as HTMLVideoElement;
            const isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
            const wasVisible = visibleMap.get(video) || false;

            if (isVisible && !wasVisible) {
              visibleMap.set(video, true);
              const playPromise = video.play();
              if (playPromise !== undefined) {
                playPromise.catch(() => {
                  video.muted = true;
                  video.play().catch(() => {});
                });
              }
            } else if (!isVisible && wasVisible) {
              visibleMap.set(video, false);
              if (!video.paused) {
                video.pause();
              }
            }
          });
        },
        {
          threshold: [0, 0.2, 0.5, 0.8],
        }
      );

      videoElements.forEach((vid) => observer?.observe(vid));

      // Kiểm tra ngay sau khi khởi tạo
      checkAllVideos();
    };

    // Chạy observer sau khi DOM render xong
    rafId = requestAnimationFrame(setupObserver);
    timer = setTimeout(setupObserver, 200);

    // 2. Lắng nghe sự kiện scroll trên cả window và container cuộn của mobile (.mobileScrollArea)
    let scrollTicking = false;
    const onScroll = () => {
      if (!scrollTicking) {
        requestAnimationFrame(() => {
          checkAllVideos();
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    const mobileScrollEl = document.querySelector(`.${styles.mobileScrollArea}`);
    if (mobileScrollEl) {
      mobileScrollEl.addEventListener('scroll', onScroll, { passive: true });
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const selector = `.${styles.richDescription} video, .${styles.descContent} video, .${styles.fullDescText} video`;
        document.querySelectorAll<HTMLVideoElement>(selector).forEach((v) => {
          if (!v.paused) v.pause();
        });
      } else {
        checkAllVideos();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (timer) clearTimeout(timer);
      if (observer) observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (mobileScrollEl) {
        mobileScrollEl.removeEventListener('scroll', onScroll);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loading, product?.description, product?._id, isExpandModalOpen]);

  // Render product description with HTML & interleaved images support
  const renderDescriptionContent = (content?: string, extraClass: string = '') => {
    const raw =
      content ||
      'Chất liệu cao cấp, đường may tỉ mỉ, form dáng chuẩn thời trang hiện đại.\nThiết kế trẻ trung năng động, dễ phối đồ phù hợp đi học, đi chơi, đi làm.';
    const hasHtml = /<\/?(p|div|br|img|video|source|iframe|h[1-6]|ul|ol|li|strong|b|em|i|s|span|figure|table|hr|blockquote)\b/i.test(raw);

    if (hasHtml) {
      const sanitized = sanitizeAndTransformRichDescription(raw);
      return (
        <div
          className={`${extraClass} ${styles.richDescription}`}
          onClick={handleDescriptionImageClick}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      );
    }

    return (
      <div className={extraClass} style={{ whiteSpace: 'pre-line' }}>
        {raw}
      </div>
    );
  };

  if (loading) {
    return <StoreLoading />;
  }

  if (!product) {
    return (
      <div className={styles.page}>
        <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: 440, margin: '0 auto' }}>
          <FiAlertCircle size={44} color="#ef4444" style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-main, #ffffff)' }}>
            Không tìm thấy sản phẩm
          </h3>
          <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
            Sản phẩm có thể đã được cập nhật đường dẫn mới hoặc đường truyền mạng tạm thời bị gián đoạn.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                borderRadius: 9999,
                background: 'var(--bg-card, #13161f)',
                color: 'var(--text-main, #ffffff)',
                border: '1px solid var(--border-color, #232838)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              🔄 Tải lại trang
            </button>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '10px 20px',
                borderRadius: 9999,
                background: 'var(--primary, #ee4d2d)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              Quay lại trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* =========================================================================
          1. MOBILE VIEW (< 1024px) - 100% ORIGINAL & UNTOUCHED MOBILE STRUCTURE
          ========================================================================= */}
      <div className={styles.mobileView}>
        {/* Fixed Top Navigation */}
        <nav className={styles.mobileTopNav}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              className={styles.navBtn}
              onClick={handleBack}
              aria-label="Quay lại"
              title="Quay lại"
            >
              <FiChevronLeft size={22} />
            </button>
            <Link
              href="/"
              className={styles.navBtn}
              aria-label="Trang chủ"
              title="Về trang chủ"
            >
              <FiHome size={19} />
            </Link>
          </div>

          <div className={styles.navTitle}>Chi tiết sản phẩm</div>

          <div className={styles.navRight}>
            <button className={styles.navBtn} onClick={handleShare} aria-label="Chia sẻ">
              <FiShare2 size={20} />
            </button>
            <Link href="/cart" className={styles.navBtn} aria-label="Giỏ hàng">
              <FiShoppingCart size={20} />
              {cartCount > 0 && <span className={styles.cartBadge}>{cartCount}</span>}
            </Link>
          </div>
        </nav>

        {/* Scrollable Content Area */}
        <div className={styles.mobileScrollArea}>
          <BannerNotice />

          {/* 1. Mobile Gallery (Tự động cuộn sau 3s) */}
          <div
            className={styles.mobileGallery}
            onTouchStart={() => setIsGalleryPaused(true)}
            onTouchEnd={() => {
              setTimeout(() => setIsGalleryPaused(false), 2500);
            }}
          >
            <img
              src={images[activeImageIndex] || images[0]}
              alt={product.name}
              className={styles.mobileMainImage}
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className={`${styles.galleryNavBtn} ${styles.galleryPrevBtn}`}
                  onClick={handlePrevImage}
                  aria-label="Ảnh trước"
                >
                  <FiChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className={`${styles.galleryNavBtn} ${styles.galleryNextBtn}`}
                  onClick={handleNextImage}
                  aria-label="Ảnh sau"
                >
                  <FiChevronRight size={20} />
                </button>

                <div className={styles.dotsContainer}>
                  {images.map((_: any, idx: number) => (
                    <span
                      key={idx}
                      className={`${styles.dot} ${activeImageIndex === idx ? styles.activeDot : ''}`}
                      onClick={() => setActiveImageIndex(idx)}
                    />
                  ))}
                </div>

                <span className={styles.imageCounter}>
                  {activeImageIndex + 1}/{images.length}
                </span>
              </>
            )}
          </div>

          {/* Mobile Flash Sale Bar */}
          {flashSaleItem && flashSaleItem.isLive && (
            <div className={styles.mobileFlashBar}>
              <div className={styles.flashBarLeft}>
                <FiZap size={18} style={{ fill: '#fff' }} />
                <span className={styles.flashBarTitle}>FLASH SALE GIÁ SỐC</span>
              </div>

              <div className={styles.flashBarRight}>
                <span className={styles.flashBarCountdownLabel}>KẾT THÚC TRONG</span>
                <div className={styles.flashBarCountdownTimer}>
                  <span className={styles.flashBarDigit}>{flashCountdown.hours}</span>
                  <span className={styles.flashBarColon}>:</span>
                  <span className={styles.flashBarDigit}>{flashCountdown.minutes}</span>
                  <span className={styles.flashBarColon}>:</span>
                  <span className={styles.flashBarDigit}>{flashCountdown.seconds}</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Mobile Main Card */}
          <div className={styles.mobileMainCard}>
            <div className={styles.mobilePriceRow}>
              <span
                className={styles.mobileCurrentPrice}
                style={{ color: (flashSaleItem && flashSaleItem.isLive) ? '#f97316' : undefined }}
              >
                {displayCurrentPriceText}
              </span>
              {displayOriginalPriceText && (
                <>
                  <span className={styles.mobileOldPrice}>{displayOriginalPriceText}</span>
                  {displayDiscountBadge && (
                    <span
                      className={styles.mobileDiscountBadge}
                      style={{
                        background: (flashSaleItem && flashSaleItem.isLive) ? '#ea580c' : undefined,
                        color: (flashSaleItem && flashSaleItem.isLive) ? '#ffffff' : undefined,
                      }}
                    >
                      {displayDiscountBadge}
                    </span>
                  )}
                </>
              )}
            </div>

            <h1 className={styles.mobileTitle}>{product.name}</h1>

            <div className={styles.mobileMetaRow}>
              <Link href={`/product/${product.slug}/reviews`} className={styles.ratingLink}>
                <span className={styles.mobileRating}>
                  <FiStar style={{ fill: '#FFB800' }} size={13} /> {reviewsStats.averageRating || product.rating || 5.0}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 3 }}>
                    ({reviewsStats.totalReviews} đánh giá)
                  </span>
                </span>
              </Link>
              <span className={styles.mobileSold}>
                Đã bán {Number(product.soldCount ?? product.sold ?? 0).toLocaleString('vi-VN')}
              </span>
              <span className={styles.mobileStock}>
                {isProductOutOfStock ? (
                  <span className={styles.outOfStockBadge}>Tạm hết hàng</span>
                ) : (
                  `Kho: ${totalStock} có sẵn`
                )}
              </span>
            </div>

            {/* FOMO Notice */}
            {fomoSettings && fomoSettings.enableViewerCount === true && (
              <div className={styles.mobileViewerCountNotice}>
                <FiZap /> 🔥 <strong>18 người</strong> đang cùng xem sản phẩm này
              </div>
            )}
          </div>

          {/* 2.5 Voucher Collection Bar */}
          <VoucherCollectionBar />

          {/* 3. Mobile Variant Selection Card */}
          {(options.length > 0 || (variants.length > 0 && options.length === 0)) && (
            <div className={styles.mobileVariantCard}>
              {options.map((opt) => (
                <div key={opt.name} className={styles.variantSection}>
                  <div className={styles.variantTitle}>
                    <span>{opt.name}:</span>
                    {selectedAttributes[opt.name] ? (
                      <span style={{ color: 'var(--primary, #ee4d2d)', fontWeight: 700, marginLeft: 4 }}>
                        {selectedAttributes[opt.name]}
                        {matchedVariant && typeof matchedVariant.stock === 'number' && (
                          <span style={{ fontSize: 11.5, color: 'var(--text-muted, #64748b)', fontWeight: 500, marginLeft: 6 }}>
                            (Còn {matchedVariant.stock} sp)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', fontWeight: 400, marginLeft: 6 }}>
                        (Vui lòng chọn)
                      </span>
                    )}
                  </div>
                  <div className={styles.variantChips}>
                    {opt.values.map((val) => {
                      const isSelected = selectedAttributes[opt.name] === val;
                      const isAvailable = isOptionValueAvailable(opt.name, val);

                      return (
                        <button
                          key={val}
                          type="button"
                          disabled={!isAvailable}
                          className={`${styles.variantBtn} ${isSelected ? styles.activeVariant : ''} ${!isAvailable ? styles.disabledVariant : ''}`}
                          onClick={() => isAvailable && handleSelectAttribute(opt.name, val)}
                          title={!isAvailable ? 'Tùy chọn này tạm hết hàng' : undefined}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {options.length === 0 && variants.length > 0 && (
                <div className={styles.variantSection}>
                  <div className={styles.variantTitle}>
                    <span>Phân loại hàng:</span>
                    {matchedVariant?.title ? (
                      <span style={{ color: 'var(--primary, #ee4d2d)', fontWeight: 700, marginLeft: 4 }}>
                        {matchedVariant.title}
                        {typeof matchedVariant.stock === 'number' && (
                          <span style={{ fontSize: 11.5, color: 'var(--text-muted, #64748b)', fontWeight: 500, marginLeft: 6 }}>
                            (Còn {matchedVariant.stock} sp)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', fontWeight: 400, marginLeft: 6 }}>
                        (Vui lòng chọn)
                      </span>
                    )}
                  </div>
                  <div className={styles.variantChips}>
                    {variants.map((v, idx) => {
                      const isSelected = matchedVariant?._id === v._id || matchedVariant?.sku === v.sku;
                      const isAvail = v.stock > 0;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!isAvail}
                          className={`${styles.variantBtn} ${isSelected ? styles.activeVariant : ''} ${!isAvail ? styles.disabledVariant : ''}`}
                          onClick={() => isAvail && handleSelectGenericVariant(v)}
                        >
                          {v.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Stepper */}
              <div className={styles.mobileQuantityRow}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Số lượng</span>
                <div className={styles.quantityControl}>
                  <button
                    type="button"
                    className={styles.qtyBtn}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1 || isOutOfStock}
                  >
                    <FiMinus size={12} />
                  </button>
                  <span className={styles.qtyValue}>{isOutOfStock ? 0 : quantity}</span>
                  <button
                    type="button"
                    className={styles.qtyBtn}
                    onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                    disabled={quantity >= currentStock || isOutOfStock}
                  >
                    <FiPlus size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. Mobile Shop Info Card */}
          <div className={styles.mobileShopCard}>
            <div className={styles.shopLeft}>
              <div className={styles.shopAvatar}>
                {theme?.pageTitles?.logoUrl ? (
                  <img
                    src={theme.pageTitles.logoUrl}
                    alt={theme?.pageTitles?.logoText || 'Logo'}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 10 }}
                  />
                ) : (
                  theme?.pageTitles?.logoText ? theme.pageTitles.logoText.substring(0, 2).toUpperCase() : 'ST'
                )}
              </div>
              <div>
                <div className={styles.shopName}>{theme?.pageTitles?.logoText || 'Cửa Hàng'}</div>
                <div className={styles.shopMeta}>⭐ 4.8 | 12.5K đã bán</div>
              </div>
            </div>
            <Link href="/" className={styles.viewShopBtn}>
              Xem Shop
            </Link>
          </div>

          {/* 5. Mobile Description Card - Hiển thị full 100% nội dung */}
          <div className={styles.mobileDescCard}>
            <h2 className={styles.descTitle}>
              <span>📋 Chi Tiết Sản Phẩm</span>
            </h2>

            <div className={styles.descContentWrapper}>
              {renderDescriptionContent(product.description, styles.descContent)}
            </div>
          </div>

          {/* 6. Mobile Reviews Card */}
          <div className={styles.mobileReviewsCard}>
            <div className={styles.reviewsCardHeader}>
              <div>
                <h2 className={styles.reviewsCardTitle}>Đánh Giá & Nhận Xét</h2>
                <div className={styles.reviewsRatingSummary}>
                  <span className={styles.reviewsScoreBig}>{reviewsStats.averageRating || '5.0'}</span>
                  <div className={styles.reviewsStarsRow}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <FiStar
                        key={i}
                        size={13}
                        style={{
                          fill: i <= Math.round(reviewsStats.averageRating) ? '#fbbf24' : 'none',
                          color: '#fbbf24',
                        }}
                      />
                    ))}
                  </div>
                  <span className={styles.reviewsCountText}>({reviewsStats.totalReviews} đánh giá)</span>
                </div>
              </div>
              <Link href={`/product/${product.slug}/reviews`} className={styles.seeAllReviewsLink}>
                Xem tất cả <FiChevronRight size={13} />
              </Link>
            </div>

            {reviewsPreview.length > 0 ? (
              <>
                <div className={styles.reviewsPreviewList}>
                  {displayedReviews.map((rev) => (
                    <div key={rev._id} className={styles.previewReviewItem}>
                      <div className={styles.previewReviewHeader}>
                        <div className={styles.previewAuthor}>
                          {rev.author ? (rev.author.length <= 2 ? rev.author + '***' : rev.author[0] + '***' + rev.author[rev.author.length - 1]) : 'Khách hàng'}
                        </div>
                        <div className={styles.previewStars}>
                          {[1, 2, 3, 4, 5].map((s: number) => (
                            <FiStar
                              key={s}
                              size={11}
                              style={{
                                fill: s <= rev.rating ? '#fbbf24' : 'none',
                                color: '#fbbf24',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      {rev.variantTitle && (
                        <span className={styles.previewVariant}>Phân loại: {rev.variantTitle}</span>
                      )}
                      <p className={styles.previewComment}>{rev.comment}</p>
                      {Array.isArray(rev.images) && rev.images.length > 0 && (
                        <div className={styles.previewImgs}>
                          {rev.images.slice(0, 5).map((imgUrl: string, idx: number) => (
                            <img
                              key={idx}
                              src={imgUrl}
                              alt="Review"
                              className={styles.previewImg}
                              onClick={() => setLightboxImage(imgUrl)}
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {reviewsPreview.length > 10 && (
                  <div className={styles.seeMoreReviewsWrap}>
                    <button
                      type="button"
                      className={styles.seeMoreReviewsBtn}
                      onClick={() => setIsReviewsExpanded(!isReviewsExpanded)}
                    >
                      {isReviewsExpanded ? (
                        <>
                          Thu gọn đánh giá <FiChevronUp size={16} />
                        </>
                      ) : (
                        <>
                          Xem thêm {reviewsPreview.length - 10} đánh giá khác <FiChevronDown size={16} />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noReviewsYet}>
                <p>Chưa có đánh giá nào cho sản phẩm này.</p>
              </div>
            )}

            <button
              type="button"
              className={styles.writeReviewCtaBtn}
              onClick={() => setIsWriteModalOpen(true)}
            >
              <FiEdit3 size={15} />
              <span>Viết đánh giá cho sản phẩm này</span>
            </button>
          </div>

          {/* 6. Mobile Related Products: Có Thể Bạn Cũng Thích */}
          {relatedProducts.length > 0 && (
            <div className={styles.relatedSection}>
              <div className={styles.relatedHeader}>
                <div className={styles.relatedTitleGroup}>
                  <span className={styles.relatedSparkleIcon}>✨</span>
                  <h3 className={styles.relatedTitle}>CÓ THỂ BẠN CŨNG THÍCH</h3>
                </div>
                <Link
                  href={product.category?.slug ? `/?category=${encodeURIComponent(product.category.slug)}&tab=products` : '/?tab=products'}
                  className={styles.relatedSeeAllBtn}
                >
                  <span>Xem thêm</span>
                  <FiChevronRight size={13} />
                </Link>
              </div>

              <div className={styles.relatedGrid}>
                {relatedProducts.map((relProd) => (
                  <StoreProductCard
                    key={relProd._id}
                    product={relProd}
                    onQuickAdd={handleQuickAddRelated}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Fixed Bottom Action Bar */}
        <div className={styles.mobileBottomBar}>
          <Link
            href="/"
            className={styles.actionIconBtn}
            title="Quay lại trang chủ"
          >
            <FiHome size={18} />
            <span>Trang chủ</span>
          </Link>

          <a
            href={zaloChatUrl}
            target={cleanZaloPhone ? '_blank' : undefined}
            rel={cleanZaloPhone ? 'noopener noreferrer' : undefined}
            className={styles.actionIconBtn}
            title={cleanZaloPhone ? `Chat Zalo 1:1 với Shop (${cleanZaloPhone})` : 'Chat với Shop'}
          >
            {cleanZaloPhone ? (
              <ZaloIcon size={18} />
            ) : (
              <FiMessageSquare size={18} />
            )}
            <span>{cleanZaloPhone ? 'Chat Zalo' : 'Chat'}</span>
          </a>

          <Link href={`/product/${product.slug}/reviews`} className={styles.actionIconBtn} title="Xem đánh giá">
            <FiStar size={18} />
            <span>Đánh giá</span>
          </Link>

          <button
            type="button"
            className={styles.addCartBtn}
            onClick={handleAddToCartMobile}
            disabled={isOutOfStock}
            style={isOutOfStock ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            <span>{isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}</span>
          </button>
          <button
            type="button"
            className={styles.buyNowBtn}
            onClick={handleBuyNowMobile}
            disabled={isOutOfStock}
            style={isOutOfStock ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            <span>{isOutOfStock ? 'Tạm hết hàng' : 'Mua ngay'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. PC VIEW (>= 1024px) - LUXURY SINGLE-VIEWPORT NO-SCROLL LAYOUT
          ========================================================================= */}
      <div className={styles.pcView}>
        {/* Top PC Nav - Centered Product Name */}
        <nav className={styles.pcTopNav}>
          <div className={styles.topNavLeft} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              className={styles.navBtn}
              onClick={handleBack}
              aria-label="Quay lại"
              title="Quay lại"
            >
              <FiChevronLeft size={22} />
            </button>
            <Link
              href="/"
              className={styles.navBtn}
              aria-label="Trang chủ"
              title="Về trang chủ"
            >
              <FiHome size={19} />
            </Link>
          </div>

          <h1 className={styles.pcNavTitle} title={product.name}>
            {product.name}
          </h1>

          <div className={styles.navRight}>
            <button className={styles.navBtn} onClick={handleShare} aria-label="Chia sẻ" title="Chia sẻ sản phẩm">
              <FiShare2 size={18} />
            </button>
            <Link href="/cart" className={styles.navBtn} aria-label="Giỏ hàng" title="Giỏ hàng">
              <FiShoppingCart size={18} />
              {cartCount > 0 && <span className={styles.cartBadge}>{cartCount}</span>}
            </Link>
          </div>
        </nav>

        {/* 2-Column Main Showcase Grid */}
        <div className={styles.pcViewportGrid}>
          {/* Left Column: Media Showcase (Tự động cuộn sau 3s) */}
          <div className={styles.pcLeftColumn}>
            <div
              className={styles.pcGallery}
              onMouseEnter={() => setIsGalleryPaused(true)}
              onMouseLeave={() => setIsGalleryPaused(false)}
            >
              <img
                src={images[activeImageIndex] || images[0]}
                alt={product.name}
                className={styles.pcMainImage}
              />

              <div className={styles.badgeOverlay}>
                <span className={styles.mallBadge}>MALL</span>
                {discountPercent && (
                  <span className={styles.discountOverlayBadge}>
                    -{discountPercent}%
                  </span>
                )}
              </div>

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.galleryNavBtn} ${styles.galleryPrevBtn}`}
                    onClick={handlePrevImage}
                    aria-label="Ảnh trước"
                  >
                    <FiChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.galleryNavBtn} ${styles.galleryNextBtn}`}
                    onClick={handleNextImage}
                    aria-label="Ảnh sau"
                  >
                    <FiChevronRight size={20} />
                  </button>

                  <div className={styles.dotsContainer}>
                    {images.map((_: any, idx: number) => (
                      <span
                        key={idx}
                        className={`${styles.dot} ${activeImageIndex === idx ? styles.activeDot : ''}`}
                        onClick={() => setActiveImageIndex(idx)}
                      />
                    ))}
                  </div>

                  <span className={styles.imageCounter}>
                    {activeImageIndex + 1}/{images.length}
                  </span>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className={styles.pcThumbnailsReel}>
                {images.map((imgUrl: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    className={`${styles.thumbnailBtn} ${activeImageIndex === idx ? styles.activeThumbnail : ''}`}
                    onClick={() => setActiveImageIndex(idx)}
                    onMouseEnter={() => setActiveImageIndex(idx)}
                  >
                    <img src={imgUrl} alt={`Thumb ${idx + 1}`} className={styles.thumbImg} />
                  </button>
                ))}
              </div>
            )}

            <div className={styles.pcTrustBadgesRow}>
              <div className={styles.trustItem}>
                <FiShield className={styles.trustIcon} />
                <span>100% Chính Hãng</span>
              </div>
              <div className={styles.trustItem}>
                <FiRefreshCw className={styles.trustIcon} />
                <span>Đổi trả 7 ngày</span>
              </div>
              <div className={styles.trustItem}>
                <FiTruck className={styles.trustIcon} />
                <span>Freeship từ 500k</span>
              </div>
            </div>

            <div className={styles.pcShopCardMini}>
              <div className={styles.shopLeft}>
                <div className={styles.shopAvatar}>
                  {theme?.pageTitles?.logoUrl ? (
                    <img
                      src={theme.pageTitles.logoUrl}
                      alt={theme?.pageTitles?.logoText || 'Shop'}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }}
                    />
                  ) : (
                    theme?.pageTitles?.logoText ? theme.pageTitles.logoText.substring(0, 2).toUpperCase() : 'ST'
                  )}
                </div>
                <div>
                  <div className={styles.shopName}>{theme?.pageTitles?.logoText || 'Cửa Hàng'}</div>
                  <div className={styles.shopMeta}>⭐ 4.9 • 15.2K đã bán • Phản hồi 99%</div>
                </div>
              </div>
              <Link href="/" className={styles.viewShopBtn}>
                Xem Shop
              </Link>
            </div>
          </div>

          {/* Right Column: Command Center */}
          <div className={styles.pcRightColumn}>
            <div className={styles.pcProductHeaderBox}>
              <h1 className={styles.pcTitle}>{product.name}</h1>

              <div className={styles.pcMetaRow}>
                <span className={styles.rating}>
                  <FiStar style={{ fill: '#FFB800' }} size={13} /> {reviewsStats.averageRating || product.rating || 5.0}
                  <span className={styles.ratingCount}>
                    ({reviewsStats.totalReviews} đánh giá)
                  </span>
                </span>
                <span className={styles.metaDivider}>•</span>
                <span className={styles.sold}>
                  Đã bán {Number(product.soldCount ?? product.sold ?? 0).toLocaleString('vi-VN')}
                </span>
                <span className={styles.metaDivider}>•</span>
                <span className={styles.stock}>
                  {isProductOutOfStock ? (
                    <span className={styles.outOfStockBadge}>Tạm hết hàng</span>
                  ) : (
                    `Kho: ${totalStock} có sẵn`
                  )}
                </span>
              </div>

              {flashSaleItem && flashSaleItem.isLive && (
                <div className={styles.shopeeFlashBar}>
                  <div className={styles.flashBarLeft}>
                    <FiZap size={16} style={{ fill: '#fff' }} />
                    <span className={styles.flashBarTitle}>FLASH SALE GIÁ SỐC</span>
                  </div>
                  <div className={styles.flashBarRight}>
                    <span className={styles.flashBarCountdownLabel}>KẾT THÚC TRONG</span>
                    <div className={styles.flashBarCountdownTimer}>
                      <span className={styles.flashBarDigit}>{flashCountdown.hours}</span>
                      <span className={styles.flashBarColon}>:</span>
                      <span className={styles.flashBarDigit}>{flashCountdown.minutes}</span>
                      <span className={styles.flashBarColon}>:</span>
                      <span className={styles.flashBarDigit}>{flashCountdown.seconds}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.priceRow}>
                <span className={styles.currentPrice}>
                  {displayCurrentPriceText}
                </span>
                {displayOriginalPriceText && (
                  <>
                    <span className={styles.oldPrice}>{displayOriginalPriceText}</span>
                    {displayDiscountBadge && (
                      <span className={styles.discountBadge}>
                        {displayDiscountBadge}
                      </span>
                    )}
                  </>
                )}
              </div>

              {fomoSettings && fomoSettings.enableViewerCount === true && (
                <div className={styles.viewerCountNotice}>
                  <FiZap size={13} /> 🔥 <strong>18 người</strong> đang cùng xem sản phẩm này
                </div>
              )}
            </div>

            <div className={styles.voucherSectionWrap}>
              <VoucherCollectionBar />
            </div>

            {(options.length > 0 || (variants.length > 0 && options.length === 0)) && (
              <div className={styles.pcVariantCard}>
                {options.map((opt) => (
                  <div key={opt.name} className={styles.variantSection}>
                    <div className={styles.variantTitle}>
                      <span>{opt.name}:</span>
                      {selectedAttributes[opt.name] ? (
                        <span className={styles.selectedVariantText}>
                          {' '}{selectedAttributes[opt.name]}
                          {matchedVariant && typeof matchedVariant.stock === 'number' && (
                            <span style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', fontWeight: 500, marginLeft: 6 }}>
                              (Còn {matchedVariant.stock} sản phẩm)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', fontWeight: 400, marginLeft: 6 }}>
                          (Vui lòng chọn)
                        </span>
                      )}
                    </div>
                    <div className={styles.variantChips}>
                      {opt.values.map((val) => {
                        const isSelected = selectedAttributes[opt.name] === val;
                        const isAvailable = isOptionValueAvailable(opt.name, val);

                        return (
                          <button
                            key={val}
                            type="button"
                            disabled={!isAvailable}
                            className={`${styles.variantBtn} ${isSelected ? styles.activeVariant : ''} ${!isAvailable ? styles.disabledVariant : ''}`}
                            onClick={() => isAvailable && handleSelectAttribute(opt.name, val)}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {options.length === 0 && variants.length > 0 && (
                  <div className={styles.variantSection}>
                    <div className={styles.variantTitle}>
                      <span>Phân loại hàng:</span>
                      {matchedVariant?.title ? (
                        <span className={styles.selectedVariantText}>
                          {' '}{matchedVariant.title}
                          {typeof matchedVariant.stock === 'number' && (
                            <span style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', fontWeight: 500, marginLeft: 6 }}>
                              (Còn {matchedVariant.stock} sản phẩm)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', fontWeight: 400, marginLeft: 6 }}>
                          (Vui lòng chọn)
                        </span>
                      )}
                    </div>
                    <div className={styles.variantChips}>
                      {variants.map((v, idx) => {
                        const isSelected = matchedVariant?._id === v._id || matchedVariant?.sku === v.sku;
                        const isAvail = v.stock > 0;
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={!isAvail}
                            className={`${styles.variantBtn} ${isSelected ? styles.activeVariant : ''} ${!isAvail ? styles.disabledVariant : ''}`}
                            onClick={() => isAvail && handleSelectGenericVariant(v)}
                          >
                            {v.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className={styles.quantityRow}>
                  <span className={styles.qtyLabel}>Số lượng:</span>
                  <div className={styles.quantityControl}>
                    <button
                      type="button"
                      className={styles.qtyBtn}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1 || isOutOfStock}
                    >
                      <FiMinus size={12} />
                    </button>
                    <span className={styles.qtyValue}>{isOutOfStock ? 0 : quantity}</span>
                    <button
                      type="button"
                      className={styles.qtyBtn}
                      onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                      disabled={quantity >= currentStock || isOutOfStock}
                    >
                      <FiPlus size={12} />
                    </button>
                  </div>
                  <span className={styles.stockNoticeText}>
                    {currentStock} sản phẩm có sẵn
                  </span>
                </div>
              </div>
            )}

            {/* Desktop Action Buttons */}
            <div className={styles.pcActionButtons}>
              <a
                href={zaloChatUrl}
                target={cleanZaloPhone ? '_blank' : undefined}
                rel={cleanZaloPhone ? 'noopener noreferrer' : undefined}
                className={`${styles.pcChatBtn} ${cleanZaloPhone ? styles.pcZaloChatBtn : ''}`}
                title={cleanZaloPhone ? `Chat Zalo 1:1 với Shop (${cleanZaloPhone})` : 'Chat với Shop'}
              >
                {cleanZaloPhone ? (
                  <ZaloIcon size={19} />
                ) : (
                  <FiMessageSquare size={17} />
                )}
                <span>{cleanZaloPhone ? 'Chat Zalo' : 'Chat Ngay'}</span>
              </a>

              <button
                type="button"
                className={styles.pcAddCartBtn}
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                <FiShoppingCart size={17} />
                <span>Thêm Vào Giỏ</span>
              </button>

              <button
                type="button"
                className={styles.pcBuyNowBtn}
                onClick={handleBuyNow}
                disabled={isOutOfStock}
              >
                <FiZap size={17} />
                <span>{isOutOfStock ? 'Tạm Hết Hàng' : 'Mua Ngay'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. PC Section 1: Chi Tiết Mô Tả Sản Phẩm */}
        <div className={styles.pcDetailsCard}>
          <div className={styles.pcSectionHeader}>
            <div className={styles.pcSectionTitle}>
              <FiPackage size={18} className={styles.pcSectionTitleIcon} />
              <span>Chi Tiết Mô Tả Sản Phẩm</span>
            </div>
          </div>

          <div className={styles.pcDetailsBody}>
            <div className={styles.fullDescContent}>
              <div className={styles.descHighlightsBox}>
                <h4>🌟 Đặc điểm nổi bật</h4>
                <p>{product.name}</p>
              </div>
              {renderDescriptionContent(product.description, styles.fullDescText)}

              <div className={styles.policyGuarantees}>
                <div className={styles.policyItem}>
                  <FiShield size={20} color="var(--primary, #ee4d2d)" />
                  <div>
                    <strong>Cam kết chính hãng 100%</strong>
                    <p>Đảm bảo nguồn gốc xuất xứ rõ ràng, hoàn tiền nếu phát hiện hàng giả.</p>
                  </div>
                </div>
                <div className={styles.policyItem}>
                  <FiRefreshCw size={20} color="var(--primary, #ee4d2d)" />
                  <div>
                    <strong>Chính sách đổi trả trong 7 ngày</strong>
                    <p>Hỗ trợ đổi size hoặc hoàn tiền nếu sản phẩm có lỗi từ nhà sản xuất.</p>
                  </div>
                </div>
                <div className={styles.policyItem}>
                  <FiTruck size={20} color="var(--primary, #ee4d2d)" />
                  <div>
                    <strong>Giao hàng toàn quốc siêu tốc</strong>
                    <p>Kiểm tra hàng thoải mái trước khi thanh toán COD.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. PC Section 2: Đánh Giá Khách Hàng */}
        <div className={styles.pcDetailsCard}>
          <div className={styles.pcSectionHeader}>
            <div className={styles.pcSectionTitle}>
              <FiStar size={18} className={styles.pcSectionTitleIcon} />
              <span>Đánh Giá Khách Hàng ({reviewsStats.totalReviews})</span>
            </div>
            {reviewsStats.totalReviews > 0 && (
              <button
                type="button"
                className={styles.writeReviewHeaderBtn}
                onClick={() => setIsWriteModalOpen(true)}
              >
                <FiEdit3 size={14} />
                <span>Viết đánh giá</span>
              </button>
            )}
          </div>

          <div className={styles.pcDetailsBody}>
            <div className={styles.fullReviewsContent}>
              <div className={styles.fullReviewsStatsCard}>
                <div className={styles.fullReviewsScoreGroup}>
                  <span className={styles.fullReviewsScoreNum}>{reviewsStats.averageRating || '5.0'}</span>
                  <div className={styles.fullReviewsStarsBig}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <FiStar
                        key={i}
                        size={16}
                        style={{
                          fill: i <= Math.round(reviewsStats.averageRating) ? '#fbbf24' : 'none',
                          color: '#fbbf24',
                        }}
                      />
                    ))}
                  </div>
                  <span className={styles.fullReviewsCount}>Dựa trên {reviewsStats.totalReviews} lượt đánh giá thực tế</span>
                </div>

                <button
                  type="button"
                  className={styles.writeReviewCtaBtn}
                  onClick={() => setIsWriteModalOpen(true)}
                >
                  <FiEdit3 size={15} />
                  <span>Viết đánh giá cho sản phẩm này</span>
                </button>
              </div>

              {reviewsPreview.length > 0 ? (
                <>
                  <div className={styles.reviewsPreviewList}>
                    {displayedReviews.map((rev) => (
                      <div key={rev._id} className={styles.previewReviewItem}>
                        <div className={styles.previewReviewHeader}>
                          <div className={styles.previewAuthor}>
                            {rev.author ? (rev.author.length <= 2 ? rev.author + '***' : rev.author[0] + '***' + rev.author[rev.author.length - 1]) : 'Khách hàng'}
                          </div>
                          <div className={styles.previewStars}>
                            {[1, 2, 3, 4, 5].map((s: number) => (
                              <FiStar
                                key={s}
                                size={11}
                                style={{
                                  fill: s <= rev.rating ? '#fbbf24' : 'none',
                                  color: '#fbbf24',
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        {rev.variantTitle && (
                          <span className={styles.previewVariant}>Phân loại: {rev.variantTitle}</span>
                        )}
                        <p className={styles.previewComment}>{rev.comment}</p>
                        {Array.isArray(rev.images) && rev.images.length > 0 && (
                          <div className={styles.previewImgs}>
                            {rev.images.slice(0, 5).map((imgUrl: string, idx: number) => (
                              <img
                                key={idx}
                                src={imgUrl}
                                alt="Review photo"
                                className={styles.previewImg}
                                onClick={() => setLightboxImage(imgUrl)}
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {reviewsPreview.length > 10 && (
                    <div className={styles.seeMoreReviewsWrap}>
                      <button
                        type="button"
                        className={styles.seeMoreReviewsBtn}
                        onClick={() => setIsReviewsExpanded(!isReviewsExpanded)}
                      >
                        {isReviewsExpanded ? (
                          <>
                            Thu gọn đánh giá <FiChevronUp size={16} />
                          </>
                        ) : (
                          <>
                            Xem thêm {reviewsPreview.length - 10} đánh giá khác <FiChevronDown size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.noReviewsYet}>
                  <p>Chưa có đánh giá nào cho sản phẩm này.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. PC Related Products: Có Thể Bạn Cũng Thích */}
        {relatedProducts.length > 0 && (
          <div className={styles.pcRelatedSection}>
            <div className={styles.relatedHeader}>
              <div className={styles.relatedTitleGroup}>
                <span className={styles.relatedSparkleIcon}>✨</span>
                <h3 className={styles.relatedTitle}>CÓ THỂ BẠN CŨNG THÍCH</h3>
              </div>
              <Link
                href={product.category?.slug ? `/?category=${encodeURIComponent(product.category.slug)}&tab=products` : '/?tab=products'}
                className={styles.relatedSeeAllBtn}
              >
                <span>Xem tất cả</span>
                <FiChevronRight size={14} />
              </Link>
            </div>

            <div className={styles.pcRelatedGrid}>
              {relatedProducts.map((relProd) => (
                <StoreProductCard
                  key={relProd._id}
                  product={relProd}
                  onQuickAdd={handleQuickAddRelated}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          3. EXPAND MODAL (FOR FULL DESCRIPTION & ALL REVIEWS)
          ========================================================================= */}
      {isExpandModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsExpandModalOpen(false)}>
          <div className={styles.expandModalSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.expandModalHeader}>
              <div className={styles.expandModalTabs}>
                <button
                  type="button"
                  className={`${styles.expandTabHeaderBtn} ${expandModalTab === 'desc' ? styles.activeExpandTab : ''}`}
                  onClick={() => setExpandModalTab('desc')}
                >
                  <FiPackage size={15} />
                  <span>Chi Tiết Mô Tả Sản Phẩm</span>
                </button>
                <button
                  type="button"
                  className={`${styles.expandTabHeaderBtn} ${expandModalTab === 'reviews' ? styles.activeExpandTab : ''}`}
                  onClick={() => setExpandModalTab('reviews')}
                >
                  <FiStar size={15} />
                  <span>Đánh Giá Từ Khách Hàng ({reviewsStats.totalReviews})</span>
                </button>
              </div>

              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsExpandModalOpen(false)}
                aria-label="Đóng"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className={styles.expandModalBody}>
              {expandModalTab === 'desc' ? (
                <div className={styles.fullDescContent}>
                  <div className={styles.descHighlightsBox}>
                    <h4>🌟 Đặc điểm nổi bật</h4>
                    <p>{product.name}</p>
                  </div>
                  {renderDescriptionContent(product.description, styles.fullDescText)}

                  <div className={styles.policyGuarantees}>
                    <div className={styles.policyItem}>
                      <FiShield size={20} color="var(--primary, #ee4d2d)" />
                      <div>
                        <strong>Cam kết chính hãng 100%</strong>
                        <p>Đảm bảo nguồn gốc xuất xứ rõ ràng, hoàn tiền nếu phát hiện hàng giả.</p>
                      </div>
                    </div>
                    <div className={styles.policyItem}>
                      <FiRefreshCw size={20} color="var(--primary, #ee4d2d)" />
                      <div>
                        <strong>Chính sách đổi trả trong 7 ngày</strong>
                        <p>Hỗ trợ đổi size hoặc hoàn tiền nếu sản phẩm có lỗi từ nhà sản xuất.</p>
                      </div>
                    </div>
                    <div className={styles.policyItem}>
                      <FiTruck size={20} color="var(--primary, #ee4d2d)" />
                      <div>
                        <strong>Giao hàng toàn quốc siêu tốc</strong>
                        <p>Kiểm tra hàng thoải mái trước khi thanh toán COD.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.fullReviewsContent}>
                  <div className={styles.fullReviewsStatsCard}>
                    <div className={styles.fullReviewsScoreGroup}>
                      <span className={styles.fullReviewsScoreNum}>{reviewsStats.averageRating || '5.0'}</span>
                      <div className={styles.fullReviewsStarsBig}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <FiStar
                            key={i}
                            size={16}
                            style={{
                              fill: i <= Math.round(reviewsStats.averageRating) ? '#fbbf24' : 'none',
                              color: '#fbbf24',
                            }}
                          />
                        ))}
                      </div>
                      <span className={styles.fullReviewsCountText}>{reviewsStats.totalReviews} đánh giá thực tế</span>
                    </div>

                    <button
                      type="button"
                      className={styles.writeReviewCtaBtn}
                      onClick={() => {
                        setIsExpandModalOpen(false);
                        setIsWriteModalOpen(true);
                      }}
                    >
                      <FiEdit3 size={15} />
                      <span>Viết Đánh Giá Ngay</span>
                    </button>
                  </div>

                  <div className={styles.fullReviewsList}>
                    {reviewsPreview.length > 0 ? (
                      reviewsPreview.map((rev) => (
                        <div key={rev._id} className={styles.fullReviewCard}>
                          <div className={styles.fullReviewTop}>
                            <div className={styles.fullReviewUserWrap}>
                              <div className={styles.userAvatarCircle}>
                                <FiUser size={14} />
                              </div>
                              <div>
                                <strong className={styles.fullReviewAuthor}>
                                  {rev.author || 'Khách hàng'}
                                </strong>
                                <div className={styles.verifiedBuyerTag}>
                                  <FiCheckCircle size={10} /> Đã mua hàng
                                </div>
                              </div>
                            </div>

                            <div className={styles.fullReviewStars}>
                              {[1, 2, 3, 4, 5].map((s: number) => (
                                <FiStar
                                  key={s}
                                  size={12}
                                  style={{
                                    fill: s <= rev.rating ? '#fbbf24' : 'none',
                                    color: '#fbbf24',
                                  }}
                                />
                              ))}
                            </div>
                          </div>

                          {rev.variantTitle && (
                            <span className={styles.fullReviewVariant}>
                              Phân loại: <strong>{rev.variantTitle}</strong>
                            </span>
                          )}

                          <p className={styles.fullReviewCommentText}>{rev.comment}</p>

                          {Array.isArray(rev.images) && rev.images.length > 0 && (
                            <div className={styles.fullReviewPhotos}>
                              {rev.images.map((imgUrl: string, idx: number) => (
                                <img
                                  key={idx}
                                  src={imgUrl}
                                  alt="Review"
                                  className={styles.fullReviewPhotoImg}
                                  onClick={() => setLightboxImage(imgUrl)}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className={styles.noReviewsFull}>
                        <p>Chưa có đánh giá nào cho sản phẩm này.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.expandModalFooter}>
              <button
                type="button"
                className={styles.modalCloseFooterBtn}
                onClick={() => setIsExpandModalOpen(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className={styles.modalBuyNowFooterBtn}
                onClick={() => {
                  setIsExpandModalOpen(false);
                  handleBuyNow();
                }}
              >
                <FiZap size={16} />
                <span>Mua Ngay ({formatPrice(currentPrice)})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. WRITE REVIEW MODAL
          ========================================================================= */}
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
              <div className={styles.ratingSelectorWrap}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
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
                      htmlFor="productReviewPhotoInput"
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
                    id="productReviewPhotoInput"
                    type="file"
                    ref={reviewFileInputRef}
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

      {/* =========================================================================
          5. LIGHTBOX MODAL
          ========================================================================= */}
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

      {/* =========================================================================
          6. VARIANT SELECTION STEP MODAL (CHỌN LOẠI SẢN PHẨM)
          ========================================================================= */}
      {isVariantModalOpen && product && (
        <ProductDetailModal
          product={
            flashSaleItem?.flashPrice && flashSaleItem?.isLive
              ? { ...product, flashPrice: flashSaleItem.flashPrice, isFlashSale: true }
              : product
          }
          initialAttributes={selectedAttributes}
          initialQuantity={quantity}
          mode={variantModalMode}
          onSuccess={handleVariantModalSuccess}
          onClose={() => setIsVariantModalOpen(false)}
        />
      )}

      {/* =========================================================================
          7. MODAL FOR RELATED PRODUCTS QUICK ADD
          ========================================================================= */}
      {selectedProductForModal && (
        <ProductDetailModal
          product={selectedProductForModal}
          onClose={() => setSelectedProductForModal(null)}
          mode="all"
        />
      )}
    </div>
  );
}