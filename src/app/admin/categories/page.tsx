'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSearch, FiFolder, FiBox, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Skeleton from '@/components/common/Skeleton';
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '', order: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Categories (API 3.1)
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (e) {
      toast.error('Lỗi tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Open Create Modal (API 3.2)
  const handleOpenAdd = () => {
    setEditingCat(null);
    setFormData({ name: '', description: '', order: categories.length + 1 });
    setIsModalOpen(true);
  };

  // Open Edit Modal (API 3.3)
  const handleOpenEdit = (cat: any) => {
    setEditingCat(cat);
    setFormData({
      name: cat.name || '',
      description: cat.description || '',
      order: cat.order ?? 0,
    });
    setIsModalOpen(true);
  };

  // Submit Category (Create / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên danh mục');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingCat ? `/api/categories/${editingCat._id}` : '/api/categories';
      const method = editingCat ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingCat ? 'Cập nhật danh mục thành công!' : 'Thêm danh mục mới thành công!');
        setIsModalOpen(false);
        fetchCategories();
      } else {
        toast.error(data.message || 'Lỗi xử lý danh mục');
      }
    } catch (err) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Category (API 3.3)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/categories/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã xóa danh mục "${deleteTarget.name}"`);
        setDeleteTarget(null);
        fetchCategories();
      } else {
        toast.error(data.message || 'Lỗi xóa danh mục');
      }
    } catch (err) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter Categories by search
  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.slug && c.slug.toLowerCase().includes(search.toLowerCase()))
  );

  const totalProducts = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Quản Lý Danh Mục</h1>
          <p className={styles.subtitle}>Phân loại cấu trúc danh mục và kiểm soát số lượng sản phẩm liên quan</p>
        </div>

        <button className={styles.addBtn} onClick={handleOpenAdd}>
          <FiPlus /> Thêm danh mục mới
        </button>
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FiFolder />
          </div>
          <div>
            <div className={styles.statValue}>{categories.length}</div>
            <div className={styles.statLabel}>Tổng số danh mục</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: 'var(--accent, #10b981)', background: 'rgba(16, 185, 129, 0.12)' }}>
            <FiBox />
          </div>
          <div>
            <div className={styles.statValue}>{totalProducts}</div>
            <div className={styles.statLabel}>Tổng sản phẩm phân loại</div>
          </div>
        </div>
      </div>

      {/* Main Categories Card */}
      <div className={styles.card}>
        {/* Search Bar */}
        <div className={styles.filterBar}>
          <div className={styles.searchBox}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm kiếm danh mục theo tên hoặc slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Categories Table (Desktop) & Cards (Mobile) */}
        {loading ? (
          <div style={{ padding: 16 }}>
            <Skeleton type="table-row" count={5} />
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 769px) */}
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Thứ tự</th>
                    <th>Tên danh mục</th>
                    <th>Đường dẫn (Slug)</th>
                    <th>Mô tả</th>
                    <th>Số sản phẩm</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted, #9ca3af)', padding: 40 }}>
                        Không tìm thấy danh mục nào phù hợp
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((cat) => (
                      <tr key={cat._id}>
                        <td>
                          <span className={styles.orderBadge}>#{cat.order ?? 0}</span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-main, #ffffff)', fontSize: '0.9375rem' }}>{cat.name}</strong>
                        </td>
                        <td>
                          <span className={styles.slugCode}>{cat.slug}</span>
                        </td>
                        <td style={{ color: 'var(--text-muted, #94a3b8)', maxWidth: 260 }}>
                          {cat.description || '-'}
                        </td>
                        <td>
                          <span className={styles.countBadge}>
                            <FiBox /> {cat.productCount || 0} sản phẩm
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => handleOpenEdit(cat)}
                              title="Chỉnh sửa danh mục"
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              type="button"
                              className={`${styles.actionBtn} ${styles.dangerBtn}`}
                              onClick={() => setDeleteTarget({ id: cat._id, name: cat.name })}
                              title="Xóa danh mục"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Category Cards View (<= 768px - ZERO horizontal scroll) */}
            <div className={styles.mobileCategoryList}>
              {filteredCategories.length === 0 ? (
                <div className={styles.emptyMobile}>
                  <FiFolder size={32} style={{ color: 'var(--text-muted, #64748b)' }} />
                  <span>Không tìm thấy danh mục nào phù hợp</span>
                </div>
              ) : (
                filteredCategories.map((cat) => (
                  <div key={cat._id} className={styles.categoryCard}>
                    <div className={styles.categoryCardHeader}>
                      <div className={styles.categoryCardTitleArea}>
                        <span className={styles.orderBadge}>#{cat.order ?? 0}</span>
                        <strong className={styles.categoryCardName}>{cat.name}</strong>
                      </div>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleOpenEdit(cat)}
                          title="Chỉnh sửa danh mục"
                        >
                          <FiEdit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.dangerBtn}`}
                          onClick={() => setDeleteTarget({ id: cat._id, name: cat.name })}
                          title="Xóa danh mục"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className={styles.categoryCardMeta}>
                      <span className={styles.slugCode}>{cat.slug || cat._id}</span>
                      <span className={styles.countBadge}>
                        <FiBox size={13} /> {cat.productCount || 0} sản phẩm
                      </span>
                    </div>

                    {cat.description && (
                      <p className={styles.categoryCardDesc}>
                        {cat.description}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Thêm / Chỉnh Sửa Danh Mục (API 3.2 & 3.3) */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingCat ? 'Chỉnh Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
              </h3>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)} title="Đóng">
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tên danh mục *</label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    placeholder="VD: Áo Thun Nam"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Mô tả ngắn danh mục</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="VD: Các mẫu áo thun cotton thoáng mát, form rộng hiện đại..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Thứ tự hiển thị (Ưu tiên số nhỏ hơn)</label>
                  <input
                    type="number"
                    min="0"
                    className={styles.input}
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className={styles.saveBtn} disabled={isSubmitting}>
                  <FiCheck /> {isSubmitting ? 'Đang lưu...' : editingCat ? 'Lưu Cập Nhật' : 'Tạo Danh Mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Danh Mục */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title="Xác Nhận Xóa Danh Mục"
        message="Hành động này sẽ xóa danh mục khỏi hệ thống. Các sản phẩm thuộc danh mục này sẽ chuyển sang trạng thái chưa phân loại."
        itemTitle={deleteTarget?.name}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}