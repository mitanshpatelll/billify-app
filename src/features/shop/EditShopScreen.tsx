import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Hash, QrCode, Store, Wifi } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isApiError } from '@/api/client';
import { BILL_PREFIX_PATTERN, formatBillNumber } from '@/lib/bill-number';
import { UPI_ID_PATTERN } from '@/lib/upi';
import { Button, ErrorBanner, Icon, Screen, StackHeader, Text, TextField, Tile } from '@/ui';

import { storeShop, useShop } from './shop';
import { updateMyShop } from './shop-api';

function saveError(error: unknown): string {
  if (isApiError(error, 'NETWORK_ERROR') || isApiError(error, 'TIMEOUT')) {
    return 'No internet connection. Changing the shop needs the internet.';
  }
  if (isApiError(error, 'VALIDATION_FAILED')) return error.message;
  return 'Couldn’t save. Try again in a minute.';
}

/** 16 More → Edit shop: PATCH /v1/shops/me, then the phone's copy. Online only, like setup. */
export function EditShopScreen() {
  const shop = useShop();
  const [name, setName] = useState(shop?.name ?? '');
  const [upiId, setUpiId] = useState(shop?.upiId ?? '');
  const [prefix, setPrefix] = useState(shop?.billPrefix ?? 'A');
  const save = useMutation({
    mutationFn: updateMyShop,
    onSuccess: (server) => {
      storeShop(server, { setupDone: true });
      router.back();
    },
  });

  const nameOk = name.trim().length >= 2;
  const upiOk = UPI_ID_PATTERN.test(upiId.trim());
  const prefixOk = BILL_PREFIX_PATTERN.test(prefix);
  const prefixChanged = !!shop && prefix !== shop.billPrefix;

  return (
    <Screen
      header={<StackHeader title="Edit shop" />}
      footer={
        <Button
          label="Save"
          loading={save.isPending}
          disabled={!nameOk || !upiOk || !prefixOk}
          onPress={() =>
            save.mutate({
              name: name.trim(),
              upiId: upiId.trim().toLowerCase(),
              billPrefix: prefix,
            })
          }
        />
      }
    >
      {save.isError ? (
        <ErrorBanner
          title="Not saved"
          message={saveError(save.error)}
          onDismiss={() => save.reset()}
        />
      ) : null}
      <Tile>
        <View style={styles.form}>
          <TextField
            label="Shop name"
            icon={Store}
            inTile
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            error={!nameOk ? 'Enter the name customers know your shop by' : undefined}
          />
          <TextField
            label="UPI ID"
            icon={QrCode}
            inTile
            value={upiId}
            onChangeText={setUpiId}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            hint="Customers pay to this ID"
            error={!upiOk ? 'A UPI ID looks like name@bank' : undefined}
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
            hint={
              prefixChanged && prefixOk
                ? `New bills continue from the last ${prefix}- bill (${formatBillNumber(prefix, 1)} if there's none). Old bills keep their numbers.`
                : 'Letters before each bill number'
            }
            error={!prefixOk ? 'Use 1 to 3 letters' : undefined}
          />
        </View>
      </Tile>
      <View style={styles.note}>
        <Icon icon={Wifi} size={16} color="onSurfaceVariant" />
        <Text variant="bodySecondary" tone="muted" style={styles.flex}>
          Saving needs the internet. Billing works offline as before.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  form: { gap: theme.space.md },
  note: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  flex: { flex: 1 },
}));
