import { kvStorage } from '@/lib/kv';

const KEY = 'pending-claim';
// Long enough for a Google sign-in, short enough that a save abandoned at sign-in isn't made
// later for whoever signs in next on this phone.
const KEEP_MS = 30 * 60 * 1000;

// "Save to Billify" before signing in: the bill link's token waits here through sign-in. Back
// on the bill, SaveToBillify finishes it; if the app lands on My bills instead (it was closed
// during sign-in), My bills does. Sign-out forgets it.
export const pendingClaim = {
  set: (token: string, now = Date.now()) =>
    void kvStorage.setItem(KEY, JSON.stringify({ token, at: now })),
  /** The waiting token (removed), or only when it is `token`, if given. */
  take: (token?: string, now = Date.now()): string | null => {
    const raw = kvStorage.getItem(KEY) as string | null;
    if (!raw) return null;
    let waiting: { token?: unknown; at?: unknown };
    try {
      waiting = JSON.parse(raw) as typeof waiting;
    } catch {
      waiting = {};
    }
    const valid =
      typeof waiting.token === 'string' &&
      typeof waiting.at === 'number' &&
      now - waiting.at < KEEP_MS;
    if (valid && token && waiting.token !== token) return null; // another bill's page
    void kvStorage.removeItem(KEY);
    return valid ? (waiting.token as string) : null;
  },
  clear: () => void kvStorage.removeItem(KEY),
};
