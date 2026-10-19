import Product from '@/models/Product';
import { getProductCoverImage } from '@/lib/utils';

export interface ILowStockWarningItem {
  productName: string;
  productImage: string;
  variantTitle: string;
  orderedQuantity: number;
  availableStock: number;
  deficit: number;
}

/**
 * Kiểm tra tồn kho trước khi duyệt đơn hàng
 */
export async function checkOrderLowStock(order: any): Promise<ILowStockWarningItem[]> {
  const lowStockItems: ILowStockWarningItem[] = [];
  if (!Array.isArray(order.items) || order.items.length === 0) return lowStockItems;

  for (const item of order.items) {
    if (!item.productId) continue;
    const prod = await Product.findById(item.productId);
    if (!prod) continue;

    const qty = Number(item.quantity) || 1;

    if (item.variant && Array.isArray(prod.variants) && prod.variants.length > 0) {
      const varIdStr = item.variant._id ? String(item.variant._id) : '';
      const varSku = item.variant.sku || '';
      const varTitle = item.variant.title || item.variant.name || '';
      const varAttrs = item.variant.attributes instanceof Map
        ? Object.fromEntries(item.variant.attributes)
        : (item.variant.attributes || {});

      const matchedV = prod.variants.find((v: any) => {
        if (varIdStr && v._id && String(v._id) === varIdStr) return true;
        if (varSku && v.sku && v.sku.toLowerCase() === varSku.toLowerCase()) return true;
        if (varTitle && v.title && v.title.toLowerCase() === varTitle.toLowerCase()) return true;
        if (Object.keys(varAttrs).length > 0 && v.attributes) {
          const vAttrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : v.attributes;
          const keys = Object.keys(varAttrs);
          if (keys.every((k) => varAttrs[k] === vAttrs[k])) return true;
        }
        return false;
      });

      const avail = matchedV ? (Number(matchedV.stock) || 0) : 0;
      if (qty > avail) {
        const vTitle = matchedV?.title || item.variant?.title || 'Phân loại đã chọn';
        lowStockItems.push({
          productName: prod.name,
          productImage: matchedV?.image || item.image || getProductCoverImage(prod, '/file.svg'),
          variantTitle: vTitle,
          orderedQuantity: qty,
          availableStock: avail,
          deficit: qty - avail,
        });
      }
    } else {
      const avail = Number(prod.stock) || 0;
      if (qty > avail) {
        lowStockItems.push({
          productName: prod.name,
          productImage: item.image || getProductCoverImage(prod, '/file.svg'),
          variantTitle: 'Mặc định',
          orderedQuantity: qty,
          availableStock: avail,
          deficit: qty - avail,
        });
      }
    }
  }

  return lowStockItems;
}

/**
 * Tự động trừ tồn kho theo từng biến thể khi đơn hàng được duyệt/thanh toán
 */
export async function deductOrderInventory(order: any): Promise<boolean> {
  if (order.inventoryDeducted) return false;
  if (!Array.isArray(order.items) || order.items.length === 0) return false;

  for (const item of order.items) {
    if (!item.productId) continue;
    const prod = await Product.findById(item.productId);
    if (!prod) continue;

    const qty = Number(item.quantity) || 1;

    // Nếu sản phẩm có phân loại biến thể
    if (item.variant && Array.isArray(prod.variants) && prod.variants.length > 0) {
      const varIdStr = item.variant._id ? String(item.variant._id) : '';
      const varSku = item.variant.sku || '';
      const varTitle = item.variant.title || item.variant.name || '';
      const varAttrs = item.variant.attributes instanceof Map
        ? Object.fromEntries(item.variant.attributes)
        : (item.variant.attributes || {});

      const vIndex = prod.variants.findIndex((v: any) => {
        if (varIdStr && v._id && String(v._id) === varIdStr) return true;
        if (varSku && v.sku && v.sku.toLowerCase() === varSku.toLowerCase()) return true;
        if (varTitle && v.title && v.title.toLowerCase() === varTitle.toLowerCase()) return true;
        if (Object.keys(varAttrs).length > 0 && v.attributes) {
          const vAttrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : v.attributes;
          const keys = Object.keys(varAttrs);
          if (keys.every((k) => varAttrs[k] === vAttrs[k])) return true;
        }
        return false;
      });

      if (vIndex !== -1) {
        prod.variants[vIndex].stock = Math.max(0, (Number(prod.variants[vIndex].stock) || 0) - qty);
      }
      prod.stock = prod.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
    } else {
      prod.stock = Math.max(0, (Number(prod.stock) || 0) - qty);
    }

    prod.soldCount = (Number(prod.soldCount) || 0) + qty;
    await prod.save();
  }

  order.inventoryDeducted = true;
  return true;
}

/**
 * Hoàn trả lại tồn kho nếu đơn hàng bị hủy hoặc hoàn trả
 */
export async function restoreOrderInventory(order: any): Promise<boolean> {
  if (!order.inventoryDeducted) return false;
  if (!Array.isArray(order.items) || order.items.length === 0) return false;

  for (const item of order.items) {
    if (!item.productId) continue;
    const prod = await Product.findById(item.productId);
    if (!prod) continue;

    const qty = Number(item.quantity) || 1;

    if (item.variant && Array.isArray(prod.variants) && prod.variants.length > 0) {
      const varIdStr = item.variant._id ? String(item.variant._id) : '';
      const varSku = item.variant.sku || '';
      const varTitle = item.variant.title || item.variant.name || '';
      const varAttrs = item.variant.attributes instanceof Map
        ? Object.fromEntries(item.variant.attributes)
        : (item.variant.attributes || {});

      const vIndex = prod.variants.findIndex((v: any) => {
        if (varIdStr && v._id && String(v._id) === varIdStr) return true;
        if (varSku && v.sku && v.sku.toLowerCase() === varSku.toLowerCase()) return true;
        if (varTitle && v.title && v.title.toLowerCase() === varTitle.toLowerCase()) return true;
        if (Object.keys(varAttrs).length > 0 && v.attributes) {
          const vAttrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : v.attributes;
          const keys = Object.keys(varAttrs);
          if (keys.every((k) => varAttrs[k] === vAttrs[k])) return true;
        }
        return false;
      });

      if (vIndex !== -1) {
        prod.variants[vIndex].stock = (Number(prod.variants[vIndex].stock) || 0) + qty;
      }
      prod.stock = prod.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
    } else {
      prod.stock = (Number(prod.stock) || 0) + qty;
    }

    prod.soldCount = Math.max(0, (Number(prod.soldCount) || 0) - qty);
    await prod.save();
  }

  order.inventoryDeducted = false;
  return true;
}
