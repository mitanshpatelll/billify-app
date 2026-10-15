/** @jest-environment node */
import { billsRepo, outboxRepo, productsRepo, syncRepo } from '@/db/repos';
import type { PulledChange, PushResult } from '@/db/repos/sync';
import { outbox, products } from '@/db/schema';
import { createTestDb } from '@/db/testing/test-db';
import type { Db } from '@/db/types';
import { ApiError } from '@/api/client';

import { syncOnce, SyncStuckError, type SyncTransport } from './engine';

jest.mock('@/config/env', () => ({
  env: { apiUrl: 'http://api.test', webUrl: 'http://web.test' },
}));
jest.mock('@/lib/secure-token', () => ({
  secureToken: { get: () => null, set: () => undefined, clear: () => undefined },
}));
jest.mock('@/lib/kv', () => ({
  kvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
}));

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

function addProducts(n: number) {
  for (let i = 0; i < n; i++) {
    productsRepo.createProduct(db, {
      barcode: null,
      name: `Item ${String(i).padStart(3, '0')}`,
      unit: 'pcs',
      pricePaise: 1000,
      mrpPaise: null,
      trackStock: false,
    });
  }
}

type PushBody = Parameters<SyncTransport['push']>[0];

/** A server stand-in: answers every push with `answer`, serves `pages` to pull. */
function fakeServer({
  answer = (m) => ({ mutationId: m.mutationId, status: 'applied' as const }),
  pages = [{ changes: [], nextCursor: 0, hasMore: false }],
}: {
  answer?: (mutation: PushBody['mutations'][number]) => PushResult;
  pages?: { changes: PulledChange[]; nextCursor: number; hasMore: boolean }[];
} = {}) {
  const pushes: PushBody[] = [];
  const pulls: number[] = [];
  const transport: SyncTransport = {
    push: jest.fn(async (body) => {
      pushes.push(body);
      return { results: body.mutations.map(answer) };
    }),
    pull: jest.fn(async (cursor) => {
      pulls.push(cursor);
      return pages[pulls.length - 1] ?? { changes: [], nextCursor: cursor, hasMore: false };
    }),
  };
  return { transport, pushes, pulls };
}

describe('push', () => {
  it('sends the outbox in order, 100 at a time, and empties it', async () => {
    addProducts(150);
    const queued = db
      .select()
      .from(outbox)
      .all()
      .map((entry) => entry.mutationId);
    const server = fakeServer();

    const result = await syncOnce(db, server.transport);

    expect(server.pushes.map((body) => body.mutations.length)).toEqual([100, 50]);
    expect(server.pushes.flatMap((body) => body.mutations.map((m) => m.mutationId))).toEqual(
      queued,
    );
    expect(result).toMatchObject({ pushed: 150, rejected: 0, pulledAll: true });
    expect(db.select().from(outbox).all()).toEqual([]);
  });

  it('sends the same device id every time, in the wire shape', async () => {
    addProducts(1);
    const server = fakeServer();
    await syncOnce(db, server.transport);
    addProducts(1);
    await syncOnce(db, server.transport);

    const [first, second] = server.pushes;
    expect(first?.deviceId).toBe(second?.deviceId);
    expect(first?.mutations[0]).toMatchObject({ table: 'products', op: 'insert' });
    expect(first?.mutations[0]?.data).toHaveProperty('name', 'Item 000');
  });

  it('keeps refused changes with their reason, and still pulls', async () => {
    addProducts(2);
    let n = 0;
    const server = fakeServer({
      answer: (m) =>
        n++ === 0
          ? { mutationId: m.mutationId, status: 'rejected', reason: 'BARCODE_EXISTS' }
          : { mutationId: m.mutationId, status: 'duplicate' },
    });

    const result = await syncOnce(db, server.transport);

    expect(result).toMatchObject({ pushed: 1, rejected: 1, pulledAll: true });
    expect(outboxRepo.rejectedMutations(db)).toMatchObject([
      { status: 'rejected', reason: 'BARCODE_EXISTS' },
    ]);
    expect(server.pulls).toEqual([0]);
  });

  it('keeps the batch on a network error, counts the attempt, and does not pull', async () => {
    addProducts(2);
    const transport: SyncTransport = {
      push: jest.fn(async () => {
        throw new ApiError(0, 'NETWORK_ERROR', 'offline');
      }),
      pull: jest.fn(),
    };

    await expect(syncOnce(db, transport)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(
      db
        .select()
        .from(outbox)
        .all()
        .map((entry) => entry.attempts),
    ).toEqual([1, 1]);
    expect(transport.pull).not.toHaveBeenCalled();
  });

  it('stops (and never pulls) when the server answers none of a batch', async () => {
    addProducts(1);
    const transport: SyncTransport = {
      push: jest.fn(async () => ({ results: [] })),
      pull: jest.fn(),
    };
    await expect(syncOnce(db, transport)).rejects.toBeInstanceOf(SyncStuckError);
    expect(transport.push).toHaveBeenCalledTimes(1);
    expect(transport.pull).not.toHaveBeenCalled();
    expect(
      db
        .select()
        .from(outbox)
        .all()
        .map((entry) => entry.attempts),
    ).toEqual([1]);
  });

  it('keeps going while each round settles something, counting the unanswered', async () => {
    addProducts(3);
    // Answers only the first mutation of each batch.
    const transport: SyncTransport = {
      push: jest.fn(async (body) => ({
        results: [{ mutationId: body.mutations[0]!.mutationId, status: 'applied' as const }],
      })),
      pull: jest.fn(async () => ({ changes: [], nextCursor: 0, hasMore: false })),
    };
    const result = await syncOnce(db, transport);
    expect(transport.push).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ pushed: 3, pulledAll: true });
  });

  it('applies nothing once cancelled (signed out while the request was out)', async () => {
    addProducts(1);
    const server = fakeServer();
    await syncOnce(db, server.transport, { cancelled: () => true });
    expect(db.select().from(outbox).all()).toHaveLength(1);
  });
});

