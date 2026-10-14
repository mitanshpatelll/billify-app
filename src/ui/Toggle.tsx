import { Switch } from 'react-native';

import { colors } from '@/theme/tokens';

type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
};

export function Toggle({ value, onValueChange, accessibilityLabel }: ToggleProps) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ true: colors.primary, false: colors.disabled }}
      thumbColor={colors.surface}
      ios_backgroundColor={colors.disabled}
    />
  );
}
