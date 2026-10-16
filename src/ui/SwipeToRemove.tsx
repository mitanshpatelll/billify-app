import { Trash2 } from 'lucide-react-native';
import { useEffect, useEffectEvent, useState, type ReactNode } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Icon } from './Icon';
import { Text } from './Text';

const REMOVE_AT = 96; // px dragged left that counts as "remove"

/**
 * Swipe a row left to remove it (User Flows §2, cart review). PanResponder + Animated: no gesture
 * library for one gesture. Not the only way: screen reader users (and anyone) can remove a line
 * from the quantity sheet, which the row's quantity button opens.
 */
export function SwipeToRemove({
  children,
  label,
  onRemove,
}: {
  children: ReactNode;
  /** The row's item, e.g. "Amul Butter 100 g". */
  label: string;
  onRemove: () => void;
}) {
  const [x] = useState(() => new Animated.Value(0));
  // Set when the row has slid all the way out; the effect then removes it once.
  const [swiped, setSwiped] = useState(false);
  const removeRow = useEffectEvent(onRemove);
  useEffect(() => {
    if (swiped) removeRow();
  }, [swiped]);

  const [responder] = useState(() =>
    PanResponder.create({
      // Only a clearly sideways drag: vertical scrolling and taps stay with the screen.
      onMoveShouldSetPanResponder: (_, g) => g.dx < -12 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderMove: (_, g) => x.setValue(Math.min(0, g.dx)),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -REMOVE_AT) {
          // Only a slide that finished removes: an interrupted one (new touch) springs back.
          Animated.timing(x, { toValue: -600, duration: 160, useNativeDriver: true }).start(
            ({ finished }) => {
              if (finished) setSwiped(true);
              else Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
            },
          );
        } else {
          Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () =>
        Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
    }),
  );

  return (
    <View style={styles.wrap} accessibilityHint={`Swipe left to remove ${label}`}>
      <View
        style={styles.behind}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Icon icon={Trash2} size={18} color="error" />
        <Text variant="label" tone="error">
          Remove
        </Text>
      </View>
      <Animated.View
        style={[styles.front, { transform: [{ translateX: x }] }]}
        {...responder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrap: { overflow: 'hidden' },
  behind: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.space.xs,
    paddingHorizontal: theme.space.md,
    backgroundColor: theme.colors.background,
  },
  front: { backgroundColor: theme.colors.surface },
}));
