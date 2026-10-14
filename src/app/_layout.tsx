import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useSession } from '@/features/auth/session-store';
import { colors } from '@/theme/tokens';

// Keep the native splash up until Manrope is ready (slice 1 adds SQLite migrations + session).
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
  const signedIn = useSession((state) => state.signedIn);
  const role = useSession((state) => state.role);
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  // Route guards: when sign-in state changes, screens that are no longer allowed drop out
  // of the history and the router falls back to index, which picks the right place.
  return (
    <>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Screen name="index" />
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)/welcome" />
          <Stack.Screen name="(auth)/sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && role === 'shop'}>
          <Stack.Screen name="shop" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && role === 'customer'}>
          <Stack.Screen name="me" />
        </Stack.Protected>
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
