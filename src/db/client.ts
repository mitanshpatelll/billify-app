import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';
import type { Db } from './types';

// One connection for the whole app. The change listener feeds useDbQuery (src/db/live.ts).
export const sqlite = openDatabaseSync('billify.db', { enableChangeListener: true });
sqlite.execSync('PRAGMA journal_mode = WAL');

export const db: Db = drizzle(sqlite, { schema });
