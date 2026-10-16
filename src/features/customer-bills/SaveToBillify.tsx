import { router } from 'expo-router';
import { BookmarkPlus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isApiError } from '@/api/client';
import { queryClient } from '@/api/query-client';
import { selectSignedIn, useSession } from '@/features/auth/session-store';
import { Button, ErrorBanner, Text } from '@/ui';

import { claimBill, claimKhata, type ClaimResult } from './api';
import { pendingClaim, type PendingSave } from './pending-claim';

export function claimMessage(error: unknown): string {
  if (isApiError(error, 'CUSTOMER_ALREADY_CLAIMED')) {
    return 'These bills are saved to another account. Ask the shop to unlink it.';
  }
  if (isApiError(error, 'NETWORK_ERROR') || isApiError(error, 'TIMEOUT')) {
    return 'No internet connection. Try again.';
  }
  return 'Couldn’t save this bill. Try again in a minute.';
}

/** After a save: My bills is out of date; open the bill itself (23), saying what was saved. */
export function openSavedBill(result: ClaimResult, how: 'push' | 'replace' = 'replace') {
  void queryClient.invalidateQueries({ queryKey: ['me'] });
  router[how]({ pathname: '/me/bills/[id]', params: { id: result.billId, saved: result.kind } });
}

/**
 * Saves a bill link or a khata page link to the signed-in customer, then opens what was saved:
 * the bill (23), or My khata (25). `isCurrent` false = the customer moved on: don't navigate.
 */
export async function finishSave(
  save: PendingSave,
  how: 'push' | 'replace',
  isCurrent: () => boolean,
): Promise<void> {
  if (save.kind === 'bill') {
    const result = await claimBill(save.token);
    if (isCurrent()) openSavedBill(result, how);
    return;
  }
  await claimKhata(save.token);
  void queryClient.invalidateQueries({ queryKey: ['me'] });
  if (isCurrent()) router[how]('/me/khata');
}

/**
 * 21 → "Save to Billify" (User Flows §7), also on the khata page (D27, kind="khata"): signed in as
 * a customer, the bill (with a customer on it: every bill of that customer at this shop, and the
 * khata) or the khata is saved at once; otherwise sign-in comes first and the page (or My bills)
 * finishes the job.
 */
export function SaveToBillify({
  token,
  kind = 'bill',
}: {
  token: string;
  kind?: PendingSave['kind'];
}) {
  const signedIn = useSession(selectSignedIn);
  const role = useSession((state) => state.role);
  const chooseRole = useSession((state) => state.chooseRole);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const customer = signedIn && role === 'customer';
  // A save that finishes after the customer left this page doesn't pull them back to it.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function claim() {
    setBusy(true);
    try {
      await finishSave({ token, kind }, 'replace', () => mounted.current);
    } catch (err) {
      setError(claimMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Back from signing in (started by the tap below): finish the save.
  useEffect(() => {
    if (!customer) return;
    const save = pendingClaim.take(token);
    if (!save) return;
    finishSave(save, 'replace', () => mounted.current).catch((err: unknown) =>
      setError(claimMessage(err)),
    );
  }, [customer, token]);

  // A shop owner's phone is for billing; saving bills is for customers.
  if (signedIn && role === 'shop') return null;

  function save() {
    setError(null);
    if (!signedIn) {
      pendingClaim.set(token, kind);
      chooseRole('customer');
      router.push('/sign-in');
      return;
    }
    void claim();
  }

  return (
    <View style={styles.box}>
      {error ? (
        <ErrorBanner title="Not saved" message={error} onDismiss={() => setError(null)} />
      ) : null}
      <Button label="Save to Billify" icon={BookmarkPlus} loading={busy} onPress={save} />
      <Text variant="caption" tone="muted" align="center">
        Keep your bills from every shop in one place, with your khata.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  box: { gap: theme.space.xs },
}));
