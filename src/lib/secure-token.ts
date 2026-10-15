import * as SecureStore from 'expo-secure-store';

const KEY = 'billify.session-token';
// Readable after the first unlock since boot, so the app opened from the background while the
// phone is locked still knows the shop is signed in.
const OPTIONS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

// The session token lives in the iOS Keychain / Android Keystore, never in SQLite or kv.
// All synchronous: the first render already knows whether someone is signed in, and a quick
// sign-out → sign-in can't have a late delete wipe the new token. Cleared = empty string.
export const secureToken = {
  get: (): string | null => {
    try {
      return SecureStore.getItem(KEY, OPTIONS) || null;
    } catch {
      return null;
    }
  },
  set: (token: string): void => SecureStore.setItem(KEY, token, OPTIONS),
  clear: (): void => SecureStore.setItem(KEY, '', OPTIONS),
};
