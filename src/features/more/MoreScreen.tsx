import { router } from 'expo-router';
import {
  ChartColumn,
  ChevronRight,
  LogOut,
  ReceiptText,
  RefreshCw,
  Store,
  type LucideIcon,
} from 'lucide-react-native';
import { Alert, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { signOut, unsyncedChanges } from '@/features/auth/sign-out';
import { useSession } from '@/features/auth/session-store';
import { useShop } from '@/features/shop/shop';
import { useSyncBadge } from '@/features/sync/sync';
import {
  Icon,
  LargeTitle,
  ListGroup,
  ListRow,
  Screen,
  StatusPill,
  Text,
  Tile,
  TileRow,
} from '@/ui';

function confirmSignOut() {
  const waiting = unsyncedChanges();
  // Signing out deletes the shop's copy on this phone. Anything the server doesn't have yet
  // (waiting, or refused and not retried) would be gone for good, so say so plainly.
  Alert.alert(
    'Sign out?',
    waiting > 0
      ? `${waiting} ${waiting === 1 ? 'change hasn’t' : 'changes haven’t'} reached the server yet. Signing out deletes ${waiting === 1 ? 'it' : 'them'} from this phone for good.`
      : 'Your shop stays on the server. Sign in again to get it back.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ],
  );
}

/** 16 More: the shop, today's numbers, bills, sync, sign out. */
export function MoreScreen() {
  const shop = useShop();
  const user = useSession((state) => state.user);
  const sync = useSyncBadge();

  return (
    <Screen kind="tab">
      <LargeTitle title="More" />

      {shop ? (
        <Tile
          onPress={() => router.push('/shop/edit-shop')}
          accessibilityLabel={`${shop.name}. Edit shop`}
        >
          <View style={styles.shop}>
            <View style={styles.shopIcon}>
              <Icon icon={Store} color="primary" />
            </View>
            <View style={styles.flex}>
              <Text variant="titleNav">{shop.name}</Text>
              <Text variant="bodySecondary" tone="muted">
                UPI: {shop.upiId} · Bills {shop.billPrefix}-…
              </Text>
            </View>
            <Text variant="label" tone="primary">
              Edit
            </Text>
          </View>
        </Tile>
      ) : null}

      <TileRow>
        <LinkTile
          icon={ChartColumn}
          title="Today"
          subtitle="Sales and payments"
          onPress={() => router.push('/shop/summary')}
        />
        <LinkTile
          icon={ReceiptText}
          title="Bills"
          subtitle="History and search"
          onPress={() => router.push('/shop/bills')}
        />
      </TileRow>

      <ListGroup>
        <ListRow
          title="Sync"
          subtitle="Bills reach the server by themselves"
          leading={<Icon icon={RefreshCw} />}
          trailing={<StatusPill label={sync.label} tone={sync.tone} />}
          onPress={() => router.push('/shop/sync')}
        />
      </ListGroup>

      <ListGroup>
        <ListRow
          title="Sign out"
          subtitle={user?.email}
          leading={<Icon icon={LogOut} />}
          onPress={confirmSignOut}
        />
      </ListGroup>
    </Screen>
  );
}

type LinkTileProps = { icon: LucideIcon; title: string; subtitle: string; onPress: () => void };

function LinkTile({ icon, title, subtitle, onPress }: LinkTileProps) {
  return (
    <Tile style={styles.flex} onPress={onPress} accessibilityLabel={`${title}, ${subtitle}`}>
      <View style={styles.linkTop}>
        <View style={styles.shopIcon}>
          <Icon icon={icon} />
        </View>
        <Icon icon={ChevronRight} color="iconInactive" />
      </View>
      <Text variant="titleNav">{title}</Text>
      <Text variant="bodySecondary" tone="muted">
        {subtitle}
      </Text>
    </Tile>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  shop: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  shopIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.space.sm,
  },
}));
