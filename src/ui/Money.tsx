import type { TextStyle } from 'react-native';

import { formatRupees } from '@/lib/money';

import { Text, type TextProps } from './Text';

type MoneyProps = Omit<TextProps, 'children'> & {
  paise: number;
  showPaise?: boolean;
  suffix?: string;
};

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/** A rupee amount from paise, always with tabular figures. */
export function Money({ paise, showPaise = true, suffix, style, ...rest }: MoneyProps) {
  return (
    <Text {...rest} style={[tabular, style]}>
      {formatRupees(paise, { showPaise })}
      {suffix ? ` ${suffix}` : null}
    </Text>
  );
}
