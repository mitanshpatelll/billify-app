import { Minus, Plus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Icon } from './Icon';
import { Text } from './Text';

type QtyStepperProps = {
  value: string;
  onIncrement: () => void;
  onDecrement: () => void;
  /** Spoken item name, e.g. "Amul Butter 100 g". */
  itemLabel: string;
  /** Tap the number to type a quantity (loose items, 12 pieces). */
  onPressValue?: () => void;
};

/** Minus / value / plus on stone, neem icons. 30 tall with 44 touch targets. */
export function QtyStepper({
  value,
  onIncrement,
  onDecrement,
  itemLabel,
  onPressValue,
}: QtyStepperProps) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Less ${itemLabel}`}
        onPress={onDecrement}
        hitSlop={7}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Icon icon={Minus} size={16} color="primary" />
      </Pressable>
      {onPressValue ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quantity ${value}`}
          accessibilityHint={`Type the quantity of ${itemLabel}`}
          onPress={onPressValue}
          style={({ pressed }) => [styles.valueButton, pressed && styles.pressed]}
        >
          <Text variant="bodyStrong" style={styles.value}>
            {value}
          </Text>
        </Pressable>
      ) : (
        <Text variant="bodyStrong" style={styles.value} accessibilityLabel={`Quantity ${value}`}>
          {value}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`More ${itemLabel}`}
        onPress={onIncrement}
        hitSlop={7}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Icon icon={Plus} size={16} color="primary" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  stepper: {
    height: theme.sizes.stepper,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    width: theme.sizes.stepper,
    height: theme.sizes.stepper,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
  },
  pressed: { backgroundColor: theme.colors.surfaceVariant },
  valueButton: {
    height: theme.sizes.stepper,
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
  },
  value: {
    minWidth: 52,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
}));
