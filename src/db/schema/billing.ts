import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type { PaymentMethod } from '@/lib/payments';
import type { Unit } from '@/lib/units';

import { syncColumns } from './columns';

// Bills: insert only, except voided_at, which goes from null to a time once.
export const bills = sqliteTable(
  'bills',
  {
    ...syncColumns(),
    customerId: text('customer_id'),
    /** bill_prefix + counter, made on the phone: "A-103". */
    number: text('number').notNull(),
    totalPaise: integer('total_paise').notNull(),
    /** 16 random bytes, base64url: the bill link works before the bill syncs. */
    publicToken: text('public_token').notNull(),
    voidedAt: text('voided_at'),
  },
  (t) => [
    uniqueIndex('bills_number_uq').on(t.number),
    index('bills_created_idx').on(t.createdAt),
    index('bills_customer_idx').on(t.customerId),
  ],
);

// Bill lines copy the name and price at sale time.
export const billItems = sqliteTable(
  'bill_items',
  {
    ...syncColumns(),
    billId: text('bill_id').notNull(),
    productId: text('product_id'),
    /** Line order on the bill. */
    position: integer('position').notNull(),
    nameSnapshot: text('name_snapshot').notNull(),
    unit: text('unit').$type<Unit>().notNull(),
    qty: real('qty').notNull(),
    unitPricePaise: integer('unit_price_paise').notNull(),
  },
  (t) => [
    index('bill_items_bill_idx').on(t.billId),
    index('bill_items_product_idx').on(t.productId),
  ],
);

// One bill can have several payments (split: cash + UPI).
export const payments = sqliteTable(
  'payments',
  {
    ...syncColumns(),
    billId: text('bill_id').notNull(),
    method: text('method').$type<PaymentMethod>().notNull(),
    amountPaise: integer('amount_paise').notNull(),
  },
  (t) => [index('payments_bill_idx').on(t.billId)],
);

export type BillRow = typeof bills.$inferSelect;
export type BillItemRow = typeof billItems.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;
