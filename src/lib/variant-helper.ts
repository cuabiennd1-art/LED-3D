export interface IProductOption {
  name: string;
  values: string[];
}

export interface IVariantItem {
  _id?: string;
  sku: string;
  title: string;
  attributes: Record<string, string>;
  price: number;
  salePrice?: number;
  flashPrice?: number;
  originalPrice?: number;
  discountPercent?: number;
  stock: number;
  image?: string;
  color?: string;
  size?: string;
}

/**
 * Chuẩn hóa chuỗi thuộc tính để so khớp linh hoạt:
 * - Thay thế non-breaking space \u00a0 thành khoảng trắng thông thường
 * - Đổi ký tự nhân × và ✕ thành x
 * - Gom nhiều khoảng trắng thừa thành 1
 * - Chuyển sang chữ thường và trim()
 */
export function normalizeAttrString(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\u00a0/g, ' ')
    .replace(/[\u00d7\u2715]/g, 'x')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Thuật toán sinh biến thể tự động bằng Tích Descartes (Cartesian Product)
 */
export function generateCartesianVariants(
  options: IProductOption[],
  basePrice: number,
  baseStock = 10,
  productCode = 'PROD'
): IVariantItem[] {
  const validOptions = options.filter((opt) => opt.name?.trim() && opt.values && opt.values.length > 0);
  if (validOptions.length === 0) return [];

  const cartesian = (arrays: string[][]): string[][] => {
    return arrays.reduce<string[][]>(
      (acc, curr) => acc.flatMap((c) => curr.map((n) => [...c, n])),
      [[]]
    );
  };

  const optionValues = validOptions.map((opt) => opt.values);
  const combinations = cartesian(optionValues);

  return combinations.map((combo, idx) => {
    const attributes: Record<string, string> = {};
    const skuParts: string[] = [
      productCode
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase() || 'SP',
    ];

    combo.forEach((val, i) => {
      const optName = validOptions[i].name;
      attributes[optName] = val;
      const cleanVal = val
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();
      skuParts.push(cleanVal || `V${i + 1}`);
    });

    const title = combo.join(' / ');
    const sku = `${skuParts.join('-')}-${idx + 1}`;

    return {
      sku,
      title,
      attributes,
      price: basePrice || 0,
      salePrice: undefined,
      stock: baseStock || 10,
      image: '',
    };
  });
}

/**
 * Tìm biến thể khớp với lựa chọn
 */
export function findMatchingVariant(
  variants: any[],
  selectedAttributes: Record<string, string>,
  options?: IProductOption[]
): any | null {
  if (!variants || variants.length === 0) return null;

  const selectedKeys = Object.keys(selectedAttributes).filter((k) => selectedAttributes[k]?.trim());
  if (selectedKeys.length === 0) return null;

  // Nếu sản phẩm có danh sách options và người dùng chưa chọn đủ tất cả các options thì chưa thể xác định biến thể đơn lẻ
  if (options && options.length > 0 && selectedKeys.length < options.length) {
    return null;
  }

  return (
    variants.find((v) => {
      const rawAttrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || {});
      const attrs: Record<string, string> = { ...rawAttrs };

      // Fallback for direct color/size fields
      if (v.color && !attrs['Màu sắc'] && !attrs['Màu'] && !attrs['Color']) {
        attrs['Màu sắc'] = v.color;
      }
      if (v.size && !attrs['Kích cỡ'] && !attrs['Size'] && !attrs['Kích thước']) {
        attrs['Kích cỡ'] = v.size;
      }

      const attrEntries = Object.entries(attrs);
      // Nếu biến thể có nhiều thuộc tính mà số lượng chọn chưa bằng thì không khớp
      if (attrEntries.length > 0 && selectedKeys.length < attrEntries.length) {
        return false;
      }

      return selectedKeys.every((key) => {
        const normKey = normalizeAttrString(key);
        const normSelVal = normalizeAttrString(selectedAttributes[key]);
        if (!normSelVal) return true;

        const entry = attrEntries.find(([k]) => normalizeAttrString(k) === normKey);
        if (!entry) return false;

        return normalizeAttrString(entry[1]) === normSelVal;
      });
    }) || null
  );
}

/**
 * Trích xuất chuỗi hiển thị phân loại (Màu sắc, Size, Biến thể) từ item trong đơn hàng
 */
export function formatVariantDisplay(itemOrVariant: any): string {
  if (!itemOrVariant) return '';
  if (typeof itemOrVariant === 'string') return itemOrVariant;

  // Nếu là item đơn hàng có variant object hoặc variant string
  const v = itemOrVariant.variant !== undefined ? itemOrVariant.variant : itemOrVariant;
  if (!v) {
    if (itemOrVariant.variantTitle) return itemOrVariant.variantTitle;
    if (itemOrVariant.color || itemOrVariant.size) {
      return [itemOrVariant.color && `Màu: ${itemOrVariant.color}`, itemOrVariant.size && `Size: ${itemOrVariant.size}`]
        .filter(Boolean)
        .join(' | ');
    }
    return '';
  }

  if (typeof v === 'string') return v;
  if (v.title) return v.title;
  if (v.name) return v.name;

  if (v.attributes) {
    const rawAttrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : v.attributes;
    if (typeof rawAttrs === 'object' && rawAttrs !== null) {
      const parts = Object.entries(rawAttrs)
        .filter(([_, val]) => Boolean(val))
        .map(([k, val]) => `${k}: ${val}`);
      if (parts.length > 0) return parts.join(' | ');
    }
  }

  if (v.color || v.size) {
    return [v.color && `Màu: ${v.color}`, v.size && `Size: ${v.size}`].filter(Boolean).join(' | ');
  }

  if (itemOrVariant.variantTitle) return itemOrVariant.variantTitle;
  if (itemOrVariant.color || itemOrVariant.size) {
    return [itemOrVariant.color && `Màu: ${itemOrVariant.color}`, itemOrVariant.size && `Size: ${itemOrVariant.size}`]
      .filter(Boolean)
      .join(' | ');
  }

  return v.sku ? `SKU: ${v.sku}` : '';
}

