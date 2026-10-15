import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { KhataKind, SettlementMethod } from '@/lib/domain';

import { syncColumns } from './columns';

// Customers: insert + update (name, phone), last write wins.
export const customers = sqliteTable('customers', {
  ...syncColumns(),
  name: text('name').notNull(),
  /** 10-digit Indian mobile number, no +91. */
  phone: text('phone'),
  /** Optional khata limit (D27): checkout warns over it, never blocks. */
  khataLimitPaise: integer('khata_limit_paise'),
  /** Server-owned (set by the customer's claim, M2): pulled, never pushed. */
  linkedUserId: text('linked_user_id'),
});

// Khata ledger, insert only. Balance = SUM(delta_paise) per customer.
export const khataEntries = sqliteTable(
  'khata_entries',
  {
    ...syncColumns(),
    customerId: text('customer_id').notNull(),
    kind: text('kind').$type<KhataKind>().notNull(),
    deltaPaise: integer('delta_paise').notNull(),
    refId: text('ref_id'),
    /** Settlements only: cash or UPI (the day's cash count includes khata paid in cash). */
    method: text('method').$type<SettlementMethod>(),
  },
  (t) => [index('khata_entries_customer_idx').on(t.customerId)],
);

export type CustomerRow = typeof customers.$inferSelect;
export type KhataEntryRow = typeof khataEntries.$inferSelect;
