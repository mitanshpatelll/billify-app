import { router, useLocalSearchParams } from 'expo-router';
import { ReceiptText, Search } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { formatRupees } from '@/lib/money';
import { paymentName, type PaymentMethod } from '@/lib/payments';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  ListGroup,
  ListRow,
  Money,
  Screen,
  StackHeader,
  Text,
  TextField,
  Tile,
} from '@/ui';

import { useBillList, type BillListRow, type BillRangeName } from './history';

const RANGES: { value: BillRangeName; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This week' },
  { value: 'all', label: 'All' },
];

const METHOD_ORDER: PaymentMethod[] = ['cash', 'upi', 'khata'];

const timeFormat = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });
const dayTimeFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

/** 17 Bills: today, yesterday, this week or all; search by bill number or customer. */
export function BillsScreen() {
  const params = useLocalSearchParams<{ range?: BillRangeName }>();
  const [range, setRange] = useState<BillRangeName>(params.range ?? 'today');
  const [query, setQuery] = useState('');
  const { rows, bills: count, totalPaise: total } = useBillList(range, query);

  return (
    <Screen header={<StackHeader title="Bills" />}>
      <Tile>
        <Text variant="label" tone="muted">
          {RANGES.find((r) => r.value === range)?.label} · {count} {count === 1 ? 'bill' : 'bills'}
        </Text>
        <Money paise={total} variant="numberTile" />
        {count ? (
          <Text variant="bodySecondary" tone="muted">
            Average {formatRupees(Math.round(total / count))} a bill
          </Text>
        ) : null}
      </Tile>

      <TextField
        icon={Search}
        value={query}
        onChangeText={setQuery}
        placeholder="Bill number or customer"
        accessibilityLabel="Search bills"
        autoCorrect={false}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
      >
        {RANGES.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={range === option.value}
            onPress={() => setRange(option.value)}
          />
        ))}
      </ScrollView>

      {rows.length === 0 ? (
        <>
          <EmptyState
            icon={ReceiptText}
            title={query.trim() ? `No bill matches “${query.trim()}”` : 'No bills yet'}
            message={
              query.trim()
                ? 'Try a bill number like A-104, or a name.'
                : 'Bills you make show up here.'
            }
          />
          {!query.trim() ? (
            <Button
              label="Go to billing"
              variant="secondary"
              onPress={() => router.dismissTo('/shop/bill')}
            />
          ) : null}
        </>
      ) : (
        <ListGroup>
          {rows.map((row) => (
            <BillRow key={row.id} row={row} withDay={range === 'week' || range === 'all'} />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}

function BillRow({ row, withDay }: { row: BillListRow; withDay: boolean }) {
  const when = (withDay ? dayTimeFormat : timeFormat).format(new Date(row.createdAt));
  const methods = (row.methods.split('+').filter(Boolean) as PaymentMethod[]).sort(
    (a, b) => METHOD_ORDER.indexOf(a) - METHOD_ORDER.indexOf(b),
  );
  const khata = methods.includes('khata');
  const cancelled = !!row.voidedAt;
  return (
    <ListRow
      title={`${row.number} · ${when}`}
      subtitle={`${row.customerName ?? 'Walk-in'} · ${methods.map(paymentName).join(' + ') || '—'}`}
      onPress={() => router.push({ pathname: '/shop/bills/[id]', params: { id: row.id } })}
      trailing={
        <View style={styles.amount}>
          <Text
            variant="bodyStrong"
            tone={cancelled ? 'muted' : khata ? 'khata' : 'default'}
            style={[styles.tabular, cancelled && styles.struck]}
          >
            {formatRupees(row.totalPaise)}
          </Text>
          {cancelled ? (
            <Badge label="Cancelled" tone="error" />
          ) : khata ? (
            <Badge label="On khata" tone="due" />
          ) : (
            <Badge label="Paid" tone="paid" />
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  chipsScroll: { marginHorizontal: -theme.space.screen, flexGrow: 0 },
  chips: { paddingHorizontal: theme.space.screen, gap: theme.space.xs },
  amount: { alignItems: 'flex-end', gap: theme.space.xxs },
  tabular: { fontVariant: ['tabular-nums'] },
  struck: { textDecorationLine: 'line-through' },
}));
