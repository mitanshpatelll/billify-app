import { index, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { StockReason } from '@/lib/domain';

import { syncColumns } from './columns';

// Stock is a ledger, not a counter: current stock = SUM(qty_delta). Insert only.
export const stockMovements = sqliteTable(
  'stock_movements',
  {
    ...syncColumns(),
    productId: text('product_id').notNull(),
    qtyDelta: real('qty_delta').notNull(),
    reason: text('reason').$type<StockReason>().notNull(),
    /** The bill for sale / void movements. */
    refId: text('ref_id'),
  },
  (t) => [index('stock_movements_product_idx').on(t.productId)],
);

export type StockMovementRow = typeof stockMovements.$inferSelect;
