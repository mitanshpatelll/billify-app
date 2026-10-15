import { db } from '@/db/client';
import { useDbQuery } from '@/db/live';
import { shopRepo } from '@/db/repos';
import type { ShopRow } from '@/db/schema';
import { newId } from '@/lib/ids';

export type Shop = ShopRow;

/** The owner's shop on this phone (null before setup). Re-renders when it changes. */
export function useShop(): Shop | null {
  return useDbQuery(['shop'], () => shopRepo.getShop(db) ?? null);
}

/**
 * Saves the setup form on the phone. The auth slice sends it to POST /v1/shops first and
 * stores the shop with the server's id instead of this local one.
 */
export function saveShopDetails(details: Pick<Shop, 'name' | 'upiId' | 'billPrefix'>): void {
  const current = shopRepo.getShop(db);
  shopRepo.saveShop(db, { id: current?.id ?? newId(), ...details });
}

/** Last setup step done: flips the shop route guard, which opens the tabs by itself. */
export function finishSetup(): void {
  shopRepo.finishSetup(db);
}
