import { create } from 'zustand';

export type Shop = {
  name: string;
  upiId: string;
  billPrefix: string;
};

type ShopState = {
  shop: Shop | null;
  /** True after the last setup step (camera), when the tabs open. */
  setupDone: boolean;
  nextBillNumber: number;
  saveShop: (shop: Shop) => void;
  finishSetup: () => void;
  /** Reserves the next number: "A-001", "A-002" ... */
  takeBillNumber: () => string;
};

export function formatBillNumber(prefix: string, number: number): string {
  return `${prefix}-${String(number).padStart(3, '0')}`;
}

// UI pass: memory only. Slice 1 saves the shop with POST /v1/shops and keeps a copy in SQLite;
// the bill counter moves to SQLite with the billing slice.
export const useShop = create<ShopState>()((set, get) => ({
  shop: null,
  setupDone: false,
  nextBillNumber: 1,
  saveShop: (shop) => set({ shop }),
  finishSetup: () => set({ setupDone: true }),
  takeBillNumber: () => {
    const { shop, nextBillNumber } = get();
    set({ nextBillNumber: nextBillNumber + 1 });
    return formatBillNumber(shop?.billPrefix ?? 'A', nextBillNumber);
  },
}));
