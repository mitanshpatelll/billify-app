import { asc, count, eq } from 'drizzle-orm';

import type { SyncedTable } from '@/lib/domain';
import { newId } from '@/lib/ids';

import { outbox, type OutboxRow } from '../schema';
import type { Db } from '../types';

// Columns the phone keeps but never pushes: server time, soft delete (sent only as an update)
// and the server-owned claim link.
const LOCAL_ONLY = new Set(['updatedAt', 'deletedAt', 'linkedUserId']);

/** A new row as push expects it (Backend Guide §6): the row minus local-only columns. */
export function insertData(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !LOCAL_ONLY.has(key)));
}

/**
 * Records one mutation for the next push. Always called inside the transaction that wrote the
 * row, so a row never exists without its outbox entry (or the other way round).
 */
export function enqueue(
  tx: Db,
  tableName: SyncedTable,
  op: 'insert' | 'update',
  data: Record<string, unknown>,
  createdAt: string,
): void {
  tx.insert(outbox).values({ mutationId: newId(), tableName, op, data, createdAt }).run();
}

/** Pending entries in push order: a parent row always comes before its children. */
export function pendingMutations(db: Db, limit: number): OutboxRow[] {
  return db
    .select()
    .from(outbox)
    .where(eq(outbox.status, 'pending'))
    .orderBy(asc(outbox.id))
    .limit(limit)
    .all();
}

export function outboxCounts(db: Db): { pending: number; rejected: number } {
  const rows = db
    .select({ status: outbox.status, n: count() })
    .from(outbox)
    .groupBy(outbox.status)
    .all();
  return {
    pending: rows.find((row) => row.status === 'pending')?.n ?? 0,
    rejected: rows.find((row) => row.status === 'rejected')?.n ?? 0,
  };
}

export function rejectedMutations(db: Db): OutboxRow[] {
  return db
    .select()
    .from(outbox)
    .where(eq(outbox.status, 'rejected'))
    .orderBy(asc(outbox.id))
    .all();
}
