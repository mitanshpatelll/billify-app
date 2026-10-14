import type { LucideIcon } from 'lucide-react-native';
import { Pressable, type PressableProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { ColorName } from '@/theme/tokens';

import { Icon } from './Icon';

type IconButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  icon: LucideIcon;
  /** Required: icon-only buttons need a spoken name. */
  accessibilityLabel: string;
  variant?: 'surface' | 'background' | 'camera';
  color?: ColorName;
};

/** 40 square, radius 10, with a 44 touch target. */
export function IconButton({ icon, variant = 'surface', color, ...rest }: IconButtonProps) {
  const iconColor = color ?? (variant === 'camera' ? 'onPrimary' : 'onSurface');
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={4}
      {...rest}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed]}
    >
      <Icon icon={icon} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  base: {
    width: theme.sizes.iconButton,
    height: theme.sizes.iconButton,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surface: { backgroundColor: theme.colors.surface },
  background: { backgroundColor: theme.colors.background },
  camera: { backgroundColor: 'rgba(255, 255, 255, 0.14)' },
  pressed: { opacity: 0.7 },
}));
