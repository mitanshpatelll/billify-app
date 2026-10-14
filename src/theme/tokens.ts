import { Platform, type TextStyle } from 'react-native';

// Design tokens from Billify - DESIGN.md (Neem · Haldi · Stone, Manrope, soft-square corners).
// Light only (D8). Sizes are points / dp, checked on a 390 × 844 frame.

export const palette = {
  neem: {
    50: '#F2F9F4',
    100: '#E5F1E9',
    200: '#CCE3D4',
    300: '#ACD0B8',
    400: '#89BA9B',
    500: '#6AA37F',
    600: '#4C8864',
    700: '#356C4C',
    800: '#1F5C3B',
    900: '#153D27',
  },
  haldi: {
    50: '#FEF9F2',
    100: '#FFF2DD',
    200: '#FDE4BC',
    300: '#FAD391',
    400: '#F3BE5E',
    500: '#E2A200',
    600: '#BF8908',
    700: '#976C06',
    800: '#755204',
    900: '#563C02',
  },
  stone: {
    50: '#F8FAF7',
    100: '#F1F3F0',
    200: '#E5E7E4',
    300: '#CED2CC',
    400: '#A2A6A0',
    500: '#7E827C',
    600: '#61655F',
    700: '#484C46',
    800: '#31342F',
    900: '#1C1F1A',
  },
  red: '#C42B2B',
  white: '#FFFFFF',
} as const;

export const colors = {
  // Neem: actions, active tab, links, "paid / done"
  primary: palette.neem[800],
  onPrimary: palette.white,
  primaryPressed: palette.neem[900],
  primaryContainer: palette.neem[50],
  onPrimaryContainer: palette.neem[800],
  // Sub-text on a strong (neem-filled) tile
  onPrimaryMuted: palette.neem[100],
  // Haldi: khata due amounts only
  secondary: palette.haldi[800],
  secondaryContainer: palette.haldi[50],
  secondaryChip: palette.haldi[100],
  // Bright haldi: scanner frame and scan line on the dark camera only
  tertiary: palette.haldi[400],
  // Stone: everything neutral
  background: palette.stone[100],
  surface: palette.white,
  surfacePressed: palette.stone[50],
  onSurface: palette.stone[900],
  onSurfaceVariant: palette.stone[600],
  surfaceVariant: palette.stone[200],
  outline: palette.stone[200],
  iconInactive: palette.stone[500],
  disabled: palette.stone[300],
  camera: '#131411',
  // Red: errors and cancelled bills only
  error: palette.red,
  onError: palette.white,
  errorContainer: '#FCEBEA',
  scrim: 'rgba(0, 0, 0, 0.4)',
} as const;

export type ColorName = keyof typeof colors;

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;

// Android clips descenders ("g", "y") when the line box is shorter than Manrope's own height,
// so tight title line heights (1.1, 1.15) open up to 1.3 there.
const MIN_LINE_HEIGHT = Platform.OS === 'android' ? 1.3 : 0;

// Line height and letter spacing are given in DESIGN.md as multipliers / em: convert to points.
function type(
  fontFamily: string,
  fontSize: number,
  lineHeight: number,
  letterSpacingEm = 0,
  tabular = false,
): TextStyle {
  return {
    fontFamily,
    fontSize,
    lineHeight: Math.round(fontSize * Math.max(lineHeight, MIN_LINE_HEIGHT)),
    letterSpacing: fontSize * letterSpacingEm,
    // Amounts use tabular figures so totals don't shift as digits change.
    ...(tabular && { fontVariant: ['tabular-nums'] }),
  };
}

export const typography = {
  amount: type(fonts.bold, 40, 1.1, -0.02, true),
  titleLarge: type(fonts.bold, 32, 1.1, -0.02),
  numberTile: type(fonts.bold, 28, 1.15, -0.02, true),
  numberTileSmall: type(fonts.bold, 22, 1.15, -0.02, true),
  total: type(fonts.bold, 24, 1.15, 0, true),
  titleScreen: type(fonts.bold, 20, 1.2),
  titleNav: type(fonts.semibold, 17, 1.3),
  body: type(fonts.regular, 16, 1.35),
  bodyStrong: type(fonts.semibold, 16, 1.35),
  bodySecondary: type(fonts.regular, 14, 1.35),
  chip: type(fonts.medium, 14, 1.2),
  label: type(fonts.semibold, 13, 1.3),
  caption: type(fonts.regular, 12, 1.3),
  tabLabel: type(fonts.semibold, 11, 1.2),
} as const;

export type TypographyName = keyof typeof typography;

export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  // Named layout values
  screen: 20,
  gap: 12,
  tile: 16,
} as const;

// Soft-square corners. Inner corners are always smaller than the corner they sit in.
export const radius = {
  xs: 2,
  segment: 7,
  sm: 8,
  md: 10,
  lg: 12,
  full: 9999,
} as const;

export const sizes = {
  button: 52,
  input: 44,
  chip: 34,
  statusChip: 26,
  iconButton: 40,
  listRow: 64,
  stepper: 30,
  segmented: 40,
  tabBar: 49,
  touch: 44,
  avatar: 44,
  scanner: 176,
  icon: { tab: 24, inline: 20, label: 16 },
  iconStroke: 1.9,
} as const;
