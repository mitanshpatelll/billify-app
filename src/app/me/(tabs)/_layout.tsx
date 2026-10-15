import { Tabs } from 'expo-router';
import { BookOpen, CircleUserRound, ReceiptText, type LucideIcon } from 'lucide-react-native';

import { colors, fonts, sizes } from '@/theme/tokens';
import { Icon } from '@/ui';

function tabIcon(icon: LucideIcon) {
  return function TabIcon({ focused }: { focused: boolean }) {
    return <Icon icon={icon} size={sizes.icon.tab} color={focused ? 'primary' : 'iconInactive'} />;
  };
}

// Bills, Khata, Account (same tab bar style as the shop side).
export default function CustomerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outline,
          borderTopWidth: 1,
          elevation: 0,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="bills" options={{ title: 'Bills', tabBarIcon: tabIcon(ReceiptText) }} />
      <Tabs.Screen name="khata" options={{ title: 'Khata', tabBarIcon: tabIcon(BookOpen) }} />
      <Tabs.Screen
        name="account"
        options={{ title: 'Account', tabBarIcon: tabIcon(CircleUserRound) }}
      />
    </Tabs>
  );
}
