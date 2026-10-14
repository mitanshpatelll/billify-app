import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode, Ref } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { colors, typography } from '@/theme/tokens';

import { Icon } from './Icon';
import { Text } from './Text';

type TextFieldProps = TextInputProps & {
  ref?: Ref<TextInput>;
  label?: string;
  /** Right side of the label row, e.g. a sample badge. */
  labelAccessory?: ReactNode;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
  /** Inside a white tile the field is stone; on the stone background it is white. */
  inTile?: boolean;
};

/** Input / search: 44 tall, radius 10, placeholder in stone 600. */
export function TextField({
  ref,
  label,
  labelAccessory,
  hint,
  error,
  icon,
  inTile = false,
  style,
  ...rest
}: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      {label || labelAccessory ? (
        <View style={styles.labelRow}>
          {label ? (
            <Text variant="label" tone="muted">
              {label}
            </Text>
          ) : null}
          {labelAccessory}
        </View>
      ) : null}
      <View style={[styles.field, inTile && styles.fieldInTile, !!error && styles.fieldError]}>
        {icon ? <Icon icon={icon} color="onSurfaceVariant" /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.onSurfaceVariant}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          accessibilityLabel={label}
          maxFontSizeMultiplier={1.4}
          {...rest}
          style={[typography.body, styles.input, style]}
        />
      </View>
      {error ? (
        <Text variant="caption" tone="error">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrapper: { gap: 6 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  field: {
    height: theme.sizes.input,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
  },
  fieldInTile: { backgroundColor: theme.colors.background },
  fieldError: { borderWidth: 1, borderColor: theme.colors.error },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
    color: theme.colors.onSurface,
    // Single-line inputs clip with a fixed line height on Android.
    lineHeight: undefined,
  },
}));
