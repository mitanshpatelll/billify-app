import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { CircleCheck, CircleHelp, ReceiptText, Send } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isApiError } from '@/api/client';
import {
  QUERY_TYPE_LABEL,
  resolveQuery,
  sendQueryMessage,
  useQueryThread,
} from '@/features/customer-bills/api';
import { BillItemsTile } from '@/features/public-bill/BillItemsTile';
import { confirmAction } from '@/lib/confirm';
import {
  Badge,
  Button,
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
} from '@/ui';

const timeFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});

function sendError(err: unknown): string {
  if (isApiError(err, 'QUERY_RESOLVED')) return 'This query is resolved already.';
  if (isApiError(err, 'NETWORK_ERROR') || isApiError(err, 'TIMEOUT')) {
    return 'No internet connection. Try again.';
  }
  return 'Couldn’t send. Try again in a minute.';
}

/**
 * A bill query thread (User Flows §8), for both sides: the shop from 20, the customer from 23.
 * Online only; refetched on focus and every 30 s while open. Only the shop resolves.
 */
export function QueryThreadScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const thread = useQueryThread(id);
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opening the thread marks it read on the server: the lists' unread marks follow on leaving.
  const { refetch } = thread;
  useFocusEffect(
    useCallback(() => {
      void refetch();
      return () => {
        void queryClient.invalidateQueries({ queryKey: ['me'] });
        void queryClient.invalidateQueries({ queryKey: ['queries'] });
      };
    }, [refetch, queryClient]),
  );

  if (!thread.data) {
    return (
      <Screen header={<StackHeader title="Bill query" />}>
        {thread.isPending ? (
          <Tile>
            <Text tone="muted">Loading the query…</Text>
          </Tile>
        ) : isApiError(thread.error, 'QUERY_NOT_FOUND') ? (
          <EmptyState
            icon={CircleHelp}
            title="This query isn’t here"
            message="It may have been removed with the bill."
          />
        ) : (
          <>
            <ErrorBanner title="Can’t load the query" message="Check your internet connection." />
            <Button label="Try again" variant="secondary" onPress={() => void thread.refetch()} />
          </>
        )}
      </Screen>
    );
  }

  const { query, role, bill, messages, shopName, customerName } = thread.data;
  const resolved = query.status === 'resolved';
  const otherName = role === 'shop' ? (customerName ?? 'Walk-in customer') : shopName;

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await sendQueryMessage(id, reply.trim());
      setReply('');
      await thread.refetch();
    } catch (err) {
      setError(sendError(err));
      void thread.refetch();
    } finally {
      setBusy(false);
    }
  }

  function confirmResolve() {
    confirmAction({
      title: 'Mark as resolved?',
      message: `${otherName} is told it's resolved and can't reply any more. Settle anything left at the counter.`,
      confirmLabel: 'Resolve',
      destructive: false,
      onConfirm: () => {
        setError(null);
        resolveQuery(id)
          .then(() => thread.refetch())
          .catch((err: unknown) => setError(sendError(err)));
      },
    });
  }

  return (
    <Screen
      header={
        <StackHeader
          title="Bill query"
          right={
            <Badge label={resolved ? 'Resolved' : 'Open'} tone={resolved ? 'paid' : 'neutral'} />
          }
        />
      }
      footer={
        resolved ? undefined : (
          <View style={styles.reply}>
            {error ? (
              <ErrorBanner title="Not sent" message={error} onDismiss={() => setError(null)} />
            ) : null}
            <TextField
              value={reply}
              onChangeText={setReply}
              placeholder={`Reply to ${otherName}`}
              accessibilityLabel="Reply"
              multiline
              maxLength={1000}
            />
            <Button
              label="Send"
              icon={Send}
              loading={busy}
              disabled={!reply.trim()}
              onPress={() => void send()}
            />
            {role === 'shop' ? (
              <TextButton label="Mark as resolved" onPress={confirmResolve} />
            ) : null}
          </View>
        )
      }
    >
      <Tile>
        <View style={styles.head}>
          <Text variant="titleNav">
            Bill {bill.number} · {QUERY_TYPE_LABEL[query.type]}
          </Text>
          <Text variant="bodySecondary" tone="muted">
            {otherName} · bill of {timeFormat.format(new Date(bill.createdAt))}
          </Text>
        </View>
      </Tile>

      <BillItemsTile
        items={bill.items}
        totalPaise={bill.totalPaise}
        discountPaise={bill.discountPaise}
      />
      {role === 'shop' ? (
        <ListGroup>
          <ListRow
            title={`Open bill ${bill.number}`}
            leading={<Icon icon={ReceiptText} />}
            onPress={() => router.push({ pathname: '/shop/bills/[id]', params: { id: bill.id } })}
          />
        </ListGroup>
      ) : null}

      <SectionHeader title="Messages" />
      <View style={styles.messages}>
        {messages.map((message) => {
          const mine = message.author === role;
          return (
            <View
              key={message.id}
              style={[styles.bubble, mine ? styles.mine : styles.theirs]}
              accessible
              accessibilityLabel={`${mine ? 'You' : otherName}: ${message.body}`}
            >
              <View style={styles.bubbleTop}>
                <Text variant="label" tone={mine ? 'primary' : 'default'}>
                  {mine ? 'You' : otherName}
                </Text>
                <Text variant="caption" tone="muted">
                  {timeFormat.format(new Date(message.createdAt))}
                </Text>
              </View>
              <Text variant="body">{message.body}</Text>
            </View>
          );
        })}
      </View>

      {resolved ? (
        <Tile variant="selected">
          <View style={styles.resolved}>
            <Icon icon={CircleCheck} color="primary" />
            <Text variant="bodyStrong" tone="primary" style={styles.flex}>
              Resolved
              {query.resolvedAt ? ` ${timeFormat.format(new Date(query.resolvedAt))}` : ''}.
              Anything left is settled at the shop or on khata.
            </Text>
          </View>
        </Tile>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  head: { gap: theme.space.xxs },
  messages: { gap: theme.space.sm },
  bubble: {
    borderRadius: theme.radius.lg,
    padding: theme.space.sm,
    gap: theme.space.xxs,
    maxWidth: '88%',
  },
  mine: { alignSelf: 'flex-end', backgroundColor: theme.colors.primaryContainer },
  theirs: { alignSelf: 'flex-start', backgroundColor: theme.colors.surface },
  bubbleTop: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.space.md },
  resolved: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  reply: { gap: theme.space.xs },
}));
