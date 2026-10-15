import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/kv';
import { secureToken } from '@/lib/secure-token';

export type Role = 'shop' | 'customer';

export type SessionUser = { id: string; name: string; email: string };

type SessionState = {
  role: Role | null;
  /** Better Auth session token (30 days, renews daily). Kept in SecureStore. */
  token: string | null;
  user: SessionUser | null;
  chooseRole: (role: Role) => void;
  signIn: (session: { token: string; user: SessionUser }) => void;
  /** Forget the session on this phone (signing out, or the server said 401). */
  signOut: () => void;
};

// Signing in or out flips the route guards in the root layout, which move on by themselves.
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      role: null,
      token: secureToken.get(),
      user: null,
      chooseRole: (role) => set({ role }),
      signIn: ({ token, user }) => {
        secureToken.set(token);
        set({ token, user });
      },
      signOut: () => {
        secureToken.clear();
        set({ token: null, user: null, role: null });
      },
    }),
    {
      name: 'session',
      storage: createJSONStorage(() => kvStorage),
      // The token stays out of kv storage: it is restored from SecureStore above.
      partialize: (state) => ({ role: state.role, user: state.user }),
    },
  ),
);

/**
 * Signed in = a session token and a role. On iOS the Keychain token survives a reinstall while
 * the role (kv storage) doesn't: that case counts as signed out, so the user picks a role again.
 */
export function selectSignedIn(state: { token: string | null; role: Role | null }): boolean {
  return state.token !== null && state.role !== null;
}

/** For non-React code (the API client). */
export function currentToken(): string | null {
  return useSession.getState().token;
}
