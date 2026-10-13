// Neem · Haldi · Stone, from Billify - DESIGN.md.
// Moves into the Unistyles theme once the design system is final.
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
  primary: palette.neem[800],
  onPrimary: palette.white,
  background: palette.stone[100],
  surface: palette.white,
  onSurface: palette.stone[900],
  onSurfaceVariant: palette.stone[600],
  error: palette.red,
} as const;
