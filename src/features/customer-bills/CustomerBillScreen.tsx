import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ChevronRight,
  CircleCheck,
  CircleHelp,
  Clock,
  MessageCircle,
  Phone,
  ReceiptText,
  Send,
  Store,
} from 'lucide-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isApiError } from '@/api/client';
import { BillItemsTile } from '@/features/public-bill/BillItemsTile';
import { whatsAppLink } from '@/features/sharing/links';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  ErrorBanner,
  Icon,
  ListGroup,
  ListRow,
  Screen,
  SectionHeader,
  StackHeader,
  Text,
  TextButton,
  TextField,
  Tile,
  TileRow,
} from '@/ui';

import { type MyBill, QUERY_TYPE_LABEL, type QueryType, raiseQuery, useMyBill } from './api';

const timeFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});

const HOUR_MS = 60 * 60 * 1000;

function statusBadge(status: MyBill['bill']['status']) {
  if (status === 'void') return <Badge label="Cancelled" tone="error" />;
  if (status === 'khata') return <Badge label="On khata" tone="due" />;
  return <Badge label="Paid" tone="paid" icon={CircleCheck} />;
}

/** 23 Customer bill detail: the bill, the shop, and a bill query within 24 hours (24). */
export function CustomerBillScreen() {
  const { id = '', saved } = useLocalSearchParams<{ id: string; saved?: 'customer' | 'bill' }>();
  const query = useMyBill(id);

  if (!query.data) {
    return (
      <Screen header={<StackHeader title="Bill" />}>
        {query.isPending ? (
          <Tile>
            <Text tone="muted">Loading the bill…</Text>
          </Tile>
        ) : isApiError(query.error, 'BILL_NOT_FOUND') ? (
          <EmptyState
            icon={ReceiptText}
            title="This bill isn’t in your account"
            message="The shop may have unlinked it."
          />
        ) : (
          <>
            <ErrorBanner title="Can’t load this bill" message="Check your internet connection." />
            <Button label="Try again" variant="secondary" onPress={() => void query.refetch()} />
          </>
        )}
      </Screen>
    );
  }

  const { shop, bill } = query.data;
  return (
    <Screen header={<StackHeader title={`Bill ${bill.number}`} />}>
      {saved ? (
        <Tile variant="selected">
          <View style={styles.row}>
            <Icon icon={CircleCheck} color="primary" />
            <Text variant="bodyStrong" tone="primary" style={styles.flex}>
              {saved === 'customer'
                ? `Saved. Your bills and khata from ${shop.name} are in My bills now.`
                : 'Saved to My bills.'}
            </Text>
          </View>
        </Tile>
      ) : null}

      <Tile>
        <View style={styles.head}>
          <View style={styles.row}>
            <Text variant="titleLarge" accessibilityRole="header">
              {bill.number}
            </Text>
            {statusBadge(bill.status)}
          </View>
          <Text variant="bodySecondary" tone="muted">
            {shop.name} · {timeFormat.format(new Date(bill.createdAt))}
          </Text>
        </View>
      </Tile>

      {bill.status === 'void' ? (
        <ErrorBanner
          title="This bill was cancelled"
          message="The shop cancelled it. Nothing on it is due."
        />
      ) : null}

      <BillItemsTile
        items={bill.items}
        totalPaise={bill.totalPaise}
        discountPaise={bill.discountPaise}
        payments={bill.payments}
        voided={bill.status === 'void'}
      />

      <ShopTile name={shop.name} phone={shop.phone} billNumber={bill.number} />

      <QuerySection data={query.data} />
    </Screen>
  );
}

