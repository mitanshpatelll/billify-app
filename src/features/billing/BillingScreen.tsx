import * as Haptics from 'expo-haptics';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { ChevronRight, PackagePlus, Plus, ScanBarcode, Search } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, View, type TextInput } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { env } from '@/config/env';
import { animateNextLayout } from '@/lib/motion';
import {
  findProductByBarcode,
  useProductSearch,
  useQuickKeys,
  type Product,
} from '@/features/catalog/catalog';
import { useShop } from '@/features/shop/shop';
import { useSyncBadge } from '@/features/sync/sync';
import { formatRupees } from '@/lib/money';
import { formatQty, isLoose, perUnit } from '@/lib/units';
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
  SwipeToRemove,
  Text,
  TextField,
  Tile,
} from '@/ui';

import { useNextBillNumber } from './bills';
import { cartTotalPaise, lineTotalPaise, useCart } from './cart-store';
import { BarcodeScanner } from './components/BarcodeScanner';
import { isStorableBarcode } from './scan-gate';

/** 01 Billing: scan / search / quick keys → cart → checkout. Never waits for the network. */
export function BillingScreen() {
  const shop = useShop();
  const billNumber = useNextBillNumber(shop?.billPrefix ?? 'A');
  const quickKeys = useQuickKeys();
  const { lines, lastAddedId, add, increment, decrement, remove, clear } = useCart();
  const [query, setQuery] = useState('');
  const results = useProductSearch(query);
  const sync = useSyncBadge();
  const focused = useIsFocused();
  // Scans only count while billing is on screen (not under quick add or checkout).
  const focusedRef = useRef(focused);
  useEffect(() => {
    focusedRef.current = focused;
  }, [focused]);
  const params = useLocalSearchParams<{ scan?: string }>();
  const searchRef = useRef<TextInput>(null);

  // Leaving billing (quick add, checkout, another tab) drops the search focus. Otherwise iOS hands
  // the focus back on return and the keyboard covers the tab bar and the pay bar.
  useEffect(() => {
    if (!focused) searchRef.current?.blur();
  }, [focused]);

  const total = cartTotalPaise(lines);

  // Loose items ask how much (a weight preset, a typed kg, or "₹20 worth"); packets go in as 1.
  function addProduct(product: Product) {
    setQuery('');
    if (isLoose(product.unit)) {
      router.push({ pathname: '/shop/qty', params: { product: product.id } });
      return;
    }
    animateNextLayout();
    add(product);
  }

  // A known barcode goes straight into the cart (haptic + slide-in); an unknown one opens
  // quick add with the barcode filled in, so the catalog builds itself while billing.
  const handleScan = useCallback(
    (code: string) => {
      if (!focusedRef.current) return;
      if (!isStorableBarcode(code)) return; // e.g. a QR code with a link: not a product
      const product = findProductByBarcode(code);
      if (product) {
        animateNextLayout();
        add(product);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        AccessibilityInfo.announceForAccessibility(`${product.name} added`);
      } else {
        focusedRef.current = false; // until billing is back on screen: one sheet per scan
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        AccessibilityInfo.announceForAccessibility('New barcode. Add the item.');
        router.push({ pathname: '/shop/quick-add', params: { barcode: code } });
      }
    },
    [add],
  );

  // Development builds: billify://shop/bill?scan=<code> counts as a scan. Simulators have no
  // camera, and the Maestro flows scan this way.
  useEffect(() => {
    if (!env.devSignIn || !params.scan) return;
    router.setParams({ scan: undefined });
    handleScan(params.scan);
  }, [params.scan, handleScan]);

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
        <StatusPill label={sync.label} tone={sync.tone} onPress={() => router.push('/shop/sync')} />
      </View>

      <BarcodeScanner onScan={handleScan} active={focused} />

      <TextField
        ref={searchRef}
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
            <SwipeToRemove
              key={line.productId}
              label={line.name}
              onRemove={() => {
                animateNextLayout();
                remove(line.productId);
              }}
            >
              <View style={[styles.line, line.productId === lastAddedId && styles.lineNew]}>
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
                  onPressValue={() =>
                    router.push({ pathname: '/shop/qty', params: { edit: line.productId } })
                  }
                />
                <Money
                  paise={lineTotalPaise(line)}
                  variant="bodyStrong"
                  align="right"
                  style={styles.lineTotal}
                />
              </View>
            </SwipeToRemove>
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
