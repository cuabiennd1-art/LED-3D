'use client';

import React, { useState, useEffect } from 'react';
import { FiSearch, FiX, FiCheck, FiPackage } from 'react-icons/fi';
import { formatPrice, getProductCoverImage } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import styles from './ProductSelectModal.module.css';

interface ProductSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedProducts: any[]) => void;
  existingProductIds: string[];
}

export default function ProductSelectModal({
  isOpen,
  onClose,
  onSelect,
  existingProductIds,
}: ProductSelectModalProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds([]);
      setSearch('');
      return;
    }

    async function loadProducts() {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/products?limit=50&status=active`);
        const data = await res.json();
        if (data.success && data.data) {
          setProducts(data.data);
        }
      } catch (err) {
        console.error('Error fetching products for selection:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredProducts = products.filter((p) => {
    const isExcluded = existingProductIds.includes(p._id);
    if (isExcluded) return false;
    if (!search.trim()) return true;
    return (
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.slug?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredProducts.map((p) => p._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSubmit = () => {
    const selected = products.filter((p) => selectedIds.includes(p._id));
    onSelect(selected);
    onClose();
  };

  const isAllSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.includes(p._id));

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.title}>
            <FiPackage style={{ color: 'var(--primary, #3b82f6)' }} />
            <span>Chọn sản phẩm tham gia Flash Sale</span>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <FiX />
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchBar}>
          <div className={styles.searchInputWrap}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm theo tên..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Body Table */}
        <div className={styles.body}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--admin-text-muted, #9ca3af)' }}>
              Đang tải danh sách sản phẩm...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--admin-text-muted, #9ca3af)' }}>
              {products.length === 0
                ? 'Không có sản phẩm nào trong kho'
                : 'Tất cả sản phẩm đã được thêm vào Flash Sale hoặc không khớp tìm kiếm'}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th>Sản phẩm</th>
                  <th style={{ width: 120 }}>Giá gốc</th>
                  <th style={{ width: 90 }}>Tồn kho</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const isChecked = selectedIds.includes(p._id);
                  return (
                    <tr
                      key={p._id}
                      className={`${styles.productRow} ${isChecked ? styles.productRowSelected : ''}`}
                      onClick={() => toggleSelect(p._id)}
                    >
                      <td>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={isChecked}
                          onChange={() => toggleSelect(p._id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td>
                        <div className={styles.productCell}>
                          <img
                            src={getProductCoverImage(p, '/file.svg')}
                            alt={p.name}
                            className={styles.productThumb}
                          />
                          <div>
                            <div className={styles.productName}>{p.name}</div>
                            <div className={styles.productCategory}>
                              {p.category?.name || 'Sản phẩm'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--admin-text, #fff)' }}>
                        {formatPrice(p.price || 0)}
                      </td>
                      <td>
                        <span className={styles.badgeStock}>
                          {p.stock || 0} cái
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.selectedCount}>
            Đã chọn <strong>{selectedIds.length}</strong> sản phẩm
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              Hủy
            </button>
            <button
              type="button"
              className={styles.btnAdd}
              onClick={handleSubmit}
              disabled={selectedIds.length === 0}
            >
              Thêm {selectedIds.length > 0 ? `(${selectedIds.length})` : ''} vào Flash Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
