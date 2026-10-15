import { Redirect } from 'expo-router';
import { Smartphone } from 'lucide-react-native';
import { Platform } from 'react-native';

import { selectSignedIn, useSession } from '@/features/auth/session-store';
import { useShop } from '@/features/shop/shop';
import { useShopDataReady } from '@/features/sync/sync';
import { EmptyState, Screen } from '@/ui';

// Shop owner → billing (or setup first), customer → my bills, otherwise → welcome.
export default function Index() {
  const signedIn = useSession(selectSignedIn);
  const role = useSession((state) => state.role);

  if (!signedIn) return <Redirect href="/welcome" />;
  if (role === 'customer') return <Redirect href="/me/bills" />;
  // Shop routes don't exist on the web (D5), and neither does SQLite.
  if (Platform.OS === 'web') {
    return (
      <Screen>
        <EmptyState
          icon={Smartphone}
          title="Billify for shops runs on your phone"
          message="Install the Billify app to bill, track stock and keep khata."
        />
      </Screen>
    );
  }
  return <ShopRedirect />;
}

function ShopRedirect() {
  const setupDone = useShop()?.setupDone ?? false;
  const dataReady = useShopDataReady();
  if (!setupDone) return <Redirect href="/shop/setup" />;
  return <Redirect href={dataReady ? '/shop/bill' : '/shop/restore'} />;
}
