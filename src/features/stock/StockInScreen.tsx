import * as Haptics from 'expo-haptics';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { CircleCheck, PackagePlus, Plus, Search } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { env } from '@/config/env';
import { isRepoError } from '@/db/repos';
import { BarcodeScanner } from '@/features/billing/components/BarcodeScanner';
import { isStorableBarcode } from '@/features/billing/scan-gate';
import { findProductByBarcode, useProductSearch, type Product } from '@/features/catalog/catalog';
import { animateNextLayout } from '@/lib/motion';
import { firstQty, formatQty, qtyStep } from '@/lib/units';
import {
  Button,
  ErrorBanner,
  Icon,
  ListGroup,
  ListRow,
  QtyStepper,
  Screen,
  SectionHeader,
  StackHeader,
  Text,
  TextField,
} from '@/ui';

import { receiveStock } from './stock';

type Line = Pick<Product, 'id' | 'name' | 'unit'> & { qty: number };

/** 13 Stock in: scan or search what arrived, set the quantities, save once. */
export function StockInScreen() {
  const [lines, setLines] = useState<Line[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const results = useProductSearch(query);
  const focused = useIsFocused();
  const focusedRef = useRef(focused);
  useEffect(() => {
    focusedRef.current = focused;
  }, [focused]);
  const params = useLocalSearchParams<{ scan?: string }>();
  const saving = useRef(false);

  // Scanning the same item again adds one more pack; a new item gets its own line on top.
  const receive = useCallback((product: Pick<Product, 'id' | 'name' | 'unit'>) => {
    animateNextLayout();
    setLines((current) => {
      const existing = current.find((line) => line.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.id === product.id ? { ...line, qty: line.qty + qtyStep(line.unit) } : line,
        );
      }
      return [{ ...product, qty: firstQty(product.unit) }, ...current];
    });
  }, []);

  const handleScan = useCallback(
    (code: string) => {
      if (!focusedRef.current || !isStorableBarcode(code)) return;
      const product = findProductByBarcode(code);
      if (product) {
        receive(product);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        AccessibilityInfo.announceForAccessibility(`${product.name}, one more`);
      } else {
        // New item: quick add saves it with the stock counted there, nothing to add here.
        focusedRef.current = false;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.push({ pathname: '/shop/quick-add', params: { barcode: code, then: 'stock' } });
      }
    },
    [receive],
  );

  // Development builds: billify://shop/stock/in?scan=<code> counts as a scan (see billing).
  useEffect(() => {
    const code = params.scan;
    if (!env.devSignIn || !code) return;
    const scan = setTimeout(() => {
      router.setParams({ scan: undefined });
      handleScan(code);
    }, 0);
    return () => clearTimeout(scan);
  }, [params.scan, handleScan]);

  function change(id: string, direction: 1 | -1) {
    setLines((current) =>
      current
        .map((line) =>
          line.id === id ? { ...line, qty: line.qty + direction * qtyStep(line.unit) } : line,
        )
        .filter((line) => line.qty > 0),
    );
  }

  function save() {
    if (saving.current || lines.length === 0) return;
    saving.current = true;
    setError(null);
    try {
      receiveStock(lines.map((line) => ({ productId: line.id, qty: line.qty })));
      router.back();
    } catch (err) {
      saving.current = false;
      if (!isRepoError(err)) throw err;
      setError(err.message);
    }
  }

  return (
    <Screen
      header={<StackHeader title="Stock in" />}
      footer={
        <Button
          label={
            lines.length
              ? `Save ${lines.length} ${lines.length === 1 ? 'item' : 'items'}`
              : 'Scan or search what came in'
          }
          icon={CircleCheck}
          disabled={lines.length === 0}
          onPress={save}
        />
      }
    >
      <BarcodeScanner onScan={handleScan} active={focused} hint="Scan each item that came in" />

      <TextField
        icon={Search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search item by name"
        accessibilityLabel="Search items"
        autoCorrect={false}
      />
      {query.trim() ? (
        <ListGroup>
          {results.map((product) => (
            <ListRow
              key={product.id}
              title={product.name}
              trailing={<Icon icon={Plus} color="primary" />}
              onPress={() => {
                receive(product);
                setQuery('');
              }}
            />
          ))}
          <ListRow
            title={results.length ? 'Not here? Add a new item' : `No item called "${query.trim()}"`}
            leading={<Icon icon={PackagePlus} color="primary" />}
            onPress={() => {
              router.push({
                pathname: '/shop/quick-add',
                params: { name: query.trim(), then: 'stock' },
              });
              setQuery('');
            }}
          />
        </ListGroup>
      ) : null}

      {error ? (
        <ErrorBanner title="Stock not saved" message={error} onDismiss={() => setError(null)} />
      ) : null}

      <SectionHeader title={lines.length ? `Received · ${lines.length}` : 'Received'} />
      {lines.length ? (
        <ListGroup>
          {lines.map((line) => (
            <View key={line.id} style={styles.line}>
              <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                {line.name}
              </Text>
              <QtyStepper
                value={`+${formatQty(line.qty, line.unit)}`}
                itemLabel={line.name}
                onIncrement={() => change(line.id, 1)}
                onDecrement={() => change(line.id, -1)}
              />
            </View>
          ))}
        </ListGroup>
      ) : (
        <Text variant="bodySecondary" tone="muted" style={styles.hint}>
          Each scan adds one pack. Use + and − for the rest.
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  line: {
    minHeight: theme.sizes.listRow,
    paddingHorizontal: theme.space.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  hint: { paddingHorizontal: theme.space.xxs },
}));
