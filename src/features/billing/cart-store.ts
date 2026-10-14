import { create } from 'zustand';

import type { Product } from '@/features/catalog/catalog-store';
import { firstQty, qtyStep, type Unit } from '@/lib/units';

// Matches the cart line in Billify - Screen Flow (01 Billing).
export type CartLine = {
  productId: string;
  name: string;
  unit: Unit;
  qty: number;
  unitPricePaise: number;
};

type CartState = {
  /** Newest first. */
  lines: CartLine[];
  customerId: string | null;
  /** The line to highlight as just added. */
  lastAddedId: string | null;
  add: (product: Product, qty?: number) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  setCustomer: (customerId: string | null) => void;
  clear: () => void;
};

// The bill being built lives in memory only; nothing is saved until checkout.
export const useCart = create<CartState>()((set) => ({
  lines: [],
  customerId: null,
  lastAddedId: null,
  add: (product, qty) =>
    set((state) => {
      const step = qty ?? firstQty(product.unit);
      const existing = state.lines.find((line) => line.productId === product.id);
      if (existing) {
        return {
          lastAddedId: product.id,
          lines: state.lines.map((line) =>
            line.productId === product.id ? { ...line, qty: line.qty + step } : line,
          ),
        };
      }
      const line: CartLine = {
        productId: product.id,
        name: product.name,
        unit: product.unit,
        qty: step,
        unitPricePaise: product.pricePaise,
      };
      return { lastAddedId: product.id, lines: [line, ...state.lines] };
    }),
  increment: (productId) =>
    set((state) => ({
      lines: state.lines.map((line) =>
        line.productId === productId ? { ...line, qty: line.qty + qtyStep(line.unit) } : line,
      ),
    })),
  decrement: (productId) =>
    set((state) => ({
      lines: state.lines
        .map((line) =>
          line.productId === productId ? { ...line, qty: line.qty - qtyStep(line.unit) } : line,
        )
        .filter((line) => line.qty > 0),
    })),
  setCustomer: (customerId) => set({ customerId }),
  clear: () => set({ lines: [], customerId: null, lastAddedId: null }),
}));

export function lineTotalPaise(line: CartLine): number {
  return Math.round(line.qty * line.unitPricePaise);
}

export function cartTotalPaise(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotalPaise(line), 0);
}
