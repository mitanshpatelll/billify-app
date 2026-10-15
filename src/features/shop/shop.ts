import { db } from '@/db/client';
import { useDbQuery } from '@/db/live';
import { adoptShop, clearLocalData, shopRepo } from '@/db/repos';
import type { ShopRow } from '@/db/schema';

import type { ServerShop } from './shop-api';

export type Shop = ShopRow;

/** The owner's shop on this phone (null before setup). Re-renders when it changes. */
export function useShop(): Shop | null {
  return useDbQuery(['shop'], () => shopRepo.getShop(db) ?? null);
}

/** Keeps the server's shop on the phone (clearing another shop's data if one was here). */
export function storeShop(server: ServerShop, { setupDone }: { setupDone: boolean }): void {
  adoptShop(
    db,
    {
      id: server.id,
      name: server.name,
      upiId: server.upiId,
      billPrefix: server.billPrefix,
      phone: server.phone,
    },
    setupDone,
  );
}

/**
 * Right after a shop owner signs in, before any shop screen shows: the phone's copy must be this
 * owner's. Their server shop is kept (another shop's data is cleared first); an owner with no
 * shop yet starts from an empty phone.
 */
export function prepareShopForOwner(server: ServerShop | null): void {
  if (server) storeShop(server, { setupDone: true });
  else clearLocalData(db);
}

/** Last setup step done: flips the shop route guard, which opens the tabs by itself. */
export function finishSetup(): void {
  shopRepo.finishSetup(db);
}
