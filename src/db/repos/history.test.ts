/** @jest-environment node */
import { outbox } from '../schema';
import { createTestDb } from '../testing/test-db';
import type { Db } from '../types';
import { billsRepo, customersRepo, khataRepo, productsRepo, stockRepo, summaryRepo } from '.';

let db: Db;
let sugar: ReturnType<typeof productsRepo.createProduct>;
let maggi: ReturnType<typeof productsRepo.createProduct>;
let ramesh: ReturnType<typeof customersRepo.createCustomer>;

const day = new Date('2026-10-15T00:00:00+05:30');
const nextDay = new Date('2026-10-16T00:00:00+05:30');
const at = (hhmm: string) => new Date(`2026-10-15T${hhmm}:00+05:30`);

beforeEach(async () => {
  db = await createTestDb();
  sugar = productsRepo.createProduct(db, {
    barcode: null,
    name: 'Sugar (loose)',
    unit: 'kg',
    pricePaise: 4400,
    mrpPaise: null,
    trackStock: true,
    openingStock: 10,
  });
  maggi = productsRepo.createProduct(db, {
    barcode: '8901058851298',
    name: 'Maggi Masala 70 g',
    unit: 'pcs',
    pricePaise: 1400,
    mrpPaise: 1400,
    trackStock: true,
    openingStock: 12,
  });
  productsRepo.updateProduct(db, maggi.id, { lowStockAt: 10 });
  ramesh = customersRepo.createCustomer(db, { name: 'Ramesh Yadav', phone: '9876504521' });
});

function bill(
  lines: [typeof sugar, number][],
  payments: { method: 'cash' | 'upi' | 'khata'; amountPaise: number }[],
  when: Date,
  customerId: string | null = null,
) {
  return billsRepo.saveBill(
    db,
    {
      billPrefix: 'A',
      customerId,
      lines: lines.map(([p, qty]) => ({
        productId: p.id,
        name: p.name,
        unit: p.unit,
        qty,
        unitPricePaise: p.pricePaise,
      })),
      payments,
    },
    when,
  );
}

describe('listBills', () => {
  it('lists newest first with customer, methods and item count; filters by day and search', () => {
    bill(
      [[sugar, 1]],
      [{ method: 'cash', amountPaise: 4400 }],
      new Date('2026-10-14T18:00:00+05:30'),
    );
    bill(
      [
        [sugar, 0.5],
        [maggi, 2],
      ],
      [
        { method: 'upi', amountPaise: 3000 },
        { method: 'cash', amountPaise: 2000 },
      ],
      at('09:42'),
      ramesh.id,
    );
    const today = billsRepo.listBills(db, { from: day, to: nextDay });
    expect(today).toHaveLength(1);
    expect(today[0]).toMatchObject({
      number: 'A-002',
      customerName: 'Ramesh Yadav',
      methods: 'cash+upi',
      items: 2,
    });
    expect(billsRepo.listBills(db).map((b) => b.number)).toEqual(['A-002', 'A-001']);
    expect(billsRepo.listBills(db, { query: 'ramesh' }).map((b) => b.number)).toEqual(['A-002']);
    expect(billsRepo.listBills(db, { query: 'A-001' }).map((b) => b.number)).toEqual(['A-001']);
  });
});

it('totals count every matching bill, not just the first page', () => {
  for (let i = 0; i < 5; i++)
    bill([[maggi, 1]], [{ method: 'cash', amountPaise: 1400 }], at('09:00'));
  const cancelled = bill([[maggi, 1]], [{ method: 'cash', amountPaise: 1400 }], at('09:30'));
  billsRepo.voidBill(db, cancelled.id);
  expect(billsRepo.listBills(db, { limit: 2 })).toHaveLength(2);
  expect(billsRepo.billTotals(db, { from: day, to: nextDay })).toEqual({
    bills: 5,
    totalPaise: 7000,
  });
});

