/** @jest-environment node */
import { createTestDb } from '../testing/test-db';
import { outbox, products, stockMovements } from '../schema';
import type { Db } from '../types';
import { billsRepo, isRepoError, productsRepo } from '.';

const maggi = {
  barcode: '8901058851298',
  name: 'Maggi Masala 70 g',
  unit: 'pcs' as const,
  pricePaise: 1400,
  mrpPaise: 1400,
  trackStock: true,
};

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe('createProduct', () => {
  it('writes the product and its outbox entry in the shape push expects', () => {
    const product = productsRepo.createProduct(db, maggi);

    expect(db.select().from(products).all()).toEqual([product]);
    const [entry] = db.select().from(outbox).all();
    expect(entry).toMatchObject({ tableName: 'products', op: 'insert', status: 'pending' });
    expect(entry?.data).toEqual({
      id: product.id,
      createdAt: product.createdAt,
      barcode: maggi.barcode,
      name: maggi.name,
      unit: 'pcs',
      pricePaise: 1400,
      mrpPaise: 1400,
      lowStockAt: null,
      trackStock: true,
    });
  });

  it('turns opening stock into a count adjustment, after the product in the outbox', () => {
    const product = productsRepo.createProduct(db, { ...maggi, openingStock: 24 });

    expect(db.select().from(stockMovements).all()).toMatchObject([
      { productId: product.id, qtyDelta: 24, reason: 'adjustment' },
    ]);
    expect(
      db
        .select()
        .from(outbox)
        .all()
        .map((entry) => entry.tableName),
    ).toEqual(['products', 'stock_movements']);
  });

  it('skips the stock movement when stock is not tracked or there is none', () => {
    productsRepo.createProduct(db, { ...maggi, trackStock: false, openingStock: 10 });
    productsRepo.createProduct(db, { ...maggi, barcode: null, openingStock: 0 });
    expect(db.select().from(stockMovements).all()).toEqual([]);
  });

  it('refuses a price above MRP and writes nothing', () => {
    expect(() => productsRepo.createProduct(db, { ...maggi, pricePaise: 1500 })).toThrow(
      expect.objectContaining({ code: 'PRICE_ABOVE_MRP' }),
    );
    expect(db.select().from(outbox).all()).toEqual([]);
  });

  it('refuses a second live product with the same barcode', () => {
    productsRepo.createProduct(db, maggi);
    let error: unknown;
    try {
      productsRepo.createProduct(db, { ...maggi, name: 'Maggi again' });
    } catch (err) {
      error = err;
    }
    expect(isRepoError(error, 'BARCODE_EXISTS')).toBe(true);
    expect(db.select().from(products).all()).toHaveLength(1);
  });
});

describe('searchProducts', () => {
  beforeEach(() => {
    productsRepo.createProduct(db, maggi);
    productsRepo.createProduct(db, {
      ...maggi,
      barcode: null,
      name: 'Sugar (loose)',
      unit: 'kg',
      mrpPaise: null,
    });
    productsRepo.createProduct(db, { ...maggi, barcode: null, name: 'Brown sugar 500 g' });
    productsRepo.createProduct(db, { ...maggi, barcode: null, name: '100% Atta' });
  });

  it('finds an exact barcode', () => {
    expect(productsRepo.searchProducts(db, maggi.barcode).map((p) => p.name)).toEqual([maggi.name]);
  });

  it('matches names anywhere, ignoring case, with names that start with the query first', () => {
    expect(productsRepo.searchProducts(db, 'SUGAR').map((p) => p.name)).toEqual([
      'Sugar (loose)',
      'Brown sugar 500 g',
    ]);
  });

  it('takes % and _ literally', () => {
    expect(productsRepo.searchProducts(db, '%').map((p) => p.name)).toEqual(['100% Atta']);
    expect(productsRepo.searchProducts(db, '_')).toEqual([]);
  });

  it('returns nothing for an empty query', () => {
    expect(productsRepo.searchProducts(db, '  ')).toEqual([]);
  });
});

describe('quickKeyProducts', () => {
  it('lists loose items only, the most sold first', () => {
    const shop = { billPrefix: 'A' };
    const sugar = productsRepo.createProduct(db, {
      ...maggi,
      barcode: null,
      name: 'Sugar',
      unit: 'kg',
      mrpPaise: null,
    });
    const rice = productsRepo.createProduct(db, {
      ...maggi,
      barcode: null,
      name: 'Rice',
      unit: 'kg',
      mrpPaise: null,
    });
    productsRepo.createProduct(db, {
      ...maggi,
      barcode: null,
      name: 'Atta',
      unit: 'kg',
      mrpPaise: null,
    });
    productsRepo.createProduct(db, maggi);
    const sell = (product: typeof rice) =>
      billsRepo.saveBill(db, {
        ...shop,
        customerId: null,
        lines: [
          {
            productId: product.id,
            name: product.name,
            unit: product.unit,
            qty: 1,
            unitPricePaise: 1400,
          },
        ],
        payments: [{ method: 'cash', amountPaise: 1400 }],
      });
    sell(rice);
    sell(rice);
    sell(sugar);

    expect(productsRepo.quickKeyProducts(db).map((p) => p.name)).toEqual(['Rice', 'Sugar', 'Atta']);
  });
});
