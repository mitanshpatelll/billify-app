import { router } from 'expo-router';
import { ReceiptText, WifiOff } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { formatRupees } from '@/lib/money';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  ErrorBanner,
  Icon,
  LargeTitle,
  ListGroup,
  ListRow,
  Screen,
  Text,
  Tile,
} from '@/ui';

import { useMyBills } from './api';
import { pendingClaim } from './pending-claim';
import { claimMessage, finishSave } from './SaveToBillify';

const dayFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Kolkata',
});

/** 22 My bills: every saved bill, from every shop, newest first; chips pick one shop. */
export function MyBillsScreen() {
  const [shopId, setShopId] = useState<string | undefined>();
  const bills = useMyBills(shopId);
  const [claimError, setClaimError] = useState<string | null>(null);

  // "Save to Billify" before signing in: finish it now (see pending-claim.ts), then open the bill
  // (unless the customer has moved on).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const save = pendingClaim.take();
    if (save) {
      finishSave(save, 'push', () => mounted.current).catch((err: unknown) =>
        setClaimError(claimMessage(err)),
      );
    }
    return () => {
      mounted.current = false;
    };
  }, []);

  const rows = bills.data?.pages.flatMap((page) => page.bills) ?? [];
  const shops = bills.data?.pages[0]?.shops ?? [];

  return (
    <Screen kind="tab">
      <LargeTitle title="My bills" subtitle="Bills from every shop you saved" />

      {shops.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip label="All shops" selected={!shopId} onPress={() => setShopId(undefined)} />
          {shops.map((shop) => (
            <Chip
              key={shop.id}
              label={shop.name}
              selected={shopId === shop.id}
              onPress={() => setShopId(shop.id)}
            />
          ))}
        </ScrollView>
      ) : null}
      {claimError ? (
        <ErrorBanner
          title="Bill not saved"
          message={claimError}
          onDismiss={() => setClaimError(null)}
        />
      ) : null}
      {bills.isError && rows.length > 0 ? (
        <View style={styles.note}>
          <Icon icon={WifiOff} size={16} color="onSurfaceVariant" />
          <Text variant="bodySecondary" tone="muted">
            Offline: showing the bills from last time.
          </Text>
        </View>
      ) : null}

      {bills.isPending ? (
        <Tile>
          <Text tone="muted">Loading your bills…</Text>
        </Tile>
      ) : bills.isError && rows.length === 0 ? (
        <>
          <ErrorBanner title="Can’t load your bills" message="Check your internet connection." />
          <Button label="Try again" variant="secondary" onPress={() => void bills.refetch()} />
        </>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No bills yet"
          message="When a shop sends you a bill on WhatsApp, open it and tap Save to Billify. It shows up here."
        />
      ) : (
        <>
          <ListGroup>
            {rows.map((bill) => (
              <ListRow
                key={bill.id}
                title={bill.shopName}
                subtitle={`${bill.number} · ${dayFormat.format(new Date(bill.createdAt))}`}
                onPress={() => router.push({ pathname: '/me/bills/[id]', params: { id: bill.id } })}
                trailing={
                  <View style={styles.amount}>
                    <Text
                      variant="bodyStrong"
                      tone={
                        bill.status === 'khata'
                          ? 'khata'
                          : bill.status === 'void'
                            ? 'muted'
                            : 'default'
                      }
                      style={[styles.tabular, bill.status === 'void' && styles.struck]}
                    >
                      {formatRupees(bill.totalPaise)}
                    </Text>
                    <Badge
                      label={
                        bill.status === 'paid'
                          ? 'Paid'
                          : bill.status === 'khata'
                            ? 'On khata'
                            : 'Cancelled'
                      }
                      tone={
                        bill.status === 'paid' ? 'paid' : bill.status === 'khata' ? 'due' : 'error'
                      }
                    />
                  </View>
                }
              />
            ))}
          </ListGroup>
          {bills.hasNextPage ? (
            <Button
              label="Show older bills"
              variant="secondary"
              loading={bills.isFetchingNextPage}
              onPress={() => void bills.fetchNextPage()}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  chips: { gap: theme.space.xs },
  note: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  amount: { alignItems: 'flex-end', gap: theme.space.xxs },
  tabular: { fontVariant: ['tabular-nums'] },
  struck: { textDecorationLine: 'line-through' },
}));
