import type { LucideIcon } from 'lucide-react-native';

import { colors, sizes, type ColorName } from '@/theme/tokens';

type IconProps = {
  icon: LucideIcon;
  size?: number;
  color?: ColorName;
};

/** Lucide outline icon at the design's stroke (1.9): 24 in the tab bar, 20 inline, 16 in labels. */
export function Icon({
  icon: LucideComponent,
  size = sizes.icon.inline,
  color = 'onSurface',
}: IconProps) {
  return <LucideComponent size={size} color={colors[color]} strokeWidth={sizes.iconStroke} />;
}
