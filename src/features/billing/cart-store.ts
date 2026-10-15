import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { BillLine } from '@/db/repos/bills';
import type { Product } from '@/features/catalog/catalog';
import { newId } from '@/lib/ids';
import { kvStorage } from '@/lib/kv';
import { lineTotalPaise as lineTotal } from '@/lib/money';
import { firstQty, qtyStep, type Unit } from '@/lib/units';

// Matches the cart line in Billify - Screen Flow (01 Billing). The price is the one on screen
// when the item went in: the bill charges what the shopkeeper saw, even after a restore.
export type CartLine = {
  productId: string;
  name: string;
  unit: Unit;
  qty: number;
  unitPricePaise: number;
};

type CartState = {
  /** Becomes the bill id, so a draft can only ever turn into one bill. New after every clear. */
  draftId: string;
  /** Newest first. */
  lines: CartLine[];
  customerId: string | null;
  /** The line to highlight as just added. */
  lastAddedId: string | null;
  add: (product: Pick<Product, 'id' | 'name' | 'unit' | 'pricePaise'>, qty?: number) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  setCustomer: (customerId: string | null) => void;
  clear: () => void;
};

// The bill being built. Saved as a draft on every change, so a killed app reopens with the
// same cart (User Flows §2). Nothing reaches the bills tables until checkout.
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      draftId: newId(),
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
      clear: () => set({ draftId: newId(), lines: [], customerId: null, lastAddedId: null }),
    }),
    {
      name: 'cart-draft',
      storage: createJSONStorage(() => kvStorage),
      partialize: (state) => ({
        draftId: state.draftId,
        lines: state.lines,
        customerId: state.customerId,
      }),
    },
  ),
);

export function lineTotalPaise(line: CartLine): number {
  return lineTotal(line.qty, line.unitPricePaise);
}

export function cartTotalPaise(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotalPaise(line), 0);
}

/** Cart lines in bill order (first scanned first; the cart shows the newest on top). */
export function toBillLines(lines: CartLine[]): BillLine[] {
  return [...lines].reverse().map((line) => ({
    productId: line.productId,
    name: line.name,
    unit: line.unit,
    qty: line.qty,
    unitPricePaise: line.unitPricePaise,
  }));
}
