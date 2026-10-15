import { eq } from 'drizzle-orm';

import { shop, type ShopRow } from '../schema';
import type { Db } from '../types';

export type ShopDetails = Pick<ShopRow, 'id' | 'name' | 'upiId' | 'billPrefix'>;

/** The owner's shop on this phone, or undefined before setup. */
export function getShop(db: Db): ShopRow | undefined {
  return db.select().from(shop).limit(1).get();
}

/** Saves (or updates) the shop's details. Keeps whether setup was finished. */
export function saveShop(db: Db, details: ShopDetails): void {
  db.transaction((tx) => {
    const current = getShop(tx);
    if (current && current.id !== details.id) tx.delete(shop).run();
    tx.insert(shop)
      .values({ ...details, setupDone: false })
      .onConflictDoUpdate({
        target: shop.id,
        set: { name: details.name, upiId: details.upiId, billPrefix: details.billPrefix },
      })
      .run();
  });
}

/** Last setup step done (camera): the shop tabs open. */
export function finishSetup(db: Db): void {
  db.update(shop).set({ setupDone: true }).where(eq(shop.setupDone, false)).run();
}
