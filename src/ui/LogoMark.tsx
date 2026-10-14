import Svg, { Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

// Same barcode mark as assets/logo.svg: bar widths and x offsets in a 100-tall glyph.
const BAR_WIDTHS = [10, 4.5, 4.5, 13, 4.5, 10, 4.5];
const GAP = 6;
const BARS = BAR_WIDTHS.map((width, index) => ({
  width,
  x: BAR_WIDTHS.slice(0, index).reduce((sum, w) => sum + w + GAP, 0),
}));
const GLYPH_WIDTH = BAR_WIDTHS.reduce((sum, w) => sum + w, 0) + GAP * (BAR_WIDTHS.length - 1);

/** Neem soft-square tile with the white barcode mark. */
export function LogoMark({ size = 48 }: { size?: number }) {
  const glyphHeight = size * 0.42;
  const scale = glyphHeight / 100;
  const left = (size - GLYPH_WIDTH * scale) / 2;
  const top = (size - glyphHeight) / 2;

  return (
    <Svg width={size} height={size} accessibilityLabel="Billify">
      <Rect width={size} height={size} rx={size * 0.22} fill={colors.primary} />
      {BARS.map((bar, index) => (
        <Rect
          key={index}
          x={left + bar.x * scale}
          y={top}
          width={bar.width * scale}
          height={glyphHeight}
          rx={Math.min((bar.width * scale) / 2, 2.2 * scale)}
          fill={colors.onPrimary}
        />
      ))}
    </Svg>
  );
}
