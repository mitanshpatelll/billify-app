import { router, useLocalSearchParams } from 'expo-router';
import { ClipboardCheck, History, Pencil, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isRepoError } from '@/db/repos';
import { formatRupees, parseRupees } from '@/lib/money';
import { formatQty, parseQty, perUnit } from '@/lib/units';
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  Icon,
  ListGroup,
  ListRow,
  Screen,
  SectionHeader,
  StackHeader,
  Text,
  TextButton,
  TextField,
  Tile,
  TileRow,
  Toggle,
} from '@/ui';

import {
  deleteProduct,
  fixCount,
  movementLabel,
  updateProduct,
  useMovements,
  useProduct,
  useStockOf,
} from './stock';

const timeFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

type Mode = 'view' | 'count' | 'edit';

/** Product detail: stock from the ledger, warn level, fix a count, edit, remove, history. */
export function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useProduct(id);
  const inStock = useStockOf(id);
  const movements = useMovements(id);
  const [mode, setMode] = useState<Mode>('view');
  const [error, setError] = useState<string | null>(null);

  if (!product || product.deletedAt) {
    return (
      <Screen header={<StackHeader title="Item" />}>
        <EmptyState icon={History} title="This item is gone" message="It was removed." />
      </Screen>
    );
  }

  function run(action: () => void) {
    setError(null);
    try {
      action();
      setMode('view');
    } catch (err) {
      if (!isRepoError(err)) throw err;
      setError(err.message);
    }
  }

  function confirmRemove() {
    if (!product) return;
    Alert.alert(
      `Remove ${product.name}?`,
      'It disappears from billing and stock. Old bills keep it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            deleteProduct(product.id);
            router.back();
          },
        },
      ],
    );
  }

  const details = [
    `${formatRupees(product.pricePaise)} ${perUnit(product.unit)}`,
    product.mrpPaise !== null ? `MRP ${formatRupees(product.mrpPaise)}` : null,
    product.barcode,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen header={<StackHeader title="Item" />}>
      <Tile>
        <Text variant="titleScreen">{product.name}</Text>
        <Text variant="bodySecondary" tone="muted">
          {details}
        </Text>
      </Tile>

      {product.trackStock ? (
        <TileRow>
          <Tile style={styles.flex}>
            <Text variant="label" tone="muted">
              In stock
            </Text>
            <Text variant="numberTile" tone={inStock < 0 ? 'error' : 'default'}>
              {formatQty(inStock, product.unit)}
            </Text>
          </Tile>
          <Tile style={styles.flex}>
            <Text variant="label" tone="muted">
              Warn at
            </Text>
            <Text variant="numberTile">
              {product.lowStockAt !== null ? formatQty(product.lowStockAt, product.unit) : '—'}
            </Text>
          </Tile>
        </TileRow>
      ) : (
        <Badge label="Stock not tracked for this item" />
      )}

      {error ? (
        <ErrorBanner title="Not saved" message={error} onDismiss={() => setError(null)} />
      ) : null}

      {mode === 'count' ? (
        <CountForm
          unit={product.unit}
          onCancel={() => setMode('view')}
          onSave={(counted) => run(() => fixCount(product.id, counted))}
        />
      ) : mode === 'edit' ? (
        <EditForm
          product={product}
          onCancel={() => setMode('view')}
          onSave={(patch) => run(() => updateProduct(product.id, patch))}
        />
      ) : (
        <ListGroup>
          {product.trackStock ? (
            <ListRow
              title="Fix the count"
              subtitle="Count the shelf and enter what's there"
              leading={<Icon icon={ClipboardCheck} color="primary" />}
              onPress={() => setMode('count')}
            />
          ) : null}
          <ListRow
            title="Edit item"
            subtitle="Name, price, MRP, warn level"
            leading={<Icon icon={Pencil} color="primary" />}
            onPress={() => setMode('edit')}
          />
          <ListRow
            title="Remove item"
            leading={<Icon icon={Trash2} color="error" />}
            onPress={confirmRemove}
          />
        </ListGroup>
      )}

      {product.trackStock ? (
        <>
          <SectionHeader title="Stock history" />
          {movements.length === 0 ? (
            <EmptyState
              icon={History}
              title="No movements yet"
              message="Sales, stock in and counts show up here."
            />
          ) : (
            <ListGroup>
              {movements.map((movement) => (
                <ListRow
                  key={movement.id}
                  title={movementLabel(movement.reason)}
                  subtitle={timeFormat.format(new Date(movement.createdAt))}
                  trailing={
                    <Text
                      variant="bodyStrong"
                      tone={movement.qtyDelta > 0 ? 'primary' : 'default'}
                      style={styles.qty}
                    >
                      {movement.qtyDelta > 0 ? '+' : ''}
                      {formatQty(movement.qtyDelta, product.unit)}
                    </Text>
                  }
                />
              ))}
            </ListGroup>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function CountForm({
  unit,
  onSave,
  onCancel,
}: {
  unit: Parameters<typeof formatQty>[1];
  onSave: (counted: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const counted = parseQty(value);
  return (
    <Tile>
      <View style={styles.form}>
        <TextField
          label={`Counted on the shelf (${unit})`}
          inTile
          value={value}
          onChangeText={setValue}
          placeholder="0"
          keyboardType="decimal-pad"
          autoFocus
          error={value && counted === null ? 'Enter a number, like 12 or 2.5' : undefined}
        />
        <Button
          label="Save count"
          disabled={counted === null}
          onPress={() => counted !== null && onSave(counted)}
        />
        <TextButton label="Cancel" onPress={onCancel} />
      </View>
    </Tile>
  );
}

type EditFormProps = {
  product: NonNullable<ReturnType<typeof useProduct>>;
  onSave: (patch: Parameters<typeof updateProduct>[1]) => void;
  onCancel: () => void;
};

function EditForm({ product, onSave, onCancel }: EditFormProps) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState((product.pricePaise / 100).toFixed(2));
  const [mrp, setMrp] = useState(
    product.mrpPaise !== null ? (product.mrpPaise / 100).toFixed(2) : '',
  );
  const [warnAt, setWarnAt] = useState(
    product.lowStockAt !== null ? String(product.lowStockAt) : '',
  );
  const [trackStock, setTrackStock] = useState(product.trackStock);

  const pricePaise = parseRupees(price);
  const mrpPaise = mrp.trim() ? parseRupees(mrp) : null;
  const warn = warnAt.trim() ? parseQty(warnAt) : null;
  const errors = {
    name: name.trim().length < 1 ? 'Enter the item name' : undefined,
    price: !pricePaise ? 'Enter the selling price' : undefined,
    mrp:
      mrp.trim() && mrpPaise === null
        ? 'Enter a valid MRP'
        : pricePaise && mrpPaise !== null && pricePaise > mrpPaise
          ? "Price can't be above MRP"
          : undefined,
    warn: warnAt.trim() && warn === null ? 'Enter a number' : undefined,
  };
  const valid = !errors.name && !errors.price && !errors.mrp && !errors.warn;

  return (
    <Tile>
      <View style={styles.form}>
        <TextField
          label="Item name"
          inTile
          value={name}
          onChangeText={setName}
          error={errors.name}
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField
              label="Selling price"
              inTile
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              error={errors.price}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label="MRP"
              inTile
              value={mrp}
              onChangeText={setMrp}
              keyboardType="decimal-pad"
              error={errors.mrp}
            />
          </View>
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
            label={`Warn me at (${product.unit})`}
            inTile
            value={warnAt}
            onChangeText={setWarnAt}
            placeholder="Leave empty: warn at 0"
            keyboardType="decimal-pad"
            hint="It shows on the low stock list at or below this"
            error={errors.warn}
          />
        ) : null}
        <Button
          label="Save item"
          disabled={!valid}
          onPress={() =>
            pricePaise &&
            onSave({
              name,
              pricePaise,
              mrpPaise,
              trackStock,
              lowStockAt: trackStock ? warn : product.lowStockAt,
            })
          }
        />
        <TextButton label="Cancel" onPress={onCancel} />
      </View>
    </Tile>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  form: { gap: theme.space.md },
  row: { flexDirection: 'row', gap: theme.space.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  qty: { fontVariant: ['tabular-nums'] },
}));
