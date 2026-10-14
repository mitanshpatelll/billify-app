import { create } from 'zustand';

import { newId, newPublicToken } from '@/lib/ids';
import type { PaymentMethod } from '@/lib/payments';

import { cartTotalPaise, type CartLine } from './cart-store';

export type { PaymentMethod };
export { paymentLabel } from '@/lib/payments';

export type Payment = { method: PaymentMethod; amountPaise: number };

export type SavedBill = {
  id: string;
  number: string;
  createdAt: string;
  customerId: string | null;
  /** Name and price copied at sale time. */
  items: CartLine[];
  totalPaise: number;
  payments: Payment[];
  /** Made on the phone so the link and QR work before sync. */
  publicToken: string;
};

type NewBill = Pick<SavedBill, 'number' | 'customerId' | 'items' | 'payments'>;

type BillsState = {
  bills: SavedBill[];
  saveBill: (bill: NewBill) => SavedBill;
};

// UI pass: memory only. The billing slice turns saveBill into one SQLite transaction
// (bills, bill_items, payments, stock_movements, khata_entries + outbox rows).
export const useBills = create<BillsState>()((set) => ({
  bills: [],
  saveBill: (input) => {
    const totalPaise = cartTotalPaise(input.items);
    const paid = input.payments.reduce((sum, payment) => sum + payment.amountPaise, 0);
    if (paid !== totalPaise) {
      throw new Error(`Payments (${paid}) must add up to the total (${totalPaise})`);
    }
    const bill: SavedBill = {
      ...input,
      id: newId(),
      createdAt: new Date().toISOString(),
      totalPaise,
      publicToken: newPublicToken(),
    };
    set((state) => ({ bills: [bill, ...state.bills] }));
    return bill;
  },
}));
