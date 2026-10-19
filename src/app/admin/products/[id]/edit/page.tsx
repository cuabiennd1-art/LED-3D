'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FiArrowLeft, FiUploadCloud, FiTrash2, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import AdminLoading from '@/components/admin/AdminLoading';
import { apiFetch } from '@/lib/api';
import ProductDescriptionEditor from '@/components/admin/ProductDescriptionEditor';
import styles from '../../new/page.module.css';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Helper to format number with thousand dots separator (VD: 100.000)
  const formatWithDots = (val: string | number) => {
    if (val === '' || val === undefined || val === null) return '';
    const digits = val.toString().replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('vi-VN');
  };

  const parseFromDots = (val: string | number) => {
    if (typeof val === 'number') return val;
    const digits = (val || '').toString().replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  };

  const [form, setForm] = useState({
    name: '',
    price: 0,
    salePrice: 0,
    category: '',
    images: [] as string[],
    stock: 100,
    soldCount: 0,
    description: '',
    isFeatured: false,
    status: 'active',
    variants: [] as { color?: string; size?: string; price?: number; salePrice?: number; stock?: number }[],
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load categories
        const catRes = await apiFetch('/api/categories');
        const catData = await catRes.json();
        if (catData.success) {
          setCategories(catData.data || []);
        }

        // Load product
        const prodRes = await apiFetch(`/api/products/${id}`);
        const prodData = await prodRes.json();
        if (prodData.success && prodData.data) {
          const p = prodData.data;
          setForm({
            name: p.name || '',
            price: p.price || 0,
            salePrice: p.salePrice || 0,
            category: p.category?._id || p.category || '',
            images: p.images || [],
            stock: p.stock ?? 0,
            soldCount: p.soldCount ?? p.sold ?? 0,
            description: p.description || '',
            isFeatured: p.isFeatured || false,
            status: p.status || 'active',
            variants: p.variants || [],
          });
        }
      } catch (e) {
        toast.error('Lỗi tải thông tin sản phẩm');
      } finally {
        setLoading(false);
      }
    }
    if (id) loadData();
  }, [id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        const res = await apiFetch('/api/upload', { method: 'POST', body: formData });
        if (res.status === 413) {
          toast.error(`Ảnh ${files[i].name} vượt quá 4.5MB giới hạn của Vercel`);
          continue;
        }
        let data: any = null;
        try {
          data = await res.json();
        } catch {}
        if (data?.success && data.data?.url) {
          uploadedUrls.push(data.data.url);
        }
      }
      setForm((prev) => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      toast.success('Đã tải ảnh lên thành công');
    } catch (err) {
      toast.error('Lỗi khi tải ảnh');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const addVariant = () => {
    setForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          color: 'Đen',
          size: 'L',
          price: form.price || 0,
          salePrice: form.salePrice ? form.salePrice : undefined,
          stock: 20,
        },
      ],
    }));
  };

  const removeVariant = (index: number) => {
    setForm((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));
  };

  const updateVariant = (index: number, key: string, value: any) => {
    setForm((prev) => {
      const updated = [...prev.variants];
      updated[index] = { ...updated[index], [key]: value };
      return { ...prev, variants: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.category) {
      toast.error('Vui lòng nhập tên sản phẩm, giá và danh mục');
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Cập nhật sản phẩm thành công!');
        router.push('/admin/products');
      } else {
        toast.error(data.message || 'Lỗi cập nhật');
      }
    } catch (err) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLoading text="Đang tải dữ liệu sản phẩm..." />;

  return (
    <form className={styles.page} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Link href="/admin/products" className={styles.backBtn}>
            <FiArrowLeft />
          </Link>
          <h1 className={styles.title}>Chỉnh sửa sản phẩm</h1>
        </div>
        <div className={styles.actions}>
          <button type="submit" disabled={saving} className={styles.btnPrimary}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.mainCol}>
          <div className={styles.card}>
            <h3>Thông tin cơ bản</h3>
            <div className={styles.formGroup}>
              <label>Tên sản phẩm *</label>
              <input
                type="text"
                required
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ margin: 0 }}>Mô tả chi tiết (Văn bản, hình ảnh & video xen kẽ)</label>
                <span style={{ fontSize: 11.5, color: '#c084fc', fontWeight: 600 }}>
                  📹 Hỗ trợ tải Video lưu vào CSDL MongoDB
                </span>
              </div>
              <ProductDescriptionEditor
                value={form.description}
                onChange={(val) => setForm({ ...form, description: val })}
                placeholder="Mô tả chi tiết, chèn hình ảnh hoặc tải video xen kẽ giữa các đoạn văn..."
              />
            </div>
          </div>

          <div className={styles.card}>
            <h3>Hình ảnh sản phẩm</h3>
            <div
              className={styles.uploadArea}
              onClick={() => fileInputRef.current?.click()}
              style={{ cursor: 'pointer' }}
            >
              <FiUploadCloud className={styles.uploadIcon} />
              <p>{uploading ? 'Đang upload ảnh...' : 'Click để chọn thêm ảnh từ máy tính'}</p>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>

            {form.images.length > 0 && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                {form.images.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img
                      src={img}
                      alt={`Product ${idx}`}
                      style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid #2d3343' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        background: '#ef4444',
                        color: '#fff',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Biến thể sản phẩm (Màu, Size)</h3>
              <button type="button" className={styles.btnSecondary} onClick={addVariant}>
                <FiPlus /> Thêm biến thể
              </button>
            </div>

            {form.variants.map((v, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid #232838',
                }}
              >
                <input
                  type="text"
                  placeholder="Màu sắc"
                  className={styles.input}
                  value={v.color || ''}
                  onChange={(e) => updateVariant(idx, 'color', e.target.value)}
                  style={{ flex: 1 }}
                />
                <input
                  type="text"
                  placeholder="Size"
                  className={styles.input}
                  value={v.size || ''}
                  onChange={(e) => updateVariant(idx, 'size', e.target.value)}
                  style={{ flex: 1 }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Giá bán"
                  className={styles.input}
                  value={formatWithDots(v.price || 0)}
                  onChange={(e) => updateVariant(idx, 'price', parseFromDots(e.target.value))}
                  style={{ width: 110 }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Giá sale"
                  className={styles.input}
                  value={v.salePrice ? formatWithDots(v.salePrice) : ''}
                  onChange={(e) =>
                    updateVariant(idx, 'salePrice', e.target.value ? parseFromDots(e.target.value) : undefined)
                  }
                  style={{ width: 110 }}
                />
                <input
                  type="number"
                  placeholder="Tồn kho"
                  className={styles.input}
                  value={v.stock || 0}
                  onChange={(e) => updateVariant(idx, 'stock', parseInt(e.target.value) || 0)}
                  style={{ width: 80 }}
                />
                <button
                  type="button"
                  onClick={() => removeVariant(idx)}
                  style={{ color: '#ef4444', padding: 8 }}
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.sideCol}>
          <div className={styles.card}>
            <h3>Trạng thái hiển thị</h3>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.status === 'active'}
                  onChange={(e) => setForm({ ...form, status: e.target.checked ? 'active' : 'hidden' })}
                />
                Đang mở bán
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                />
                Sản phẩm nổi bật (Trang chủ)
              </label>
            </div>
          </div>

          <div className={styles.card}>
            <h3>Danh mục sản phẩm</h3>
            <div className={styles.formGroup}>
              <label>Chọn danh mục *</label>
              <select
                className={styles.select}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.card}>
            <h3>Giá & Kho hàng</h3>
            <div className={styles.formGroup}>
              <label>Giá niêm yết (₫) *</label>
              <input
                type="text"
                inputMode="numeric"
                required
                className={styles.input}
                placeholder="VD: 380.000"
                value={formatWithDots(form.price)}
                onChange={(e) => setForm({ ...form, price: parseFromDots(e.target.value) })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Giá khuyến mãi (₫)</label>
              <input
                type="text"
                inputMode="numeric"
                className={styles.input}
                placeholder="VD: 299.000"
                value={formatWithDots(form.salePrice)}
                onChange={(e) => setForm({ ...form, salePrice: parseFromDots(e.target.value) })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Tổng số lượng tồn kho</label>
              <input
                type="number"
                className={styles.input}
                value={form.stock || ''}
                onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Lượt đã bán (Hiển thị ngoài shop)</label>
              <input
                type="number"
                className={styles.input}
                value={form.soldCount !== undefined && form.soldCount !== null ? form.soldCount : ''}
                onChange={(e) => setForm({ ...form, soldCount: parseInt(e.target.value) || 0 })}
                placeholder="VD: 500"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
