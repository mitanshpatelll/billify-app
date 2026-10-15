import { create } from 'zustand';

export type SyncProblem = 'offline' | 'server' | null;

type SyncStatus = {
  syncing: boolean;
  /** Why the last sync failed: no connection, or the server said no / was down. */
  problem: SyncProblem;
  setSyncing: (syncing: boolean) => void;
  setProblem: (problem: SyncProblem) => void;
};

// What the scheduler is doing right now. Counts (waiting, rejected) come from the outbox itself.
export const useSyncStatus = create<SyncStatus>()((set) => ({
  syncing: false,
  problem: null,
  setSyncing: (syncing) => set({ syncing }),
  setProblem: (problem) => set({ problem }),
}));
