import Head from 'expo-router/head';
import { useLocalSearchParams } from 'expo-router';
import { Check, Clock, RefreshCw, Share2, WifiOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isApiError } from '@/api/client';
import { billUrl } from '@/features/sharing/links';
import { formatRupees, lineTotalPaise } from '@/lib/money';
import { paymentLabel, paymentName } from '@/lib/payments';
import { formatQty } from '@/lib/units';
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  IconButton,
  Money,
  Screen,
  Text,
  Tile,
} from '@/ui';

import { BILL_NOT_FOUND, type PublicBill, usePublicBill } from './use-public-bill';

// Customers are in India: show the bill's time in IST wherever the page is opened.
const timeFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});

// A waking Render instance takes up to a minute: say so instead of an endless spinner.
const SLOW_AFTER_MS = 4000;

/** 21 Public bill: opened from the WhatsApp link or the QR, in any browser or in the app. */
export function PublicBillScreen() {
  const { token = '' } = useLocalSearchParams<{ token: string }>();
  const query = usePublicBill(token);

  let content;
  if (query.data) {
    content = <BillView bill={query.data} token={token} />;
  } else if (query.isPending) {
    content = <Loading />;
  } else if (isApiError(query.error, BILL_NOT_FOUND)) {
    content = (
      <>
        <EmptyState
          icon={Clock}
          title="This bill will appear in a few minutes"
          message="The shop’s phone sends bills when it is online. This page checks again by itself."
        />
        <Button
          label="Check now"
          variant="secondary"
          icon={RefreshCw}
          loading={query.isFetching}
          onPress={() => void query.refetch()}
        />
      </>
    );
  } else {
    const rateLimited = isApiError(query.error, 'RATE_LIMITED');
    content = (
      <>
        <ErrorBanner
          title={rateLimited ? 'Too many tries' : 'Can’t load this bill'}
          message={
            rateLimited
              ? 'Wait a minute, then try again.'
              : 'Check your internet connection and try again.'
          }
        />
        <Button
          label="Try again"
          variant="secondary"
          icon={rateLimited ? RefreshCw : WifiOff}
          loading={query.isFetching}
          onPress={() => void query.refetch()}
        />
      </>
    );
  }

  return (
    <Screen>
      <Head>
        <title>{query.data ? pageTitle(query.data) : 'Bill · Billify'}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <View style={styles.page}>{content}</View>
    </Screen>
  );
}

// Gram items carry a per-gram price; customers read loose goods per kg ("₹160.00 / kg").
function unitPrice(unit: string, paise: number) {
  return unit === 'g' ? `${formatRupees(paise * 1000)} / kg` : formatRupees(paise);
}

function pageTitle({ shop, bill }: PublicBill) {
  return `Bill ${bill.number} · ${shop.name}`;
}

function status(bill: PublicBill['bill']) {
  if (bill.voided) return { label: 'Cancelled', tone: 'error' } as const;
  const onKhata = bill.payments.filter((payment) => payment.method === 'khata').length;
  if (onKhata === 0) return { label: 'Paid', tone: 'paid', icon: Check } as const;
  return {
    label: onKhata === bill.payments.length ? 'On khata' : 'Part on khata',
    tone: 'due',
  } as const;
}

