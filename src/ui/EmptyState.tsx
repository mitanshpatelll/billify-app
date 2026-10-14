import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Icon } from './Icon';
import { Text } from './Text';
import { Tile } from './Tile';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  message: string;
};

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <Tile>
      <View style={styles.empty}>
        <Icon icon={icon} size={24} color="iconInactive" />
        <Text variant="bodyStrong" align="center">
          {title}
        </Text>
        <Text variant="bodySecondary" tone="muted" align="center">
          {message}
        </Text>
      </View>
    </Tile>
  );
}

const styles = StyleSheet.create((theme) => ({
  empty: {
    alignItems: 'center',
    gap: theme.space.xs,
    paddingVertical: theme.space.xl,
    paddingHorizontal: theme.space.md,
  },
}));
