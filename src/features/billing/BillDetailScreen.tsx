import { router, useLocalSearchParams } from 'expo-router';
import { BookOpen, CircleX, QrCode, ReceiptText, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isRepoError } from '@/db/repos';
import { formatPhone, useCustomer } from '@/features/customers/customers';
import { useShop } from '@/features/shop/shop';
import { formatRupees, lineTotalPaise } from '@/lib/money';
import { paymentLabel, paymentName } from '@/lib/payments';
import { formatQty } from '@/lib/units';
import {
  Avatar,
  Badge,
  EmptyState,
  ErrorBanner,
  Icon,
  ListGroup,
  ListRow,
  Money,
  Screen,
  StackHeader,
  Text,
  Tile,
  TileRow,
} from '@/ui';

import { useBill } from './bills';
import { voidBill } from './history';
import { shareBillOnWhatsApp } from './share';

const whenFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

/** 18 Bill detail: lines, payments, share again, show the QR, or cancel the bill. */
export function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bill = useBill(id);
  const customer = useCustomer(bill?.customerId);
  const shop = useShop();
  const [error, setError] = useState<string | null>(null);

  if (!bill) {
    return (
      <Screen header={<StackHeader title="Bill" />}>
        <EmptyState icon={ReceiptText} title="This bill isn’t on this phone" message="" />
      </Screen>
    );
  }

  const cancelled = !!bill.voidedAt;
  const khataPaise = bill.payments
    .filter((payment) => payment.method === 'khata')
    .reduce((sum, payment) => sum + payment.amountPaise, 0);

  function confirmCancel() {
    if (!bill) return;
    Alert.alert(
      `Cancel bill ${bill.number}?`,
      [
        'Its items go back into stock.',
        khataPaise > 0 && customer
          ? `${formatRupees(khataPaise)} comes off ${customer.name}'s khata.`
          : null,
        'The customer’s bill link will say it was cancelled. This can’t be undone.',
      ]
        .filter(Boolean)
        .join(' '),
      [
        { text: 'Keep bill', style: 'cancel' },
        {
          text: 'Cancel bill',
          style: 'destructive',
          onPress: () => {
            try {
              voidBill(bill.id);
            } catch (err) {
              if (!isRepoError(err)) throw err;
              setError(err.message);
            }
          },
        },
      ],
    );
  }

  return (
    <Screen
      header={
        <StackHeader
          title={`Bill ${bill.number}`}
          right={
            cancelled ? (
              <Badge label="Cancelled" tone="error" />
            ) : (
              <Badge
                label={khataPaise > 0 ? 'On khata' : `Paid by ${paymentLabel(bill.payments)}`}
                tone={khataPaise > 0 ? 'due' : 'paid'}
              />
            )
          }
        />
      }
    >
      {cancelled ? (
        <ErrorBanner
          title="This bill was cancelled"
          message={`${whenFormat.format(new Date(bill.voidedAt!))}. Its items went back into stock.`}
        />
      ) : null}
      {error ? (
        <ErrorBanner title="Not done" message={error} onDismiss={() => setError(null)} />
      ) : null}

      {customer ? (
        <Tile
          onPress={() =>
            router.push({ pathname: '/shop/customers/[id]', params: { id: customer.id } })
          }
          accessibilityLabel={`Customer ${customer.name}. Open khata`}
        >
          <View style={styles.person}>
            <Avatar name={customer.name} />
            <View style={styles.flex}>
              <Text variant="bodyStrong">{customer.name}</Text>
              <Text variant="bodySecondary" tone="muted">
                {customer.phone ? formatPhone(customer.phone) : 'No phone number'}
              </Text>
            </View>
            {khataPaise > 0 ? <Icon icon={BookOpen} color="secondary" /> : null}
          </View>
        </Tile>
      ) : null}

      <Tile>
        <View style={styles.top}>
          <Text variant="label" tone="muted">
            {bill.items.length} {bill.items.length === 1 ? 'item' : 'items'}
          </Text>
          <Text variant="label" tone="muted">
            {whenFormat.format(new Date(bill.createdAt))}
          </Text>
        </View>
        <View style={styles.items}>
          {bill.items.map((item) => (
            <View key={item.id} style={styles.item}>
              <View style={styles.flex}>
                <Text variant="body" numberOfLines={1}>
                  {item.nameSnapshot}
                </Text>
                <Text variant="caption" tone="muted">
                  {formatQty(item.qty, item.unit)} × {formatRupees(item.unitPricePaise)}
                </Text>
              </View>
              <Money paise={lineTotalPaise(item.qty, item.unitPricePaise)} variant="body" />
            </View>
          ))}
        </View>
        <View style={styles.dashed} />
        {bill.discountPaise > 0 ? (
          <View style={styles.item}>
            <Text variant="bodySecondary" tone="muted" style={styles.flex}>
              Discount on {formatRupees(bill.totalPaise + bill.discountPaise)}
            </Text>
            <Text variant="bodySecondary" tone="muted">
              −{formatRupees(bill.discountPaise)}
            </Text>
          </View>
        ) : null}
        <View style={styles.totalRow}>
          <Text variant="titleScreen">Total</Text>
          <Money
            paise={bill.totalPaise}
            variant="total"
            tone={cancelled ? 'error' : 'default'}
            style={cancelled && styles.struck}
          />
        </View>
        {bill.payments.length > 1 || khataPaise > 0 ? (
          <View style={styles.payments}>
            {bill.payments.map((payment) => (
              <View key={payment.id} style={styles.item}>
                <Text variant="bodySecondary" tone={payment.method === 'khata' ? 'khata' : 'muted'}>
                  {payment.method === 'khata' && customer
                    ? `On ${customer.name}'s khata`
                    : paymentName(payment.method)}
                </Text>
                <View style={styles.flex} />
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

      {cancelled ? null : (
        <>
          <TileRow>
            <Tile
              variant="strong"
              style={styles.flex}
              onPress={() => shareBillOnWhatsApp(bill, customer, shop, setError)}
              accessibilityLabel="WhatsApp, send bill link"
            >
              <Icon icon={Share2} color="onPrimary" />
              <Text variant="titleNav" tone="onPrimary" style={styles.actionText}>
                WhatsApp
              </Text>
              <Text variant="bodySecondary" tone="onPrimaryMuted">
                Send bill link
              </Text>
            </Tile>
            <Tile
              style={styles.flex}
              onPress={() => router.push({ pathname: '/shop/bill-qr', params: { id: bill.id } })}
              accessibilityLabel="Show QR, customer scans"
            >
              <Icon icon={QrCode} />
              <Text variant="titleNav" style={styles.actionText}>
                Show QR
              </Text>
              <Text variant="bodySecondary" tone="muted">
                Customer scans
              </Text>
            </Tile>
          </TileRow>
          <ListGroup>
            <ListRow
              title="Cancel bill"
              subtitle="Items go back into stock"
              leading={<Icon icon={CircleX} color="error" />}
              onPress={confirmCancel}
            />
          </ListGroup>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  person: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  items: { gap: theme.space.sm, paddingVertical: theme.space.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  dashed: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.surfaceVariant,
    marginVertical: theme.space.xs,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.space.xs,
  },
  struck: { textDecorationLine: 'line-through' },
  payments: { gap: theme.space.xxs, paddingTop: theme.space.sm },
  actionText: { marginTop: theme.space.sm },
}));
