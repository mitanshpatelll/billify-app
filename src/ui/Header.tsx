import { router } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { IconButton } from './IconButton';
import { Text } from './Text';

type StackHeaderProps = {
  title?: string;
  /** `close` for modals and sheets, `back` for pushed screens. */
  action?: 'back' | 'close' | 'none';
  onAction?: () => void;
  right?: ReactNode;
};

// Back with nowhere to go back to (a screen opened straight from a link): home instead.
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Non-tab screens: back (or close) button + nav title. No logo, no avatar. */
export function StackHeader({ title, action = 'back', onAction, right }: StackHeaderProps) {
  return (
    <View style={styles.stackHeader}>
      {action !== 'none' ? (
        <IconButton
          icon={action === 'close' ? X : ArrowLeft}
          accessibilityLabel={action === 'close' ? 'Close' : 'Back'}
          onPress={onAction ?? goBack}
        />
      ) : null}
      {title ? (
        <Text variant="titleNav" numberOfLines={1} style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      ) : (
        <View style={styles.title} />
      )}
      {right}
    </View>
  );
}

type LargeTitleProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

/** Tab screens: 32 bold title with an optional line under it. */
export function LargeTitle({ title, subtitle, right }: LargeTitleProps) {
  return (
    <View style={styles.largeTitle}>
      <View style={styles.largeTitleText}>
        <Text variant="titleLarge" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySecondary" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  stackHeader: {
    minHeight: theme.sizes.iconButton,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  title: { flex: 1 },
  largeTitle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space.sm,
    paddingBottom: theme.space.xxs,
  },
  largeTitleText: { flex: 1, gap: 2 },
}));
