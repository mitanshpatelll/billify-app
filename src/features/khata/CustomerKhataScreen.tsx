import { useLocalSearchParams } from 'expo-router';
import {
  Banknote,
  BookOpen,
  CircleCheck,
  MessageCircle,
  Pencil,
  Phone,
  ReceiptText,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isRepoError } from '@/db/repos';
import { formatPhone, maskPhone, useCustomer } from '@/features/customers/customers';
import { khataReminderText, whatsAppLink } from '@/features/sharing/links';
import { useShop } from '@/features/shop/shop';
import { formatRupees, parseRupees } from '@/lib/money';
import { normalizePhone } from '@/lib/phone';
import type { SettlementMethod } from '@/lib/domain';
import {
  Avatar,
  Button,
  Chip,
  EmptyState,
  ErrorBanner,
  Icon,
  IconButton,
  ListGroup,
  ListRow,
  Money,
  Screen,
  SectionHeader,
  StackHeader,
  Text,
  TextButton,
  TextField,
  Tile,
  TileRow,
  type TileVariant,
} from '@/ui';

import { recordPayment, updateCustomer, useCustomerKhata, type KhataLine } from './khata';

const dayFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

type Mode = 'view' | 'pay' | 'edit';

/** 15 Customer khata: balance, record a payment, send a reminder, history of bills and payments. */
export function CustomerKhataScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customer = useCustomer(id);
  const shop = useShop();
  const { balancePaise, entries } = useCustomerKhata(id);
  const [mode, setMode] = useState<Mode>('view');
  const [error, setError] = useState<string | null>(null);

  if (!customer || customer.deletedAt) {
    return (
      <Screen header={<StackHeader title="Khata" />}>
        <EmptyState icon={BookOpen} title="This customer is gone" message="They were removed." />
      </Screen>
    );
  }

  function run(action: () => void) {
    setError(null);
    try {
      action();
      setMode('view');
    } catch (err) {
      if (!isRepoError(err)) throw err;
      setError(err.message);
    }
  }

  function sendReminder() {
    if (!customer || !shop) return;
    const text = khataReminderText({
      customerName: customer.name,
      duePaise: balancePaise,
      shopName: shop.name,
      upiId: shop.upiId,
    });
    const open = () =>
      Linking.openURL(whatsAppLink(text, customer.phone)).catch(() =>
        setError('Couldn’t open WhatsApp. Is it installed on this phone?'),
      );
    if (!customer.phone) {
      void open(); // no number: the shopkeeper picks the chat
      return;
    }
    // Show who it goes to first, so a typo in the number doesn't reach a stranger.
    Alert.alert('Send reminder?', `To ${customer.name}, ${maskPhone(customer.phone)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send', onPress: () => void open() },
    ]);
  }

  const due = balancePaise > 0;
  const since = entries.at(-1)?.createdAt;
  const balanceTile: TileVariant = due ? 'khata' : 'selected';

  return (
    <Screen
      header={
        <StackHeader
          title="Khata"
          right={
            customer.phone ? (
              <IconButton
                icon={Phone}
                accessibilityLabel={`Call ${customer.name}`}
                onPress={() => void Linking.openURL(`tel:+91${customer.phone}`)}
              />
            ) : null
          }
        />
      }
    >
      <Tile>
        <View style={styles.person}>
          <Avatar name={customer.name} />
          <View style={styles.flex}>
            <Text variant="titleNav">{customer.name}</Text>
            <Text variant="bodySecondary" tone="muted">
              {customer.phone ? formatPhone(customer.phone) : 'No phone number'}
            </Text>
          </View>
          <IconButton
            icon={Pencil}
            variant="surface"
            accessibilityLabel="Edit customer"
            onPress={() => setMode('edit')}
          />
        </View>
      </Tile>

      <Tile variant={balanceTile}>
        <Text variant="label" tone={due ? 'khata' : 'primary'}>
          {due ? 'Due' : balancePaise < 0 ? 'Paid in advance' : 'Balance'}
        </Text>
        {balancePaise === 0 ? (
          <Text variant="amount" tone="primary">
            Settled
          </Text>
        ) : (
          <Money paise={Math.abs(balancePaise)} variant="amount" tone={due ? 'khata' : 'primary'} />
        )}
        <Text variant="bodySecondary" tone={due ? 'khata' : 'primary'}>
          {entries.length
            ? `since ${dayFormat.format(new Date(since!))} · ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`
            : 'Nothing on khata yet'}
        </Text>
      </Tile>

      {error ? (
        <ErrorBanner title="Not done" message={error} onDismiss={() => setError(null)} />
      ) : null}

      {mode === 'pay' ? (
        <PaymentForm
          duePaise={Math.max(balancePaise, 0)}
          onCancel={() => setMode('view')}
          onSave={(amount, method) => run(() => recordPayment(customer.id, amount, method))}
        />
      ) : mode === 'edit' ? (
        <EditCustomerForm
          name={customer.name}
          phone={customer.phone}
          onCancel={() => setMode('view')}
          onSave={(input) => run(() => updateCustomer(customer.id, input))}
        />
      ) : (
        <TileRow>
          <Tile
            variant="strong"
            style={styles.flex}
            onPress={() => setMode('pay')}
            accessibilityLabel="Record payment"
          >
            <Icon icon={Banknote} color="onPrimary" />
            <Text variant="titleNav" tone="onPrimary" style={styles.actionText}>
              Record payment
            </Text>
          </Tile>
          <Tile
            style={styles.flex}
            onPress={sendReminder}
            accessibilityLabel="Send reminder on WhatsApp"
          >
            <Icon icon={MessageCircle} />
            <Text variant="titleNav" style={styles.actionText}>
              Send reminder
            </Text>
          </Tile>
        </TileRow>
      )}

      <SectionHeader title="History" />
      {entries.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No history yet"
          message="Bills put on khata and payments show up here."
        />
      ) : (
        <ListGroup>
          {entries.map((entry) => (
            <HistoryRow key={entry.id} entry={entry} />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}

function HistoryRow({ entry }: { entry: KhataLine }) {
  const day = dayFormat.format(new Date(entry.createdAt));
  const title =
    entry.kind === 'credit_sale'
      ? `${day} · Bill ${entry.billNumber ?? ''}`.trim()
      : entry.kind === 'settlement'
        ? `${day} · Paid${entry.method ? `, ${entry.method === 'upi' ? 'UPI' : 'cash'}` : ''}`
        : `${day} · Adjustment`;
  const subtitle =
    entry.kind === 'credit_sale' && entry.billItems
      ? `${entry.billItems} ${entry.billItems === 1 ? 'item' : 'items'} on khata`
      : entry.kind === 'settlement'
        ? 'Taken off the khata'
        : undefined;
  const plus = entry.deltaPaise > 0;
  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      trailing={
        <Text variant="bodyStrong" tone={plus ? 'khata' : 'primary'} style={styles.tabular}>
          {plus ? '+' : '−'}
          {formatRupees(Math.abs(entry.deltaPaise))}
        </Text>
      }
    />
  );
}

function PaymentForm({
  duePaise,
  onSave,
  onCancel,
}: {
  duePaise: number;
  onSave: (amountPaise: number, method: SettlementMethod) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<SettlementMethod>('cash');
  const amountPaise = parseRupees(amount);
  const valid = amountPaise !== null && amountPaise > 0;

  return (
    <Tile>
      <View style={styles.form}>
        <TextField
          label="Amount received"
          inTile
          value={amount}
          onChangeText={setAmount}
          placeholder="₹0.00"
          keyboardType="decimal-pad"
          autoFocus
          hint={
            amountPaise !== null && amountPaise > duePaise && duePaise > 0
              ? `More than is due: ${formatRupees(amountPaise - duePaise)} goes as advance`
              : undefined
          }
          error={amount && !valid ? 'Enter the amount, like 500 or 250.50' : undefined}
        />
        <View style={styles.chips}>
          {duePaise > 0 ? (
            <Chip
              label={`Full ${formatRupees(duePaise)}`}
              onPress={() => setAmount((duePaise / 100).toFixed(2))}
            />
          ) : null}
          <Chip label="Cash" selected={method === 'cash'} onPress={() => setMethod('cash')} />
          <Chip label="UPI" selected={method === 'upi'} onPress={() => setMethod('upi')} />
        </View>
        <Button
          label="Save payment"
          icon={CircleCheck}
          disabled={!valid}
          onPress={() => valid && onSave(amountPaise, method)}
        />
        <TextButton label="Cancel" onPress={onCancel} />
      </View>
    </Tile>
  );
}

function EditCustomerForm({
  name: initialName,
  phone: initialPhone,
  onSave,
  onCancel,
}: {
  name: string;
  phone: string | null;
  onSave: (input: { name: string; phone: string | null }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ?? '');
  const errors = {
    name: name.trim().length < 1 ? 'Enter the customer’s name' : undefined,
    phone: phone.trim() && !normalizePhone(phone) ? 'Enter a 10-digit mobile number' : undefined,
  };
  return (
    <Tile>
      <View style={styles.form}>
        <TextField label="Name" inTile value={name} onChangeText={setName} error={errors.name} />
        <TextField
          label="Mobile number"
          inTile
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="98765 04521"
          error={errors.phone}
        />
        <Button
          label="Save customer"
          disabled={!!errors.name || !!errors.phone}
          onPress={() => onSave({ name, phone: phone.trim() || null })}
        />
        <TextButton label="Cancel" onPress={onCancel} />
      </View>
    </Tile>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  person: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  actionText: { marginTop: theme.space.sm },
  form: { gap: theme.space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.xs },
  tabular: { fontVariant: ['tabular-nums'] },
}));
