import { router } from 'expo-router';
import { Check, Search, UserPlus } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isRepoError } from '@/db/repos';
import { useCart } from '@/features/billing/cart-store';
import { normalizePhone } from '@/lib/phone';
import { Avatar, Button, Icon, ListGroup, ListRow, Text, TextField, Tile } from '@/ui';

import { addCustomer, formatPhone, useCustomers } from './customers';

/** Pick the customer for this bill (optional for cash / UPI, needed for khata), or add one. */
export function CustomerPickerSheet() {
  const customerId = useCart((state) => state.customerId);
  const setCustomer = useCart((state) => state.setCustomer);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const matches = useCustomers(query);

  function pick(id: string | null) {
    setCustomer(id);
    router.back();
  }

  if (adding) {
    return (
      <NewCustomerForm
        initial={query.trim()}
        onSaved={(id) => pick(id)}
        onCancel={() => setAdding(false)}
      />
    );
  }

  const q = query.trim();
  return (
    <View style={styles.sheet}>
      <Text variant="titleScreen" accessibilityRole="header">
        Customer
      </Text>
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
          <ListRow
            title={q ? `Add “${q}” as a new customer` : 'New customer'}
            subtitle="Name, and a phone number for WhatsApp"
            leading={<Icon icon={UserPlus} color="primary" />}
            onPress={() => setAdding(true)}
          />
          {customerId ? <ListRow title="No customer" onPress={() => pick(null)} /> : null}
        </ListGroup>
      </ScrollView>
    </View>
  );
}

type NewCustomerFormProps = {
  /** What was typed in the search: becomes the name, or the phone if it's digits. */
  initial: string;
  onSaved: (id: string) => void;
  onCancel: () => void;
};

function NewCustomerForm({ initial, onSaved, onCancel }: NewCustomerFormProps) {
  const typedPhone = /^[\d\s+-]+$/.test(initial);
  const [name, setName] = useState(typedPhone ? '' : initial);
  const [phone, setPhone] = useState(typedPhone ? initial : '');
  const [touched, setTouched] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saving = useRef(false);

  const errors = {
    name: name.trim().length < 1 ? 'Enter the customer’s name' : undefined,
    phone: phone.trim() && !normalizePhone(phone) ? 'Enter a 10-digit mobile number' : undefined,
  };

  function save() {
    setTouched(true);
    if (errors.name || errors.phone || saving.current) return;
    saving.current = true;
    try {
      onSaved(addCustomer({ name, phone: phone.trim() || null }).id);
    } catch (err) {
      saving.current = false;
      if (!isRepoError(err)) throw err;
      setSaveError(err.message);
    }
  }

  return (
    <ScrollView
      style={styles.flex}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.sheet}
    >
      <Text variant="titleScreen" accessibilityRole="header">
        New customer
      </Text>
      <Tile>
        <View style={styles.form}>
          <TextField
            label="Name"
            inTile
            value={name}
            onChangeText={setName}
            placeholder="Ramesh Yadav"
            autoCapitalize="words"
            autoFocus={!typedPhone}
            error={touched ? errors.name : undefined}
          />
          <TextField
            label="Mobile number (optional)"
            inTile
            value={phone}
            onChangeText={setPhone}
            placeholder="98765 04521"
            keyboardType="phone-pad"
            autoFocus={typedPhone}
            hint="Bills and reminders go to this number on WhatsApp"
            error={saveError ?? errors.phone}
          />
        </View>
      </Tile>
      <Button label="Save customer" icon={UserPlus} onPress={save} />
      <Button label="Back to list" variant="secondary" onPress={onCancel} />
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  sheet: {
    flexGrow: 1,
    gap: theme.space.sm,
    padding: theme.space.screen,
    backgroundColor: theme.colors.background,
  },
  list: { gap: theme.space.sm, paddingBottom: theme.space.xl },
  form: { gap: theme.space.md },
}));
