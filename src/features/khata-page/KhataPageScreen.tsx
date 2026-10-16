import Head from 'expo-router/head';
import { useLocalSearchParams } from 'expo-router';
import { CircleCheck, Clock, RefreshCw, Send, WifiOff } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { StyleSheet } from 'react-native-unistyles';

import { isApiError } from '@/api/client';
import { SaveToBillify } from '@/features/customer-bills/SaveToBillify';
import { formatRupees, parseRupees } from '@/lib/money';
import { upiPayLink } from '@/lib/upi';
import { colors } from '@/theme/tokens';
import {
  Button,
  EmptyState,
  ErrorBanner,
  Icon,
  Money,
  Screen,
  Text,
  TextButton,
  TextField,
  Tile,
} from '@/ui';

import { KHATA_NOT_FOUND, sendPaid, usePublicKhata, type PublicKhata } from './api';

const dayFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Kolkata',
});

/**
 * The khata page (D27, User Flows §4): opened from the shop's WhatsApp reminder. What's due at
 * the shop, Pay by UPI straight to the shop, "I've paid" (the shop confirms it), Save to Billify.
 * Shows nothing about the customer: the link can be forwarded.
 */
export function KhataPageScreen() {
  const { token = '' } = useLocalSearchParams<{ token: string }>();
  const query = usePublicKhata(token);

  let content;
  if (query.data) {
    content = <KhataView data={query.data} token={token} onChange={() => void query.refetch()} />;
  } else if (query.isPending) {
    content = (
      <Tile>
        <Text tone="muted">Loading…</Text>
      </Tile>
    );
  } else if (isApiError(query.error, KHATA_NOT_FOUND)) {
    content = (
      <>
        <EmptyState
          icon={Clock}
          title="This khata will appear in a few minutes"
          message="The shop’s phone sends it when it is online. This page checks again by itself."
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
    content = (
      <>
        <ErrorBanner title="Can’t load this page" message="Check your internet connection." />
        <Button
          label="Try again"
          variant="secondary"
          icon={WifiOff}
          loading={query.isFetching}
          onPress={() => void query.refetch()}
        />
      </>
    );
  }

  return (
    <Screen>
      {Platform.OS === 'web' ? (
        <Head>
          <title>{query.data ? `Khata · ${query.data.shop.name}` : 'Khata · Billify'}</title>
          <meta name="robots" content="noindex" />
        </Head>
      ) : null}
      {content}
    </Screen>
  );
}

function KhataView({
  data,
  token,
  onChange,
}: {
  data: PublicKhata;
  token: string;
  onChange: () => void;
}) {
  const { shop, duePaise, claim } = data;
  const [showQr, setShowQr] = useState(Platform.OS === 'web'); // a desktop has no UPI app
  const [paying, setPaying] = useState(false);
  const due = duePaise > 0;
  const upiLink = upiPayLink({
    upiId: shop.upiId,
    payeeName: shop.name,
    amountPaise: duePaise,
    note: 'Khata',
  });

  return (
    <>
      <Tile>
        <View style={styles.head}>
          <Text variant="titleLarge" accessibilityRole="header">
            {shop.name}
          </Text>
          <Text variant="bodySecondary" tone="muted">
            Your khata
          </Text>
        </View>
      </Tile>

      <Tile variant={due ? 'khata' : 'selected'}>
        <Text variant="label" tone={due ? 'khata' : 'primary'}>
          {due ? 'Due' : 'Balance'}
        </Text>
        {due ? (
          <Money paise={duePaise} variant="amount" tone="khata" />
        ) : (
          <Text variant="amount" tone="primary">
            Nothing due
          </Text>
        )}
      </Tile>

      {claim ? <ClaimStatus claim={claim} shopName={shop.name} /> : null}

      {due ? (
        <View style={styles.actions}>
          <Button
            label={`Pay ${formatRupees(duePaise)} by UPI`}
            onPress={() => {
              if (Platform.OS === 'web') {
                // A phone's browser hands upi:// to its UPI app; a desktop has the QR below.
                globalThis.location.href = upiLink;
                setShowQr(true);
                return;
              }
              Linking.openURL(upiLink).catch(() => setShowQr(true));
            }}
          />
          {showQr ? (
            <Tile>
              <View style={styles.qrRow}>
                <View style={styles.qrBox}>
                  <QRCode
                    value={upiLink}
                    size={120}
                    color={colors.onSurface}
                    backgroundColor={colors.surface}
                  />
                </View>
                <View style={styles.flex}>
                  <Text variant="bodyStrong">Scan with any UPI app</Text>
                  <Text variant="bodySecondary" tone="muted" selectable>
                    {shop.upiId}
                  </Text>
                </View>
              </View>
            </Tile>
          ) : (
            <TextButton label="Show the QR instead" onPress={() => setShowQr(true)} />
          )}
        </View>
      ) : null}

      {paying ? (
        <PaidForm
          token={token}
          duePaise={duePaise}
          shopName={shop.name}
          onDone={() => {
            setPaying(false);
            onChange();
          }}
          onCancel={() => setPaying(false)}
        />
      ) : due ? (
        <Button label="I’ve paid" icon={Send} variant="secondary" onPress={() => setPaying(true)} />
      ) : null}

      <SaveToBillify token={token} kind="khata" />

      <Text variant="caption" tone="muted" align="center">
        Khata at {shop.name} · Made with Billify
      </Text>
    </>
  );
}

function ClaimStatus({
  claim,
  shopName,
}: {
  claim: NonNullable<PublicKhata['claim']>;
  shopName: string;
}) {
  const amount = formatRupees(claim.amountPaise);
  const day = dayFormat.format(new Date(claim.createdAt));
  const message =
    claim.status === 'pending'
      ? `You told ${shopName} you paid ${amount} (${day}). It comes off your khata when they confirm it.`
      : claim.status === 'confirmed'
        ? `${shopName} confirmed your ${amount} payment (${day}).`
        : `${shopName} didn’t find your ${amount} payment (${day}). Please talk to them.`;
  return (
    <Tile variant={claim.status === 'confirmed' ? 'selected' : 'surface'}>
      <View style={styles.claim}>
        <Icon
          icon={claim.status === 'confirmed' ? CircleCheck : Clock}
          color={claim.status === 'confirmed' ? 'primary' : 'onSurfaceVariant'}
        />
        <Text
          variant="bodySecondary"
          tone={claim.status === 'confirmed' ? 'primary' : 'default'}
          style={styles.flex}
        >
          {message}
        </Text>
      </View>
    </Tile>
  );
}

function PaidForm({
  token,
  duePaise,
  shopName,
  onDone,
  onCancel,
}: {
  token: string;
  duePaise: number;
  shopName: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState((duePaise / 100).toFixed(2));
  const [utr, setUtr] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountPaise = parseRupees(amount);
  const utrOk = !utr.trim() || /^\d{12}$/.test(utr.trim());
  const valid = amountPaise !== null && amountPaise >= 100 && utrOk;

  async function send() {
    if (!valid || amountPaise === null) return;
    setSending(true);
    setError(null);
    try {
      await sendPaid(token, amountPaise, utr.trim() || undefined);
      onDone();
    } catch (err) {
      setError(
        isApiError(err, 'TOO_MANY_CLAIMS')
          ? `${shopName} has payments from you to check already. Ask them to confirm those first.`
          : isApiError(err, 'RATE_LIMITED')
            ? 'Too many tries. Wait a while, then try again.'
            : isApiError(err, 'NETWORK_ERROR') || isApiError(err, 'TIMEOUT')
              ? 'No internet connection. Try again.'
              : 'Couldn’t send. Try again in a minute.',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Tile>
      <View style={styles.form}>
        <Text variant="titleNav">Tell {shopName} you paid</Text>
        <TextField
          label="Amount paid"
          inTile
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          error={amount && amountPaise === null ? 'Enter an amount, like 500' : undefined}
        />
        <TextField
          label="UPI reference (optional)"
          inTile
          value={utr}
          onChangeText={setUtr}
          keyboardType="number-pad"
          placeholder="12 digits from your UPI app"
          maxLength={12}
          error={!utrOk ? 'A UPI reference has 12 digits' : undefined}
        />
        {error ? <ErrorBanner title="Not sent" message={error} /> : null}
        <Button
          label="Send to the shop"
          icon={Send}
          loading={sending}
          disabled={!valid}
          onPress={() => void send()}
        />
        <TextButton label="Cancel" onPress={onCancel} />
        <Text variant="caption" tone="muted" align="center">
          The shop checks its UPI app and confirms. Your khata changes only then.
        </Text>
      </View>
    </Tile>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  head: { gap: theme.space.xxs },
  actions: { gap: theme.space.sm },
  qrRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  qrBox: {
    padding: theme.space.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  claim: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  form: { gap: theme.space.md },
}));
