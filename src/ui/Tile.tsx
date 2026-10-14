import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export type TileVariant = 'surface' | 'strong' | 'khata' | 'selected';

type TileProps = {
  children: ReactNode;
  variant?: TileVariant;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Bento tile: radius 12, padding 16, no border, no shadow.
 * strong = neem fill (one per screen) · khata = haldi container · selected = neem container.
 */
export function Tile({
  children,
  variant = 'surface',
  onPress,
  accessibilityLabel,
  style,
}: TileProps) {
  if (!onPress) {
    return <View style={[styles.base, styles[variant], style]}>{children}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

/** Two-column bento row with the 12 gap; children share the width. */
export function TileRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create((theme) => ({
  base: {
    borderRadius: theme.radius.lg,
    padding: theme.space.tile,
  },
  surface: { backgroundColor: theme.colors.surface },
  strong: { backgroundColor: theme.colors.primary },
  khata: { backgroundColor: theme.colors.secondaryContainer },
  selected: { backgroundColor: theme.colors.primaryContainer },
  pressed: { opacity: 0.85 },
  row: {
    flexDirection: 'row',
    gap: theme.space.gap,
  },
}));
