import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

// A bill opened straight from a link (after Save to Billify) still has the tabs behind it.
export const unstable_settings = { initialRouteName: '(tabs)' };

// Customer side (M2): tabs, then a bill and a query thread. Online only (TanStack Query);
// also served on the web.
export default function CustomerLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="bills/[id]" />
      <Stack.Screen name="queries/[id]" />
    </Stack>
  );
}
