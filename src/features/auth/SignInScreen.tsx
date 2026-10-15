import { Mail } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isApiError } from '@/api/client';
import { env } from '@/config/env';
import { fetchMyShop } from '@/features/shop/shop-api';
import { prepareShopForOwner } from '@/features/shop/shop';
import {
  Button,
  ErrorBanner,
  LogoMark,
  Screen,
  SectionHeader,
  StackHeader,
  Text,
  TextField,
} from '@/ui';

import { signInForDevelopment, signInWithGoogle, type SignedIn } from './auth-api';
import { getGoogleIdToken, googleSignInAvailable } from './google';
import { GoogleMark } from './GoogleMark';
import { useSession } from './session-store';

/** What went wrong, in the shopkeeper's words. */
function signInMessage(error: unknown): string {
  if (isApiError(error, 'NETWORK_ERROR') || isApiError(error, 'TIMEOUT')) {
    return 'No internet connection. Sign-in needs the internet once; after that, billing works offline.';
  }
  if (isApiError(error)) return `The server said no (${error.code}). Try again in a minute.`;
  return error instanceof Error ? error.message : 'Something went wrong. Try again.';
}

/** 08 Sign in: Google (Apple joins before the first iOS release). */
export function SignInScreen() {
  const role = useSession((state) => state.role);
  const signIn = useSession((state) => state.signIn);
  const [busy, setBusy] = useState<'google' | 'dev' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devEmail, setDevEmail] = useState('owner@billify.test');

  // Signing in flips the route guards in the root layout, which move on by themselves:
  // a shop owner to setup (or billing if the shop exists), a customer to My bills.
  async function run(kind: 'google' | 'dev', getSession: () => Promise<SignedIn | null>) {
    if (busy) return;
    setBusy(kind);
    setError(null);
    try {
      const session = await getSession();
      if (!session) return;
      if (role !== 'customer') {
        // Before any shop screen shows: whatever is on this phone must be this owner's shop.
        // (A session that ended with a 401 leaves the last owner's data here.)
        prepareShopForOwner(await fetchMyShop(session.token));
      }
      signIn(session);
    } catch (err) {
      setError(signInMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const continueWithGoogle = () =>
    run('google', async () => {
      const idToken = await getGoogleIdToken();
      return idToken ? signInWithGoogle(idToken) : null; // null: the user backed out
    });

  const devSignIn = () => {
    if (devEmail.trim()) void run('dev', () => signInForDevelopment(devEmail.trim()));
  };

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
        loading={busy === 'google'}
        disabled={!googleSignInAvailable || (busy !== null && busy !== 'google')}
        onPress={continueWithGoogle}
      />
      {!googleSignInAvailable ? (
        <Text variant="caption" tone="muted" align="center">
          Google sign-in isn’t set up in this build yet.
        </Text>
      ) : null}

      {env.devSignIn ? (
        <View style={styles.dev}>
          <SectionHeader title="Development build: sign in by email" />
          <TextField
            label="Email (API started with DEV_SIGN_IN=true)"
            icon={Mail}
            value={devEmail}
            onChangeText={setDevEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="go"
            onSubmitEditing={devSignIn}
          />
          <Button
            label="Sign in without Google"
            variant="secondary"
            loading={busy === 'dev'}
            disabled={!devEmail.trim() || (busy !== null && busy !== 'dev')}
            onPress={devSignIn}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  heading: {
    gap: theme.space.sm,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.md,
  },
  dev: { gap: theme.space.sm, paddingTop: theme.space.lg },
}));
