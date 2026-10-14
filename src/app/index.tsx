import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/session-store';
import { useShop } from '@/features/shop/shop-store';

// Shop owner → billing (or setup first), customer → my bills, otherwise → welcome.
export default function Index() {
  const signedIn = useSession((state) => state.signedIn);
  const role = useSession((state) => state.role);
  const setupDone = useShop((state) => state.setupDone);

  if (!signedIn) return <Redirect href="/welcome" />;
  if (role === 'customer') return <Redirect href="/me/bills" />;
  return <Redirect href={setupDone ? '/shop/bill' : '/shop/setup'} />;
}
