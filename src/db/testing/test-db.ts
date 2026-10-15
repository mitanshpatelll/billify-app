/// <reference types="node" />
import { drizzle } from 'drizzle-orm/sql-js';
import { migrate } from 'drizzle-orm/sql-js/migrator';
import path from 'node:path';
import initSqlJs from 'sql.js';

import * as schema from '../schema';
import type { Db } from '../types';

let SQL: Awaited<ReturnType<typeof initSqlJs>> | undefined;

/**
 * A fresh in-memory SQLite (sql.js, pure WASM) with the app's own migrations applied.
 * Same SQL as the phone; only the driver differs.
 */
export async function createTestDb(): Promise<Db> {
  SQL ??= await initSqlJs();
  const db = drizzle(new SQL.Database(), { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, '../migrations') });
  return db;
}
