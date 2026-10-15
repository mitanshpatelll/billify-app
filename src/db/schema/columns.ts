import { text } from 'drizzle-orm/sqlite-core';

// Columns every synced table shares with the server (Backend Guide §5), minus shop_id and seq:
// the phone holds one shop's data, and the pull cursor lives in sync_state.
// Times are ISO 8601 strings. created_at is the phone's time (a bill made offline keeps it);
// updated_at is the phone's time until a pull brings the server's.
export const syncColumns = () => ({
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});
