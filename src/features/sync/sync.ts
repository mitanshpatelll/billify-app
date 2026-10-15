import { db } from '@/db/client';
import { useDbQuery } from '@/db/live';
import { outboxRepo, syncRepo } from '@/db/repos';
import type { OutboxRow } from '@/db/schema';
import { useSyncStatus } from '@/sync/status-store';

export { requestSync } from '@/sync/scheduler';

export type SyncBadge = { label: string; tone: 'ok' | 'waiting' | 'attention' };

/** Outbox counts and last sync time, live. */
export function useOutbox() {
  return useDbQuery(['outbox', 'sync_state'], () => ({
    ...outboxRepo.outboxCounts(db),
    bills: syncRepo.pendingBillCount(db),
    lastSyncedAt: syncRepo.lastSyncedAt(db),
  }));
}

/**
 * The small badge on the billing screen (User Flows §6): synced · syncing · offline (n bills
 * waiting) · needs attention (the server refused something).
 */
export function useSyncBadge(): SyncBadge {
  const { pending, rejected, bills } = useOutbox();
  const { syncing, problem } = useSyncStatus();
  const waiting = bills > 0 ? `${bills} ${bills === 1 ? 'bill' : 'bills'} waiting` : 'waiting';

  if (rejected > 0) return { label: 'Needs attention', tone: 'attention' };
  if (pending === 0) return { label: 'Synced', tone: 'ok' };
  if (problem === 'offline') return { label: `Offline · ${waiting}`, tone: 'waiting' };
  if (syncing) return { label: 'Syncing', tone: 'waiting' };
  return { label: bills > 0 ? waiting : 'Waiting to sync', tone: 'waiting' };
}

export function useRejected(): OutboxRow[] {
  return useDbQuery(['outbox'], () => outboxRepo.rejectedMutations(db));
}

export function retryRejected(id: number): void {
  syncRepo.retryRejected(db, id);
}

export function removeRejected(id: number): void {
  syncRepo.removeRejected(db, id);
}

/** True once the shop's server data is on this phone (see syncRepo.initialPullDone). */
export function useShopDataReady(): boolean {
  return useDbQuery(['sync_state'], () => syncRepo.initialPullDone(db));
}

export function markShopDataReady(): void {
  syncRepo.markInitialPullDone(db);
}
