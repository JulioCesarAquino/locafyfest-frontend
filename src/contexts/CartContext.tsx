import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { ProductAPI, ProductVariationAPI } from '@/modules/admin/products/services';

export interface CartItem {
  product: ProductAPI;
  variation?: ProductVariationAPI;
  quantity: number;
}

interface CartContextData {
  items: CartItem[];
  totalItems: number;
  addItem: (product: ProductAPI, variation?: ProductVariationAPI, qty?: number) => void;
  updateQuantity: (index: number, qty: number) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const STORAGE_KEY = 'locafyfest_cart';

function loadFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function addItem(product: ProductAPI, variation?: ProductVariationAPI, qty = 1) {
    setItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.product.id === product.id && (i.variation?.id ?? null) === (variation?.id ?? null),
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
        return next;
      }
      return [...prev, { product, variation, quantity: qty }];
    });
  }

  function updateQuantity(index: number, qty: number) {
    if (qty <= 0) {
      removeItem(index);
      return;
    }
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: qty };
      return next;
    });
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function clearCart() {
    setItems([]);
  }

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, totalItems, addItem, updateQuantity, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
