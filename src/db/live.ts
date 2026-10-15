import { addDatabaseChangeListener } from 'expo-sqlite';
import { useRef, useSyncExternalStore } from 'react';

import type { TableName } from './types';

// A version per table, bumped on every row change. Hooks re-read only when a table they
// watch has moved on. Notifications are coalesced per microtask, so a bill saving
// 20 rows re-renders once, not 20 times.
const versions = new Map<string, number>();
const subscribers = new Set<() => void>();
let scheduled = false;

addDatabaseChangeListener(({ tableName }) => {
  versions.set(tableName, (versions.get(tableName) ?? 0) + 1);
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    subscribers.forEach((notify) => notify());
  });
});

function subscribe(notify: () => void) {
  subscribers.add(notify);
  return () => {
    subscribers.delete(notify);
  };
}

function sameDeps(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}

/**
 * Reads from SQLite synchronously (the first render already has the data: no loading flash,
 * no guard flicker) and reads again when a row in one of `tables` changes or `deps` change.
 */
export function useDbQuery<T>(
  tables: readonly TableName[],
  read: () => T,
  deps: readonly unknown[] = [],
): T {
  const cache = useRef<{ version: string; deps: readonly unknown[]; value: T } | null>(null);

  function getSnapshot(): T {
    const version = tables.map((table) => versions.get(table) ?? 0).join('.');
    const cached = cache.current;
    if (cached && cached.version === version && sameDeps(cached.deps, deps)) return cached.value;
    const value = read();
    cache.current = { version, deps, value };
    return value;
  }

  return useSyncExternalStore(subscribe, getSnapshot);
}
