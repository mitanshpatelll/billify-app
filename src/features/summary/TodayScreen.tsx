import { router } from 'expo-router';
import { ChevronRight, PackageMinus, ReceiptText, Wallet } from 'lucide-react-native';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useTodaySummary } from '@/features/billing/history';
import { useKhataSummary } from '@/features/khata/khata';
import { formatRupees } from '@/lib/money';
import { paymentName } from '@/lib/payments';
import { formatQty } from '@/lib/units';
import {
  EmptyState,
  Icon,
  LargeTitle,
  ListGroup,
  ListRow,
  Money,
  Screen,
  SectionHeader,
  StackHeader,
  Text,
  Tile,
  TileRow,
} from '@/ui';

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** 05 Today (User Flows §5): close the day from the phone, offline and instant. */
export function TodayScreen() {
  const today = useTodaySummary();
  const khata = useKhataSummary();
  const average = today.bills ? Math.round(today.salesPaise / today.bills) : 0;
  const share = (paise: number) =>
    today.salesPaise ? `${Math.round((paise / today.salesPaise) * 100)}%` : '0%';

  return (
    <Screen header={<StackHeader />}>
      <LargeTitle title="Today" subtitle={dateFormat.format(new Date(today.dayStart))} />

      <Tile>
        <Text variant="label" tone="muted">
          Sales
        </Text>
        <Money paise={today.salesPaise} variant="amount" />
        <Text variant="bodySecondary" tone="muted">
          {today.bills} {today.bills === 1 ? 'bill' : 'bills'}
          {today.bills ? ` · average ${formatRupees(average)}` : ''}
          {today.cancelled ? ` · ${today.cancelled} cancelled` : ''}
        </Text>
      </Tile>

      {today.bills === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No bills today"
          message="Today’s sales, payments and top items show up here as you bill."
        />
      ) : (
        <>
          <SectionHeader title="How customers paid" />
          <ListGroup>
            {today.methods.map((method) => (
              <ListRow
                key={method.method}
                title={paymentName(method.method)}
                subtitle={`${method.bills} ${method.bills === 1 ? 'bill' : 'bills'} · ${share(method.paise)}`}
                trailing={
                  <Money
                    paise={method.paise}
                    variant="bodyStrong"
                    tone={method.method === 'khata' ? 'khata' : 'default'}
                  />
                }
              />
            ))}
          </ListGroup>

          <Tile variant="selected">
            <View style={styles.drawer}>
              <Icon icon={Wallet} color="primary" />
              <View style={styles.flex}>
                <Text variant="bodyStrong" tone="primary">
                  Cash in the drawer from today: {formatRupees(today.expectedCashPaise)}
                </Text>
                <Text variant="bodySecondary" tone="primary">
                  Cash bills {formatRupees(today.methods[0]?.paise ?? 0)}
                  {today.khataCollected.cash
                    ? ` + khata paid in cash ${formatRupees(today.khataCollected.cash)}`
                    : ''}
                  . If the drawer doesn’t match, check today’s bills.
                </Text>
              </View>
            </View>
          </Tile>
        </>
      )}

      <TileRow>
        <Tile
          variant="khata"
          style={styles.flex}
          onPress={() => router.navigate('/shop/khata')}
          accessibilityLabel={`To collect on khata ${formatRupees(khata.toCollectPaise)}`}
        >
          <Text variant="label" tone="khata">
            To collect
          </Text>
          <Money
            paise={khata.toCollectPaise}
            variant="numberTileSmall"
            tone="khata"
            showPaise={false}
          />
          <Text variant="caption" tone="khata">
            {khata.dueCustomers} {khata.dueCustomers === 1 ? 'customer' : 'customers'}
          </Text>
        </Tile>
        <Tile
          style={styles.flex}
          onPress={() => router.push('/shop/stock/low')}
          accessibilityLabel={`${today.wentLow.length} low items sold today`}
        >
          <Text variant="label" tone="muted">
            Low and sold today
          </Text>
          <Text variant="numberTileSmall">{today.wentLow.length}</Text>
          <Text variant="caption" tone="muted">
            {today.wentLow.length ? 'Open the reorder list' : 'Nothing ran low'}
          </Text>
        </Tile>
      </TileRow>

      {today.topItems.length ? (
        <>
          <SectionHeader title="Top items today" />
          <ListGroup>
            {today.topItems.map((item, index) => (
              <ListRow
                key={`${item.name}-${item.unit}`}
                title={`${index + 1}. ${item.name}`}
                subtitle={formatQty(item.qty, item.unit) + (item.unit === 'pcs' ? ' sold' : '')}
                trailing={<Money paise={item.paise} variant="bodyStrong" />}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      {today.wentLow.length ? (
        <ListGroup>
          {today.wentLow.slice(0, 3).map((item) => (
            <ListRow
              key={item.id}
              title={item.name}
              subtitle={`${formatQty(item.inStock, item.unit)} left`}
              leading={<Icon icon={PackageMinus} color="onSurfaceVariant" />}
              onPress={() =>
                router.push({ pathname: '/shop/products/[id]', params: { id: item.id } })
              }
            />
          ))}
        </ListGroup>
      ) : null}

      <ListGroup>
        <ListRow
          title="Open today’s bills"
          leading={<Icon icon={ReceiptText} />}
          trailing={<Icon icon={ChevronRight} color="iconInactive" />}
          onPress={() => router.push({ pathname: '/shop/bills', params: { range: 'today' } })}
        />
      </ListGroup>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  drawer: { flexDirection: 'row', gap: theme.space.sm, alignItems: 'flex-start' },
}));
