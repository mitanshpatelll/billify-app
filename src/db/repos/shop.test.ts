/** @jest-environment node */
import { bills, outbox, products, shop } from '../schema';
import { createTestDb } from '../testing/test-db';
import type { Db } from '../types';
import { adoptShop, billsRepo, clearLocalData, productsRepo, shopRepo } from '.';

const sharma = {
  id: '0192f3a1-0000-7000-8000-00000000a001',
  name: 'Sharma Kirana',
  upiId: 'sharmakirana@okaxis',
  billPrefix: 'A',
};

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

function sellOne() {
  const sugar = productsRepo.createProduct(db, {
    barcode: null,
    name: 'Sugar',
    unit: 'kg',
    pricePaise: 4400,
    mrpPaise: null,
    trackStock: true,
  });
  billsRepo.saveBill(db, {
    billPrefix: 'A',
    customerId: null,
    lines: [{ productId: sugar.id, name: 'Sugar', unit: 'kg', qty: 1, unitPricePaise: 4400 }],
    payments: [{ method: 'cash', amountPaise: 4400 }],
  });
}

describe('saveShop', () => {
  it('starts unfinished, finishes once, and stays finished on later saves', () => {
    shopRepo.saveShop(db, sharma);
    expect(shopRepo.getShop(db)?.setupDone).toBe(false);
    shopRepo.finishSetup(db);
    shopRepo.saveShop(db, { ...sharma, name: 'Sharma General Store' });
    expect(shopRepo.getShop(db)).toMatchObject({ name: 'Sharma General Store', setupDone: true });
  });

  it('can be saved as finished (a shop restored from the server skips setup)', () => {
    shopRepo.saveShop(db, sharma, true);
    expect(shopRepo.getShop(db)?.setupDone).toBe(true);
  });
});

describe('adoptShop', () => {
  it('keeps the data when the same shop signs in again', () => {
    adoptShop(db, sharma, true);
    sellOne();
    adoptShop(db, { ...sharma, upiId: 'sharma@okhdfc' }, true);
    expect(db.select().from(bills).all()).toHaveLength(1);
    expect(shopRepo.getShop(db)?.upiId).toBe('sharma@okhdfc');
  });

  it('clears the phone first when a different shop signs in', () => {
    adoptShop(db, sharma, true);
    sellOne();
    const other = { ...sharma, id: '0192f3a1-0000-7000-8000-00000000b002', name: 'Verma Stores' };
    adoptShop(db, other, false);
    expect(db.select().from(bills).all()).toEqual([]);
    expect(db.select().from(products).all()).toEqual([]);
    expect(db.select().from(outbox).all()).toEqual([]);
    expect(db.select().from(shop).all()).toMatchObject([
      { name: 'Verma Stores', setupDone: false },
    ]);
  });
});

it('clearLocalData empties every table', () => {
  adoptShop(db, sharma, true);
  sellOne();
  clearLocalData(db);
  for (const table of [shop, bills, products, outbox]) {
    expect(db.select().from(table).all()).toEqual([]);
  }
});
