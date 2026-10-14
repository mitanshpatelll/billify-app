import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

// Customer side (M2). Only the empty "My bills" screen exists in this UI pass.
export default function CustomerLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}
