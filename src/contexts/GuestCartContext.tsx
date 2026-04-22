import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { CartItem } from './CartContext';
import type { ProductAPI, ProductVariationAPI, ComponentSelection } from '@/modules/admin/products/services';

const GUEST_STORAGE_KEY = 'locafyfest_guest_cart';

interface GuestCartContextData {
  guestItems: CartItem[];
  guestTotalItems: number;
  addGuestItem: (product: ProductAPI, variation?: ProductVariationAPI, qty?: number, componentSelections?: ComponentSelection[]) => void;
  updateGuestQuantity: (index: number, qty: number) => void;
  removeGuestItem: (index: number) => void;
  clearGuestCart: () => void;
}

const GuestCartContext = createContext<GuestCartContextData>({} as GuestCartContextData);

function loadFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function GuestCartProvider({ children }: { children: ReactNode }) {
  const [guestItems, setGuestItems] = useState<CartItem[]>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestItems));
  }, [guestItems]);

  function stockLimit(product: ProductAPI, variation?: ProductVariationAPI): number {
    if (variation) return variation.quantity_available;
    return product.quantity_available;
  }

  function addGuestItem(product: ProductAPI, variation?: ProductVariationAPI, qty = 1, componentSelections?: ComponentSelection[]) {
    const limit = stockLimit(product, variation);
    setGuestItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.product.id === product.id && (i.variation?.id ?? null) === (variation?.id ?? null),
      );
      if (idx >= 0) {
        const newQty = Math.min(prev[idx].quantity + qty, limit);
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: newQty };
        return next;
      }
      const clampedQty = Math.min(qty, limit);
      if (clampedQty <= 0) return prev;
      return [...prev, { product, variation, componentSelections, quantity: clampedQty }];
    });
  }

  function updateGuestQuantity(index: number, qty: number) {
    if (qty <= 0) {
      removeGuestItem(index);
      return;
    }
    setGuestItems((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const limit = stockLimit(item.product, item.variation);
      const next = [...prev];
      next[index] = { ...next[index], quantity: Math.min(qty, limit) };
      return next;
    });
  }

  function removeGuestItem(index: number) {
    setGuestItems((prev) => prev.filter((_, i) => i !== index));
  }

  function clearGuestCart() {
    setGuestItems([]);
  }

  const guestTotalItems = guestItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <GuestCartContext.Provider
      value={{ guestItems, guestTotalItems, addGuestItem, updateGuestQuantity, removeGuestItem, clearGuestCart }}
    >
      {children}
    </GuestCartContext.Provider>
  );
}

export function useGuestCart() {
  return useContext(GuestCartContext);
}
