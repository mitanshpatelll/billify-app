import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from './Text';

export function initials(name: string): string {
  const parts = name
    .replace(/[^\p{L}\s]/gu, '')
    .trim()
    .split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Initials in a soft-square, radius 10. `settled` turns it neem. */
export function Avatar({ name, settled = false }: { name: string; settled?: boolean }) {
  return (
    // Decoration only: the name next to it is what a screen reader should say.
    <View
      style={[styles.avatar, settled && styles.settled]}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text variant="bodyStrong" tone={settled ? 'primary' : 'muted'}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  avatar: {
    width: theme.sizes.avatar,
    height: theme.sizes.avatar,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settled: { backgroundColor: theme.colors.primaryContainer },
}));
