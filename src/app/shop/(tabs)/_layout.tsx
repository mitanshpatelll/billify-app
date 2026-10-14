import { Tabs } from 'expo-router';
import { Archive, BookOpen, Ellipsis, ReceiptText, type LucideIcon } from 'lucide-react-native';

import { colors, fonts, sizes } from '@/theme/tokens';
import { Icon } from '@/ui';

function tabIcon(icon: LucideIcon) {
  return function TabIcon({ focused }: { focused: boolean }) {
    return <Icon icon={icon} size={sizes.icon.tab} color={focused ? 'primary' : 'iconInactive'} />;
  };
}

// Bill, Stock, Khata, More. Separated by a 1 pt stone line, not a shadow.
export default function ShopTabsLayout() {
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
      <Tabs.Screen name="bill" options={{ title: 'Bill', tabBarIcon: tabIcon(ReceiptText) }} />
      <Tabs.Screen name="stock" options={{ title: 'Stock', tabBarIcon: tabIcon(Archive) }} />
      <Tabs.Screen name="khata" options={{ title: 'Khata', tabBarIcon: tabIcon(BookOpen) }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: tabIcon(Ellipsis) }} />
    </Tabs>
  );
}