describe('voidBill', () => {
  it('puts the stock back, takes the khata off, and queues the void first', () => {
    const saved = bill(
      [[sugar, 2]],
      [{ method: 'khata', amountPaise: 8800 }],
      at('10:00'),
      ramesh.id,
    );
    db.delete(outbox).run();

    billsRepo.voidBill(db, saved.id, at('10:05'));

    expect(billsRepo.getBill(db, saved.id)?.voidedAt).toBe(at('10:05').toISOString());
    expect(stockRepo.stockOf(db, sugar.id)).toBe(10);
    expect(khataRepo.customerKhata(db, ramesh.id).balancePaise).toBe(0);
    const queued = db.select().from(outbox).all();
    expect(queued.map((e) => [e.tableName, e.op])).toEqual([
      ['bills', 'update'],
      ['stock_movements', 'insert'],
      ['khata_entries', 'insert'],
    ]);
    expect(queued[0]?.data).toEqual({ id: saved.id, voidedAt: at('10:05').toISOString() });
    expect(queued[2]?.data).toMatchObject({
      kind: 'adjustment',
      deltaPaise: -8800,
      refId: saved.id,
    });
  });

  it('refuses a second cancel', () => {
    const saved = bill([[maggi, 1]], [{ method: 'cash', amountPaise: 1400 }], at('11:00'));
    billsRepo.voidBill(db, saved.id);
    expect(() => billsRepo.voidBill(db, saved.id)).toThrow(
      expect.objectContaining({ code: 'BILL_ALREADY_VOIDED' }),
    );
  });
});

describe('daySummary', () => {
  it('adds up today (cancelled bills left out), the cash to expect, top items, items gone low', () => {
    bill([[sugar, 2]], [{ method: 'cash', amountPaise: 8800 }], at('09:00'));
    bill([[maggi, 3]], [{ method: 'upi', amountPaise: 4200 }], at('10:00'));
    bill(
      [[sugar, 1]],
      [
        { method: 'cash', amountPaise: 1400 },
        { method: 'khata', amountPaise: 3000 },
      ],
      at('11:00'),
      ramesh.id,
    );
    const cancelled = bill([[maggi, 1]], [{ method: 'cash', amountPaise: 1400 }], at('12:00'));
    billsRepo.voidBill(db, cancelled.id);
    bill(
      [[sugar, 1]],
      [{ method: 'cash', amountPaise: 4400 }],
      new Date('2026-10-14T20:00:00+05:30'),
    );
    khataRepo.recordPayment(db, ramesh.id, 2000, 'cash', at('13:00'));
    khataRepo.recordPayment(db, ramesh.id, 500, 'upi', at('14:00'));

    const summary = summaryRepo.daySummary(db, day, nextDay);

    expect(summary).toMatchObject({
      salesPaise: 8800 + 4200 + 4400,
      bills: 3,
      cancelled: 1,
      methods: [
        { method: 'cash', paise: 10_200, bills: 2 },
        { method: 'upi', paise: 4200, bills: 1 },
        { method: 'khata', paise: 3000, bills: 1 },
      ],
      khataCollected: { cash: 2000, upi: 500 },
      expectedCashPaise: 10_200 + 2000,
    });
    expect(summary.topItems.map((i) => [i.name, i.qty, i.paise])).toEqual([
      ['Sugar (loose)', 3, 13_200],
      ['Maggi Masala 70 g', 3, 4200],
    ]);
    // Maggi: 12 − 3 sold (the cancelled one came back) = 9, at or below 10 → went low today
    expect(summary.wentLow.map((i) => i.name)).toEqual(['Maggi Masala 70 g']);
  });

  it('is all zeros on a day without bills', () => {
    expect(summaryRepo.daySummary(db, day, nextDay)).toMatchObject({
      salesPaise: 0,
      bills: 0,
      expectedCashPaise: 0,
      topItems: [],
      wentLow: [],
    });
  });
});
