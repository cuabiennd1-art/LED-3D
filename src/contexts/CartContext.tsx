'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getProductCoverImage } from '@/lib/utils';

export interface CartItem {
  _id?: string;
  productId: string;
  name: string;
  slug?: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  stock?: number;
  image?: string;
  variant?: {
    _id?: string;
    sku?: string;
    title?: string;
    name?: string;
    color?: string;
    size?: string;
    attributes?: Record<string, string>;
    price?: number;
    salePrice?: number;
    stock?: number;
  };
  selected?: boolean;
}

export const getCartItemPrice = (item: CartItem): number => {
  if (item.variant) {
    if (item.variant.salePrice !== undefined && item.variant.salePrice !== null && Number(item.variant.salePrice) > 0) {
      return Number(item.variant.salePrice);
    }
    if (item.variant.price !== undefined && item.variant.price !== null && Number(item.variant.price) > 0) {
      return Number(item.variant.price);
    }
  }
  return item.price || 0;
};

export const getCartItemOriginalPrice = (item: CartItem): number => {
  if (item.variant?.price !== undefined && item.variant.price !== null && Number(item.variant.price) > 0) {
    return Number(item.variant.price);
  }
  return item.originalPrice || item.price || 0;
};

export const getCartItemStock = (item: CartItem): number => {
  if (item.variant?.stock !== undefined && item.variant.stock !== null) {
    return Number(item.variant.stock);
  }
  if (item.stock !== undefined && item.stock !== null) {
    return Number(item.stock);
  }
  return 999;
};

