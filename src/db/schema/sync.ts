import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { SyncedTable } from '@/lib/domain';

// Pending mutations, pushed in id order (a parent row always before its children).
// A repo writes the row and its outbox entry in one transaction.
export const outbox = sqliteTable(
  'outbox',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    mutationId: text('mutation_id').notNull().unique(),
    tableName: text('table_name').$type<SyncedTable>().notNull(),
    op: text('op').$type<'insert' | 'update'>().notNull(),
    data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
    createdAt: text('created_at').notNull(),
    /** `rejected` entries stay until the shopkeeper sees them on 19 Sync. */
    status: text('status').$type<'pending' | 'rejected'>().notNull().default('pending'),
    reason: text('reason'),
    message: text('message'),
    attempts: integer('attempts').notNull().default(0),
  },
  (t) => [index('outbox_status_idx').on(t.status, t.id)],
);

// Small key-value state for sync: pull cursor, device id, last synced time.
export const syncState = sqliteTable('sync_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type OutboxRow = typeof outbox.$inferSelect;
