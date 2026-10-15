import { eq } from 'drizzle-orm';

import { shop, type ShopRow } from '../schema';
import type { Db } from '../types';

export type ShopDetails = Pick<ShopRow, 'id' | 'name' | 'upiId' | 'billPrefix'>;

/** The owner's shop on this phone, or undefined before setup. */
export function getShop(db: Db): ShopRow | undefined {
  return db.select().from(shop).limit(1).get();
}

/**
 * Saves (or updates) the shop's details. Setup stays finished once it is; `setupDone` finishes
 * it now (a shop restored from the server skips the setup screens).
 */
export function saveShop(db: Db, details: ShopDetails, setupDone = false): void {
  db.transaction((tx) => {
    const current = getShop(tx);
    if (current && current.id !== details.id) tx.delete(shop).run();
    const done = setupDone || (current?.id === details.id && current.setupDone);
    tx.insert(shop)
      .values({ ...details, setupDone: done })
      .onConflictDoUpdate({
        target: shop.id,
        set: {
          name: details.name,
          upiId: details.upiId,
          billPrefix: details.billPrefix,
          setupDone: done,
        },
      })
      .run();
  });
}

/** Last setup step done (camera): the shop tabs open. */
export function finishSetup(db: Db): void {
  db.update(shop).set({ setupDone: true }).where(eq(shop.setupDone, false)).run();
}
