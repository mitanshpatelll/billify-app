import type { ConfigContext, ExpoConfig } from 'expo/config';

// Build variant, set per EAS profile in eas.json. Local `expo start` = development.
type Variant = 'development' | 'preview' | 'production';

const variant = (process.env.APP_VARIANT ?? 'development') as Variant;

const VARIANTS: Record<Variant, { name: string; appId: string }> = {
  development: { name: 'Billify Dev', appId: 'com.glitchover.billify.dev' },
  preview: { name: 'Billify Preview', appId: 'com.glitchover.billify.preview' },
  production: { name: 'Billify', appId: 'com.glitchover.billify' },
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: VARIANTS[variant].name,
  slug: 'billify',
  scheme: 'billify',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  // Light only: see Billify - Design System, decision D8
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: VARIANTS[variant].appId,
    supportsTablet: false,
  },
  android: {
    package: VARIANTS[variant].appId,
    adaptiveIcon: {
      backgroundColor: '#F1F3F0',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    variant,
  },
});
