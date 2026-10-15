import { Pressable } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from './Text';

type TextButtonProps = { label: string; onPress: () => void };

/** Quiet action as neem text, 44 tall: "Not now", "Cancel". Works on stone and inside tiles. */
export function TextButton({ label, onPress }: TextButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text variant="bodyStrong" tone="primary">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: {
    minHeight: theme.sizes.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
}));
