import { StyleSheet, Text, View } from 'react-native';

import { env } from '@/config/env';
import { colors } from '@/theme/colors';

// Placeholder until slice 1 (auth + onboarding) adds the real redirect.
export default function Index() {
  return (
    <View style={styles.screen}>
      <View style={styles.tile}>
        <Text style={styles.label}>Billify</Text>
        <Text style={styles.title}>Hello, counter</Text>
        <Text style={styles.meta}>Variant: {env.variant}</Text>
        <Text style={styles.meta}>API: {env.apiUrl}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  tile: {
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  meta: {
    fontSize: 15,
    color: colors.onSurfaceVariant,
  },
});