function ShopTile({
  name,
  phone,
  billNumber,
}: {
  name: string;
  phone: string | null;
  billNumber: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const open = (url: string, app: string) =>
    Linking.openURL(url).catch(() => setError(`Couldn’t open ${app} on this device.`));

  return (
    <>
      <Tile>
        <View style={styles.row}>
          <View style={styles.shopIcon}>
            <Icon icon={Store} color="primary" />
          </View>
          <Text variant="titleNav" style={styles.flex}>
            {name}
          </Text>
        </View>
      </Tile>
      {phone ? (
        <TileRow>
          <Tile
            style={styles.flex}
            onPress={() => void open(`tel:+91${phone}`, 'the phone app')}
            accessibilityLabel={`Call shop, ${name}`}
          >
            <View style={styles.row}>
              <Icon icon={Phone} />
              <Text variant="titleNav">Call shop</Text>
            </View>
          </Tile>
          <Tile
            style={styles.flex}
            onPress={() =>
              void open(whatsAppLink(`Hi ${name}, about bill ${billNumber}: `, phone), 'WhatsApp')
            }
            accessibilityLabel={`WhatsApp ${name}`}
          >
            <View style={styles.row}>
              <Icon icon={MessageCircle} />
              <Text variant="titleNav">WhatsApp</Text>
            </View>
          </Tile>
        </TileRow>
      ) : null}
      {error ? (
        <ErrorBanner title="Not opened" message={error} onDismiss={() => setError(null)} />
      ) : null}
    </>
  );
}

const TYPES = Object.keys(QUERY_TYPE_LABEL) as QueryType[];

/**
 * User Flows §8: a query on this bill within 24 hours of when the server got it (the server
 * decides; this only shows what it said). One per bill; after that it's the thread.
 */
function QuerySection({ data }: { data: MyBill }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<QueryType>('missing');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openedAt] = useState(Date.now); // the server has the last word when it's sent

  if (data.query) {
    const resolved = data.query.status === 'resolved';
    return (
      <ListGroup>
        <ListRow
          title={`Your query · ${QUERY_TYPE_LABEL[data.query.type]}`}
          subtitle={
            data.query.unread
              ? `New reply from ${data.shop.name}`
              : resolved
                ? 'Resolved by the shop'
                : 'Waiting for the shop'
          }
          leading={<Icon icon={CircleHelp} color={data.query.unread ? 'primary' : undefined} />}
          trailing={
            <View style={styles.row}>
              <Badge
                label={data.query.unread ? 'New' : resolved ? 'Resolved' : 'Open'}
                tone={resolved && !data.query.unread ? 'paid' : 'neutral'}
                dot={data.query.unread}
              />
              <Icon icon={ChevronRight} color="iconInactive" />
            </View>
          }
          onPress={() =>
            router.push({ pathname: '/me/queries/[id]', params: { id: data.query!.id } })
          }
        />
      </ListGroup>
    );
  }

  if (data.bill.status === 'void') return null;

  const msLeft = new Date(data.queryWindowEndsAt).getTime() - openedAt;
  if (msLeft <= 0) {
    return (
      <Tile>
        <View style={styles.stack}>
          <View>
            <Text variant="titleNav">Something wrong with this bill?</Text>
            <Text variant="bodySecondary" tone="muted">
              Queries can be raised within 24 hours of the bill. Talk to {data.shop.name} at the
              shop.
            </Text>
          </View>
          <Button label="Raise a query" icon={CircleHelp} disabled onPress={() => undefined} />
        </View>
      </Tile>
    );
  }

  const hours = Math.floor(msLeft / HOUR_MS);
  const left = hours >= 1 ? `${hours} more ${hours === 1 ? 'hour' : 'hours'}` : 'less than an hour';

  async function send() {
    setSending(true);
    setError(null);
    try {
      const { id } = await raiseQuery(data.bill.id, type, note.trim());
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push({ pathname: '/me/queries/[id]', params: { id } });
    } catch (err) {
      setError(
        isApiError(err, 'BILL_QUERY_WINDOW_CLOSED')
          ? 'The 24 hours for queries on this bill are over. Talk to the shop.'
          : isApiError(err, 'QUERY_EXISTS')
            ? 'You already raised a query on this bill.'
            : isApiError(err, 'NETWORK_ERROR') || isApiError(err, 'TIMEOUT')
              ? 'No internet connection. Try again.'
              : 'Couldn’t send the query. Try again in a minute.',
      );
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <Tile>
        <View style={styles.stack}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text variant="titleNav">Something wrong with this bill?</Text>
              <Text variant="bodySecondary" tone="muted">
                You can raise a query for {left}
              </Text>
            </View>
            <Icon icon={Clock} color="onSurfaceVariant" />
          </View>
          <Button label="Raise a query" icon={CircleHelp} onPress={() => setOpen(true)} />
        </View>
      </Tile>
    );
  }

  return (
    <>
      <SectionHeader title="What’s wrong?" />
      <View style={styles.chips}>
        {TYPES.map((value) => (
          <Chip
            key={value}
            label={QUERY_TYPE_LABEL[value]}
            selected={type === value}
            onPress={() => setType(value)}
          />
        ))}
      </View>
      <Tile>
        <TextField
          label="Note for the shop"
          inTile
          value={note}
          onChangeText={setNote}
          placeholder="Charged for Toor Dal but it wasn’t in my bag"
          multiline
          maxLength={1000}
        />
      </Tile>
      {error ? <ErrorBanner title="Not sent" message={error} /> : null}
      <Button
        label="Send query"
        icon={Send}
        loading={sending}
        disabled={!note.trim()}
        onPress={() => void send()}
      />
      <TextButton label="Cancel" onPress={() => setOpen(false)} />
      <Text variant="caption" tone="muted" align="center">
        The shop sees this bill and your note. Money is settled at the shop or on khata.
      </Text>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  head: { gap: theme.space.xxs },
  shopIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: { gap: theme.space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.xs },
}));
