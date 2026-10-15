/** @jest-environment node */
import { outbox, stockMovements } from '../schema';
import { createTestDb } from '../testing/test-db';
import type { Db } from '../types';
import { billsRepo, productsRepo } from '.';
import * as stockRepo from './stock';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

function product(name: string, fields: Partial<productsRepo.NewProduct> = {}) {
  return productsRepo.createProduct(db, {
    barcode: null,
    name,
    unit: 'pcs',
    pricePaise: 2800,
    mrpPaise: null,
    trackStock: true,
    ...fields,
  });
}

function sell(p: ReturnType<typeof product>, qty: number) {
  billsRepo.saveBill(db, {
    billPrefix: 'A',
    customerId: null,
    lines: [{ productId: p.id, name: p.name, unit: p.unit, qty, unitPricePaise: p.pricePaise }],
    payments: [{ method: 'cash', amountPaise: Math.round(qty * p.pricePaise) }],
  });
}

describe('stock levels', () => {
  it('is the sum of the ledger: opening stock, stock in, sales', () => {
    const salt = product('Tata Salt 1 kg', { openingStock: 10 });
    stockRepo.receiveStock(db, [{ productId: salt.id, qty: 24 }]);
    sell(salt, 3);
    expect(stockRepo.stockOf(db, salt.id)).toBe(31);
    expect(stockRepo.stockLevels(db)).toMatchObject([{ name: 'Tata Salt 1 kg', inStock: 31 }]);
  });

  it('keeps kg to 3 decimals and can go negative (sold without stocking in)', () => {
    const sugar = product('Sugar', { unit: 'kg', pricePaise: 4400, openingStock: 1.5 });
    sell(sugar, 0.25);
    sell(sugar, 0.25);
    expect(stockRepo.stockOf(db, sugar.id)).toBe(1);
    const parle = product('Parle-G 250 g');
    sell(parle, 2);
    expect(stockRepo.stockOf(db, parle.id)).toBe(-2);
  });

  it('flags low (at or below the alert level) and out (at or below 0); untracked never', () => {
    const maggi = product('Maggi', { openingStock: 3 });
    productsRepo.updateProduct(db, maggi.id, { lowStockAt: 5 });
    const salt = product('Salt', { openingStock: 20 });
    productsRepo.updateProduct(db, salt.id, { lowStockAt: 5 });
    product('Parle-G'); // no alert level, 0 in stock → out (and so low)
    product('Coriander', { trackStock: false });

    expect(stockRepo.lowStock(db).map((row) => row.name)).toEqual(['Parle-G', 'Maggi']);
    expect(stockRepo.stockSummary(db)).toMatchObject({ items: 4, low: 2, out: 1 });
    expect(stockRepo.stockLevels(db, { filter: 'out' }).map((row) => row.name)).toEqual([
      'Parle-G',
    ]);
  });

  it('values stock at selling price, counting only tracked items above 0', () => {
    product('Salt', { openingStock: 10, pricePaise: 2800 });
    product('Sugar', { unit: 'kg', pricePaise: 4400, openingStock: 2.5 });
    product('Coriander', { trackStock: false, pricePaise: 1000 });
    expect(stockRepo.stockSummary(db).valuePaise).toBe(28_000 + 11_000);
  });

  it('searches by name or exact barcode', () => {
    product('Tata Salt 1 kg', { barcode: '8904043901015' });
    product('Maggi');
    expect(stockRepo.stockLevels(db, { query: 'salt' }).map((r) => r.name)).toEqual([
      'Tata Salt 1 kg',
    ]);
    expect(stockRepo.stockLevels(db, { query: '8904043901015' })).toHaveLength(1);
  });
});

