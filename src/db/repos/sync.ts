import { and, count, eq, inArray, max, or, sql } from 'drizzle-orm';

import type { SyncedTable } from '@/lib/domain';
import { newId } from '@/lib/ids';

import {
  billItems,
  bills,
  customers,
  khataEntries,
  outbox,
  payments,
  products,
  stockMovements,
  syncState,
} from '../schema';
import type { Db } from '../types';

const LOCAL_TABLES = {
  products,
  customers,
  bills,
  bill_items: billItems,
  payments,
  stock_movements: stockMovements,
  khata_entries: khataEntries,
} as const satisfies Record<SyncedTable, unknown>;

export type PushResult = {
  mutationId: string;
  status: 'applied' | 'duplicate' | 'rejected';
  reason?: string;
  message?: string;
};

/** One pulled row, as GET /v1/sync/pull sends it (camelCase, ISO times). */
export type PulledChange = { table: SyncedTable; seq: number; row: { id: string } & object };

// ------------------------------------------------------------------ small state

function getValue(db: Db, key: string): string | undefined {
  return db.select().from(syncState).where(eq(syncState.key, key)).get()?.value;
}

function setValue(db: Db, key: string, value: string): void {
  db.insert(syncState)
    .values({ key, value })
    .onConflictDoUpdate({ target: syncState.key, set: { value } })
    .run();
}

/** This install's id, sent with every push (made once, cleared with the phone's data). */
export function deviceId(db: Db): string {
  const existing = getValue(db, 'device_id');
  if (existing) return existing;
  const id = newId();
  setValue(db, 'device_id', id);
  return id;
}

export function pullCursor(db: Db): number {
  return Number(getValue(db, 'pull_cursor') ?? 0);
}

export function lastSyncedAt(db: Db): string | null {
  return getValue(db, 'last_synced_at') ?? null;
}

export function markSynced(db: Db, at: Date): void {
  setValue(db, 'last_synced_at', at.toISOString());
}

/**
 * True once this phone holds the shop's server data: right away for a shop made on this phone,
 * after the first full pull for a shop restored onto a new phone.
 */
export function initialPullDone(db: Db): boolean {
  return getValue(db, 'initial_pull_done') === '1';
}

export function markInitialPullDone(db: Db): void {
  setValue(db, 'initial_pull_done', '1');
}

// ------------------------------------------------------------------ push

/**
 * What push answered, per mutation: applied and duplicate leave the outbox; rejected stay,
 * with the reason, until the shopkeeper retries or removes them (19 Sync). A mutation the
 * server didn't answer stays pending for the next push.
 */
export function applyPushResults(db: Db, results: PushResult[]): void {
  db.transaction((tx) => {
    const done = results
      .filter((result) => result.status !== 'rejected')
      .map((result) => result.mutationId);
    if (done.length) tx.delete(outbox).where(inArray(outbox.mutationId, done)).run();
    for (const result of results) {
      if (result.status !== 'rejected') continue;
      tx.update(outbox)
        .set({ status: 'rejected', reason: result.reason ?? null, message: result.message ?? null })
        .where(eq(outbox.mutationId, result.mutationId))
        .run();
    }
  });
}

/** A failed push (network, server down): the batch stays pending, attempts counted. */
export function countAttempt(db: Db, mutationIds: string[]): void {
  if (!mutationIds.length) return;
  for (const mutationId of mutationIds) {
    const entry = db.select().from(outbox).where(eq(outbox.mutationId, mutationId)).get();
    if (entry) {
      db.update(outbox)
        .set({ attempts: entry.attempts + 1 })
        .where(eq(outbox.mutationId, mutationId))
        .run();
    }
  }
}

export function retryRejected(db: Db, id: number): void {
  db.update(outbox)
    .set({ status: 'pending', reason: null, message: null })
    .where(and(eq(outbox.id, id), eq(outbox.status, 'rejected')))
    .run();
}

/**
 * Gives up on one refused change: it stays on this phone and never reaches the server. Changes
 * that only exist because of it (a bill's lines, payments, stock and khata rows; a product's
 * stock ledger; a customer's khata ledger) go with it, or they would be refused next. A bill line
 * that merely sells a refused product stays: it is refused on its own and shown on its own. The pull cursor goes back to the start, so the
 * next sync brings the server's copy of anything the removed change had touched.
 */
export function removeRejected(db: Db, id: number): void {
  db.transaction((tx) => {
    const entry = tx
      .select()
      .from(outbox)
      .where(and(eq(outbox.id, id), eq(outbox.status, 'rejected')))
      .get();
    if (!entry) return;
    const rowId = entry.data.id;
    tx.delete(outbox).where(eq(outbox.id, id)).run();
    if (typeof rowId === 'string') {
      const field = (key: string) => sql`json_extract(${outbox.data}, ${`$.${key}`})`;
      tx.delete(outbox)
        .where(
          or(
            // a bill's lines and payments, and the stock / khata rows it made
            eq(field('billId'), rowId),
            eq(field('refId'), rowId),
            // a product's own stock ledger, a customer's own khata ledger
            and(eq(outbox.tableName, 'stock_movements'), eq(field('productId'), rowId)),
            and(eq(outbox.tableName, 'khata_entries'), eq(field('customerId'), rowId)),
          ),
        )
        .run();
    }
    setValue(tx, 'pull_cursor', '0');
  });
}

/** Highest outbox id: grows only when a write queues new work (the scheduler watches it). */
export function latestOutboxId(db: Db): number {
  return (
    db
      .select({ id: max(outbox.id) })
      .from(outbox)
      .get()?.id ?? 0
  );
}

export function pendingBillCount(db: Db): number {
  return (
    db
      .select({ n: count() })
      .from(outbox)
      .where(
        and(eq(outbox.status, 'pending'), eq(outbox.tableName, 'bills'), eq(outbox.op, 'insert')),
      )
      .get()?.n ?? 0
  );
}

// ------------------------------------------------------------------ pull

/**
 * Ids of rows with a local change the server doesn't have yet (waiting, or refused and not yet
 * retried or removed): a pull must not overwrite them.
 */
function unsentRowIds(db: Db): Set<string> {
  const ids = new Set<string>();
  for (const entry of db.select({ data: outbox.data }).from(outbox).all()) {
    const id = entry.data.id;
    if (typeof id === 'string') ids.add(id);
  }
  return ids;
}

/**
 * Upserts one pulled page and moves the cursor, in one transaction (a crash halfway re-pulls
 * the page; upserts make that harmless). Rows with an unsent local change are skipped: once
 * pushed, the server sends them again with a newer seq; if the change is removed instead,
 * removeRejected re-pulls from the start. A table this app version doesn't know is skipped too
 * (a newer server), so it can't jam the cursor.
 */
export function applyPullChanges(db: Db, changes: PulledChange[], nextCursor: number): void {
  db.transaction((tx) => {
    const skip = unsentRowIds(tx);
    for (const change of changes) {
      if (skip.has(change.row.id)) continue;
      const table = LOCAL_TABLES[change.table];
      if (!table) continue;
      // The pulled row has exactly the local columns (same names as the Drizzle schema).
      const row = change.row as typeof table.$inferInsert;
      tx.insert(table).values(row).onConflictDoUpdate({ target: table.id, set: row }).run();
    }
    setValue(tx, 'pull_cursor', String(nextCursor));
  });
}
