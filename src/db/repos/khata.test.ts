/** @jest-environment node */
import { outbox } from '../schema';
import { createTestDb } from '../testing/test-db';
import type { Db } from '../types';
import { billsRepo, customersRepo, khataRepo, productsRepo } from '.';

let db: Db;
let ramesh: ReturnType<typeof customersRepo.createCustomer>;
let sunita: ReturnType<typeof customersRepo.createCustomer>;

beforeEach(async () => {
  db = await createTestDb();
  ramesh = customersRepo.createCustomer(db, { name: 'Ramesh Yadav', phone: '9876504521' });
  sunita = customersRepo.createCustomer(db, { name: 'Sunita Devi', phone: null });
  customersRepo.createCustomer(db, { name: 'Mohd. Arif', phone: null });
});

function khataBill(customerId: string, paise: number, at = new Date()) {
  const item = productsRepo.createProduct(db, {
    barcode: null,
    name: `Item ${paise}`,
    unit: 'pcs',
    pricePaise: paise,
    mrpPaise: null,
    trackStock: false,
  });
  return billsRepo.saveBill(
    db,
    {
      billPrefix: 'A',
      customerId,
      lines: [{ productId: item.id, name: item.name, unit: 'pcs', qty: 1, unitPricePaise: paise }],
      payments: [{ method: 'khata', amountPaise: paise }],
    },
    at,
  );
}

it('balance = credit sales minus payments; the most due first', () => {
  khataBill(ramesh.id, 124_000);
  khataBill(sunita.id, 86_000);
  khataRepo.recordPayment(db, ramesh.id, 50_000, 'cash');

  expect(khataRepo.customerBalances(db).map((c) => [c.name, c.balancePaise])).toEqual([
    ['Sunita Devi', 86_000],
    ['Ramesh Yadav', 74_000],
    ['Mohd. Arif', 0],
  ]);
});

it('paying more than is due leaves an advance (negative balance), not an error', () => {
  khataBill(ramesh.id, 10_000);
  khataRepo.recordPayment(db, ramesh.id, 15_000, 'upi');
  expect(khataRepo.customerKhata(db, ramesh.id).balancePaise).toBe(-5_000);
  expect(khataRepo.customerBalances(db, { filter: 'settled' }).map((c) => c.name)).toContain(
    'Ramesh Yadav',
  );
});

it('filters due / settled and searches by name or phone', () => {
  khataBill(ramesh.id, 10_000);
  expect(khataRepo.customerBalances(db, { filter: 'due' }).map((c) => c.name)).toEqual([
    'Ramesh Yadav',
  ]);
  expect(khataRepo.customerBalances(db, { query: '4521' }).map((c) => c.name)).toEqual([
    'Ramesh Yadav',
  ]);
  expect(khataRepo.customerBalances(db, { query: 'devi' }).map((c) => c.name)).toEqual([
    'Sunita Devi',
  ]);
});

it('summarises what is due, and what came in / went out this week', () => {
  const lastWeek = new Date('2026-10-05T10:00:00Z');
  const monday = new Date('2026-10-12T00:00:00Z');
  khataBill(ramesh.id, 50_000, lastWeek);
  khataBill(ramesh.id, 20_000, new Date('2026-10-13T10:00:00Z'));
  khataBill(sunita.id, 30_000, new Date('2026-10-14T10:00:00Z'));
  khataRepo.recordPayment(db, ramesh.id, 40_000, 'cash', new Date('2026-10-15T09:00:00Z'));

  expect(khataRepo.khataSummary(db, monday)).toEqual({
    toCollectPaise: 30_000 + 30_000,
    dueCustomers: 2,
    customers: 3,
    collectedSincePaise: 40_000,
    givenSincePaise: 50_000,
  });
});

it('history is newest first, with the bill number of each credit sale', () => {
  const bill = khataBill(ramesh.id, 42_000, new Date('2026-10-12T04:12:00Z'));
  khataRepo.recordPayment(db, ramesh.id, 10_000, 'cash', new Date('2026-10-13T04:00:00Z'));
  const { entries } = khataRepo.customerKhata(db, ramesh.id);
  expect(entries.map((e) => [e.kind, e.deltaPaise, e.billNumber, e.method])).toEqual([
    ['settlement', -10_000, null, 'cash'],
    ['credit_sale', 42_000, bill.number, null],
  ]);
  expect(entries[1]?.billItems).toBe(1);
});

it('a payment syncs as a settlement with its method', () => {
  db.delete(outbox).run();
  khataRepo.recordPayment(db, ramesh.id, 50_000, 'cash');
  const [entry] = db.select().from(outbox).all();
  expect(entry?.data).toMatchObject({
    customerId: ramesh.id,
    kind: 'settlement',
    deltaPaise: -50_000,
    method: 'cash',
  });
});

it('refuses a zero payment or a removed customer', () => {
  expect(() => khataRepo.recordPayment(db, ramesh.id, 0, 'cash')).toThrow(
    expect.objectContaining({ code: 'INVALID_AMOUNT' }),
  );
  expect(() => khataRepo.recordPayment(db, 'nope', 100, 'cash')).toThrow(
    expect.objectContaining({ code: 'CUSTOMER_NOT_FOUND' }),
  );
});

it('editing a customer pushes only what changed', () => {
  db.delete(outbox).run();
  customersRepo.updateCustomer(db, ramesh.id, { name: 'Ramesh Yadav', phone: '+91 98111 22334' });
  expect(db.select().from(outbox).all()[0]?.data).toEqual({ id: ramesh.id, phone: '9811122334' });
  expect(() => customersRepo.updateCustomer(db, ramesh.id, { phone: '123' })).toThrow(
    expect.objectContaining({ code: 'INVALID_PHONE' }),
  );
});

it('tells customers who never had khata apart from settled ones', () => {
  khataBill(ramesh.id, 10_000);
  khataRepo.recordPayment(db, ramesh.id, 10_000, 'cash');
  const rows = khataRepo.customerBalances(db);
  expect(rows.find((c) => c.name === 'Ramesh Yadav')).toMatchObject({
    balancePaise: 0,
    entries: 2,
  });
  expect(rows.find((c) => c.name === 'Sunita Devi')).toMatchObject({ balancePaise: 0, entries: 0 });
  expect(khataRepo.customerBalances(db, { filter: 'settled' }).map((c) => c.name)).toEqual([
    'Ramesh Yadav',
  ]);
});
