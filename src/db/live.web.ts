import type { TableName } from './types';

// No SQLite on the web (see client.web.ts). Shop screens never render there.
export function onTableChange(_table: TableName, _listener: () => void): () => void {
  return () => {};
}

export function useDbQuery<T>(
  _tables: readonly TableName[],
  _read: () => T,
  _deps: readonly unknown[] = [],
): T {
  throw new Error('SQLite is not available on the web');
}
