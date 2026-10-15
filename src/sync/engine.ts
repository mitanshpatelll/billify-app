import { outboxRepo, syncRepo } from '@/db/repos';
import type { PulledChange, PushResult } from '@/db/repos/sync';
import type { Db } from '@/db/types';

/** The two sync calls (Backend Guide §6). The app's real one is in transport.ts. */
export type SyncTransport = {
  push(body: {
    deviceId: string;
    mutations: { mutationId: string; table: string; op: string; data: Record<string, unknown> }[];
  }): Promise<{ results: PushResult[] }>;
  pull(
    cursor: number,
    limit: number,
  ): Promise<{
    changes: PulledChange[];
    nextCursor: number;
    hasMore: boolean;
  }>;
};

export const PUSH_BATCH = 100; // the server's cap
export const PULL_PAGE = 500;
const MAX_PULL_PAGES = 1_000; // 500k rows: far beyond any shop, but never an endless loop

/** The server answered in a way sync can't make progress with; the scheduler backs off. */
export class SyncStuckError extends Error {
  readonly code = 'SYNC_STUCK';
  constructor(message: string) {
    super(message);
    this.name = 'SyncStuckError';
  }
}

export type SyncResult = { pushed: number; rejected: number; pulled: number; pulledAll: boolean };

/**
 * One full sync (User Flows §6): push the outbox in order, 100 at a time, until it is empty;
 * then pull every change since the cursor. Pull waits for an empty outbox so it never brings
 * back an older copy of a row the phone has just changed. Throws on network / server errors:
 * the scheduler retries with backoff, and nothing is lost (push is idempotent, pull re-pulls).
 */
export async function syncOnce(
  db: Db,
  transport: SyncTransport,
  {
    onPulled,
    cancelled = () => false,
  }: {
    onPulled?: (total: number) => void;
    /** True once signed out: an answer that arrives after that must not touch the wiped phone. */
    cancelled?: () => boolean;
  } = {},
): Promise<SyncResult> {
  const result: SyncResult = { pushed: 0, rejected: 0, pulled: 0, pulledAll: false };
  const deviceId = syncRepo.deviceId(db);

  for (;;) {
    const batch = outboxRepo.pendingMutations(db, PUSH_BATCH);
    if (batch.length === 0) break;
    let response: { results: PushResult[] };
    try {
      response = await transport.push({
        deviceId,
        mutations: batch.map((entry) => ({
          mutationId: entry.mutationId,
          table: entry.tableName,
          op: entry.op,
          data: entry.data,
        })),
      });
    } catch (error) {
      syncRepo.countAttempt(
        db,
        batch.map((entry) => entry.mutationId),
      );
      throw error;
    }
    if (cancelled()) return result;
    syncRepo.applyPushResults(db, response.results);
    result.pushed += response.results.filter((r) => r.status !== 'rejected').length;
    result.rejected += response.results.filter((r) => r.status === 'rejected').length;
    // Every push must settle at least one mutation; otherwise the same batch would go round
    // forever. Unanswered ones count an attempt and the scheduler backs off.
    const answered = new Set(response.results.map((r) => r.mutationId));
    const unanswered = batch.filter((entry) => !answered.has(entry.mutationId));
    if (unanswered.length > 0) {
      syncRepo.countAttempt(
        db,
        unanswered.map((entry) => entry.mutationId),
      );
    }
    if (unanswered.length === batch.length) {
      throw new SyncStuckError('The server answered none of the pushed changes');
    }
  }

  if (outboxRepo.outboxCounts(db).pending > 0) return result;

  for (let pages = 0; ; pages++) {
    const cursor = syncRepo.pullCursor(db);
    const page = await transport.pull(cursor, PULL_PAGE);
    if (cancelled()) return result;
    if (page.hasMore && (page.nextCursor <= cursor || pages >= MAX_PULL_PAGES)) {
      throw new SyncStuckError('Pull says there is more, but the cursor did not move');
    }
    syncRepo.applyPullChanges(db, page.changes, page.nextCursor);
    result.pulled += page.changes.length;
    onPulled?.(result.pulled);
    if (!page.hasMore) break;
  }
  result.pulledAll = true;
  syncRepo.markSynced(db, new Date());
  return result;
}
