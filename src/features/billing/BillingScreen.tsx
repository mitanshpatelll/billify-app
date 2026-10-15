import { router } from 'expo-router';
import { ChevronRight, PackagePlus, Plus, ScanBarcode, Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useProductSearch, useQuickKeys, type Product } from '@/features/catalog/catalog';
import { useShop } from '@/features/shop/shop';
import { formatRupees } from '@/lib/money';
import { formatQty, perUnit } from '@/lib/units';
import {
  Button,
  Chip,
  Icon,
  ListGroup,
  ListRow,
  Money,
  QtyStepper,
  Screen,
  SectionHeader,
  StatusPill,
  Text,
  TextField,
  Tile,
} from '@/ui';

import { useNextBillNumber } from './bills';
import { cartTotalPaise, lineTotalPaise, useCart } from './cart-store';
import { ScannerPreview } from './components/ScannerPreview';

/** 01 Billing: scan / search / quick keys → cart → checkout. Never waits for the network. */
export function BillingScreen() {
  const shop = useShop();
  const billNumber = useNextBillNumber(shop?.billPrefix ?? 'A');
  const quickKeys = useQuickKeys();
  const { lines, lastAddedId, add, increment, decrement, clear } = useCart();
  const [query, setQuery] = useState('');
  const results = useProductSearch(query);

  const total = cartTotalPaise(lines);

  function addProduct(product: Product) {
    add(product);
    setQuery('');
  }

  return (
    <Screen
      kind="tab"
      footerStyle="bar"
      footer={
        <View style={styles.payBar}>
          <View style={styles.totalBlock}>
            <Text variant="label" tone="muted">
              Total
            </Text>
            <Money
              paise={total}
              variant="total"
              accessibilityLabel={`Total ${formatRupees(total)}`}
            />
          </View>
          <View style={styles.flex}>
            <Button
              label="Checkout"
              trailingIcon={ChevronRight}
              disabled={lines.length === 0}
              onPress={() => router.push('/shop/checkout')}
            />
          </View>
        </View>
      }
    >
      <View style={styles.top}>
        <View style={styles.flex}>
          <Text variant="titleScreen" numberOfLines={1}>
            {shop?.name ?? 'Billify'}
          </Text>
          <Text variant="bodySecondary" tone="muted">
            Bill {billNumber}
          </Text>
        </View>
        {/* Sync slice: outbox count, "Synced" when it is 0, else "3 waiting". */}
        <StatusPill label="Synced" />
      </View>

      <ScannerPreview />

      <TextField
        icon={Search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search item by name"
        accessibilityLabel="Search items"
        returnKeyType="search"
        autoCorrect={false}
      />

      {query.trim() ? (
        <ListGroup>
          {results.map((product) => (
            <ListRow
              key={product.id}
              title={product.name}
              subtitle={`${formatRupees(product.pricePaise)} ${perUnit(product.unit)}`}
              trailing={<Icon icon={Plus} color="primary" />}
              onPress={() => addProduct(product)}
            />
          ))}
          <ListRow
            title={results.length ? 'Not here? Add a new item' : `No item called "${query.trim()}"`}
            subtitle={results.length ? undefined : 'Add it once, then it scans and searches'}
            leading={<Icon icon={PackagePlus} color="primary" />}
            onPress={() => {
              router.push({ pathname: '/shop/quick-add', params: { name: query.trim() } });
              setQuery('');
            }}
          />
        </ListGroup>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickKeysScroll}
          contentContainerStyle={styles.quickKeys}
        >
          {quickKeys.map((product) => (
            <Chip key={product.id} label={product.name} onPress={() => add(product)} />
          ))}
        </ScrollView>
      )}

      <SectionHeader
        title={
          lines.length ? `Cart · ${lines.length} ${lines.length === 1 ? 'item' : 'items'}` : 'Cart'
        }
        trailing={
          lines.length ? (
            <Pressable accessibilityRole="button" onPress={clear} hitSlop={12}>
              <Text variant="label" tone="primary">
                Clear
              </Text>
            </Pressable>
          ) : null
        }
      />

      {lines.length ? (
        <ListGroup>
          {lines.map((line) => (
            <View
              key={line.productId}
              style={[styles.line, line.productId === lastAddedId && styles.lineNew]}
            >
              <View style={styles.lineText}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {line.name}
                </Text>
                <Text variant="bodySecondary" tone="muted">
                  {formatRupees(line.unitPricePaise)} {perUnit(line.unit)}
                </Text>
              </View>
              <QtyStepper
                value={formatQty(line.qty, line.unit)}
                itemLabel={line.name}
                onIncrement={() => increment(line.productId)}
                onDecrement={() => decrement(line.productId)}
              />
              <Money
                paise={lineTotalPaise(line)}
                variant="bodyStrong"
                align="right"
                style={styles.lineTotal}
              />
            </View>
          ))}
        </ListGroup>
      ) : (
        <Tile>
          <View style={styles.empty}>
            <Icon icon={ScanBarcode} size={24} color="iconInactive" />
            <Text variant="bodySecondary" tone="muted" align="center">
              Scan a barcode, search, or tap a quick key to start a bill.
            </Text>
          </View>
        </Tile>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  quickKeysScroll: {
    marginHorizontal: -theme.space.screen,
    flexGrow: 0,
  },
  quickKeys: {
    paddingHorizontal: theme.space.screen,
    gap: theme.space.xs,
  },
  line: {
    minHeight: theme.sizes.listRow,
    paddingHorizontal: theme.space.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  lineNew: { backgroundColor: theme.colors.primaryContainer },
  lineText: { flex: 1, gap: 2 },
  lineTotal: { minWidth: 72 },
  empty: {
    alignItems: 'center',
    gap: theme.space.xs,
    paddingVertical: theme.space.md,
  },
  payBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  totalBlock: { minWidth: 110 },
}));
