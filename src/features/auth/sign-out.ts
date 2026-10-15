import { Platform } from 'react-native';

import { queryClient } from '@/api/query-client';

import { db } from '@/db/client';
import { clearLocalData, outboxRepo } from '@/db/repos';
import { useCart } from '@/features/billing/cart-store';

import { signOutOnServer } from './auth-api';
import { signOutOfGoogle } from './google';
import { currentToken, useSession } from './session-store';

/** Changes made on this phone that haven't reached the server yet (lost on sign-out). */
export function unsyncedChanges(): number {
  if (Platform.OS === 'web') return 0;
  return outboxRepo.outboxCounts(db).pending;
}

/**
 * Signs out: the session is forgotten first (the guards leave the shop screens), then the
 * phone's copy of the shop is deleted, so the next account starts clean.
 */
export function signOut(): void {
  const token = currentToken();
  useSession.getState().signOut();
  if (Platform.OS !== 'web') clearLocalData(db);
  useCart.getState().clear();
  queryClient.clear();
  void signOutOfGoogle();
  if (token) void signOutOnServer(token);
}
