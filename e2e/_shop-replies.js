// The shop answers the newest open bill query (as its phone would), straight to the API.
const auth = { Authorization: 'Bearer ' + OWNER_TOKEN, 'Content-Type': 'application/json' };
const inbox = json(http.get(API_URL + '/v1/shops/me/queries', { headers: auth }).body);
const id = inbox.queries[0].id;
const res = http.post(API_URL + '/v1/queries/' + id + '/messages', {
  headers: auth,
  body: JSON.stringify({ body: 'Sorry, we will return the difference at the counter' }),
});
if (res.status !== 201) throw new Error('reply failed: ' + res.status + ' ' + res.body);
output.queryId = id;
