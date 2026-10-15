import type { Db } from './types';

// The shop app is native only (D5): the web build serves the bill page and customer screens,
// which never touch SQLite. Keeping expo-sqlite out of the web bundle avoids its WASM setup.
export const db = new Proxy({} as Db, {
  get() {
    throw new Error('SQLite is not available on the web');
  },
});
