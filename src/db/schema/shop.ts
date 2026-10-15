import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// The signed-in owner's shop: one row. Created online once (POST /v1/shops), copied here so
// billing never needs the network. Not synced through the outbox.
export const shop = sqliteTable('shop', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  upiId: text('upi_id').notNull(),
  billPrefix: text('bill_prefix').notNull(),
  /** Set after the last setup step (camera), when the tabs open. */
  setupDone: integer('setup_done', { mode: 'boolean' }).notNull().default(false),
});

export type ShopRow = typeof shop.$inferSelect;
