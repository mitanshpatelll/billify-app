import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from './Text';

/** Lists sit inside one white tile with inset dividers, never one card per row. */
export function ListGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.group}>
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index > 0 ? <View style={styles.divider} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

type ListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  highlighted?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** 64 tall row: optional leading (avatar / icon), title + subtitle, trailing (amount, stepper, chevron). */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  highlighted = false,
  style,
}: ListRowProps) {
  const content = (
    <>
      {leading}
      <View style={styles.text}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySecondary" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, highlighted && styles.highlighted, style]}>{content}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        highlighted && styles.highlighted,
        pressed && styles.pressed,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

/** Small sentence-case label above a group, with an optional right-side action. */
export function SectionHeader({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" tone="muted">
        {title}
      </Text>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  group: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginHorizontal: theme.space.md,
    backgroundColor: theme.colors.outline,
  },
  row: {
    minHeight: theme.sizes.listRow,
    paddingHorizontal: theme.space.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  highlighted: { backgroundColor: theme.colors.primaryContainer },
  pressed: { backgroundColor: theme.colors.surfacePressed },
  text: { flex: 1, gap: 2 },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.xxs,
    minHeight: 24,
  },
}));
