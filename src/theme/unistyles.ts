import { StyleSheet } from 'react-native-unistyles';

import { colors, fonts, palette, radius, sizes, space, typography } from './tokens';

const light = { colors, palette, fonts, typography, space, radius, sizes } as const;

const themes = { light };

type AppThemes = typeof themes;

declare module 'react-native-unistyles' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- module augmentation
  export interface UnistylesThemes extends AppThemes {}
}

// Light only (D8): one theme, no adaptive switching.
StyleSheet.configure({
  themes,
  settings: { initialTheme: 'light' },
});
