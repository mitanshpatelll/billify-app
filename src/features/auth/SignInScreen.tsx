import { useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, ErrorBanner, LogoMark, Screen, StackHeader, Text } from '@/ui';

import { GoogleMark } from './GoogleMark';
import { useSession } from './session-store';

/** 08 Sign in: Google only (Apple joins on iOS with the auth slice). */
export function SignInScreen() {
  const role = useSession((state) => state.role);
  const signIn = useSession((state) => state.signIn);
  const [error, setError] = useState<string | null>(null);

  function continueWithGoogle() {
    setError(null);
    // UI pass: no network yet. Slice 1 calls Better Auth (POST /api/auth/sign-in/social),
    // shows "Couldn't sign in" on failure, then GET /v1/shops/me decides setup vs billing.
    // Signing in flips the route guards in the root layout, which moves on by itself.
    signIn();
  }

  return (
    <Screen
      header={<StackHeader />}
      footer={
        <Text variant="caption" tone="muted" align="center">
          By continuing, you agree to Billify’s Terms of Service and Privacy Policy.
        </Text>
      }
    >
      <View style={styles.heading}>
        <LogoMark size={48} />
        <Text variant="titleLarge" accessibilityRole="header">
          Sign in
        </Text>
        <Text variant="body" tone="muted">
          {role === 'customer'
            ? 'Use your Google account to keep your bills from every shop in one place.'
            : 'Use your Google account. No password to remember.'}
        </Text>
      </View>

      {error ? (
        <ErrorBanner title="Couldn't sign in" message={error} onDismiss={() => setError(null)} />
      ) : null}

      <Button
        label="Continue with Google"
        variant="secondary"
        leading={<GoogleMark />}
        onPress={continueWithGoogle}
      />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  heading: {
    gap: theme.space.sm,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.md,
  },
}));