interface CartContextType {
  items: CartItem[];
  cartCount: number;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  checkoutItems: CartItem[];
  setCheckoutItems: (items: CartItem[]) => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addToCart: (product: any, quantity?: number, variant?: any) => boolean;
  buyNow: (product: any, quantity?: number, variant?: any) => CartItem | null;
  updateQuantity: (indexOrId: string | number, quantity: number) => void;
  removeFromCart: (indexOrId: string | number) => void;
  clearCart: () => void;
  removeCheckedOutItems: (checkedOutItems: CartItem[]) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [checkoutItems, setCheckoutItemsState] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Load cart and checkout items from storage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('shopbig_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
      const savedCheckout = sessionStorage.getItem('shopbig_checkout_items');
      if (savedCheckout) {
        setCheckoutItemsState(JSON.parse(savedCheckout));
      }
    } catch (e) {
      console.error('Error loading cart from storage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 2. Persist cart purely to localStorage on every change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('shopbig_cart', JSON.stringify(items));
    } catch (e) {
      console.error('Error saving cart to localStorage:', e);
    }
  }, [items, isLoaded]);

  const setCheckoutItems = useCallback((list: CartItem[]) => {
    setCheckoutItemsState(list);
    try {
      if (list && list.length > 0) {
        sessionStorage.setItem('shopbig_checkout_items', JSON.stringify(list));
      } else {
        sessionStorage.removeItem('shopbig_checkout_items');
      }
    } catch (e) {
      console.error('Error saving checkout items:', e);
    }
  }, []);

  // Cart count represents the number of distinct product/variant items in cart
  const cartCount = items.length;

  const subtotal = items.reduce((acc, item) => {
    return acc + getCartItemPrice(item) * item.quantity;
  }, 0);

  const shippingFee = subtotal >= 500000 || subtotal === 0 ? 0 : 30000;
  const totalAmount = subtotal + shippingFee;

  // 3. Add to Cart (With strict stock validation & clamping)
  const addToCart = useCallback((product: any, quantity = 1, variant?: any): boolean => {
    const prodId = product._id || product.id;
    const variantName =
      variant?.title ||
      variant?.name ||
      (variant?.attributes
        ? Object.values(variant.attributes).filter(Boolean).join(' / ')
        : variant?.color && variant?.size
        ? `${variant.color} - ${variant.size}`
        : variant?.color || variant?.size || '');

    const variantFlashPrice =
      variant?.flashPrice !== undefined && variant?.flashPrice !== null && Number(variant.flashPrice) > 0
        ? Number(variant.flashPrice)
        : (variant?.salePrice !== undefined && variant?.salePrice !== null && Number(variant.salePrice) > 0
          ? Number(variant.salePrice)
          : undefined);

    const baseFlashPrice =
      product?.flashPrice !== undefined && product?.flashPrice !== null && Number(product.flashPrice) > 0
        ? Number(product.flashPrice)
        : undefined;

    const effectivePrice =
      variantFlashPrice !== undefined
        ? variantFlashPrice
        : (variant?.price !== undefined && variant.price !== null && Number(variant.price) > 0
          ? Number(variant.price)
          : (baseFlashPrice !== undefined
            ? baseFlashPrice
            : (product.salePrice && Number(product.salePrice) > 0 ? Number(product.salePrice) : (Number(product.price) || 0))));

    const originalPrice =
      variant?.originalPrice !== undefined && variant?.originalPrice !== null && Number(variant.originalPrice) > 0
        ? Number(variant.originalPrice)
        : (variant?.price !== undefined && variant.price !== null && Number(variant.price) > 0
          ? Number(variant.price)
          : (Number(product.originalPrice) || Number(product.price) || effectivePrice));

    const availableStock =
      variant?.stock !== undefined && variant?.stock !== null
        ? Number(variant.stock)
        : (product.stock !== undefined && product.stock !== null ? Number(product.stock) : 999);

    if (availableStock <= 0) {
      toast.error('Sản phẩm/phiên bản này hiện đã hết hàng trong kho!');
      return false;
    }

    let reachedMax = false;

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => {
        if (item.productId !== prodId) return false;
        if (!variant && !item.variant) return true;
        if (variant && item.variant) {
          if (variant._id && item.variant._id && String(variant._id) === String(item.variant._id)) return true;
          if (variant.sku && item.variant.sku && variant.sku === item.variant.sku) return true;
          return item.variant.name === variantName;
        }
        return false;
      });

      if (existingIndex > -1) {
        const currentQty = prevItems[existingIndex].quantity;
        if (currentQty >= availableStock) {
          reachedMax = true;
          return prevItems;
        }

        const newQty = Math.min(availableStock, currentQty + quantity);
        return prevItems.map((item, idx) =>
          idx === existingIndex
            ? { ...item, price: effectivePrice, originalPrice, quantity: newQty, stock: availableStock, variant: item.variant ? { ...item.variant, price: originalPrice, salePrice: effectivePrice, stock: availableStock } : undefined }
            : item
        );
      } else {
        const initialQty = Math.min(availableStock, quantity);
        const newItem: CartItem = {
          _id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          productId: prodId,
          name: product.name,
          slug: product.slug,
          price: effectivePrice,
          originalPrice,
          quantity: initialQty,
          stock: availableStock,
          image: variant?.image || getProductCoverImage(product, '/file.svg'),
          variant: variant ? { ...variant, name: variantName, price: originalPrice, salePrice: effectivePrice, stock: availableStock } : undefined,
          selected: true,
        };
        return [...prevItems, newItem];
      }
    });

    if (reachedMax) {
      toast.error(`Số lượng trong giỏ đã đạt tối đa tồn kho (${availableStock} sản phẩm)!`);
      return false;
    }

    toast.success('Đã thêm sản phẩm vào giỏ hàng!');
    return true;
  }, []);

  // 4. Buy Now (Isolates only this product for checkout, does not pollute or force other cart items)
  const buyNow = useCallback((product: any, quantity = 1, variant?: any): CartItem | null => {
    const prodId = product._id || product.id;
    const variantName =
      variant?.title ||
      variant?.name ||
      (variant?.attributes
        ? Object.values(variant.attributes).filter(Boolean).join(' / ')
        : variant?.color && variant?.size
        ? `${variant.color} - ${variant.size}`
        : variant?.color || variant?.size || '');

    const variantFlashPrice =
      variant?.flashPrice !== undefined && variant?.flashPrice !== null && Number(variant.flashPrice) > 0
        ? Number(variant.flashPrice)
        : (variant?.salePrice !== undefined && variant?.salePrice !== null && Number(variant.salePrice) > 0
          ? Number(variant.salePrice)
          : undefined);

    const baseFlashPrice =
      product?.flashPrice !== undefined && product?.flashPrice !== null && Number(product.flashPrice) > 0
        ? Number(product.flashPrice)
        : undefined;

    const effectivePrice =
      variantFlashPrice !== undefined
        ? variantFlashPrice
        : (variant?.price !== undefined && variant.price !== null && Number(variant.price) > 0
          ? Number(variant.price)
          : (baseFlashPrice !== undefined
            ? baseFlashPrice
            : (product.salePrice && Number(product.salePrice) > 0 ? Number(product.salePrice) : (Number(product.price) || 0))));

    const originalPrice =
      variant?.originalPrice !== undefined && variant?.originalPrice !== null && Number(variant.originalPrice) > 0
        ? Number(variant.originalPrice)
        : (variant?.price !== undefined && variant.price !== null && Number(variant.price) > 0
          ? Number(variant.price)
          : (Number(product.originalPrice) || Number(product.price) || effectivePrice));

    const availableStock =
      variant?.stock !== undefined && variant?.stock !== null
        ? Number(variant.stock)
        : (product.stock !== undefined && product.stock !== null ? Number(product.stock) : 999);

    if (availableStock <= 0) {
      toast.error('Sản phẩm/phiên bản này hiện đã hết hàng trong kho!');
      return null;
    }

    const finalQty = Math.min(availableStock, quantity);

    const singleCheckoutItem: CartItem = {
      _id: `buynow_${Date.now()}`,
      productId: prodId,
      name: product.name,
      slug: product.slug,
      price: effectivePrice,
      originalPrice,
      quantity: finalQty,
      stock: availableStock,
      image: variant?.image || getProductCoverImage(product, '/file.svg'),
      variant: variant ? { ...variant, name: variantName, price: originalPrice, salePrice: effectivePrice, stock: availableStock } : undefined,
      selected: true,
    };

    setCheckoutItemsState([singleCheckoutItem]);
    return singleCheckoutItem;
  }, []);

  // 5. Update Quantity (Strict stock limit enforcement)
  const updateQuantity = useCallback((identifier: string | number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(identifier);
      return;
    }

    let overStockMsg = '';

    setItems((prevItems) => {
      return prevItems.map((item, idx) => {
        if (item._id === identifier || idx === identifier) {
          const maxStock = getCartItemStock(item);

          if (quantity > maxStock) {
            overStockMsg = `Kho chỉ còn tối đa ${maxStock} sản phẩm!`;
            return { ...item, quantity: maxStock };
          }
          return { ...item, quantity };
        }
        return item;
      });
    });

    if (overStockMsg) {
      toast.error(overStockMsg);
    }
  }, []);

  // 6. Remove Item (Local Only - No API call)
  const removeFromCart = useCallback((identifier: string | number) => {
    setItems((prevItems) => {
      return prevItems.filter((item, idx) => item._id !== identifier && idx !== identifier);
    });
    toast.success('Đã xóa sản phẩm khỏi giỏ');
  }, []);

  // 7. Clear Cart
  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // 8. Remove Checked Out Items (removes only items that were purchased)
  const removeCheckedOutItems = useCallback((checkedOutList: CartItem[]) => {
    if (!checkedOutList || checkedOutList.length === 0) return;
    setItems((prevItems) => {
      return prevItems.filter((item) => {
        const wasBought = checkedOutList.some(
          (c) => c._id === item._id || (c.productId === item.productId && c.variant?.name === item.variant?.name)
        );
        return !wasBought;
      });
    });
    setCheckoutItemsState([]);
  }, []);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const value = React.useMemo(
    () => ({
      items,
      cartCount,
      subtotal,
      shippingFee,
      totalAmount,
      checkoutItems,
      setCheckoutItems,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      addToCart,
      buyNow,
      updateQuantity,
      removeFromCart,
      clearCart,
      removeCheckedOutItems,
    }),
    [
      items,
      cartCount,
      subtotal,
      shippingFee,
      totalAmount,
      checkoutItems,
      setCheckoutItems,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      addToCart,
      buyNow,
      updateQuantity,
      removeFromCart,
      clearCart,
      removeCheckedOutItems,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}