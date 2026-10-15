import { router } from 'expo-router';
import {
  Banknote,
  BookOpen,
  ChevronRight,
  CircleCheck,
  QrCode,
  Split,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { StyleSheet } from 'react-native-unistyles';

import { isRepoError } from '@/db/repos';
import { formatPhone, useCustomer } from '@/features/customers/customers';
import { useShop } from '@/features/shop/shop';
import { formatRupees, parseRupees } from '@/lib/money';
import { upiPayLink } from '@/lib/upi';
import { colors } from '@/theme/tokens';
import {
  Avatar,
  Badge,
  Button,
  Chip,
  ErrorBanner,
  Icon,
  Money,
  Screen,
  SectionHeader,
  StackHeader,
  Text,
  TextField,
  Tile,
  TileRow,
} from '@/ui';

import { saveBill, useNextBillNumber, type NewPayment } from './bills';
import { cartTotalPaise, toBillLines, useCart } from './cart-store';

type Method = 'cash' | 'upi' | 'khata' | 'split';

const METHODS: { method: Method; title: string; subtitle: string; icon: LucideIcon }[] = [
  { method: 'cash', title: 'Cash', subtitle: 'Collect at counter', icon: Banknote },
  { method: 'upi', title: 'UPI', subtitle: 'Show QR', icon: QrCode },
  { method: 'khata', title: 'Khata', subtitle: 'Add to due', icon: BookOpen },
  { method: 'split', title: 'Split', subtitle: 'Cash + UPI', icon: Split },
];

/** 02 Checkout: amount, customer, payment method. No gateway: the shop confirms the payment. */
export function CheckoutScreen() {
  const shop = useShop();
  const { draftId, lines, customerId, clear } = useCart();
  const [method, setMethod] = useState<Method>('upi');
  const [cashInput, setCashInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  // A second tap before the screen closes must not save the bill again.
  const saving = useRef(false);

  const total = cartTotalPaise(lines);
  const customer = useCustomer(customerId);
  const billNumber = useNextBillNumber(shop?.billPrefix ?? 'A');
  const splitCash = parseRupees(cashInput);
  const splitOk = splitCash !== null && splitCash > 0 && splitCash < total;
  const upiAmount = method === 'split' && splitOk ? total - splitCash : total;
  const canSave = method === 'khata' ? !!customer : method === 'split' ? splitOk : true;

  function payments(): NewPayment[] {
    if (method === 'split' && splitCash !== null) {
      return [
        { method: 'cash', amountPaise: splitCash },
        { method: 'upi', amountPaise: total - splitCash },
      ];
    }
    return [{ method: method === 'split' ? 'cash' : method, amountPaise: total }];
  }

  function markAsPaid() {
    if (!shop || saving.current) return;
    saving.current = true;
    setError(null);
    try {
      // One SQLite transaction: bill, lines, payments, stock, khata + outbox. No network.
      // The draft id makes it idempotent: a draft already saved returns that bill.
      const bill = saveBill({
        id: draftId,
        billPrefix: shop.billPrefix,
        customerId: customer?.id ?? null,
        lines: toBillLines(lines),
        payments: payments(),
      });
      clear();
      router.replace({ pathname: '/shop/bill-saved', params: { id: bill.id } });
    } catch (err) {
      saving.current = false;
      if (!isRepoError(err)) throw err;
      setError(err.message);
    }
  }

  if (lines.length === 0) {
    return (
      <Screen header={<StackHeader action="close" title="Checkout" />}>
        <Tile>
          <Text tone="muted">The cart is empty. Add items on the Bill tab first.</Text>
        </Tile>
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <StackHeader
          action="close"
          title="Checkout"
          right={<Badge label={`Bill ${billNumber}`} />}
        />
      }
      footer={
        <Button
          label={method === 'khata' ? 'Add to khata' : 'Mark as paid'}
          icon={CircleCheck}
          disabled={!canSave}
          onPress={markAsPaid}
        />
      }
    >
      {error ? (
        <ErrorBanner title="Bill not saved" message={error} onDismiss={() => setError(null)} />
      ) : null}

      <Tile>
        <View style={styles.amountTop}>
          <Text variant="label" tone="muted">
            Amount to collect
          </Text>
          <Badge label={`${lines.length} ${lines.length === 1 ? 'item' : 'items'}`} />
        </View>
        <Money paise={total} variant="amount" style={styles.amount} />
        <Text variant="bodySecondary" tone="muted" numberOfLines={2}>
          {lines.map((line) => line.name).join(', ')}
        </Text>
      </Tile>

      <Tile
        onPress={() => router.push('/shop/customer-picker')}
        accessibilityLabel={customer ? `Customer ${customer.name}. Change` : 'Pick customer'}
      >
        <View style={styles.customerRow}>
          {customer ? (
            <Avatar name={customer.name} />
          ) : (
            <View style={styles.customerIcon}>
              <Icon icon={UserRound} color="onSurfaceVariant" />
            </View>
          )}
          <View style={styles.flex}>
            <Text variant="bodyStrong">{customer ? customer.name : 'Add customer'}</Text>
            <Text variant="bodySecondary" tone="muted">
              {customer
                ? customer.phone
                  ? formatPhone(customer.phone)
                  : 'No phone number'
                : 'Optional for cash and UPI, needed for khata'}
            </Text>
          </View>
          {customer ? (
            <Text variant="label" tone="primary">
              Change
            </Text>
          ) : (
            <Icon icon={ChevronRight} color="iconInactive" />
          )}
        </View>
      </Tile>

      <SectionHeader title="Payment method" />
      <View style={styles.methods}>
        {[METHODS.slice(0, 2), METHODS.slice(2)].map((row) => (
          <TileRow key={row[0]?.method}>
            {row.map((option) => {
              const selected = option.method === method;
              return (
                <Tile
                  key={option.method}
                  variant={selected ? 'strong' : 'surface'}
                  onPress={() => setMethod(option.method)}
                  accessibilityLabel={`${option.title}, ${option.subtitle}`}
                  style={styles.flex}
                >
                  <View style={styles.methodTop} accessibilityState={{ selected }}>
                    <Icon
                      icon={option.icon}
                      size={24}
                      color={selected ? 'onPrimary' : 'onSurface'}
                    />
                    {selected ? <Icon icon={CircleCheck} color="onPrimary" /> : null}
                  </View>
                  <Text variant="titleNav" tone={selected ? 'onPrimary' : 'default'}>
                    {option.title}
                  </Text>
                  <Text variant="bodySecondary" tone={selected ? 'onPrimaryMuted' : 'muted'}>
                    {option.subtitle}
                  </Text>
                </Tile>
              );
            })}
          </TileRow>
        ))}
      </View>

      {method === 'cash' ? <CashChange total={total} /> : null}

      {method === 'split' ? (
        <Tile>
          <View style={styles.splitFields}>
            <TextField
              label="Cash received"
              inTile
              value={cashInput}
              onChangeText={setCashInput}
              placeholder="₹0.00"
              keyboardType="decimal-pad"
              error={cashInput && !splitOk ? `Enter less than ${formatRupees(total)}` : undefined}
            />
            <Text variant="bodySecondary" tone="muted">
              Rest by UPI: {splitOk ? formatRupees(total - (splitCash ?? 0)) : '—'}
            </Text>
          </View>
        </Tile>
      ) : null}

      {(method === 'upi' || (method === 'split' && splitOk)) && shop ? (
        <Tile>
          <View style={styles.upiRow}>
            <View style={styles.qrBox}>
              <QRCode
                value={upiPayLink({
                  upiId: shop.upiId,
                  payeeName: shop.name,
                  amountPaise: upiAmount,
                  note: billNumber,
                })}
                size={104}
                color={colors.onSurface}
                backgroundColor={colors.surface}
              />
            </View>
            <View style={styles.flex}>
              <Text variant="bodyStrong">Scan with any UPI app</Text>
              <Text variant="bodySecondary" tone="muted" numberOfLines={1}>
                {shop.upiId}
              </Text>
              <View style={styles.upiBadge}>
                <Badge label={`${formatRupees(upiAmount)} · ${billNumber}`} />
              </View>
            </View>
          </View>
          <Text variant="caption" tone="muted" style={styles.upiNote}>
            Check the payment on your phone or soundbox, then mark as paid.
          </Text>
        </Tile>
      ) : null}

      {method === 'khata' ? (
        <Tile variant="khata">
          <Text variant="bodyStrong" tone="khata">
            {customer
              ? `${formatRupees(total)} will be added to ${customer.name}'s khata`
              : 'Pick a customer to add this bill to khata'}
          </Text>
        </Tile>
      ) : null}
    </Screen>
  );
}

/** Cash: tap what the customer handed over to see the change to give back. */
function CashChange({ total }: { total: number }) {
  const [received, setReceived] = useState<number | null>(null);
  // Next round amounts a customer is likely to hand over: ₹50, ₹100, ₹500, ₹2,000 steps.
  const notes = [5000, 10000, 50000, 200000]
    .map((step) => Math.ceil(total / step) * step)
    .filter((value, index, all) => value > total && all.indexOf(value) === index)
    .slice(0, 3);
  const options = [total, ...notes];

  return (
    <Tile>
      <View style={styles.cash}>
        <Text variant="label" tone="muted">
          Customer gave
        </Text>
        <View style={styles.cashChips}>
          {options.map((value) => (
            <Chip
              key={value}
              label={formatRupees(value, { showPaise: false })}
              selected={received === value}
              onPress={() => setReceived(value)}
            />
          ))}
        </View>
        {received !== null ? (
          <Pressable onPress={() => setReceived(null)} accessibilityRole="button">
            <Text variant="bodyStrong">
              {received === total
                ? 'Exact amount, no change'
                : `Give back ${formatRupees(received - total)}`}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Tile>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  amountTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amount: { marginVertical: theme.space.xs },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  customerIcon: {
    width: theme.sizes.avatar,
    height: theme.sizes.avatar,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methods: { gap: theme.space.gap },
  methodTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.space.sm,
  },
  splitFields: { gap: theme.space.sm },
  upiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  qrBox: {
    padding: theme.space.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  upiBadge: { marginTop: theme.space.xs },
  upiNote: { marginTop: theme.space.sm },
  cash: { gap: theme.space.sm },
  cashChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.xs,
  },
}));
