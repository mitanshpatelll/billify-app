import { BookOpen } from 'lucide-react-native';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { BalanceText } from '@/features/khata/BalanceText';
import { ago } from '@/lib/dates';
import {
  Button,
  EmptyState,
  ErrorBanner,
  LargeTitle,
  ListGroup,
  ListRow,
  Money,
  Screen,
  Text,
  Tile,
} from '@/ui';

import { useMyKhata } from './api';

/** 25 My khata: what I owe at each shop. No pay button: the shop records payments (15). */
export function MyKhataScreen() {
  const khata = useMyKhata();
  const rows = khata.data?.khata ?? [];
  const due = rows
    .filter((row) => row.balancePaise > 0)
    .reduce((sum, row) => sum + row.balancePaise, 0);

  return (
    <Screen kind="tab">
      <LargeTitle title="My khata" subtitle="Updates after the shop’s phone syncs" />
      {khata.isPending ? (
        <Tile>
          <Text tone="muted">Loading…</Text>
        </Tile>
      ) : khata.isError && rows.length === 0 ? (
        <>
          <ErrorBanner title="Can’t load your khata" message="Check your internet connection." />
          <Button label="Try again" variant="secondary" onPress={() => void khata.refetch()} />
        </>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No khata with any shop"
          message="Save a bill from a shop where you buy on khata, and the balance shows up here."
        />
      ) : (
        <>
          <Tile variant={due > 0 ? 'khata' : 'selected'}>
            <Text variant="label" tone={due > 0 ? 'khata' : 'primary'}>
              {due > 0 ? 'You owe in total' : 'Nothing due'}
            </Text>
            <Money paise={due} variant="amount" tone={due > 0 ? 'khata' : 'primary'} />
          </Tile>
          <ListGroup>
            {rows.map((row) => (
              <ListRow
                key={`${row.shopName}-${row.customerName}`}
                title={row.shopName}
                subtitle={
                  row.lastEntryAt ? `Last change ${ago(row.lastEntryAt)}` : `As ${row.customerName}`
                }
                trailing={
                  <View>
                    <BalanceText balancePaise={row.balancePaise} />
                  </View>
                }
              />
            ))}
          </ListGroup>
          <Text variant="caption" tone="muted" align="center" style={styles.note}>
            Pay at the shop, in cash or UPI. The shop takes it off your khata.
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  note: { paddingHorizontal: theme.space.md },
}));
