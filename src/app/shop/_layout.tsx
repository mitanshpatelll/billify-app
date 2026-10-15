import { Stack } from 'expo-router';

import { useShop } from '@/features/shop/shop';
import { colors, radius } from '@/theme/tokens';

const sheet = {
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetCornerRadius: radius.lg,
  contentStyle: { backgroundColor: colors.background },
} as const;

// Shop side: setup until it's done, then the tabs and the billing flow.
export default function ShopLayout() {
  const setupDone = useShop()?.setupDone ?? false;

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Protected guard={!setupDone}>
        <Stack.Screen name="setup/index" />
        <Stack.Screen name="setup/camera" />
      </Stack.Protected>
      <Stack.Protected guard={setupDone}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="checkout" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="bill-saved"
          options={{ presentation: 'modal', gestureEnabled: false }}
        />
        <Stack.Screen name="bill-qr" options={{ ...sheet, sheetAllowedDetents: [0.75] }} />
        <Stack.Screen name="customer-picker" options={{ ...sheet, sheetAllowedDetents: [0.75] }} />
        <Stack.Screen name="quick-add" options={{ ...sheet, sheetAllowedDetents: [0.92] }} />
      </Stack.Protected>
    </Stack>
  );
}
