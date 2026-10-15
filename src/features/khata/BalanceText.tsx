import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { formatRupees } from '@/lib/money';
import { Text } from '@/ui';

// Shared by the shop's 04 Khata and the customer's 25 My khata (web too): no database imports.

/** "₹1,240.00 due" in haldi, "Settled" in neem, "₹50.00 advance" when paid ahead. */
export function BalanceText({ balancePaise }: { balancePaise: number }) {
  if (balancePaise > 0) {
    return (
      <View style={styles.balance}>
        <Text variant="bodyStrong" tone="khata" style={styles.tabular}>
          {formatRupees(balancePaise)}
        </Text>
        <Text variant="caption" tone="khata">
          due
        </Text>
      </View>
    );
  }
  if (balancePaise < 0) {
    return (
      <View style={styles.balance}>
        <Text variant="bodyStrong" tone="primary" style={styles.tabular}>
          {formatRupees(-balancePaise)}
        </Text>
        <Text variant="caption" tone="primary">
          advance
        </Text>
      </View>
    );
  }
  return (
    <Text variant="bodyStrong" tone="primary">
      Settled
    </Text>
  );
}

const styles = StyleSheet.create(() => ({
  balance: { alignItems: 'flex-end' },
  tabular: { fontVariant: ['tabular-nums'] },
}));
