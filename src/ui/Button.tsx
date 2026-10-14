import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { colors } from '@/theme/tokens';

import { Icon } from './Icon';
import { Text } from './Text';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: 'primary' | 'secondary';
  icon?: LucideIcon;
  /** Custom leading mark, e.g. a brand logo. */
  leading?: ReactNode;
  trailingIcon?: LucideIcon;
  loading?: boolean;
};

/** 52 tall, radius 10. Primary = neem fill (one per screen); secondary = white. */
export function Button({
  label,
  variant = 'primary',
  icon,
  leading,
  trailingIcon,
  loading = false,
  disabled,
  ...rest
}: ButtonProps) {
  const primary = variant === 'primary';
  const inactive = disabled || loading;
  const contentColor = primary ? 'onPrimary' : 'onSurface';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        pressed && (primary ? styles.primaryPressed : styles.secondaryPressed),
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[contentColor]} />
      ) : (
        <View style={styles.content}>
          {leading}
          {icon ? <Icon icon={icon} color={contentColor} /> : null}
          <Text variant="bodyStrong" tone={primary ? 'onPrimary' : 'default'} numberOfLines={1}>
            {label}
          </Text>
          {trailingIcon ? <Icon icon={trailingIcon} color={contentColor} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  base: {
    height: theme.sizes.button,
    borderRadius: theme.radius.md,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: theme.colors.primary },
  primaryPressed: { backgroundColor: theme.colors.primaryPressed },
  secondary: { backgroundColor: theme.colors.surface },
  secondaryPressed: { backgroundColor: theme.colors.surfacePressed },
  disabled: { opacity: 0.45 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
  },
}));
