import { router, useFocusEffect } from 'expo-router';
import { CircleHelp } from 'lucide-react-native';
import { useCallback, useState } from 'react';

import { QUERY_TYPE_LABEL, useShopQueries } from '@/features/customer-bills/api';
import { ago } from '@/lib/dates';
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  LargeTitle,
  ListGroup,
  ListRow,
  Screen,
  SegmentedControl,
  StackHeader,
  Text,
  Tile,
} from '@/ui';

type Tab = 'open' | 'resolved';

/** 20 Bill queries: what customers asked about their bills. Online, refetched on focus. */
export function ShopQueriesScreen() {
  const [tab, setTab] = useState<Tab>('open');
  const queries = useShopQueries('all');
  const { refetch } = queries;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const all = queries.data?.queries ?? [];
  const open = all.filter((query) => query.status === 'open');
  const rows = tab === 'open' ? open : all.filter((query) => query.status === 'resolved');

  return (
    <Screen header={<StackHeader />}>
      <LargeTitle title="Bill queries" subtitle="Questions customers raised on their bills" />
      <SegmentedControl
        options={[
          { value: 'open', label: `Open (${open.length})` },
          { value: 'resolved', label: `Resolved (${all.length - open.length})` },
        ]}
        value={tab}
        onChange={setTab}
        accessibilityLabel="Show queries"
      />

      {queries.isPending ? (
        <Tile>
          <Text tone="muted">Loading queries…</Text>
        </Tile>
      ) : queries.isError && all.length === 0 ? (
        <>
          <ErrorBanner title="Can’t load queries" message="Check your internet connection." />
          <Button label="Try again" variant="secondary" onPress={() => void queries.refetch()} />
        </>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CircleHelp}
          title={tab === 'open' ? 'No open queries' : 'Nothing resolved yet'}
          message="A customer who saved a bill can ask about it within 24 hours. Their questions show up here."
        />
      ) : (
        <ListGroup>
          {rows.map((query) => (
            <ListRow
              key={query.id}
              title={`${query.billNumber} · ${query.customerName ?? 'Walk-in customer'}`}
              subtitle={[QUERY_TYPE_LABEL[query.type], ago(query.createdAt), query.lastMessage]
                .filter(Boolean)
                .join(' · ')}
              trailing={
                query.unread ? (
                  <Badge label="New" dot />
                ) : (
                  <Badge
                    label={query.status === 'open' ? 'Open' : 'Resolved'}
                    tone={query.status === 'open' ? 'neutral' : 'paid'}
                  />
                )
              }
              onPress={() =>
                router.push({ pathname: '/shop/queries/[id]', params: { id: query.id } })
              }
            />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}