function BillView({ bill: { shop, bill }, token }: { bill: PublicBill; token: string }) {
  const badge = status(bill);
  const itemCount = bill.items.length;
  const canShare = Platform.OS !== 'web' || typeof navigator.share === 'function';

  function share() {
    const url = billUrl(token);
    const message = `${shop.name} bill ${bill.number} ${formatRupees(bill.totalPaise)}`;
    void Share.share(Platform.OS === 'ios' ? { message, url } : { message: `${message}\n${url}` });
  }

  return (
    <>
      <Tile>
        <View style={styles.headRow}>
          <View style={styles.headText}>
            <Text variant="titleLarge" accessibilityRole="header">
              {shop.name}
            </Text>
            <Text variant="bodySecondary" tone="muted">
              Bill {bill.number} · {timeFormat.format(new Date(bill.createdAt))}
            </Text>
            <Badge
              label={badge.label}
              tone={badge.tone}
              icon={'icon' in badge ? badge.icon : undefined}
            />
          </View>
          {canShare ? (
            <IconButton
              icon={Share2}
              variant="background"
              accessibilityLabel="Share this bill"
              onPress={share}
            />
          ) : null}
        </View>
      </Tile>

      {bill.voided ? (
        <ErrorBanner
          title="This bill was cancelled"
          message="The shop cancelled it. Nothing on it is due."
        />
      ) : null}

      <Tile>
        <View style={styles.spread}>
          <Text variant="label" tone="muted">
            Items
          </Text>
          <Text variant="label" tone="muted">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
        </View>

        <View style={styles.items}>
          {bill.items.map((item, index) => (
            <View key={`${index}-${item.name}`} style={styles.item}>
              <View style={styles.flex}>
                <Text variant="body">{item.name}</Text>
                <Text variant="caption" tone="muted">
                  {formatQty(item.qty, item.unit)} × {unitPrice(item.unit, item.unitPricePaise)}
                </Text>
              </View>
              <Money paise={lineTotalPaise(item.qty, item.unitPricePaise)} variant="body" />
            </View>
          ))}
        </View>

        <View style={styles.dashed} />

        <View style={styles.totalRow}>
          <Text variant="titleScreen">Total</Text>
          {bill.payments.length > 0 ? <Badge label={paymentLabel(bill.payments)} /> : null}
          <View style={styles.flex} />
          <Money
            paise={bill.totalPaise}
            variant="total"
            style={bill.voided ? styles.struck : undefined}
          />
        </View>

        {bill.payments.length > 1 ? (
          <View style={styles.payments}>
            {bill.payments.map((payment, index) => (
              <View key={`${index}-${payment.method}`} style={styles.spread}>
                <Text variant="bodySecondary" tone="muted">
                  {paymentName(payment.method)}
                </Text>
                {/* Haldi is for amounts due on khata only (DESIGN.md). */}
                <Money
                  paise={payment.amountPaise}
                  variant="bodySecondary"
                  tone={payment.method === 'khata' ? 'khata' : 'muted'}
                />
              </View>
            ))}
          </View>
        ) : null}
      </Tile>

      <Text variant="caption" tone="muted" align="center">
        Bill from {shop.name}, sent with Billify
      </Text>
    </>
  );
}

function Loading() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View accessibilityLabel="Loading the bill" style={styles.loading}>
      <Tile>
        <View style={[styles.bone, styles.boneTitle]} />
        <View style={[styles.bone, styles.boneLine]} />
      </Tile>
      <Tile>
        {[0, 1, 2].map((row) => (
          <View key={row} style={[styles.bone, styles.boneRow]} />
        ))}
      </Tile>
      {slow ? (
        <Text variant="bodySecondary" tone="muted" align="center">
          Waking up the server. This can take up to a minute.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  // Phone-width column, centred on a wide desktop browser.
  page: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: theme.space.gap,
  },
  flex: { flex: 1 },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space.sm,
  },
  headText: {
    flex: 1,
    gap: theme.space.xxs,
  },
  spread: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  items: {
    gap: theme.space.sm,
    paddingVertical: theme.space.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space.sm,
  },
  dashed: {
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.outline,
    marginVertical: theme.space.xs,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    paddingTop: theme.space.xs,
  },
  struck: { textDecorationLine: 'line-through' },
  payments: {
    gap: theme.space.xxs,
    paddingTop: theme.space.sm,
  },
  loading: { gap: theme.space.gap },
  bone: {
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceVariant,
  },
  boneTitle: { height: 32, width: '60%' },
  boneLine: { height: 16, width: '40%', marginTop: theme.space.xs },
  boneRow: { height: 20, marginVertical: theme.space.xs },
}));
