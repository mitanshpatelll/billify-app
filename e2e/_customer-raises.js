// A customer saves the khata bill and raises a query on it (as their phone would), via the API.
const json_ = { 'Content-Type': 'application/json' };
const me = json(
  http.post(API_URL + '/v1/dev/sign-in', {
    headers: json_,
    body: JSON.stringify({ email: 'ramesh-' + Date.now() + '@billify.test', name: 'Ramesh' }),
  }).body,
);
const auth = { Authorization: 'Bearer ' + me.token, 'Content-Type': 'application/json' };
const saved = json(
  http.post(API_URL + '/v1/public/bills/' + KHATA_TOKEN + '/claim', { headers: auth, body: '{}' })
    .body,
);
const res = http.post(API_URL + '/v1/bills/' + saved.billId + '/queries', {
  headers: auth,
  body: JSON.stringify({ type: 'missing', note: 'Toor Dal was not in my bag' }),
});
if (res.status !== 201) throw new Error('query failed: ' + res.status + ' ' + res.body);
