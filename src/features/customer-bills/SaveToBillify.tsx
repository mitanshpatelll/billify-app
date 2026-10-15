import { router } from 'expo-router';
import { BookmarkPlus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isApiError } from '@/api/client';
import { queryClient } from '@/api/query-client';
import { selectSignedIn, useSession } from '@/features/auth/session-store';
import { Button, ErrorBanner, Text } from '@/ui';

import { claimBill, type ClaimResult } from './api';
import { pendingClaim } from './pending-claim';

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
 * 21 → "Save to Billify" (User Flows §7): signed in as a customer, the bill (with a customer on
 * it: every bill of that customer at this shop, and the khata) is saved at once; otherwise
 * sign-in comes first and My bills finishes the job, then opens the bill.
 */
export function SaveToBillify({ token }: { token: string }) {
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
      const result = await claimBill(token);
      if (mounted.current) openSavedBill(result);
    } catch (err) {
      setError(claimMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Back from signing in (started by the tap below): finish the save.
  useEffect(() => {
    if (!customer || !pendingClaim.take(token)) return;
    claimBill(token)
      .then((result) => {
        if (mounted.current) openSavedBill(result);
      })
      .catch((err: unknown) => setError(claimMessage(err)));
  }, [customer, token]);

  // A shop owner's phone is for billing; saving bills is for customers.
  if (signedIn && role === 'shop') return null;

  function save() {
    setError(null);
    if (!signedIn) {
      pendingClaim.set(token);
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
