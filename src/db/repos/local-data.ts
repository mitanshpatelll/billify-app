import {
  billItems,
  bills,
  customers,
  khataEntries,
  outbox,
  payments,
  products,
  shop,
  stockMovements,
  syncState,
} from '../schema';
import type { Db } from '../types';
import { getShop, saveShop, type ShopDetails } from './shop';

/** Deletes every row on this phone: signing out, or another shop signing in. */
export function clearLocalData(db: Db): void {
  db.transaction((tx) => {
    for (const table of [
      outbox,
      syncState,
      payments,
      billItems,
      bills,
      khataEntries,
      customers,
      stockMovements,
      products,
      shop,
    ]) {
      tx.delete(table).run();
    }
  });
}

/**
 * Keeps the server's copy of the signed-in owner's shop. Another shop's data never mixes in:
 * if a different shop was on this phone (another account signed in), everything is cleared first.
 */
export function adoptShop(db: Db, details: ShopDetails, setupDone: boolean): void {
  db.transaction((tx) => {
    const local = getShop(tx);
    if (local && local.id !== details.id) clearLocalData(tx);
    saveShop(tx, details, setupDone);
  });
}
