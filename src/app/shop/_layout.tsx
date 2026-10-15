import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { useShop } from '@/features/shop/shop';
import { useShopDataReady } from '@/features/sync/sync';
import { startSync } from '@/sync/scheduler';
import { colors, radius } from '@/theme/tokens';

const sheet = {
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetCornerRadius: radius.lg,
  contentStyle: { backgroundColor: colors.background },
} as const;

// Shop side: setup until it's done, then (on a new phone) the shop's data comes down, then the
// tabs and the billing flow. Sync runs in the background while the tabs are open.
export default function ShopLayout() {
  const setupDone = useShop()?.setupDone ?? false;
  const dataReady = useShopDataReady();
  const open = setupDone && dataReady;

  useEffect(() => {
    if (open) return startSync();
  }, [open]);

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Protected guard={!setupDone}>
        <Stack.Screen name="setup/index" />
        <Stack.Screen name="setup/camera" />
      </Stack.Protected>
      <Stack.Protected guard={setupDone && !dataReady}>
        <Stack.Screen name="restore" />
      </Stack.Protected>
      <Stack.Protected guard={open}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="checkout" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="bill-saved"
          options={{ presentation: 'modal', gestureEnabled: false }}
        />
        <Stack.Screen name="sync" />
        <Stack.Screen name="stock/in" />
        <Stack.Screen name="stock/low" />
        <Stack.Screen name="products/[id]" />
        <Stack.Screen name="customers/[id]" />
        <Stack.Screen name="summary" />
        <Stack.Screen name="bills/index" />
        <Stack.Screen name="bills/[id]" />
        <Stack.Screen name="edit-shop" />
        <Stack.Screen name="queries/index" />
        <Stack.Screen name="queries/[id]" />
        <Stack.Screen name="bill-qr" options={{ ...sheet, sheetAllowedDetents: [0.75] }} />
        <Stack.Screen name="customer-picker" options={{ ...sheet, sheetAllowedDetents: [0.75] }} />
        <Stack.Screen name="quick-add" options={{ ...sheet, sheetAllowedDetents: [0.92] }} />
        <Stack.Screen name="qty" options={{ ...sheet, sheetAllowedDetents: [0.75] }} />
      </Stack.Protected>
    </Stack>
  );
}
