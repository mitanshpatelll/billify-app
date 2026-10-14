import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { StyleSheet } from 'react-native-unistyles';

import { billUrl } from '@/features/sharing/links';
import { colors } from '@/theme/tokens';
import { Money, Text } from '@/ui';

import { useBills } from './bills-store';

/** Bill QR, shown to the customer at the counter. Opens the public bill page (21). */
export function BillQrSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bill = useBills((state) => state.bills.find((saved) => saved.id === id));

  if (!bill) return null;
  const url = billUrl(bill.publicToken);

  return (
    <View style={styles.sheet}>
      <Text variant="titleScreen" align="center">
        Bill {bill.number}
      </Text>
      <Money paise={bill.totalPaise} variant="total" align="center" />
      <View style={styles.qr}>
        <QRCode value={url} size={220} color={colors.onSurface} backgroundColor={colors.surface} />
      </View>
      <Text variant="bodySecondary" tone="muted" align="center">
        Ask the customer to scan this with their phone camera to open the bill.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  sheet: {
    flex: 1,
    alignItems: 'center',
    gap: theme.space.sm,
    padding: theme.space.xl,
    backgroundColor: theme.colors.background,
  },
  qr: {
    padding: theme.space.md,
    marginVertical: theme.space.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
  },
}));
