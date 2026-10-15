import { LogOut, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';

import { isApiError } from '@/api/client';
import { deleteAccount } from '@/features/auth/delete-account';
import { useSession } from '@/features/auth/session-store';
import { signOut } from '@/features/auth/sign-out';
import { confirmAction } from '@/lib/confirm';
import { Avatar, ErrorBanner, Icon, LargeTitle, ListGroup, ListRow, Screen } from '@/ui';

/** Customer account: who is signed in, sign out, delete account. */
export function AccountScreen() {
  const user = useSession((state) => state.user);
  const [error, setError] = useState<string | null>(null);
  const deleting = useRef(false);

  function confirmDelete() {
    confirmAction({
      title: 'Delete your account?',
      message:
        'Your saved bills and your bill queries disappear from Billify. The shops keep their own records. This can’t be undone.',
      confirmLabel: 'Delete account',
      onConfirm: () => {
        if (deleting.current) return;
        deleting.current = true;
        setError(null);
        deleteAccount().catch((err: unknown) => {
          deleting.current = false;
          setError(
            isApiError(err, 'NETWORK_ERROR') || isApiError(err, 'TIMEOUT')
              ? 'No internet connection. Deleting the account needs the internet.'
              : 'Couldn’t delete the account. Try again in a minute.',
          );
        });
      },
    });
  }

  return (
    <Screen kind="tab">
      <LargeTitle title="Account" />
      {error ? (
        <ErrorBanner title="Not deleted" message={error} onDismiss={() => setError(null)} />
      ) : null}
      {user ? (
        <ListGroup>
          <ListRow title={user.name} subtitle={user.email} leading={<Avatar name={user.name} />} />
        </ListGroup>
      ) : null}
      <ListGroup>
        <ListRow title="Sign out" leading={<Icon icon={LogOut} />} onPress={signOut} />
        <ListRow
          title="Delete account"
          leading={<Icon icon={Trash2} color="error" />}
          onPress={confirmDelete}
        />
      </ListGroup>
    </Screen>
  );
}
