import Storage from 'expo-sqlite/kv-store';
import type { StateStorage } from 'zustand/middleware';

/** Small synchronous key-value storage (SQLite-backed): drafts and preferences, never secrets. */
export const kvStorage: StateStorage = {
  getItem: (key) => Storage.getItemSync(key),
  setItem: (key, value) => Storage.setItemSync(key, value),
  removeItem: (key) => {
    Storage.removeItemSync(key);
  },
};
