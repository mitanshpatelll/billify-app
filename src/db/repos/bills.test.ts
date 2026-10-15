/** @jest-environment node */
import { billItems, bills, khataEntries, outbox, payments, stockMovements } from '../schema';
import { createTestDb } from '../testing/test-db';
import type { Db } from '../types';
import { billsRepo, customersRepo, productsRepo } from '.';
import type { NewBill } from './bills';

let db: Db;
let maggi: ReturnType<typeof productsRepo.createProduct>;
let sugar: ReturnType<typeof productsRepo.createProduct>;
let unTracked: ReturnType<typeof productsRepo.createProduct>;

const at = new Date('2026-10-15T10:30:00.000Z');

beforeEach(async () => {
  db = await createTestDb();
  maggi = productsRepo.createProduct(db, {
    barcode: '8901058851298',
    name: 'Maggi Masala 70 g',
    unit: 'pcs',
    pricePaise: 1400,
    mrpPaise: 1400,
    trackStock: true,
  });
  sugar = productsRepo.createProduct(db, {
    barcode: null,
    name: 'Sugar (loose)',
    unit: 'kg',
    pricePaise: 4400,
    mrpPaise: null,
    trackStock: true,
  });
  unTracked = productsRepo.createProduct(db, {
    barcode: null,
    name: 'Coriander bunch',
    unit: 'pcs',
    pricePaise: 1000,
    mrpPaise: null,
    trackStock: false,
  });
  // Only the bill's own writes from here on.
  db.delete(outbox).run();
});

function line(product: typeof maggi, qty: number) {
  return {
    productId: product.id,
    name: product.name,
    unit: product.unit,
    qty,
    unitPricePaise: product.pricePaise,
  };
}

// 2 × ₹14 + 0.25 kg × ₹44 + 1 × ₹10 = ₹49
let cart: NewBill;
beforeEach(() => {
  cart = {
    billPrefix: 'A',
    customerId: null,
    lines: [line(maggi, 2), line(sugar, 0.25), line(unTracked, 1)],
    payments: [{ method: 'cash', amountPaise: 4900 }],
  };
});

describe('nextBillNumber', () => {
  it('starts at 001 and counts up per prefix', () => {
    expect(billsRepo.nextBillNumber(db, 'A')).toBe('A-001');
    billsRepo.saveBill(db, cart);
    billsRepo.saveBill(db, cart);
    expect(billsRepo.nextBillNumber(db, 'A')).toBe('A-003');
    expect(billsRepo.nextBillNumber(db, 'B')).toBe('B-001');
  });

  it('goes past 999 by number, not by text order', () => {
    db.insert(bills)
      .values({
        id: '0192f3a1-0000-7000-8000-000000000001',
        createdAt: at.toISOString(),
        updatedAt: at.toISOString(),
        number: 'A-999',
        totalPaise: 100,
        publicToken: 'AAAAAAAAAAAAAAAAAAAAAA',
      })
      .run();
    expect(billsRepo.nextBillNumber(db, 'A')).toBe('A-1000');
  });
});

