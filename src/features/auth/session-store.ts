import { create } from 'zustand';

export type Role = 'shop' | 'customer';

type SessionState = {
  role: Role | null;
  signedIn: boolean;
  chooseRole: (role: Role) => void;
  signIn: () => void;
  signOut: () => void;
};

// UI pass: memory only, so every full reload starts at Welcome.
// Slice 1 replaces signIn with Better Auth (Google) and keeps the session token in SecureStore.
export const useSession = create<SessionState>()((set) => ({
  role: null,
  signedIn: false,
  chooseRole: (role) => set({ role }),
  signIn: () => set({ signedIn: true }),
  signOut: () => set({ signedIn: false, role: null }),
}));
