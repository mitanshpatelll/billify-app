import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { db } from './client';
import migrations from './migrations/migrations';

/** Applies the bundled migrations on start. The splash stays up until they're done. */
export function useDatabaseReady(): { done: boolean; error: Error | undefined } {
  const { success, error } = useMigrations(db, migrations);
  return { done: success, error };
}
