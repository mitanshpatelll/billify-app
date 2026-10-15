import { router } from 'expo-router';
import { Archive, PackageMinus, PackageX, Plus, Search } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { formatRupees } from '@/lib/money';
import { formatQty, perUnit } from '@/lib/units';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  Icon,
  LargeTitle,
  ListGroup,
  ListRow,
  Money,
  Screen,
  Text,
  TextField,
  Tile,
  TileRow,
} from '@/ui';

import { useStockLevels, useStockSummary, type StockFilter, type StockLevel } from './stock';

/** 12 Stock: stock per item from the ledger, low / out at a glance, stock in at the bottom. */
export function StockScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const summary = useStockSummary();
  const rows = useStockLevels(query, filter);

  const filters: { value: StockFilter; label: string }[] = [
    { value: 'all', label: `All (${summary.items})` },
    { value: 'low', label: `Low (${summary.low})` },
    { value: 'out', label: `Out (${summary.out})` },
  ];

  return (
    <Screen
      kind="tab"
      footer={<Button label="Stock in" icon={Plus} onPress={() => router.push('/shop/stock/in')} />}
    >
      <LargeTitle
        title="Stock"
        subtitle={`${summary.items} ${summary.items === 1 ? 'item' : 'items'}`}
      />

      <TileRow>
        <Tile
          style={styles.flex}
          onPress={() => router.push('/shop/stock/low')}
          accessibilityLabel={`${summary.low} items low on stock. Open the reorder list`}
        >
          <Icon icon={PackageMinus} color="onSurfaceVariant" />
          <Text variant="numberTile" style={styles.tileNumber}>
            {summary.low}
          </Text>
          <Text variant="label" tone="muted">
            Low stock
          </Text>
        </Tile>
        <Tile style={styles.flex}>
          <Icon icon={PackageX} color="onSurfaceVariant" />
          <Text variant="numberTile" style={styles.tileNumber}>
            {summary.out}
          </Text>
          <Text variant="label" tone="muted">
            Out of stock
          </Text>
        </Tile>
      </TileRow>

      <Tile>
        <Text variant="label" tone="muted">
          Stock value at selling price
        </Text>
        <Money paise={summary.valuePaise} variant="numberTileSmall" showPaise={false} />
      </Tile>

      <TextField
        icon={Search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search items or scan code"
        accessibilityLabel="Search stock"
        autoCorrect={false}
        returnKeyType="search"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
      >
        {filters.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={filter === option.value}
            onPress={() => setFilter(option.value)}
          />
        ))}
      </ScrollView>

      {rows.length === 0 ? (
        <EmptyState
          icon={Archive}
          title={
            summary.items === 0
              ? 'No items yet'
              : filter === 'all'
                ? `Nothing called “${query.trim()}”`
                : filter === 'low'
                  ? 'Nothing is low'
                  : 'Nothing is out of stock'
          }
          message={
            summary.items === 0
              ? 'Items appear here as you bill or stock in. Tap Stock in and scan what came in.'
              : 'Try another name, or switch back to All.'
          }
        />
      ) : (
        <ListGroup>
          {rows.map((row) => (
            <ListRow
              key={row.id}
              title={row.name}
              subtitle={`${formatRupees(row.pricePaise)} ${perUnit(row.unit)}`}
              trailing={<StockAmount row={row} />}
              onPress={() =>
                router.push({ pathname: '/shop/products/[id]', params: { id: row.id } })
              }
            />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}

/** "24", "3 left" (low), "Out", "-2" in red (sold more than was stocked: fix the count). */
function StockAmount({ row }: { row: StockLevel }) {
  if (!row.trackStock) {
    return (
      <Text variant="bodySecondary" tone="muted">
        Not tracked
      </Text>
    );
  }
  if (row.inStock < 0) {
    return (
      <Text variant="bodyStrong" tone="error" style={styles.qty}>
        {formatQty(row.inStock, row.unit)}
      </Text>
    );
  }
  if (row.out) return <Badge label="Out" tone="error" />;
  if (row.low) return <Badge label={`${formatQty(row.inStock, row.unit)} left`} dot />;
  return (
    <Text variant="bodyStrong" style={styles.qty}>
      {formatQty(row.inStock, row.unit)}
    </Text>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  tileNumber: { marginTop: theme.space.xs },
  chipsScroll: {
    marginHorizontal: -theme.space.screen,
    flexGrow: 0,
  },
  chips: {
    paddingHorizontal: theme.space.screen,
    gap: theme.space.xs,
  },
  qty: { fontVariant: ['tabular-nums'] },
}));
