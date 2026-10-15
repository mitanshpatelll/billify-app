import { router, useLocalSearchParams } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { db } from '@/db/client';
import { productsRepo } from '@/db/repos';
import { MAX_QTY, roundQty } from '@/lib/domain';
import { formatRupees, lineTotalPaise, parseRupees } from '@/lib/money';
import { formatQty, isLoose, parseQty, perUnit, type Unit } from '@/lib/units';
import {
  Button,
  Chip,
  IconButton,
  SegmentedControl,
  Text,
  TextButton,
  TextField,
  Tile,
} from '@/ui';

import { useCart } from './cart-store';

// What a customer usually asks for at the counter.
const PRESETS: Record<Unit, number[]> = {
  kg: [0.25, 0.5, 1, 2, 5],
  g: [100, 250, 500, 1000],
  litre: [0.5, 1, 2, 5],
  pcs: [2, 3, 5, 6, 10, 12],
};

type Mode = 'qty' | 'amount';

/**
 * Loose items (User Flows §2, "tap quick key, enter qty or kg"): a weight preset, a typed
 * quantity, or "₹20 worth". Also opened from a cart line's quantity to type it exactly.
 * product=<id>: add to the bill; edit=<id>: change (or remove) that cart line.
 */
export function QtySheet() {
  const params = useLocalSearchParams<{ product?: string; edit?: string }>();
  const lines = useCart((state) => state.lines);
  const { add, setQty, remove } = useCart.getState();
  const line = params.edit ? lines.find((item) => item.productId === params.edit) : undefined;
  const [product] = useState(() =>
    params.product ? productsRepo.getProduct(db, params.product) : undefined,
  );
  const item = line
    ? { id: line.productId, name: line.name, unit: line.unit, pricePaise: line.unitPricePaise }
    : product
      ? { id: product.id, name: product.name, unit: product.unit, pricePaise: product.pricePaise }
      : undefined;

  const [mode, setMode] = useState<Mode>('qty');
  const [input, setInput] = useState(line ? String(line.qty) : '');

  if (!item) {
    return (
      <View style={styles.sheet} collapsable={false}>
        <View style={styles.header} collapsable={false}>
          <Text variant="titleScreen" style={styles.flex}>
            Item not found
          </Text>
          <IconButton icon={X} accessibilityLabel="Close" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const loose = isLoose(item.unit);
  const typedQty = parseQty(input);
  const amountPaise = parseRupees(input);
  // "₹20 worth": the quantity that costs that much (to the gram for kg / litre).
  const qty =
    mode === 'amount'
      ? amountPaise && item.pricePaise
        ? roundQty(
            item.unit === 'g'
              ? Math.round(amountPaise / item.pricePaise)
              : amountPaise / item.pricePaise,
          )
        : null
      : typedQty !== null && item.unit === 'pcs' && !Number.isInteger(typedQty)
        ? null
        : typedQty;
  const valid = qty !== null && qty > 0 && qty <= MAX_QTY;

  // No LayoutAnimation here: on the new architecture it crashes the app when it runs while the
  // sheet is being dismissed (React's LayoutAnimationDelegateProxy aborts).
  function apply(value: number) {
    if (!item) return;
    if (line) setQty(item.id, value);
    else add(item, value);
    router.back();
  }

  return (
    <View style={styles.sheet} collapsable={false}>
      <View style={styles.header} collapsable={false}>
        <View style={styles.flex}>
          <Text variant="titleScreen" accessibilityRole="header" numberOfLines={1}>
            {item.name}
          </Text>
          <Text variant="bodySecondary" tone="muted">
            {formatRupees(item.pricePaise * (item.unit === 'g' ? 1000 : 1))}{' '}
            {item.unit === 'g' ? '/ kg' : perUnit(item.unit)}
          </Text>
        </View>
        <IconButton icon={X} accessibilityLabel="Close" onPress={() => router.back()} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.chips}>
          {PRESETS[item.unit].map((value) => (
            <Chip
              key={value}
              label={formatQty(value, item.unit)}
              selected={line?.qty === value}
              onPress={() => apply(value)}
            />
          ))}
        </View>

        {loose ? (
          <SegmentedControl
            options={[
              { value: 'qty', label: item.unit === 'g' ? 'Grams' : `By ${item.unit}` },
              { value: 'amount', label: 'By amount (₹)' },
            ]}
            value={mode}
            onChange={(next) => {
              setMode(next);
              setInput('');
            }}
            accessibilityLabel="Enter quantity or amount"
          />
        ) : null}

        <Tile>
          <View style={styles.form}>
            <TextField
              label={mode === 'amount' ? 'Amount (₹)' : `Quantity (${item.unit})`}
              inTile
              value={input}
              onChangeText={setInput}
              placeholder={mode === 'amount' ? '20' : item.unit === 'pcs' ? '1' : '0.75'}
              keyboardType={item.unit === 'pcs' || item.unit === 'g' ? 'number-pad' : 'decimal-pad'}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => valid && apply(qty)}
              error={
                input && !valid
                  ? mode === 'amount'
                    ? 'Enter an amount, like 20 or 45.50'
                    : item.unit === 'pcs'
                      ? 'Enter a whole number'
                      : 'Enter a quantity, like 0.75'
                  : undefined
              }
            />
            <Text variant="bodyStrong" accessibilityLiveRegion="polite">
              {valid
                ? mode === 'amount'
                  ? `${formatQty(qty, item.unit)} · ${formatRupees(lineTotalPaise(qty, item.pricePaise))}`
                  : formatRupees(lineTotalPaise(qty, item.pricePaise))
                : ' '}
            </Text>
          </View>
        </Tile>

        <Button
          label={line ? 'Update quantity' : 'Add to bill'}
          icon={Check}
          disabled={!valid}
          onPress={() => valid && apply(qty)}
        />
        {line ? (
          <View style={styles.remove}>
            <TextButton
              label="Remove from bill"
              onPress={() => {
                remove(line.productId);
                router.back();
              }}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  sheet: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: theme.space.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.screen,
    paddingBottom: theme.space.sm,
  },
  content: {
    gap: theme.space.gap,
    paddingHorizontal: theme.space.screen,
    paddingBottom: theme.space.xxl,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.xs },
  form: { gap: theme.space.sm },
  remove: { alignItems: 'center' },
  flex: { flex: 1 },
}));
