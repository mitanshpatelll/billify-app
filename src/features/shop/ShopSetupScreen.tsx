import { router } from 'expo-router';
import { Hash, QrCode, Store, Wifi } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { BILL_PREFIX_PATTERN, formatBillNumber } from '@/lib/bill-number';
import { UPI_ID_PATTERN } from '@/lib/upi';
import { Badge, Button, Icon, LargeTitle, Screen, StackHeader, Text, TextField, Tile } from '@/ui';

import { saveShopDetails, useShop } from './shop';

/** 09 Shop setup: shop name, UPI id, bill prefix. The only step that needs the internet. */
export function ShopSetupScreen() {
  const saved = useShop();
  const [name, setName] = useState(saved?.name ?? '');
  const [upiId, setUpiId] = useState(saved?.upiId ?? '');
  const [prefix, setPrefix] = useState(saved?.billPrefix ?? 'A');
  const [touched, setTouched] = useState(false);

  const nameOk = name.trim().length >= 2;
  const upiOk = UPI_ID_PATTERN.test(upiId.trim());
  const prefixOk = BILL_PREFIX_PATTERN.test(prefix);
  const valid = nameOk && upiOk && prefixOk;
  const sampleNumber = formatBillNumber(prefixOk ? prefix : 'A', 1);

  function next() {
    setTouched(true);
    if (!valid) return;
    // Auth slice: POST /v1/shops (201, or 409 SHOP_EXISTS → load it), then the first sync pull.
    saveShopDetails({ name: name.trim(), upiId: upiId.trim().toLowerCase(), billPrefix: prefix });
    router.push('/shop/setup/camera');
  }

  return (
    <Screen
      header={<StackHeader right={<Badge label="Step 1 of 2" />} />}
      footer={<Button label="Continue" onPress={next} />}
    >
      <LargeTitle title="Set up your shop" subtitle="This goes on every bill you share." />

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
}));
