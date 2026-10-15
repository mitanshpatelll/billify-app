import { CircleAlert, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Icon } from './Icon';
import { Text } from './Text';

type BannerProps = {
  title: string;
  message?: string;
  onDismiss?: () => void;
};

/** Error banner. Red is for errors only. */
export function ErrorBanner({ title, message, onDismiss }: BannerProps) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Icon icon={CircleAlert} color="error" />
      <View style={styles.text}>
        <Text variant="bodyStrong" tone="error">
          {title}
        </Text>
        {message ? <Text variant="bodySecondary">{message}</Text> : null}
      </View>
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onDismiss}
          hitSlop={12}
        >
          <Icon icon={X} color="error" />
        </Pressable>
      ) : null}
    </View>
  );
}

type StatusPillProps = {
  label: string;
  tone?: 'ok' | 'waiting' | 'attention';
  onPress?: () => void;
};

/**
 * White pill with a dot, e.g. sync state: "Synced" (neem), "3 bills waiting" (stone),
 * "Needs attention" (red: the server refused something, an error). Always words, not only colour.
 */
export function StatusPill({ label, tone = 'ok', onPress }: StatusPillProps) {
  const content = (
    <>
      <View
        style={[
          styles.dot,
          tone === 'waiting' && styles.dotWaiting,
          tone === 'attention' && styles.dotAttention,
        ]}
      />
      <Text variant="label">{label}</Text>
    </>
  );
  if (!onPress) return <View style={styles.pill}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. Sync details`}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space.sm,
    padding: theme.space.tile,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.errorContainer,
  },
  text: { flex: 1, gap: 2 },
  pill: {
    height: 30,
    paddingHorizontal: theme.space.sm,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  dotWaiting: { backgroundColor: theme.colors.iconInactive },
  dotAttention: { backgroundColor: theme.colors.error },
  pillPressed: { backgroundColor: theme.colors.surfacePressed },
}));