describe('stock in and fix a count', () => {
  it('stock in writes one purchase movement per line, queued for sync', () => {
    const salt = product('Salt');
    const maggi = product('Maggi');
    db.delete(outbox).run();
    stockRepo.receiveStock(db, [
      { productId: salt.id, qty: 12 },
      { productId: maggi.id, qty: 48 },
    ]);
    expect(db.select().from(stockMovements).all()).toMatchObject([
      { productId: salt.id, qtyDelta: 12, reason: 'purchase' },
      { productId: maggi.id, qtyDelta: 48, reason: 'purchase' },
    ]);
    expect(
      db
        .select()
        .from(outbox)
        .all()
        .map((e) => e.tableName),
    ).toEqual(['stock_movements', 'stock_movements']);
  });

  it('refuses an empty or zero stock in', () => {
    const salt = product('Salt');
    expect(() => stockRepo.receiveStock(db, [])).toThrow(
      expect.objectContaining({ code: 'EMPTY_STOCK_IN' }),
    );
    expect(() => stockRepo.receiveStock(db, [{ productId: salt.id, qty: 0 }])).toThrow(
      expect.objectContaining({ code: 'INVALID_QTY' }),
    );
  });

  it('a count becomes one adjustment for the difference; a right count writes nothing', () => {
    const salt = product('Salt', { openingStock: 10 });
    sell(salt, 4); // ledger says 6
    expect(stockRepo.fixCount(db, salt.id, 9)).toBe(3);
    expect(stockRepo.stockOf(db, salt.id)).toBe(9);
    expect(stockRepo.fixCount(db, salt.id, 9)).toBe(0);
    expect(
      stockRepo.movementsFor(db, salt.id).filter((m) => m.reason === 'adjustment'),
    ).toHaveLength(2); // opening stock + the fix
  });
});

describe('edit and remove a product', () => {
  it('pushes only the fields that changed', () => {
    const salt = product('Tata Salt 1 kg', { mrpPaise: 2800 });
    db.delete(outbox).run();
    productsRepo.updateProduct(db, salt.id, {
      name: 'Tata Salt 1 kg',
      pricePaise: 2700,
      lowStockAt: 6,
    });
    const [entry] = db.select().from(outbox).all();
    expect(entry).toMatchObject({ tableName: 'products', op: 'update' });
    expect(entry?.data).toEqual({ id: salt.id, pricePaise: 2700, lowStockAt: 6 });
  });

  it('writes nothing when nothing changes', () => {
    const salt = product('Salt');
    db.delete(outbox).run();
    productsRepo.updateProduct(db, salt.id, { name: ' Salt ' });
    expect(db.select().from(outbox).all()).toEqual([]);
  });

  it('keeps the MRP rule and barcode uniqueness on edit', () => {
    const salt = product('Salt', { mrpPaise: 2800 });
    product('Maggi', { barcode: '8901058851298' });
    expect(() => productsRepo.updateProduct(db, salt.id, { pricePaise: 3000 })).toThrow(
      expect.objectContaining({ code: 'PRICE_ABOVE_MRP' }),
    );
    expect(() => productsRepo.updateProduct(db, salt.id, { barcode: '8901058851298' })).toThrow(
      expect.objectContaining({ code: 'BARCODE_EXISTS' }),
    );
  });

  it('removing frees the barcode, hides the item, and syncs as deletedAt', () => {
    const maggi = product('Maggi', { barcode: '8901058851298' });
    db.delete(outbox).run();
    productsRepo.deleteProduct(db, maggi.id);
    expect(productsRepo.findProductByBarcode(db, '8901058851298')).toBeUndefined();
    expect(stockRepo.stockLevels(db)).toEqual([]);
    expect(db.select().from(outbox).all()[0]?.data).toEqual({
      id: maggi.id,
      deletedAt: expect.any(String),
    });
    expect(() => product('Maggi new pack', { barcode: '8901058851298' })).not.toThrow();
  });
});

describe('guards', () => {
  it('refuses stock in for a removed item', () => {
    const salt = product('Salt');
    productsRepo.deleteProduct(db, salt.id);
    expect(() => stockRepo.receiveStock(db, [{ productId: salt.id, qty: 5 }])).toThrow(
      expect.objectContaining({ code: 'PRODUCT_NOT_FOUND' }),
    );
  });

  it('refuses a count further from the ledger than one movement may carry', () => {
    const salt = product('Salt', { openingStock: 99_000 });
    productsRepo.updateProduct(db, salt.id, { trackStock: true });
    sell(salt, 99_000);
    sell(salt, 50_000); // ledger at -50,000
    expect(() => stockRepo.fixCount(db, salt.id, 60_000)).toThrow(
      expect.objectContaining({ code: 'INVALID_QTY' }),
    );
  });

  it('ignores undefined fields in an edit (never pushes an empty update)', () => {
    const salt = product('Salt');
    db.delete(outbox).run();
    productsRepo.updateProduct(db, salt.id, { trackStock: undefined, name: 'Salt' });
    expect(db.select().from(outbox).all()).toEqual([]);
    expect(productsRepo.getProduct(db, salt.id)?.trackStock).toBe(true);
  });
});
