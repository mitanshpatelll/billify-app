import { router } from 'expo-router';
import { Check, Search } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useCart } from '@/features/billing/cart-store';
import { Avatar, Icon, ListGroup, ListRow, Text, TextField } from '@/ui';

import { formatPhone, SAMPLE_CUSTOMERS } from './customers';

/** Pick the customer for this bill (optional for cash / UPI, needed for khata). */
export function CustomerPickerSheet() {
  const customerId = useCart((state) => state.customerId);
  const setCustomer = useCart((state) => state.setCustomer);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const matches = SAMPLE_CUSTOMERS.filter(
    (customer) => !q || customer.name.toLowerCase().includes(q) || customer.phone?.includes(q),
  );

  function pick(id: string | null) {
    setCustomer(id);
    router.back();
  }

  return (
    <View style={styles.sheet}>
      <Text variant="titleScreen">Customer</Text>
      <TextField
        icon={Search}
        value={query}
        onChangeText={setQuery}
        placeholder="Name or phone"
        accessibilityLabel="Search customers"
        autoCorrect={false}
      />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
        <ListGroup>
          {matches.map((customer) => (
            <ListRow
              key={customer.id}
              title={customer.name}
              subtitle={customer.phone ? formatPhone(customer.phone) : 'No phone number'}
              leading={<Avatar name={customer.name} />}
              trailing={customer.id === customerId ? <Icon icon={Check} color="primary" /> : null}
              onPress={() => pick(customer.id)}
            />
          ))}
          {customerId ? <ListRow title="No customer" onPress={() => pick(null)} /> : null}
        </ListGroup>
        {matches.length === 0 ? (
          <Text variant="bodySecondary" tone="muted" align="center">
            No customer called “{query.trim()}” yet.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  sheet: {
    flex: 1,
    gap: theme.space.sm,
    padding: theme.space.screen,
    backgroundColor: theme.colors.background,
  },
  list: { gap: theme.space.sm, paddingBottom: theme.space.xl },
}));
