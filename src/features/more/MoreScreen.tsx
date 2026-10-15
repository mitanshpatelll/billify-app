import { LogOut } from 'lucide-react-native';

import { useSession } from '@/features/auth/session-store';
import { useShop } from '@/features/shop/shop';
import { Icon, LargeTitle, ListGroup, ListRow, Screen } from '@/ui';

/** 16 More: shop details and sign out for now; Today, Bills and Sync come in the next UI pass. */
export function MoreScreen() {
  const shop = useShop();
  const signOut = useSession((state) => state.signOut);

  return (
    <Screen kind="tab">
      <LargeTitle title="More" />
      {shop ? (
        <ListGroup>
          <ListRow title={shop.name} subtitle={`UPI: ${shop.upiId}`} />
        </ListGroup>
      ) : null}
      <ListGroup>
        {/* Sync slice: block sign-out while the outbox still has rows, or those bills are lost. */}
        <ListRow title="Sign out" leading={<Icon icon={LogOut} />} onPress={signOut} />
      </ListGroup>
    </Screen>
  );
}
