import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

export type Schema = typeof schema;

/**
 * A synchronous Drizzle SQLite database (or a transaction on one). expo-sqlite in the app,
 * sql.js in tests: repos take it as their first argument, so they run on either.
 */
export type Db = BaseSQLiteDatabase<'sync', any, Schema>;

/** SQL names of the tables the live queries watch. */
export type TableName =
  | 'shop'
  | 'products'
  | 'customers'
  | 'bills'
  | 'bill_items'
  | 'payments'
  | 'stock_movements'
  | 'khata_entries'
  | 'outbox'
  | 'sync_state';
