import { router, useIsFocused } from 'expo-router';
import { BadgeIndianRupee, BookOpen, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native-unistyles';

import { ago } from '@/lib/dates';
import { formatRupees } from '@/lib/money';
import {
  Avatar,
  EmptyState,
  Icon,
  LargeTitle,
  ListGroup,
  ListRow,
  Money,
  Screen,
  SectionHeader,
  SegmentedControl,
  Text,
  TextField,
  Tile,
  TileRow,
} from '@/ui';

import {
  useCustomerBalances,
  useKhataSummary,
  type CustomerBalance,
  type KhataFilter,
} from './khata';
import { BalanceText } from './BalanceText';
import { usePaymentClaims } from './payment-claims';

const FILTERS: { value: KhataFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'due', label: 'Due' },
  { value: 'settled', label: 'Settled' },
];

/** 04 Khata: what customers owe, most due first. A khata sale adds to it by itself (flow 2). */
export function KhataScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<KhataFilter>('all');
  const focused = useIsFocused(); // re-render on focus: "this week" moves on by itself on Monday
  const summary = useKhataSummary();
  // "I've paid" from khata pages (D27), online: refreshed whenever the tab comes back.
  const claims = usePaymentClaims();
  const { refetch: refetchClaims } = claims;
  useEffect(() => {
    if (focused) void refetchClaims();
  }, [focused, refetchClaims]);
  const rows = useCustomerBalances(query, filter);

  return (
    <Screen kind="tab">
      <LargeTitle
        title="Khata"
        subtitle={`${summary.customers} ${summary.customers === 1 ? 'customer' : 'customers'}`}
      />

      <Tile variant="khata">
        <Text variant="label" tone="khata">
          To collect
        </Text>
        <Money paise={summary.toCollectPaise} variant="amount" tone="khata" />
        <Text variant="bodySecondary" tone="khata">
          {summary.dueCustomers === 0
            ? 'No udhaar, good'
            : `from ${summary.dueCustomers} ${summary.dueCustomers === 1 ? 'customer' : 'customers'}`}
        </Text>
      </Tile>

      <TileRow>
        <Tile style={styles.flex}>
          <Text variant="label" tone="muted">
            Collected this week
          </Text>
          <Money paise={summary.collectedSincePaise} variant="numberTileSmall" showPaise={false} />
        </Tile>
        <Tile style={styles.flex}>
          <Text variant="label" tone="muted">
            Given on khata this week
          </Text>
          <Money paise={summary.givenSincePaise} variant="numberTileSmall" showPaise={false} />
        </Tile>
      </TileRow>

      {claims.data?.length ? (
        <>
          <SectionHeader title="Payments to confirm" />
          <ListGroup>
            {claims.data.map((claim) => (
              <ListRow
                key={claim.id}
                title={claim.customerName}
                subtitle={`Says they paid ${formatRupees(claim.amountPaise)} · ${ago(claim.createdAt)}`}
                leading={<Icon icon={BadgeIndianRupee} color="primary" />}
                onPress={() =>
                  router.push({
                    pathname: '/shop/customers/[id]',
                    params: { id: claim.customerId },
                  })
                }
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      <SegmentedControl
        options={FILTERS}
        value={filter}
        onChange={setFilter}
        accessibilityLabel="Show customers"
      />
      <TextField
        icon={Search}
        value={query}
        onChangeText={setQuery}
        placeholder="Name or phone"
        accessibilityLabel="Search customers"
        autoCorrect={false}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={
            summary.customers === 0
              ? 'No customers yet'
              : filter === 'due'
                ? 'No udhaar, good'
                : 'No one here'
          }
          message={
            summary.customers === 0
              ? 'Pick or add a customer at checkout. Bills put on khata show up here.'
              : 'Try another name, or switch to All.'
          }
        />
      ) : (
        <ListGroup>
          {rows.map((row) => (
            <ListRow
              key={row.id}
              title={row.name}
              subtitle={lastActivity(row)}
              leading={<Avatar name={row.name} />}
              trailing={
                row.entries === 0 ? (
                  <Text variant="bodySecondary" tone="muted">
                    No khata
                  </Text>
                ) : (
                  <BalanceText balancePaise={row.balancePaise} />
                )
              }
              onPress={() =>
                router.push({ pathname: '/shop/customers/[id]', params: { id: row.id } })
              }
            />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}

function lastActivity(row: CustomerBalance): string {
  const paid = row.lastPaidAt;
  const bill = row.lastBillAt;
  if (paid && (!bill || paid > bill)) return `Paid ${ago(paid)}`;
  if (bill) return `Last bill ${ago(bill)}`;
  return 'No bills yet';
}

const styles = StyleSheet.create(() => ({
  flex: { flex: 1 },
}));
