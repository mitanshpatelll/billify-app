import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, typography, type ColorName, type TypographyName } from '@/theme/tokens';

const TONES = {
  default: 'onSurface',
  muted: 'onSurfaceVariant',
  primary: 'primary',
  onPrimary: 'onPrimary',
  onPrimaryMuted: 'onPrimaryMuted',
  khata: 'secondary',
  error: 'error',
  inactive: 'iconInactive',
} as const satisfies Record<string, ColorName>;

export type TextTone = keyof typeof TONES;

export type TextProps = RNTextProps & {
  variant?: TypographyName;
  tone?: TextTone;
  align?: 'left' | 'center' | 'right';
};

// Light only (D8), so type and colour come straight from the tokens.
export function Text({ variant = 'body', tone = 'default', align, style, ...rest }: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[typography[variant], { color: colors[TONES[tone]], textAlign: align }, style]}
    />
  );
}
