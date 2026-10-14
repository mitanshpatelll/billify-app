import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from './Text';

type SegmentedControlProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

/** Stone 200 track, white selected segment with the only hairline shadow in the app. 40 tall. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={styles.track}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.selected]}
          >
            <Text variant={selected ? 'label' : 'chip'} tone={selected ? 'default' : 'muted'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  track: {
    height: theme.sizes.segmented,
    padding: 4,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceVariant,
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    borderRadius: theme.radius.segment,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: theme.colors.surface,
    boxShadow: '0 1px 2px rgba(28, 31, 26, 0.12)',
  },
}));
