import { Trash2 } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Icon } from './Icon';
import { Text } from './Text';

const REMOVE_AT = 96; // px dragged left that counts as "remove"

/**
 * Swipe a row left to remove it (User Flows §2, cart review). PanResponder + Animated: no gesture
 * library for one gesture. Screen readers get a "Remove …" action instead of the swipe.
 */
export function SwipeToRemove({
  children,
  label,
  onRemove,
}: {
  children: ReactNode;
  /** Spoken: "Remove Amul Butter 100 g". */
  label: string;
  onRemove: () => void;
}) {
  const [x] = useState(() => new Animated.Value(0));
  // Set when the swipe finishes sliding out; the effect then removes the row (latest onRemove).
  const [swiped, setSwiped] = useState(false);
  useEffect(() => {
    if (swiped) onRemove();
  }, [swiped, onRemove]);

  const [responder] = useState(() =>
    PanResponder.create({
      // Only a clearly sideways drag: vertical scrolling and taps stay with the screen.
      onMoveShouldSetPanResponder: (_, g) => g.dx < -12 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderMove: (_, g) => x.setValue(Math.min(0, g.dx)),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -REMOVE_AT) {
          Animated.timing(x, { toValue: -600, duration: 160, useNativeDriver: true }).start(() =>
            setSwiped(true),
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
    <View
      style={styles.wrap}
      accessibilityActions={[{ name: 'remove', label: `Remove ${label}` }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'remove') onRemove();
      }}
    >
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
