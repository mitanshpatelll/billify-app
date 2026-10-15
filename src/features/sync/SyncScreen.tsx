import { CircleAlert, CloudOff, RefreshCw, RotateCcw, Trash2 } from 'lucide-react-native';
import { Alert, Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useSyncStatus } from '@/sync/status-store';
import {
  Badge,
  Button,
  EmptyState,
  Icon,
  ListGroup,
  Screen,
  SectionHeader,
  StackHeader,
  Text,
  Tile,
} from '@/ui';

import { changeTitle, reasonText } from './reasons';
import {
  removeRejected,
  requestSync,
  retryRejected,
  useOutbox,
  useRejected,
  useSyncBadge,
} from './sync';

const timeFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

function confirmRemove(id: number, title: string) {
  Alert.alert(
    'Remove from sync?',
    `${title} stays on this phone but will never reach the server.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeRejected(id) },
    ],
  );
}

/** 19 Sync: what is waiting, when it last synced, and anything the server refused. */
export function SyncScreen() {
  const badge = useSyncBadge();
  const { pending, lastSyncedAt } = useOutbox();
  const { syncing, problem } = useSyncStatus();
  const rejected = useRejected();

  return (
    <Screen
      header={<StackHeader title="Sync" />}
      footer={
        <Button
          label={syncing ? 'Syncing…' : 'Sync now'}
          icon={RefreshCw}
          loading={syncing}
          onPress={() => requestSync({ force: true })}
        />
      }
    >
      <Tile>
        <View style={styles.status}>
          <Text variant="label" tone="muted">
            Status
          </Text>
          <Text variant="titleScreen">{badge.label}</Text>
          <Text variant="bodySecondary" tone="muted">
            {pending > 0
              ? `${pending} ${pending === 1 ? 'change' : 'changes'} waiting to reach the server.`
              : 'Everything on this phone is on the server.'}{' '}
            {lastSyncedAt
              ? `Last synced ${timeFormat.format(new Date(lastSyncedAt))}.`
              : 'Not synced yet.'}
          </Text>
        </View>
      </Tile>

      {problem === 'offline' ? (
        <View style={styles.note}>
          <Icon icon={CloudOff} size={16} color="onSurfaceVariant" />
          <Text variant="bodySecondary" tone="muted" style={styles.flex}>
            No internet. Billing works as usual; bills sync by themselves when you’re back online.
          </Text>
        </View>
      ) : problem === 'server' ? (
        <View style={styles.note}>
          <Icon icon={CloudOff} size={16} color="onSurfaceVariant" />
          <Text variant="bodySecondary" tone="muted" style={styles.flex}>
            The server isn’t answering right now. Billify keeps trying.
          </Text>
        </View>
      ) : null}

      <SectionHeader title="Refused by the server" />
      {rejected.length === 0 ? (
        <EmptyState
          icon={CircleAlert}
          title="Nothing refused"
          message="If the server ever refuses a change, it shows up here with the reason."
        />
      ) : (
        <ListGroup>
          {rejected.map((entry) => {
            const title = changeTitle(entry);
            return (
              <View key={entry.id} style={styles.issue}>
                <View style={styles.issueText}>
                  <Text variant="bodyStrong">{title}</Text>
                  <Text variant="bodySecondary" tone="muted">
                    {reasonText(entry)}
                  </Text>
                  <Badge label={entry.reason ?? 'Refused'} tone="error" />
                </View>
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Try ${title} again`}
                    onPress={() => {
                      retryRejected(entry.id);
                      requestSync({ force: true });
                    }}
                    hitSlop={8}
                    style={styles.action}
                  >
                    <Icon icon={RotateCcw} color="primary" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${title} from sync`}
                    onPress={() => confirmRemove(entry.id, title)}
                    hitSlop={8}
                    style={styles.action}
                  >
                    <Icon icon={Trash2} color="error" />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ListGroup>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  status: { gap: theme.space.xxs },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    paddingHorizontal: theme.space.xxs,
  },
  issue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    padding: theme.space.md,
  },
  issueText: { flex: 1, gap: theme.space.xxs },
  actions: { flexDirection: 'row', gap: theme.space.xs },
  action: {
    width: theme.sizes.touch,
    height: theme.sizes.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
