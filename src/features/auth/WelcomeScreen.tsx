import { router } from 'expo-router';
import {
  ArrowRight,
  CircleCheck,
  CloudOff,
  ReceiptText,
  Store,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, Icon, LogoMark, Screen, Text, Tile } from '@/ui';

import { useSession, type Role } from './session-store';

const ROLES: { role: Role; title: string; subtitle: string; icon: LucideIcon }[] = [
  { role: 'shop', title: 'I run a shop', subtitle: 'Bill, track stock and khata', icon: Store },
  {
    role: 'customer',
    title: "I'm a customer",
    subtitle: 'See your bills and khata',
    icon: ReceiptText,
  },
];

/** 07 Welcome: pick a role, then sign in. */
export function WelcomeScreen() {
  const role = useSession((state) => state.role) ?? 'shop';
  const chooseRole = useSession((state) => state.chooseRole);

  return (
    <Screen
      footer={
        <>
          <Button
            label="Continue"
            trailingIcon={ArrowRight}
            onPress={() => {
              chooseRole(role);
              router.push('/sign-in');
            }}
          />
          <View style={styles.offline}>
            <Icon icon={CloudOff} size={16} color="onSurfaceVariant" />
            <Text variant="bodySecondary" tone="muted" style={styles.offlineText}>
              Works without internet. Bills sync when you’re back online.
            </Text>
          </View>
        </>
      }
    >
      <View style={styles.brand}>
        <LogoMark size={40} />
        <Text variant="titleScreen">Billify</Text>
      </View>

      <View style={styles.heading}>
        <Text variant="titleLarge" accessibilityRole="header">
          How will you use Billify?
        </Text>
        <Text variant="body" tone="muted">
          Choose one to get started
        </Text>
      </View>

      <View accessibilityRole="radiogroup" style={styles.roles}>
        {ROLES.map((option) => {
          const selected = option.role === role;
          return (
            <Tile
              key={option.role}
              variant={selected ? 'strong' : 'surface'}
              onPress={() => chooseRole(option.role)}
              accessibilityLabel={`${option.title}. ${option.subtitle}`}
            >
              <View style={styles.roleRow} accessibilityState={{ selected }}>
                <View style={[styles.roleIcon, selected && styles.roleIconSelected]}>
                  <Icon icon={option.icon} color={selected ? 'onPrimary' : 'onSurface'} />
                </View>
                <View style={styles.roleText}>
                  <Text variant="titleNav" tone={selected ? 'onPrimary' : 'default'}>
                    {option.title}
                  </Text>
                  <Text variant="bodySecondary" tone={selected ? 'onPrimaryMuted' : 'muted'}>
                    {option.subtitle}
                  </Text>
                </View>
                {selected ? <Icon icon={CircleCheck} color="onPrimary" /> : null}
              </View>
            </Tile>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingTop: theme.space.xs,
  },
  heading: {
    gap: theme.space.xs,
    paddingTop: theme.space.xl,
    paddingBottom: theme.space.sm,
  },
  roles: { gap: theme.space.gap },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    minHeight: 56,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconSelected: { backgroundColor: 'rgba(255, 255, 255, 0.14)' },
  roleText: { flex: 1, gap: 2 },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.xs,
  },
  offlineText: { flexShrink: 1 },
}));
