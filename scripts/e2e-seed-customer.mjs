// For e2e/customer.yaml, shop-queries.yaml and khata-page.yaml: a new shop on the local API (started with
// DEV_SIGN_IN=true) with a bill on Ramesh's khata and a walk-in bill. Prints the Maestro env,
// including a session token for that test shop: local development only, never in CI logs.
//   node scripts/e2e-seed-customer.mjs [apiUrl]
//   → KHATA_TOKEN=… WALKIN_TOKEN=… OWNER_TOKEN=… OWNER_EMAIL=… KHATA_PAGE_TOKEN=…
import { randomBytes } from 'node:crypto';

const API = process.argv[2] ?? 'http://localhost:3100';
const OWNER = `e2e-shop-${Date.now()}@billify.test`;
function uuidv7() {
  const b = randomBytes(16);
  b.writeUIntBE(Date.now(), 0, 6);
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
const token = () => randomBytes(16).toString('base64url');
async function call(method, path, body, auth) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(auth ? { authorization: `Bearer ${auth}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok && res.status !== 409) throw new Error(`${method} ${path} ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}
const owner = await call('POST', '/v1/dev/sign-in', { email: OWNER, name: 'Sharma Ji' });
await call(
  'POST',
  '/v1/shops',
  { name: 'Sharma Kirana', upiId: 'sharmakirana@okaxis', billPrefix: 'A' },
  owner.token,
);
await call('PATCH', '/v1/shops/me', { phone: '9876543210' }, owner.token);
const ins = (table, data) => ({ mutationId: uuidv7(), table, op: 'insert', data });
const now = new Date().toISOString();
const ramesh = { id: uuidv7(), name: 'Ramesh Yadav', phone: '9876504521', khataToken: token() };
const khataBill = {
  id: uuidv7(),
  number: 'A-201',
  customerId: ramesh.id,
  totalPaise: 42000,
  publicToken: token(),
  createdAt: now,
};
const walkIn = {
  id: uuidv7(),
  number: 'A-202',
  customerId: null,
  totalPaise: 5800,
  publicToken: token(),
  createdAt: now,
};
const item = (billId, name, qty, unit, price, position = 0) => ({
  id: uuidv7(),
  billId,
  productId: null,
  position,
  nameSnapshot: name,
  unit,
  qty,
  unitPricePaise: price,
});
const res = await call(
  'POST',
  '/v1/sync/push',
  {
    deviceId: uuidv7(),
    mutations: [
      ins('customers', ramesh),
      ins('bills', khataBill),
      ins('bill_items', item(khataBill.id, 'Toor Dal 1 kg', 1, 'pcs', 11000)),
      ins('bill_items', item(khataBill.id, 'Ashirvaad Atta 5 kg', 1, 'pcs', 26000, 1)),
      ins('bill_items', item(khataBill.id, 'Maggi Masala', 4, 'pcs', 1250, 2)),
      ins('payments', { id: uuidv7(), billId: khataBill.id, method: 'khata', amountPaise: 42000 }),
      ins('khata_entries', {
        id: uuidv7(),
        customerId: ramesh.id,
        kind: 'credit_sale',
        deltaPaise: 42000,
        refId: khataBill.id,
      }),
      ins('bills', walkIn),
      ins('bill_items', item(walkIn.id, 'Amul Butter 100 g', 1, 'pcs', 5800)),
      ins('payments', { id: uuidv7(), billId: walkIn.id, method: 'cash', amountPaise: 5800 }),
    ],
  },
  owner.token,
);
const refused = res.results.filter((r) => r.status !== 'applied');
if (refused.length) throw new Error(`seed refused: ${JSON.stringify(refused)}`);
console.log(
  [
    `KHATA_TOKEN=${khataBill.publicToken}`,
    `WALKIN_TOKEN=${walkIn.publicToken}`,
    `OWNER_TOKEN=${owner.token}`,
    `OWNER_EMAIL=${OWNER}`,
    `KHATA_PAGE_TOKEN=${ramesh.khataToken}`,
  ].join(' '),
);
