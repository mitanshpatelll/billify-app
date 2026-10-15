import { Platform } from 'react-native';

import { queryClient } from '@/api/query-client';

import { db } from '@/db/client';
import { clearLocalData, outboxRepo } from '@/db/repos';
import { useCart } from '@/features/billing/cart-store';
import { stopSync } from '@/sync/scheduler';

import { signOutOnServer } from './auth-api';
import { signOutOfGoogle } from './google';
import { currentToken, useSession } from './session-store';

/**
 * Changes made on this phone that the server doesn't have (lost on sign-out): waiting ones, and
 * ones the server refused that were never retried or removed.
 */
export function unsyncedChanges(): number {
  if (Platform.OS === 'web') return 0;
  const { pending, rejected } = outboxRepo.outboxCounts(db);
  return pending + rejected;
}

/**
 * Signs out: the session is forgotten first (the guards leave the shop screens), then the
 * phone's copy of the shop is deleted, so the next account starts clean.
 */
export function signOut(): void {
  const token = currentToken();
  // First: no sync answer still on its way may land in the phone about to be wiped.
  stopSync();
  useSession.getState().signOut();
  if (Platform.OS !== 'web') clearLocalData(db);
  useCart.getState().clear();
  queryClient.clear();
  void signOutOfGoogle();
  if (token) void signOutOnServer(token);
}
