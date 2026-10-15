import { CloudDownload } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isApiError } from '@/api/client';
import { db } from '@/db/client';
import { useShop } from '@/features/shop/shop';
import { syncOnce } from '@/sync/engine';
import { syncGeneration } from '@/sync/scheduler';
import { apiTransport } from '@/sync/transport';
import { colors } from '@/theme/tokens';
import { Button, ErrorBanner, Icon, Screen, Text } from '@/ui';

import { markShopDataReady } from './sync';

/**
 * New phone or reinstall (User Flows §1): the shop's products, bills, stock and khata come down
 * before billing starts. Billing earlier could reuse bill numbers the server already has.
 */
export function RestoreScreen() {
  const shop = useShop();
  const [pulled, setPulled] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // One id per attempt: an older attempt (Try again, StrictMode's double effect) that finishes
  // late must not mark the shop ready or show its result.
  const attempt = useRef(0);

  const restore = useCallback(async () => {
    const mine = ++attempt.current;
    const generation = syncGeneration();
    const stale = () => mine !== attempt.current || generation !== syncGeneration();
    try {
      const result = await syncOnce(db, apiTransport, {
        onPulled: (total) => !stale() && setPulled(total),
        cancelled: stale,
      });
      if (stale()) return;
      // Only a complete pull counts: opening early could reuse the server's bill numbers.
      if (result.pulledAll) markShopDataReady();
      else setError('Not everything came down yet. Try again.');
    } catch (err) {
      if (stale()) return;
      setError(
        isApiError(err, 'NETWORK_ERROR') || isApiError(err, 'TIMEOUT')
          ? 'No internet connection. Getting your shop onto this phone needs the internet once.'
          : 'The server isn’t answering. Try again in a minute.',
      );
    }
  }, []);

  useEffect(() => {
    // Started from a timer so leaving the screen at once never starts it at all.
    const start = setTimeout(() => void restore(), 0);
    return () => {
      clearTimeout(start);
      attempt.current += 1; // leaving the screen: any attempt still running is stale
    };
  }, [restore]);

  return (
    <Screen
      footer={
        error ? (
          <Button
            label="Try again"
            onPress={() => {
              setError(null);
              void restore();
            }}
          />
        ) : undefined
      }
    >
      <View style={styles.center}>
        <View style={styles.icon}>
          <Icon icon={CloudDownload} size={32} color="primary" />
        </View>
        <Text variant="titleLarge" align="center" accessibilityRole="header">
          Getting {shop?.name ?? 'your shop'} ready
        </Text>
        <Text variant="body" tone="muted" align="center">
          Downloading your items, bills, stock and khata to this phone.
        </Text>
        {error ? null : (
          <View style={styles.progress} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.primary} />
            <Text variant="bodySecondary" tone="muted">
              {pulled > 0 ? `${pulled} records downloaded` : 'Starting…'}
            </Text>
          </View>
        )}
      </View>
      {error ? <ErrorBanner title="Download paused" message={error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  center: {
    alignItems: 'center',
    gap: theme.space.sm,
    paddingTop: theme.space.xxl * 2,
    paddingBottom: theme.space.xl,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space.xs,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    marginTop: theme.space.md,
  },
}));
