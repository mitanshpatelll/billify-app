import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Icon } from './Icon';
import { Text } from './Text';

type ChipProps = {
  label: string;
  selected?: boolean;
  icon?: LucideIcon;
  onPress?: () => void;
};

/** Chips and quick keys: 34 tall, radius 8. Selected = dark stone with white text. */
export function Chip({ label, selected = false, icon, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={{ top: 5, bottom: 5 }}
      style={({ pressed }) => [styles.base, selected && styles.selected, pressed && styles.pressed]}
    >
      {icon ? <Icon icon={icon} size={16} color={selected ? 'surface' : 'onSurface'} /> : null}
      <Text variant="chip" style={selected ? styles.selectedText : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

type BadgeTone = 'paid' | 'due' | 'neutral' | 'error';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: LucideIcon;
  dot?: boolean;
};

const BADGE_TEXT = { paid: 'primary', due: 'khata', neutral: 'muted', error: 'error' } as const;
const BADGE_ICON = {
  paid: 'primary',
  due: 'secondary',
  neutral: 'onSurfaceVariant',
  error: 'error',
} as const;

/** Small status chip, 26 tall: "Paid" neem, "Due" haldi, errors red. Always words, not colour alone. */
export function Badge({ label, tone = 'neutral', icon, dot = false }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[tone]]}>
      {dot ? <View style={[styles.dot, styles[`${tone}Dot`]]} /> : null}
      {icon ? <Icon icon={icon} size={14} color={BADGE_ICON[tone]} /> : null}
      <Text variant="label" tone={BADGE_TEXT[tone]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  base: {
    height: theme.sizes.chip,
    paddingHorizontal: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selected: { backgroundColor: theme.colors.onSurface },
  selectedText: { color: theme.colors.surface },
  pressed: { opacity: 0.75 },
  badge: {
    height: theme.sizes.statusChip,
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  paid: { backgroundColor: theme.colors.primaryContainer },
  due: { backgroundColor: theme.colors.secondaryChip },
  neutral: { backgroundColor: theme.colors.surfaceVariant },
  error: { backgroundColor: theme.colors.errorContainer },
  dot: { width: 8, height: 8, borderRadius: 4 },
  paidDot: { backgroundColor: theme.colors.primary },
  dueDot: { backgroundColor: theme.colors.secondary },
  neutralDot: { backgroundColor: theme.colors.iconInactive },
  errorDot: { backgroundColor: theme.colors.error },
}));
