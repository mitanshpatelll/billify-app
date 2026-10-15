import { router, useLocalSearchParams } from 'expo-router';
import { Barcode, Plus, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isRepoError } from '@/db/repos';
import { useCart } from '@/features/billing/cart-store';
import { parseRupees } from '@/lib/money';
import { parseQty, UNITS, type Unit } from '@/lib/units';
import {
  Button,
  ErrorBanner,
  Icon,
  IconButton,
  SegmentedControl,
  Text,
  TextField,
  Tile,
  Toggle,
} from '@/ui';

import { addProduct } from './catalog';

const UNIT_OPTIONS = UNITS.map((unit) => ({ value: unit, label: unit }));

/** 11 Quick add item: an unknown barcode (or a name search miss) becomes a product, then a cart line. */
export function QuickAddSheet() {
  const params = useLocalSearchParams<{ barcode?: string; name?: string }>();
  const addToCart = useCart((state) => state.add);

  const [name, setName] = useState(params.name ?? '');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [unit, setUnit] = useState<Unit>('pcs');
  const [trackStock, setTrackStock] = useState(true);
  const [openingStock, setOpeningStock] = useState('');
  const [touched, setTouched] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saving = useRef(false);

  const pricePaise = parseRupees(price);
  const mrpPaise = mrp.trim() ? parseRupees(mrp) : null;
  const errors = {
    name: name.trim().length < 2 ? 'Enter the item name' : undefined,
    price: !pricePaise ? 'Enter the selling price' : undefined,
    // Selling above MRP is illegal in India.
    mrp:
      mrp.trim() && mrpPaise === null
        ? 'Enter a valid MRP'
        : pricePaise && mrpPaise !== null && pricePaise > mrpPaise
          ? "Price can't be above MRP"
          : undefined,
  };
  const openingQty = openingStock.trim() ? parseQty(openingStock) : 0;
  const openingError =
    trackStock && openingQty === null ? 'Enter a number, like 12 or 2.5' : undefined;
  const valid = !errors.name && !errors.price && !errors.mrp && !openingError;

  function save() {
    setTouched(true);
    if (!valid || !pricePaise || saving.current) return;
    saving.current = true;
    setSaveError(null);
    try {
      // One SQLite transaction: product + opening stock movement + outbox entries.
      const product = addProduct({
        barcode: params.barcode ?? null,
        name: name.trim(),
        unit,
        pricePaise,
        mrpPaise,
        trackStock,
        openingStock: trackStock ? (openingQty ?? 0) : undefined,
      });
      addToCart(product);
      router.back();
    } catch (err) {
      saving.current = false;
      if (!isRepoError(err)) throw err;
      setSaveError(err.message);
    }
  }

  // Form sheets want at most a header + one scroll view. Unistyles applies styles natively, so
  // React would flatten these wrappers away and hand the sheet their children instead.
  return (
    <View style={styles.sheet} collapsable={false}>
      <View style={styles.header} collapsable={false}>
        <Text variant="titleScreen" style={styles.flex} accessibilityRole="header">
          New item
        </Text>
        <IconButton
          icon={X}
          variant="surface"
          accessibilityLabel="Close"
          onPress={() => router.back()}
        />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {params.barcode ? (
          <View style={styles.barcode}>
            <Icon icon={Barcode} size={16} color="onSurfaceVariant" />
            <Text variant="label" style={styles.barcodeText}>
              {params.barcode}
            </Text>
          </View>
        ) : null}

        {saveError ? (
          <ErrorBanner
            title="Item not saved"
            message={saveError}
            onDismiss={() => setSaveError(null)}
          />
        ) : null}

        <Tile>
          <View style={styles.form}>
            <TextField
              label="Item name"
              inTile
              value={name}
              onChangeText={setName}
              placeholder="Parle-G 250 g"
              autoCapitalize="words"
              error={touched ? errors.name : undefined}
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField
                  label="Selling price"
                  inTile
                  value={price}
                  onChangeText={setPrice}
                  placeholder="₹0.00"
                  keyboardType="decimal-pad"
                  error={touched ? errors.price : undefined}
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  label="MRP"
                  inTile
                  value={mrp}
                  onChangeText={setMrp}
                  placeholder="₹0.00"
                  keyboardType="decimal-pad"
                  error={errors.mrp}
                />
              </View>
            </View>
            <View style={styles.field}>
              <Text variant="label" tone="muted">
                Unit
              </Text>
              <SegmentedControl
                options={UNIT_OPTIONS}
                value={unit}
                onChange={setUnit}
                accessibilityLabel="Unit"
              />
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.flex}>
                <Text variant="bodyStrong">Track stock</Text>
                <Text variant="bodySecondary" tone="muted">
                  Count it down as you sell
                </Text>
              </View>
              <Toggle
                value={trackStock}
                onValueChange={setTrackStock}
                accessibilityLabel="Track stock"
              />
            </View>
            {trackStock ? (
              <TextField
                label={`In stock now (${unit})`}
                inTile
                value={openingStock}
                onChangeText={setOpeningStock}
                placeholder="0"
                keyboardType="decimal-pad"
                error={touched ? openingError : undefined}
              />
            ) : null}
          </View>
        </Tile>

        <Button label="Add to bill" icon={Plus} onPress={save} />
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
    paddingHorizontal: theme.space.screen,
    paddingBottom: theme.space.sm,
  },
  content: {
    gap: theme.space.gap,
    paddingHorizontal: theme.space.screen,
    paddingBottom: theme.space.xxl,
  },
  barcode: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    height: 30,
    paddingHorizontal: theme.space.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
  },
  barcodeText: { fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
  form: { gap: theme.space.md },
  field: { gap: 6 },
  row: { flexDirection: 'row', gap: theme.space.sm },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  flex: { flex: 1 },
}));
