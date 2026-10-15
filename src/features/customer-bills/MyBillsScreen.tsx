import { LogOut, ReceiptText } from 'lucide-react-native';

import { signOut } from '@/features/auth/sign-out';
import { EmptyState, Icon, LargeTitle, ListGroup, ListRow, Screen } from '@/ui';

/** 22 My bills (M2), empty state: bills appear after "Save to Billify" on a bill link. */
export function MyBillsScreen() {
  return (
    <Screen>
      <LargeTitle title="My bills" />
      <EmptyState
        icon={ReceiptText}
        title="No bills yet"
        message="When a shop sends you a bill on WhatsApp, open it and tap Save to Billify. It shows up here."
      />
      <ListGroup>
        <ListRow title="Sign out" leading={<Icon icon={LogOut} />} onPress={signOut} />
      </ListGroup>
    </Screen>
  );
}
