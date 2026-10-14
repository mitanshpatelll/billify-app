import { Archive } from 'lucide-react-native';

import { EmptyState, LargeTitle, Screen } from '@/ui';

/** 12 Stock: built in the next UI pass. */
export function StockScreen() {
  return (
    <Screen kind="tab">
      <LargeTitle title="Stock" />
      <EmptyState
        icon={Archive}
        title="Stock comes next"
        message="Stock levels, stock in by scan and the low-stock list are the next screens to build."
      />
    </Screen>
  );
}