const maggiRow = (fields: Record<string, unknown> = {}) => ({
  id: '0192f3a1-0000-7000-8000-0000000000aa',
  createdAt: '2026-10-14T05:00:00.000Z',
  updatedAt: '2026-10-14T05:00:01.000Z',
  deletedAt: null,
  barcode: '8901058851298',
  name: 'Maggi Masala 70 g',
  unit: 'pcs',
  pricePaise: 1400,
  mrpPaise: 1400,
  lowStockAt: null,
  trackStock: true,
  ...fields,
});

describe('pull', () => {
  it('pages until hasMore is false, upserting rows and saving the cursor', async () => {
    const server = fakeServer({
      pages: [
        { changes: [{ table: 'products', seq: 7, row: maggiRow() }], nextCursor: 7, hasMore: true },
        {
          changes: [{ table: 'products', seq: 9, row: maggiRow({ pricePaise: 1300 }) }],
          nextCursor: 9,
          hasMore: false,
        },
      ],
    });
    const progress: number[] = [];

    const result = await syncOnce(db, server.transport, { onPulled: (n) => progress.push(n) });

    expect(server.pulls).toEqual([0, 7]);
    expect(progress).toEqual([1, 2]);
    expect(result).toMatchObject({ pulled: 2, pulledAll: true });
    expect(db.select().from(products).all()).toMatchObject([
      { name: 'Maggi Masala 70 g', pricePaise: 1300 },
    ]);
    expect(syncRepo.pullCursor(db)).toBe(9);
    expect(syncRepo.lastSyncedAt(db)).not.toBeNull();
  });

  it('stops when pull says there is more but the cursor does not move', async () => {
    const server = fakeServer({
      pages: [{ changes: [], nextCursor: 0, hasMore: true }],
    });
    await expect(syncOnce(db, server.transport)).rejects.toBeInstanceOf(SyncStuckError);
  });

  it('skips tables this app version does not know, and still moves the cursor', () => {
    syncRepo.applyPullChanges(
      db,
      [{ table: 'orders' as never, seq: 4, row: { id: '0192f3a1-0000-7000-8000-00000000c0de' } }],
      4,
    );
    expect(syncRepo.pullCursor(db)).toBe(4);
  });

  it('never overwrites a row whose change the server refused (not yet retried or removed)', async () => {
    const local = productsRepo.createProduct(db, {
      barcode: '8904043901015',
      name: 'Tata Salt 1 kg',
      unit: 'pcs',
      pricePaise: 2800,
      mrpPaise: 2800,
      trackStock: true,
    });
    await syncOnce(
      db,
      fakeServer({
        answer: (m) => ({ mutationId: m.mutationId, status: 'rejected', reason: 'BARCODE_EXISTS' }),
      }).transport,
    );
    syncRepo.applyPullChanges(
      db,
      [{ table: 'products', seq: 5, row: maggiRow({ id: local.id, name: 'Server copy' }) }],
      5,
    );
    expect(db.select().from(products).all()).toMatchObject([{ name: 'Tata Salt 1 kg' }]);
  });

  it('never overwrites a row that has a change waiting to be pushed', () => {
    const local = productsRepo.createProduct(db, {
      barcode: null,
      name: 'Tata Salt (new name)',
      unit: 'pcs',
      pricePaise: 2800,
      mrpPaise: null,
      trackStock: true,
    });
    syncRepo.applyPullChanges(
      db,
      [{ table: 'products', seq: 3, row: maggiRow({ id: local.id, name: 'Tata Salt (old)' }) }],
      3,
    );
    expect(db.select().from(products).all()).toMatchObject([{ name: 'Tata Salt (new name)' }]);
    expect(syncRepo.pullCursor(db)).toBe(3);
  });
});

describe('removing a refused change', () => {
  it('takes the changes that hang off it along, and re-pulls from the start', async () => {
    const sugar = productsRepo.createProduct(db, {
      barcode: null,
      name: 'Sugar',
      unit: 'kg',
      pricePaise: 4400,
      mrpPaise: null,
      trackStock: true,
      openingStock: 10,
    });
    billsRepo.saveBill(db, {
      billPrefix: 'A',
      customerId: null,
      lines: [{ productId: sugar.id, name: 'Sugar', unit: 'kg', qty: 1, unitPricePaise: 4400 }],
      payments: [{ method: 'cash', amountPaise: 4400 }],
    });
    syncRepo.applyPullChanges(db, [], 42);
    // The server refuses the bill (its number was taken) and everything after it.
    await syncOnce(
      db,
      fakeServer({
        answer: (m) =>
          m.table === 'products' || (m.table === 'stock_movements' && m.data.reason !== 'sale')
            ? { mutationId: m.mutationId, status: 'applied' }
            : { mutationId: m.mutationId, status: 'rejected', reason: 'BILL_NUMBER_TAKEN' },
      }).transport,
    );
    const billEntry = outboxRepo.rejectedMutations(db).find((e) => e.tableName === 'bills');

    syncRepo.removeRejected(db, billEntry!.id);

    // Lines, payment and the sale movement went with the bill; nothing is left to push.
    expect(db.select().from(outbox).all()).toEqual([]);
    expect(syncRepo.pullCursor(db)).toBe(0);
  });
});
