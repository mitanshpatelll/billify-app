import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type { Unit } from '@/lib/units';

import { syncColumns } from './columns';

// Products: insert + update, last write wins on the server (Backend Guide §6).
export const products = sqliteTable(
  'products',
  {
    ...syncColumns(),
    barcode: text('barcode'),
    name: text('name').notNull(),
    unit: text('unit').$type<Unit>().notNull(),
    pricePaise: integer('price_paise').notNull(),
    mrpPaise: integer('mrp_paise'),
    lowStockAt: real('low_stock_at'),
    /** Sales count the stock down only for tracked products. */
    trackStock: integer('track_stock', { mode: 'boolean' }).notNull().default(true),
  },
  (t) => [
    // Same rule as the server: one live product per barcode.
    uniqueIndex('products_barcode_uq')
      .on(t.barcode)
      .where(sql`barcode is not null and deleted_at is null`),
  ],
);

export type ProductRow = typeof products.$inferSelect;
