import { router } from 'expo-router';
import {
  Banknote,
  BookOpen,
  ChevronRight,
  CircleCheck,
  QrCode,
  Split,
  TriangleAlert,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { StyleSheet } from 'react-native-unistyles';

import { isRepoError } from '@/db/repos';
import { formatPhone, useCustomer } from '@/features/customers/customers';
import { useCustomerKhata } from '@/features/khata/khata';
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
import {
  cartTotalPaise,
  discountPaise,
  toBillLines,
  useCart,
  type CartDiscount,
} from './cart-store';

type Method = 'cash' | 'upi' | 'khata' | 'split';

const METHODS: { method: Method; title: string; subtitle: string; icon: LucideIcon }[] = [
  { method: 'cash', title: 'Cash', subtitle: 'Collect at counter', icon: Banknote },
  { method: 'upi', title: 'UPI', subtitle: 'Show QR', icon: QrCode },
  { method: 'khata', title: 'Khata', subtitle: 'Add to due', icon: BookOpen },
  { method: 'split', title: 'Split', subtitle: 'Cash, UPI, khata', icon: Split },
];

/** 02 Checkout: amount, customer, payment method. No gateway: the shop confirms the payment. */
export function CheckoutScreen() {
  const shop = useShop();
  const { draftId, lines, customerId, discount, setDiscount, clear } = useCart();
  const [method, setMethod] = useState<Method>('upi');
  const [cashInput, setCashInput] = useState('');
  const [khataInput, setKhataInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  // A second tap before the screen closes must not save the bill again.
  const saving = useRef(false);

  const subtotal = cartTotalPaise(lines);
  const discountOff = discountPaise(lines, discount);
  const discountOk = discountOff >= 0 && discountOff < subtotal;
  const total = discountOk ? subtotal - discountOff : subtotal;
  const customer = useCustomer(customerId);
  const { balancePaise } = useCustomerKhata(customer?.id);
  const billNumber = useNextBillNumber(shop?.billPrefix ?? 'A');

  // Split (User Flows §2, "mixed"): cash and khata typed, the rest by UPI. Empty = none.
  const splitCash = cashInput.trim() ? parseRupees(cashInput) : 0;
  const splitKhata = khataInput.trim() ? parseRupees(khataInput) : 0;
  const splitRest =
    splitCash !== null && splitKhata !== null ? total - splitCash - splitKhata : null;
  const splitParts = [splitCash, splitKhata, splitRest].filter((part) => !!part && part > 0);
  const splitOk = splitRest !== null && splitRest >= 0 && splitParts.length >= 2;
  const upiAmount = method === 'split' ? Math.max(splitRest ?? 0, 0) : total;
  const khataPart = method === 'khata' ? total : method === 'split' && splitOk ? splitKhata! : 0;
  const canSave =
    discountOk &&
    (method === 'khata'
      ? !!customer
      : method === 'split'
        ? splitOk && (khataPart === 0 || !!customer)
        : true);
  // D27: a warning, never a block. The shopkeeper knows the customer.
  const limit = customer?.khataLimitPaise ?? null;
  const overLimit =
    limit !== null && khataPart > 0 && balancePaise + khataPart > limit
      ? balancePaise + khataPart - limit
      : 0;

  function payments(): NewPayment[] {
    if (method === 'split') {
      const parts: NewPayment[] = [
        { method: 'cash', amountPaise: splitCash ?? 0 },
        { method: 'upi', amountPaise: splitRest ?? 0 },
        { method: 'khata', amountPaise: splitKhata ?? 0 },
      ];
      return parts.filter((part) => part.amountPaise > 0);
    }
    return [{ method, amountPaise: total }];
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
        discountPaise: discountOff,
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
        {discountOff > 0 && discountOk ? (
          <Text variant="bodySecondary" tone="muted">
            {formatRupees(subtotal)} − {formatRupees(discountOff)}{' '}
            {discount.kind === 'roundoff' ? 'round-off' : 'discount'}
          </Text>
        ) : null}
        <Text variant="bodySecondary" tone="muted" numberOfLines={2}>
          {lines.map((line) => line.name).join(', ')}
        </Text>
      </Tile>

      <DiscountPicker subtotal={subtotal} discount={discount} onChange={setDiscount} />

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
              error={cashInput && splitCash === null ? 'Enter an amount, like 100' : undefined}
            />
            <TextField
              label="On khata"
              inTile
              value={khataInput}
              onChangeText={setKhataInput}
              placeholder="₹0.00"
              keyboardType="decimal-pad"
              error={
                khataInput && splitKhata === null
                  ? 'Enter an amount, like 100'
                  : splitKhata && !customer
                    ? 'Pick a customer for the khata part'
                    : undefined
              }
            />
            <Text
              variant="bodySecondary"
              tone={splitRest !== null && splitRest < 0 ? 'error' : 'muted'}
            >
              {splitRest === null
                ? 'Rest by UPI: —'
                : splitRest < 0
                  ? `That is ${formatRupees(-splitRest)} more than the bill`
                  : `Rest by UPI: ${formatRupees(splitRest)}`}
            </Text>
          </View>
        </Tile>
      ) : null}

      {(method === 'upi' || (method === 'split' && splitOk && upiAmount > 0)) && shop ? (
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

      {overLimit > 0 && customer && limit !== null ? (
        <Tile variant="khata">
          <View style={styles.limitRow}>
            <Icon icon={TriangleAlert} color="secondary" />
            <Text variant="bodySecondary" tone="khata" style={styles.flex}>
              Over {customer.name}’s khata limit of {formatRupees(limit)} by{' '}
              {formatRupees(overLimit)}. You can still add it.
            </Text>
          </View>
        </Tile>
      ) : null}
    </Screen>
  );
}

/** Discount or round-off (User Flows §2, review): none, the paise off, or an amount. */
function DiscountPicker({
  subtotal,
  discount,
  onChange,
}: {
  subtotal: number;
  discount: CartDiscount;
  onChange: (discount: CartDiscount) => void;
}) {
  const [input, setInput] = useState(
    discount.kind === 'amount' ? (discount.paise / 100).toFixed(2) : '',
  );
  const roundoff = subtotal >= 100 ? subtotal % 100 : 0;
  const typed = parseRupees(input);
  const tooMuch = discount.kind === 'amount' && discount.paise >= subtotal;

  return (
    <Tile>
      <View style={styles.cash}>
        <Text variant="label" tone="muted">
          Discount
        </Text>
        <View style={styles.cashChips}>
          <Chip
            label="None"
            selected={discount.kind === 'none'}
            onPress={() => onChange({ kind: 'none' })}
          />
          {roundoff > 0 ? (
            <Chip
              label={`Round off −${formatRupees(roundoff)}`}
              selected={discount.kind === 'roundoff'}
              onPress={() => onChange({ kind: 'roundoff' })}
            />
          ) : null}
          <Chip
            label="Amount"
            selected={discount.kind === 'amount'}
            onPress={() => onChange({ kind: 'amount', paise: typed ?? 0 })}
          />
        </View>
        {discount.kind === 'amount' ? (
          <TextField
            label="Discount (₹)"
            inTile
            value={input}
            onChangeText={(text) => {
              setInput(text);
              onChange({ kind: 'amount', paise: parseRupees(text) ?? 0 });
            }}
            placeholder="₹0.00"
            keyboardType="decimal-pad"
            error={
              input && typed === null
                ? 'Enter an amount, like 10'
                : tooMuch
                  ? `Must be less than ${formatRupees(subtotal)}`
                  : undefined
            }
          />
        ) : null}
      </View>
    </Tile>
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
  limitRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
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
