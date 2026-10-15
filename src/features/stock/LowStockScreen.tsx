import { Check, PackageCheck, Send } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { reorderText, whatsAppLink } from '@/features/sharing/links';
import { useShop } from '@/features/shop/shop';
import { formatQty, qtyStep } from '@/lib/units';
import {
  Button,
  EmptyState,
  ErrorBanner,
  Icon,
  ListGroup,
  QtyStepper,
  Screen,
  SectionHeader,
  StackHeader,
  Text,
  Tile,
} from '@/ui';

import { suggestedOrder, useLowStock } from './stock';

/** 14 Low stock: pick what to order, adjust quantities, send the list on WhatsApp. */
export function LowStockScreen() {
  const shop = useShop();
  const rows = useLowStock();
  // Per item: unticked, or the order quantity (defaults to the suggestion).
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [orders, setOrders] = useState<Record<string, number>>({});
  const [shareError, setShareError] = useState<string | null>(null);

  const orderOf = (row: (typeof rows)[number]) => orders[row.id] ?? suggestedOrder(row);
  const picked = rows.filter((row) => !skipped.has(row.id));

  function toggle(id: string) {
    setSkipped((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function change(row: (typeof rows)[number], direction: 1 | -1) {
    const step = row.unit === 'pcs' ? 1 : qtyStep(row.unit);
    setOrders((current) => ({
      ...current,
      [row.id]: Math.max(step, orderOf(row) + direction * step),
    }));
  }

  function share() {
    const text = reorderText(
      shop?.name ?? 'Billify',
      picked.map((row) => ({ name: row.name, qty: orderOf(row), unit: row.unit })),
    );
    // No number: the shopkeeper picks the distributor's chat in WhatsApp.
    setShareError(null);
    Linking.openURL(whatsAppLink(text)).catch(() =>
      setShareError('Couldn’t open WhatsApp. Is it installed on this phone?'),
    );
  }

  return (
    <Screen
      header={<StackHeader title="Low stock" />}
      footer={
        rows.length ? (
          <Button
            label={`Share on WhatsApp · ${picked.length} ${picked.length === 1 ? 'item' : 'items'}`}
            icon={Send}
            disabled={picked.length === 0}
            onPress={share}
          />
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Everything is stocked"
          message="Items show up here when they reach the level you set on the item."
        />
      ) : (
        <>
          {shareError ? (
            <ErrorBanner
              title="Not shared"
              message={shareError}
              onDismiss={() => setShareError(null)}
            />
          ) : null}
          <Tile>
            <Text variant="titleScreen">
              {rows.length} {rows.length === 1 ? 'item is' : 'items are'} running low
            </Text>
            <Text variant="bodySecondary" tone="muted">
              Pick what to order and send the list to your distributor on WhatsApp.
            </Text>
          </Tile>

          <SectionHeader
            title={`Order · ${picked.length} of ${rows.length}`}
            trailing={
              <Pressable
                accessibilityRole="button"
                hitSlop={12}
                onPress={() =>
                  setSkipped(picked.length ? new Set(rows.map((row) => row.id)) : new Set())
                }
              >
                <Text variant="label" tone="primary">
                  {picked.length ? 'Untick all' : 'Tick all'}
                </Text>
              </Pressable>
            }
          />
          <ListGroup>
            {rows.map((row) => {
              const on = !skipped.has(row.id);
              return (
                <View key={row.id} style={styles.row}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`Order ${row.name}`}
                    onPress={() => toggle(row.id)}
                    hitSlop={8}
                    style={[styles.box, on && styles.boxOn]}
                  >
                    {on ? <Icon icon={Check} size={16} color="onPrimary" /> : null}
                  </Pressable>
                  <View style={styles.text}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {row.name}
                    </Text>
                    <Text
                      variant="bodySecondary"
                      tone={row.inStock < 0 ? 'error' : 'muted'}
                      numberOfLines={1}
                    >
                      {formatQty(row.inStock, row.unit)} left
                      {row.lowStockAt !== null
                        ? ` · warn at ${formatQty(row.lowStockAt, row.unit)}`
                        : ''}
                    </Text>
                  </View>
                  {on ? (
                    <QtyStepper
                      value={formatQty(orderOf(row), row.unit)}
                      itemLabel={row.name}
                      onIncrement={() => change(row, 1)}
                      onDecrement={() => change(row, -1)}
                    />
                  ) : null}
                </View>
              );
            })}
          </ListGroup>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    minHeight: theme.sizes.listRow,
    paddingHorizontal: theme.space.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.xs + 4,
    borderWidth: 2,
    borderColor: theme.colors.iconInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  text: { flex: 1, gap: 2 },
}));