describe('saveBill', () => {
  it('writes bill, lines, payments and sale stock movements in one go', () => {
    const bill = billsRepo.saveBill(db, cart, at);

    expect(bill).toMatchObject({ number: 'A-001', totalPaise: 4900, createdAt: at.toISOString() });
    expect(bill.publicToken).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(
      db
        .select()
        .from(billItems)
        .all()
        .map((item) => [item.position, item.nameSnapshot, item.qty]),
    ).toEqual([
      [0, 'Maggi Masala 70 g', 2],
      [1, 'Sugar (loose)', 0.25],
      [2, 'Coriander bunch', 1],
    ]);
    expect(db.select().from(payments).all()).toMatchObject([
      { billId: bill.id, method: 'cash', amountPaise: 4900 },
    ]);
    // Only tracked products: Coriander bunch has no movement.
    expect(db.select().from(stockMovements).all()).toMatchObject([
      { productId: maggi.id, qtyDelta: -2, reason: 'sale', refId: bill.id },
      { productId: sugar.id, qtyDelta: -0.25, reason: 'sale', refId: bill.id },
    ]);
    expect(db.select().from(khataEntries).all()).toEqual([]);
  });

  it('queues every row, parents first, so push never sends a child before its parent', () => {
    billsRepo.saveBill(db, cart, at);
    expect(
      db
        .select()
        .from(outbox)
        .all()
        .map((entry) => entry.tableName),
    ).toEqual([
      'bills',
      'bill_items',
      'bill_items',
      'bill_items',
      'payments',
      'stock_movements',
      'stock_movements',
    ]);
    const [billEntry] = db.select().from(outbox).all();
    expect(Object.keys(billEntry?.data ?? {}).sort()).toEqual(
      ['createdAt', 'customerId', 'id', 'number', 'publicToken', 'totalPaise', 'voidedAt'].sort(),
    );
  });

  it('adds the khata part of a split bill to the customer’s khata', () => {
    const customer = customersRepo.createCustomer(db, {
      name: 'Ramesh Yadav',
      phone: '98765 04521',
    });
    const bill = billsRepo.saveBill(db, {
      ...cart,
      customerId: customer.id,
      payments: [
        { method: 'cash', amountPaise: 900 },
        { method: 'khata', amountPaise: 4000 },
      ],
    });
    expect(db.select().from(khataEntries).all()).toMatchObject([
      { customerId: customer.id, kind: 'credit_sale', deltaPaise: 4000, refId: bill.id },
    ]);
  });

  it.each<[string, (bill: NewBill) => NewBill, string]>([
    [
      'payments that don’t add up',
      (b) => ({ ...b, payments: [{ method: 'cash', amountPaise: 4800 }] }),
      'PAYMENTS_MISMATCH',
    ],
    [
      'a zero payment line',
      (b) => ({
        ...b,
        payments: [
          { method: 'cash', amountPaise: 4900 },
          { method: 'upi', amountPaise: 0 },
        ],
      }),
      'PAYMENTS_MISMATCH',
    ],
    [
      'khata without a customer',
      (b) => ({ ...b, payments: [{ method: 'khata', amountPaise: 4900 }] }),
      'KHATA_NEEDS_CUSTOMER',
    ],
    [
      'an unknown customer',
      (b) => ({ ...b, customerId: '0192f3a1-0000-7000-8000-00000000dead' }),
      'CUSTOMER_NOT_FOUND',
    ],
    ['an empty cart', (b) => ({ ...b, lines: [] }), 'EMPTY_BILL'],
    ['a zero quantity', (b) => ({ ...b, lines: [line(maggi, 0)] }), 'INVALID_QTY'],
    ['a quantity that rounds to 0', (b) => ({ ...b, lines: [line(sugar, 0.0004)] }), 'INVALID_QTY'],
  ])('refuses %s and writes nothing', (_, change, code) => {
    expect(() => billsRepo.saveBill(db, change(cart))).toThrow(expect.objectContaining({ code }));
    expect(db.select().from(bills).all()).toEqual([]);
    expect(db.select().from(outbox).all()).toEqual([]);
  });

  it('saving the same draft twice returns the first bill and writes nothing new', () => {
    const draftId = '0192f3a1-0000-7000-8000-0000000d4af7';
    const first = billsRepo.saveBill(db, { ...cart, id: draftId });
    const queued = db.select().from(outbox).all().length;
    const second = billsRepo.saveBill(db, { ...cart, id: draftId });

    expect(second).toEqual(first);
    expect(first.id).toBe(draftId);
    expect(db.select().from(bills).all()).toHaveLength(1);
    expect(db.select().from(stockMovements).all()).toHaveLength(2);
    expect(db.select().from(outbox).all()).toHaveLength(queued);
  });

  it('reads a saved bill back with lines in bill order', () => {
    const bill = billsRepo.saveBill(db, cart);
    const saved = billsRepo.getBill(db, bill.id);
    expect(saved?.items.map((item) => item.nameSnapshot)).toEqual([
      'Maggi Masala 70 g',
      'Sugar (loose)',
      'Coriander bunch',
    ]);
    expect(saved?.payments).toHaveLength(1);
    expect(billsRepo.getBill(db, 'nope')).toBeUndefined();
  });
});
