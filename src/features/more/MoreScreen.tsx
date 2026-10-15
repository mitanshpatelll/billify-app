import { router } from 'expo-router';
import { LogOut, RefreshCw } from 'lucide-react-native';
import { Alert } from 'react-native';

import { signOut, unsyncedChanges } from '@/features/auth/sign-out';
import { useSession } from '@/features/auth/session-store';
import { useShop } from '@/features/shop/shop';
import { useSyncBadge } from '@/features/sync/sync';
import { Icon, LargeTitle, ListGroup, ListRow, Screen } from '@/ui';

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

/** 16 More: shop details and sign out for now; Today, Bills and Sync come with their slices. */
export function MoreScreen() {
  const shop = useShop();
  const user = useSession((state) => state.user);
  const sync = useSyncBadge();

  return (
    <Screen kind="tab">
      <LargeTitle title="More" />
      {shop ? (
        <ListGroup>
          <ListRow title={shop.name} subtitle={`UPI: ${shop.upiId}`} />
        </ListGroup>
      ) : null}
      <ListGroup>
        <ListRow
          title="Sync"
          subtitle={sync.label}
          leading={<Icon icon={RefreshCw} />}
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
