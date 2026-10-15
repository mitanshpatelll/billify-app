import type { StateStorage } from 'zustand/middleware';

/** Small synchronous key-value storage: localStorage on the web. */
export const kvStorage: StateStorage = {
  getItem: (key) => globalThis.localStorage?.getItem(key) ?? null,
  setItem: (key, value) => globalThis.localStorage?.setItem(key, value),
  removeItem: (key) => globalThis.localStorage?.removeItem(key),
};
