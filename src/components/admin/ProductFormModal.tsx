'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FiX,
  FiPlus,
  FiTrash2,
  FiUploadCloud,
  FiCheck,
  FiLayers,
  FiZap,
  FiTag,
  FiSliders,
  FiVideo,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import LazyImage from '@/components/common/LazyImage';
import { apiFetch } from '@/lib/api';
import { isVideoUrl } from '@/lib/utils';
import {
  IProductOption,
  IVariantItem,
  generateCartesianVariants,
} from '@/lib/variant-helper';
import ProductDescriptionEditor from '@/components/admin/ProductDescriptionEditor';
import styles from './ProductFormModal.module.css';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: any[];
}

const POPULAR_OPTION_SUGGESTIONS = [
  'Màu sắc',
  'Kích cỡ',
  'Dung lượng',
  'Khối lượng',
  'Thể tích',
  'Chất liệu',
  'RAM',
];

export default function ProductFormModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
}: ProductFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    salePrice: '',
    category: '',
    stock: 50,
    isFeatured: false,
    status: 'active' as 'active' | 'hidden',
    description: '',
  });

  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  // Senior Architecture: Options metadata & Cartesian Variants
  const [options, setOptions] = useState<IProductOption[]>([]);
  const [tagInputs, setTagInputs] = useState<Record<number, string>>({});
  const [variants, setVariants] = useState<IVariantItem[]>([]);

  // Bulk Edit Bar state
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkSalePrice, setBulkSalePrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const prevIsOpenRef = useRef(false);

  // Auto reset form state ONLY when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setFormData({
        name: '',
        price: '',
        salePrice: '',
        category: categories && categories.length > 0 ? categories[0]._id : '',
        stock: 50,
        isFeatured: false,
        status: 'active',
        description: '',
      });
      setImages([]);
      setVideo('');
      setNewImageUrl('');
      setOptions([]);
      setTagInputs({});
      setVariants([]);
      setBulkPrice('');
      setBulkSalePrice('');
      setBulkStock('');
      setIsSubmitting(false);
      setIsUploading(false);
      setIsUploadingVideo(false);
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, categories]);

  // Helper to format number with thousand dots separator (VD: 100.000)
  const formatWithDots = (val: string | number | undefined | null) => {
    if (val === '' || val === undefined || val === null) return '';
    const digits = val.toString().replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('vi-VN');
  };

  const parseFromDots = (val: string | number | undefined | null) => {
    if (typeof val === 'number') return val;
    const digits = (val || '').toString().replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  };

  // Sync total stock if variants exist
  useEffect(() => {
    if (variants.length > 0) {
      const sumStock = variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
      setFormData((prev) => ({ ...prev, stock: sumStock }));
    }
  }, [variants]);

  if (!isOpen) return null;

  // Add Image or Video via URL
  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    const url = newImageUrl.trim();
    setImages((prev) => [...prev, url]);
    if (isVideoUrl(url)) {
      setVideo(url);
    }
    setNewImageUrl('');
  };

  // Upload image to /api/upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('file', file);

    setIsUploading(true);
    try {
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: data,
      });
      const resData = await res.json();
      if (resData.success && resData.data?.url) {
        setImages((prev) => [...prev, resData.data.url]);
        toast.success('Tải ảnh lên thành công!');
      } else {
        toast.error(resData.message || 'Lỗi tải ảnh lên');
      }
    } catch (err) {
      toast.error('Lỗi khi tải file ảnh');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Upload video to /api/upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error('Kích thước video không được vượt quá 100MB');
      return;
    }

    const data = new FormData();
    data.append('file', file);

    setIsUploadingVideo(true);
    try {
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: data,
      });
      const resData = await res.json();
      if (resData.success && resData.data?.url) {
        const vidUrl = resData.data.url;
        setImages((prev) => [...prev, vidUrl]);
        setVideo(vidUrl);
        toast.success('Tải video lên thành công!');
      } else {
        toast.error(resData.message || 'Lỗi tải video lên');
      }
    } catch (err) {
      toast.error('Lỗi khi tải file video');
    } finally {
      setIsUploadingVideo(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const removedUrl = images[index];
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (video === removedUrl) {
      setVideo('');
    }
  };

  // Drag & drop reorder handlers for images / videos
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    setImages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // ================= OPTION BUILDER HANDLERS =================
  const handleAddOption = (defaultName = '') => {
    setOptions((prev) => [...prev, { name: defaultName, values: [] }]);
  };

  const handleUpdateOptionName = (idx: number, name: string) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === idx ? { ...opt, name } : opt))
    );
  };

  const handleRemoveOption = (idx: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddTagValue = (optIdx: number) => {
    const val = (tagInputs[optIdx] || '').trim();
    if (!val) return;

    setOptions((prev) =>
      prev.map((opt, i) => {
        if (i === optIdx) {
          if (opt.values.includes(val)) {
            toast.error(`Giá trị "${val}" đã tồn tại!`);
            return opt;
          }
          return { ...opt, values: [...opt.values, val] };
        }
        return opt;
      })
    );

    setTagInputs((prev) => ({ ...prev, [optIdx]: '' }));
  };

  const handleRemoveTagValue = (optIdx: number, valIdx: number) => {
    setOptions((prev) =>
      prev.map((opt, i) => {
        if (i === optIdx) {
          return { ...opt, values: opt.values.filter((_, vIndex) => vIndex !== valIdx) };
        }
        return opt;
      })
    );
  };

  // ================= CARTESIAN GENERATOR =================
  const handleGenerateCartesianVariants = () => {
    const rawPrice = parseFromDots(formData.price) || 0;
    const rawStock = Number(formData.stock) || 10;

    const validOptions = options.filter((opt) => opt.name?.trim() && opt.values.length > 0);
    if (validOptions.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 nhóm thuộc tính có giá trị (VD: Màu sắc: Đỏ, Xanh)!');
      return;
    }

    const generated = generateCartesianVariants(
      validOptions,
      rawPrice,
      rawStock,
      formData.name || 'SP'
    );

    if (generated.length === 0) {
      toast.error('Không thể sinh biến thể. Vui lòng kiểm tra lại các nhóm thuộc tính!');
      return;
    }

    setVariants(generated);
    toast.success(`Đã tự động sinh ${generated.length} biến thể thành công!`);
  };

  // ================= BULK APPLY HANDLER =================
  const handleBulkApply = () => {
    if (variants.length === 0) {
      toast.error('Chưa có biến thể nào để áp dụng!');
      return;
    }

    const parsedPrice = bulkPrice ? parseFromDots(bulkPrice) : undefined;
    const parsedSale = bulkSalePrice ? parseFromDots(bulkSalePrice) : undefined;
    const parsedStock = bulkStock ? Math.max(0, parseInt(bulkStock) || 0) : undefined;

    if (parsedPrice === undefined && parsedSale === undefined && parsedStock === undefined) {
      toast.error('Vui lòng nhập ít nhất một giá trị (Giá hoặc Tồn kho) để áp dụng hàng loạt!');
      return;
    }

    setVariants((prev) =>
      prev.map((v) => ({
        ...v,
        price: parsedPrice !== undefined ? parsedPrice : v.price,
        salePrice: parsedSale !== undefined ? parsedSale : v.salePrice,
        stock: parsedStock !== undefined ? parsedStock : v.stock,
      }))
    );

    toast.success('Đã áp dụng thay đổi cho tất cả các biến thể!');
  };

  // ================= VARIANT ROW HANDLERS =================
  const handleAddManualVariant = () => {
    const rawPrice = parseFromDots(formData.price) || 0;
    const rawStock = 10;
    const count = variants.length + 1;

    setVariants((prev) => [
      ...prev,
      {
        sku: `SP-CUSTOM-${count}`,
        title: `Tùy chọn ${count}`,
        attributes: { 'Phân loại': `Tùy chọn ${count}` },
        price: rawPrice,
        stock: rawStock,
      },
    ]);
  };

  const handleUpdateVariantField = (idx: number, field: keyof IVariantItem, val: any) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: val } : v))
    );
  };

  const handleRemoveVariant = (idx: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  // ================= FORM SUBMISSION =================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rawPrice = parseFromDots(formData.price);
    const rawSalePrice = formData.salePrice ? parseFromDots(formData.salePrice) : undefined;

    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên sản phẩm');
      return;
    }
    if (!rawPrice || rawPrice <= 0) {
      toast.error('Vui lòng nhập giá niêm yết hợp lệ');
      return;
    }
    if (!formData.category) {
      toast.error('Vui lòng chọn danh mục cho sản phẩm');
      return;
    }

    // Format variants for standard backend payload
    const preparedVariants = variants.map((v, i) => {
      const colorVal = v.attributes?.['Màu sắc'] || v.attributes?.['Màu'] || '';
      const sizeVal = v.attributes?.['Kích cỡ'] || v.attributes?.['Size'] || v.attributes?.['Kích thước'] || '';

      return {
        sku: v.sku?.trim() || `SKU-${i + 1}`,
        title: v.title || Object.values(v.attributes || {}).join(' / ') || `Biến thể ${i + 1}`,
        name: v.title || Object.values(v.attributes || {}).join(' / '),
        color: colorVal || undefined,
        size: sizeVal || undefined,
        attributes: v.attributes || {},
        price: Number(v.price) || rawPrice,
        salePrice: v.salePrice !== undefined && v.salePrice !== null ? Number(v.salePrice) : 0,
        stock: Math.max(0, Number(v.stock) || 0),
        image: v.image || '',
      };
    });

    const determinedVideo = video || images.find(isVideoUrl) || '';
    const payload = {
      name: formData.name.trim(),
      price: rawPrice,
      salePrice: rawSalePrice,
      category: formData.category,
      images: images.length > 0 ? images : ['/file.svg'],
      video: determinedVideo,
      stock: Number(formData.stock) || 0,
      isFeatured: formData.isFeatured,
      status: formData.status,
      description: formData.description.trim(),
      options: options.filter((opt) => opt.name?.trim() && opt.values.length > 0),
      variants: preparedVariants,
    };

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Thêm sản phẩm mới thành công!');
        onSuccess();
        onClose();
      } else {
        toast.error(data.message || 'Lỗi thêm sản phẩm');
      }
    } catch (err) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            <FiLayers style={{ color: 'var(--primary, #3b82f6)' }} /> Thêm Sản Phẩm Mới
          </h2>
          <button className={styles.closeBtn} onClick={onClose} title="Đóng">
            <FiX />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className={styles.body}>
          {/* Row 1: Name & Category */}
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Tên sản phẩm *</label>
              <input
                type="text"
                required
                className={styles.input}
                placeholder="VD: Điện Thoại iPhone 15 Pro Max"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Danh mục sản phẩm *</label>
              <select
                required
                className={styles.select}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Price, Sale Price, Stock */}
          <div className={styles.grid3}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Giá niêm yết (VNĐ) *</label>
              <input
                type="text"
                inputMode="numeric"
                required
                className={styles.input}
                placeholder="VD: 380.000"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: formatWithDots(e.target.value) })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Giá khuyến mãi (VNĐ)</label>
              <input
                type="text"
                inputMode="numeric"
                className={styles.input}
                placeholder="VD: 299.000"
                value={formData.salePrice}
                onChange={(e) => setFormData({ ...formData, salePrice: formatWithDots(e.target.value) })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Tổng tồn kho {variants.length > 0 && <span style={{ color: 'var(--primary, #3b82f6)', fontSize: '0.75rem' }}>(Tự động tính từ biến thể)</span>}
              </label>
              <input
                type="number"
                min="0"
                className={styles.input}
                placeholder="VD: 50"
                value={formData.stock}
                readOnly={variants.length > 0}
                onChange={(e) => setFormData({ ...formData, stock: Math.max(0, parseInt(e.target.value) || 0) })}
              />
            </div>
          </div>

          {/* Row 3: Images & Videos Manager */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Hình ảnh & Video sản phẩm
              <span className={styles.dragHint}>(Kéo thả các ô để thay đổi thứ tự hiển thị)</span>
            </label>
            <div className={styles.imageSection}>
              {images.length > 0 && (
                <div className={styles.imageList}>
                  {images.map((img, idx) => {
                    const isVid = isVideoUrl(img);
                    const isDragging = draggedIndex === idx;
                    const isDragOver = dragOverIndex === idx;
                    return (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={`${styles.imageItem} ${isDragging ? styles.imageItemDragging : ''} ${isDragOver ? styles.imageItemDragOver : ''}`}
                        title="Kéo thả để sắp xếp thứ tự hiển thị"
                      >
                        <span className={`${styles.imageIndexBadge} ${idx === 0 ? styles.coverBadge : ''}`}>
                          {idx === 0 ? 'Bìa' : `#${idx + 1}`}
                        </span>
                        {isVid ? (
                          <>
                            <video
                              src={img}
                              className={styles.thumbVideo}
                              muted
                              preload="metadata"
                              playsInline
                            />
                            <div className={styles.videoBadge}>
                              <FiVideo size={10} /> Video
                            </div>
                          </>
                        ) : (
                          <LazyImage src={img} alt={`Ảnh ${idx + 1}`} style={{ width: '100%', height: '100%' }} />
                        )}
                        <button
                          type="button"
                          draggable={false}
                          className={styles.removeImgBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(idx);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          title={isVid ? 'Xóa video này' : 'Xóa ảnh này'}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className={styles.imageInputs}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Nhập đường dẫn URL ảnh/video hoặc upload..."
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImageUrl();
                    }
                  }}
                />
                <button
                  type="button"
                  className={styles.uploadBtn}
                  onClick={handleAddImageUrl}
                  disabled={!newImageUrl.trim()}
                >
                  <FiPlus /> Thêm link
                </button>
                <button
                  type="button"
                  className={styles.uploadBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isUploadingVideo}
                >
                  <FiUploadCloud /> {isUploading ? 'Đang tải...' : 'Upload ảnh'}
                </button>
                <button
                  type="button"
                  className={styles.uploadVideoBtn}
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isUploading || isUploadingVideo}
                  title="Tải video MP4/WebM từ thiết bị"
                >
                  <FiVideo /> {isUploadingVideo ? 'Đang tải video...' : 'Upload video'}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleFileUpload}
                />
                <input
                  type="file"
                  ref={videoInputRef}
                  style={{ display: 'none' }}
                  accept="video/*"
                  onChange={handleVideoUpload}
                />
              </div>
            </div>
          </div>

          {/* ================= SENIOR ARCHITECTURE: OPTIONS BUILDER & CARTESIAN MATRIX ================= */}
          <div className={styles.variantSection}>
            {/* Option Builder Header */}
            <div className={styles.variantHeader}>
              <div>
                <label className={styles.label} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiSliders style={{ color: 'var(--primary, #3b82f6)' }} /> 1. Thiết Lập Nhóm Thuộc Tính (Options)
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', display: 'block', marginTop: 2 }}>
                  Tạo các nhóm phân loại (Màu sắc, Dung lượng, Size...) để tự động sinh ma trận biến thể
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={styles.addVariantBtn}
                  onClick={() => handleAddOption()}
                >
                  <FiPlus /> Thêm nhóm thuộc tính
                </button>
              </div>
            </div>

            {/* Quick Suggestions Chips */}
            <div className={styles.suggestionChips}>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted, #94a3b8)', alignSelf: 'center' }}>Gợi ý nhanh:</span>
              {POPULAR_OPTION_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  className={styles.suggestionChip}
                  onClick={() => {
                    const alreadyExists = options.some((opt) => opt.name?.toLowerCase() === sug.toLowerCase());
                    if (alreadyExists) {
                      toast.error(`Nhóm "${sug}" đã được thêm!`);
                    } else {
                      handleAddOption(sug);
                    }
                  }}
                >
                  + {sug}
                </button>
              ))}
            </div>

            {/* List of Option Cards */}
            {options.length === 0 ? (
              <div className={styles.emptyOptionBox}>
                Chưa có nhóm thuộc tính nào. Bấm <strong>"+ Thêm nhóm thuộc tính"</strong> hoặc chọn gợi ý ở trên nếu sản phẩm có nhiều phân loại.
              </div>
            ) : (
              options.map((opt, optIdx) => (
                <div key={optIdx} className={styles.optionCard}>
                  <div className={styles.optionCardHeader}>
                    <div style={{ flex: 1, maxWidth: 260 }}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Tên nhóm (VD: Màu sắc, Size, Dung lượng...)"
                        value={opt.name}
                        onChange={(e) => handleUpdateOptionName(optIdx, e.target.value)}
                        style={{ height: 36, fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </div>

                    <button
                      type="button"
                      className={styles.deleteVariantBtn}
                      onClick={() => handleRemoveOption(optIdx)}
                      title="Xóa nhóm thuộc tính này"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>

                  {/* Tag List & Tag Input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className={styles.tagList}>
                      {opt.values.length === 0 ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
                          Chưa có giá trị. Nhập giá trị bên dưới và nhấn Enter.
                        </span>
                      ) : (
                        opt.values.map((val, valIdx) => (
                          <span key={valIdx} className={styles.tagBadge}>
                            <FiTag size={11} /> {val}
                            <button
                              type="button"
                              className={styles.tagRemoveBtn}
                              onClick={() => handleRemoveTagValue(optIdx, valIdx)}
                              title="Xóa giá trị này"
                            >
                              ✕
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder={`Nhập giá trị cho "${opt.name || 'nhóm'}" (VD: Đen, Trắng, 128GB...) và ấn Enter`}
                        value={tagInputs[optIdx] || ''}
                        onChange={(e) => setTagInputs({ ...tagInputs, [optIdx]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTagValue(optIdx);
                          }
                        }}
                        style={{ height: 34, fontSize: '0.8125rem' }}
                      />
                      <button
                        type="button"
                        className={styles.uploadBtn}
                        onClick={() => handleAddTagValue(optIdx)}
                        style={{ height: 34 }}
                      >
                        <FiPlus /> Thêm giá trị
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Generator Action Bar */}
            {options.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, flexWrap: 'wrap', gap: 10 }}>
                <span style={{ fontSize: '0.775rem', color: 'var(--text-muted, #94a3b8)' }}>
                  Tổng số biến thể dự kiến:{' '}
                  <strong style={{ color: 'var(--primary, #3b82f6)' }}>
                    {options.reduce((acc, opt) => acc * (opt.values.length || 1), options.some((o) => o.values.length > 0) ? 1 : 0)} biến thể
                  </strong>
                </span>
                <button
                  type="button"
                  className={styles.generateBtn}
                  onClick={handleGenerateCartesianVariants}
                >
                  <FiZap /> Sinh Biến Thể Tự Động (Tích Descartes)
                </button>
              </div>
            )}

            {/* ================= 2. VARIANTS MATRIX TABLE ================= */}
            <div style={{ marginTop: 12, borderTop: '1px solid var(--border-color, #232838)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className={styles.variantHeader}>
                <div>
                  <label className={styles.label} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiLayers style={{ color: '#a855f7' }} /> 2. Danh Sách Biến Thể Chi Tiết ({variants.length})
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', display: 'block', marginTop: 2 }}>
                    Tùy chỉnh giá bán, giá sale, mã SKU và tồn kho riêng cho từng biến thể
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.addVariantBtn}
                  onClick={handleAddManualVariant}
                >
                  <FiPlus /> Thêm thủ công
                </button>
              </div>

              {/* Bulk Edit Bar */}
              {variants.length > 1 && (
                <div className={styles.bulkBar}>
                  <span className={styles.bulkTitle}>Áp dụng nhanh cho tất cả:</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Giá bán (₫)"
                    className={styles.input}
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(formatWithDots(e.target.value))}
                    style={{ width: 120, height: 32, fontSize: '0.775rem' }}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Giá sale (₫)"
                    className={styles.input}
                    value={bulkSalePrice}
                    onChange={(e) => setBulkSalePrice(formatWithDots(e.target.value))}
                    style={{ width: 120, height: 32, fontSize: '0.775rem' }}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Tồn kho"
                    className={styles.input}
                    value={bulkStock}
                    onChange={(e) => setBulkStock(e.target.value)}
                    style={{ width: 90, height: 32, fontSize: '0.775rem' }}
                  />
                  <button
                    type="button"
                    className={styles.bulkApplyBtn}
                    onClick={handleBulkApply}
                  >
                    Áp dụng tất cả
                  </button>
                </div>
              )}

              {/* Matrix Table */}
              {variants.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted, #94a3b8)' }}>
                  Chưa có biến thể nào được tạo. Hãy bấm nút <strong>"Sinh Biến Thể Tự Động"</strong> ở trên hoặc thêm thủ công.
                </p>
              ) : (
                <div className={styles.matrixTableWrap}>
                  <table className={styles.matrixTable}>
                    <thead>
                      <tr>
                        <th>Tên phân loại / Biến thể</th>
                        <th style={{ width: 140 }}>Mã SKU</th>
                        <th style={{ width: 125 }}>Giá riêng (₫) *</th>
                        <th style={{ width: 125 }}>Giá sale (₫)</th>
                        <th style={{ width: 85 }}>Kho *</th>
                        <th style={{ width: 40, textAlign: 'center' }}>Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v, idx) => (
                        <tr key={idx}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <strong style={{ color: 'var(--text-main, #f8fafc)' }}>{v.title || `Biến thể ${idx + 1}`}</strong>
                              {v.attributes && (
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {Object.entries(v.attributes).map(([k, val]) => (
                                    <span key={k} className={styles.attributeBadge}>
                                      {k}: {val}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <input
                              type="text"
                              className={styles.input}
                              value={v.sku || ''}
                              onChange={(e) => handleUpdateVariantField(idx, 'sku', e.target.value)}
                              style={{ height: 32, fontSize: '0.775rem', fontFamily: 'monospace' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              inputMode="numeric"
                              className={styles.input}
                              placeholder="Giá bán"
                              value={formatWithDots(v.price)}
                              onChange={(e) =>
                                handleUpdateVariantField(idx, 'price', parseFromDots(e.target.value))
                              }
                              style={{ height: 32, fontSize: '0.775rem', fontWeight: 600, color: '#60a5fa' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              inputMode="numeric"
                              className={styles.input}
                              placeholder="Giá sale"
                              value={formatWithDots(v.salePrice)}
                              onChange={(e) =>
                                handleUpdateVariantField(
                                  idx,
                                  'salePrice',
                                  e.target.value ? parseFromDots(e.target.value) : undefined
                                )
                              }
                              style={{ height: 32, fontSize: '0.775rem' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              className={styles.input}
                              value={v.stock !== undefined ? v.stock : 0}
                              onChange={(e) =>
                                handleUpdateVariantField(
                                  idx,
                                  'stock',
                                  Math.max(0, parseInt(e.target.value) || 0)
                                )
                              }
                              style={{ height: 32, fontSize: '0.775rem' }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className={styles.deleteVariantBtn}
                              onClick={() => handleRemoveVariant(idx)}
                              title="Xóa biến thể này"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Row 5: Description */}
          <div className={styles.formGroup}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className={styles.label} style={{ margin: 0 }}>
                Mô tả sản phẩm (Văn bản, hình ảnh & video xen kẽ)
              </label>
              <span style={{ fontSize: 11.5, color: '#c084fc', fontWeight: 600 }}>
                📹 Hỗ trợ tải Video lưu vào CSDL MongoDB
              </span>
            </div>
            <ProductDescriptionEditor
              value={formData.description}
              onChange={(val) => setFormData({ ...formData, description: val })}
              placeholder="Nhập mô tả chi tiết, chèn hình ảnh hoặc tải video xen kẽ giữa các đoạn văn..."
            />
          </div>

          {/* Row 6: Toggles */}
          <div className={styles.checkboxRow}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
              />
              Sản phẩm nổi bật (Hiển thị trang chủ)
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={formData.status === 'active'}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.checked ? 'active' : 'hidden' })
                }
              />
              Mở bán ngay lập tức (Active)
            </label>
          </div>

          {/* Footer Submit Buttons */}
          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
              Hủy bỏ
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              <FiCheck /> {isSubmitting ? 'Đang lưu...' : 'Lưu Sản Phẩm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
