import { BookOpen } from 'lucide-react-native';

import { EmptyState, LargeTitle, Screen } from '@/ui';

/** 04 Khata: built in the next UI pass. */
export function KhataScreen() {
  return (
    <Screen kind="tab">
      <LargeTitle title="Khata" />
      <EmptyState
        icon={BookOpen}
        title="Khata comes next"
        message="Customer balances, recording a payment and reminders are the next screens to build."
      />
    </Screen>
  );
}
