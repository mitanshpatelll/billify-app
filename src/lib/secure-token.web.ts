const KEY = 'billify.session-token';

// No Keychain in the browser: the customer web keeps its session in localStorage (M2).
export const secureToken = {
  get: (): string | null => globalThis.localStorage?.getItem(KEY) || null,
  set: (token: string): void => globalThis.localStorage?.setItem(KEY, token),
  clear: (): void => globalThis.localStorage?.removeItem(KEY),
};
