import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Hash, QrCode, Store, Wifi } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isApiError } from '@/api/client';
import { useSession } from '@/features/auth/session-store';
import { BILL_PREFIX_PATTERN, formatBillNumber } from '@/lib/bill-number';
import { UPI_ID_PATTERN } from '@/lib/upi';
import { colors } from '@/theme/tokens';
import {
  Badge,
  Button,
  ErrorBanner,
  Icon,
  LargeTitle,
  Screen,
  StackHeader,
  Text,
  TextField,
  Tile,
} from '@/ui';

import { storeShop, useShop } from './shop';
import { createMyShop, fetchMyShop } from './shop-api';

function setupError(error: unknown): string {
  if (isApiError(error, 'NETWORK_ERROR') || isApiError(error, 'TIMEOUT')) {
    return 'No internet connection. Setting up the shop needs the internet once.';
  }
  if (isApiError(error, 'VALIDATION_FAILED')) return error.message;
  return 'Couldn’t save the shop. Try again in a minute.';
}

/** 09 Shop setup: shop name, UPI id, bill prefix. The only step that needs the internet. */
export function ShopSetupScreen() {
  const userId = useSession((state) => state.user?.id);
  const saved = useShop();
  // A shop that already exists on the server (new phone, reinstall) skips setup entirely.
  const existing = useQuery({
    queryKey: ['shops', 'me', userId],
    queryFn: () => fetchMyShop(),
    retry: 1,
    staleTime: 0,
  });
  const create = useMutation({ mutationFn: createMyShop });

  const [name, setName] = useState(saved?.name ?? '');
  const [upiId, setUpiId] = useState(saved?.upiId ?? '');
  const [prefix, setPrefix] = useState(saved?.billPrefix ?? 'A');
  const [touched, setTouched] = useState(false);

  const nameOk = name.trim().length >= 2;
  const upiOk = UPI_ID_PATTERN.test(upiId.trim());
  const prefixOk = BILL_PREFIX_PATTERN.test(prefix);
  const valid = nameOk && upiOk && prefixOk;
  const sampleNumber = formatBillNumber(prefixOk ? prefix : 'A', 1);

  useEffect(() => {
    // Storing it with setup done flips the shop route guard: the tabs open by themselves.
    // The sync slice pulls the shop's products, bills and khata after this.
    if (existing.data) storeShop(existing.data, { setupDone: true });
  }, [existing.data]);

  function next() {
    setTouched(true);
    if (!valid || create.isPending) return;
    create.mutate(
      { name: name.trim(), upiId: upiId.trim().toLowerCase(), billPrefix: prefix },
      {
        onSuccess: (shop) => {
          storeShop(shop, { setupDone: false });
          router.push('/shop/setup/camera');
        },
      },
    );
  }

  if (existing.isPending || existing.data) {
    return (
      <Screen>
        <View style={styles.checking}>
          <ActivityIndicator color={colors.primary} />
          <Text variant="body" tone="muted">
            Checking for your shop…
          </Text>
        </View>
      </Screen>
    );
  }

  const offline = existing.isError ? setupError(existing.error) : null;

  return (
    <Screen
      header={<StackHeader action="none" right={<Badge label="Step 1 of 2" />} />}
      footer={<Button label="Continue" loading={create.isPending} onPress={next} />}
    >
      <LargeTitle title="Set up your shop" subtitle="This goes on every bill you share." />

      {create.isError ? (
        <ErrorBanner
          title="Shop not saved"
          message={setupError(create.error)}
          onDismiss={() => create.reset()}
        />
      ) : offline ? (
        <ErrorBanner title="Couldn't check for your shop" message={offline} />
      ) : null}

      <Tile>
        <View style={styles.form}>
          <TextField
            label="Shop name"
            icon={Store}
            inTile
            value={name}
            onChangeText={setName}
            placeholder="Sharma Kirana"
            autoCapitalize="words"
            returnKeyType="next"
            error={touched && !nameOk ? 'Enter the name customers know your shop by' : undefined}
          />
          <TextField
            label="UPI ID"
            icon={QrCode}
            inTile
            value={upiId}
            onChangeText={setUpiId}
            placeholder="sharmakirana@okaxis"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            hint="Customers pay to this ID"
            error={touched && !upiOk ? 'A UPI ID looks like name@bank' : undefined}
          />
          <TextField
            label="Bill prefix"
            icon={Hash}
            inTile
            value={prefix}
            onChangeText={(text) => setPrefix(text.toUpperCase().replace(/[^A-Z]/g, ''))}
            maxLength={3}
            autoCapitalize="characters"
            autoCorrect={false}
            hint={`Bills will look like ${sampleNumber}`}
            error={touched && !prefixOk ? 'Use 1 to 3 letters' : undefined}
          />
        </View>
      </Tile>

      <Tile>
        <View style={styles.preview}>
          <Text variant="label" tone="muted">
            Bill preview
          </Text>
          <View style={styles.previewCard}>
            <View style={styles.previewTop}>
              <Text variant="titleScreen" numberOfLines={1} style={styles.flex}>
                {name.trim() || 'Your shop'}
              </Text>
              <Badge label={`Bill ${sampleNumber}`} tone="paid" />
            </View>
            <View style={styles.divider} />
            <Text variant="bodySecondary" tone="muted" numberOfLines={1}>
              UPI: {upiId.trim() || 'name@bank'}
            </Text>
          </View>
        </View>
      </Tile>

      <View style={styles.note}>
        <Icon icon={Wifi} size={16} color="onSurfaceVariant" />
        <Text variant="bodySecondary" tone="muted" style={styles.flex}>
          This step needs the internet once. After it, billing works offline.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  form: { gap: theme.space.md },
  preview: { gap: theme.space.sm },
  previewCard: {
    gap: theme.space.sm,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
  },
  previewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  divider: { height: 1, backgroundColor: theme.colors.outline },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    paddingHorizontal: theme.space.xxs,
  },
  flex: { flex: 1 },
  checking: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    paddingVertical: theme.space.xxl,
  },
}));
