// Console API: roles, merges, deletes, the change feed, the team guard and the public
// enquiry route, run against in-memory stand-ins for DynamoDB and Cognito with real
// RS256-signed tokens.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, sign} from 'node:crypto';
import {createApp} from '../infra/api/app.mjs';
import {verifyIdToken} from '../infra/api/jwt.mjs';

const region = 'ap-south-1', poolId = 'ap-south-1_TEST', clientId = 'client123';
const {publicKey, privateKey} = generateKeyPairSync('rsa', {modulusLength: 2048});
const jwks = {k1: publicKey};
const b64u = x => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
function token(claims, {kid = 'k1', key = privateKey} = {}) {
  const head = b64u({alg: 'RS256', kid});
  const body = b64u({iss: `https://cognito-idp.${region}.amazonaws.com/${poolId}`, aud: clientId, token_use: 'id', exp: Math.floor(Date.now() / 1000) + 600, ...claims});
  return `${head}.${body}.${sign('RSA-SHA256', Buffer.from(`${head}.${body}`), key).toString('base64url')}`;
}
const as = role => token({'sub': role + '-sub', 'cognito:username': role + '-user', email: role + '@sb.in', ...(role === 'pending' ? {} : {'cognito:groups': [role]})});

function memoryStore() {
  const items = new Map();
  const auditLog = [];
  const k = (c, id) => c + '|' + id;
  return {
    items, auditLog,
    list: async c => [...items.values()].filter(i => i.c === c),
    changesSince: async since => [...items.values()].filter(i => i.g === 'doc' && i.u > since).sort((a, b) => a.u < b.u ? -1 : 1),
    get: async (c, id) => items.get(k(c, id)) || null,
    put: async (item, expectedV) => {
      const cur = items.get(k(item.c, item.id));
      if (expectedV == null ? cur : !cur || cur.v !== expectedV) throw Object.assign(new Error('cond'), {name: 'ConditionalCheckFailedException'});
      items.set(k(item.c, item.id), structuredClone(item));
    },
    audit: async r => { auditLog.push(r); },
    listAudit: async n => auditLog.slice(-n).reverse()
  };
}
function memoryTeam(people) {
  return {
    people,
    list: async () => people.map(p => ({...p})),
    invite: async ({email, name, role}) => { people.push({user_id: email, email, name, role, enabled: true}); return {ok: true, user_id: email}; },
    setRole: async (id, role) => { people.find(p => p.user_id === id).role = role; }
  };
}

function setup() {
  const store = memoryStore();
  const team = memoryTeam([{user_id: 'owner-user', email: 'owner@sb.in', role: 'owner', enabled: true}, {user_id: 'staff-user', email: 'staff@sb.in', role: 'staff', enabled: true}]);
  let clock = Date.parse('2026-11-14T10:00:00Z');
  const app = createApp({store, team, now: () => clock, verify: t => verifyIdToken(t, {region, poolId, clientId, jwks})});
  const call = (role, method, path, body, query = {}) => app({method, path, query, headers: role ? {authorization: 'Bearer ' + as(role)} : {}, body: body === undefined ? undefined : JSON.stringify(body)});
  return {store, team, call, tick: ms => { clock += ms; }};
}

test('tokens: forged, expired, wrong client and missing tokens are refused', async () => {
  const {call} = setup();
  const other = generateKeyPairSync('rsa', {modulusLength: 2048}).privateKey;
  const tries = [
    token({sub: 'x', 'cognito:groups': ['owner']}, {key: other}),
    token({sub: 'x', 'cognito:groups': ['owner'], exp: Math.floor(Date.now() / 1000) - 5}),
    token({sub: 'x', 'cognito:groups': ['owner'], aud: 'someone-else'}),
    token({sub: 'x', 'cognito:groups': ['owner'], token_use: 'access'}),
    'not-a-token', ''
  ];
  assert.equal((await call(null, 'GET', '/me')).status, 401, 'no header at all');
  const {store, team} = setup();
  const app = createApp({store, team, verify: t => verifyIdToken(t, {region, poolId, clientId, jwks})});
  for (const t of tries) assert.equal((await app({method: 'GET', path: '/me', headers: {authorization: 'Bearer ' + t}})).status, 401, t.slice(0, 20));
  assert.equal((await call('viewer', 'GET', '/me')).body.role, 'viewer');
});

test('roles: viewers read, staff write, only admins delete, pending sees nothing', async () => {
  const {call} = setup();
  const made = await call('staff', 'POST', '/docs/students', {name: 'Asha', fees: {total: 30000}});
  assert.equal(made.status, 200);
  const id = made.body.id;
  assert.equal((await call('viewer', 'GET', '/docs')).body.docs.length, 1);
  assert.equal((await call('viewer', 'POST', '/docs/students', {name: 'X'})).status, 403);
  assert.equal((await call('viewer', 'PATCH', `/docs/students/${id}`, {name: 'Y'})).status, 403);
  assert.equal((await call('staff', 'DELETE', `/docs/students/${id}`)).status, 403);
  assert.equal((await call('pending', 'GET', '/docs')).status, 403);
  assert.equal((await call('pending', 'GET', '/me')).body.role, 'pending');
  assert.equal((await call('admin', 'DELETE', `/docs/students/${id}`)).status, 200);
  assert.equal((await call('viewer', 'GET', '/docs')).body.docs.length, 0);
  assert.equal((await call('admin', 'GET', '/docs/nonsense')).status, 404);
  assert.equal((await call('owner', 'POST', '/docs/audit', {})).status, 404, 'audit is not a writable collection');
});

test('patches merge nested objects (attendance) and replace arrays', async () => {
  const {call} = setup();
  const {body: {id}} = await call('staff', 'POST', '/docs/batches', {code: 'B1', days: ['Mon'], attendance: {'2026-11-10': ['a', 'b']}});
  await call('staff', 'PATCH', `/docs/batches/${id}`, {attendance: {'2026-11-12': ['a']}, days: ['Tue', 'Thu']});
  const doc = (await call('viewer', 'GET', '/docs')).body.docs.find(d => d.id === id).data;
  assert.deepEqual(doc, {code: 'B1', days: ['Tue', 'Thu'], attendance: {'2026-11-10': ['a', 'b'], '2026-11-12': ['a']}});
  assert.equal((await call('staff', 'PATCH', '/docs/batches/missing', {a: 1})).status, 404);
});

test('two people saving at once both keep their changes', async () => {
  const {call} = setup();
  const {body: {id}} = await call('staff', 'POST', '/docs/batches', {attendance: {}});
  await Promise.all([
    call('staff', 'PATCH', `/docs/batches/${id}`, {attendance: {'2026-11-10': ['a']}}),
    call('admin', 'PATCH', `/docs/batches/${id}`, {attendance: {'2026-11-11': ['b']}})
  ]);
  const doc = (await call('viewer', 'GET', '/docs')).body.docs.find(d => d.id === id).data;
  assert.deepEqual(Object.keys(doc.attendance).sort(), ['2026-11-10', '2026-11-11']);
});

test('the change feed returns only what changed, including deletions', async () => {
  const {call, tick} = setup();
  const first = await call('staff', 'POST', '/docs/trainers', {name: 'T1'});
  const {body: {cursor}} = await call('viewer', 'GET', '/docs');
  tick(120e3);
  const second = await call('staff', 'POST', '/docs/trainers', {name: 'T2'});
  await call('admin', 'DELETE', `/docs/trainers/${first.body.id}`);
  const feed = (await call('viewer', 'GET', '/docs', undefined, {since: cursor})).body;
  assert.deepEqual(feed.docs.map(d => [d.id, d.deleted]).sort(), [[first.body.id, true], [second.body.id, false]].sort());
  assert.ok(feed.cursor > cursor);
});

test('changes to students, payments and trainers are audited; admins can read the trail', async () => {
  const {call, store} = setup();
  const {body: {id}} = await call('staff', 'POST', '/docs/payments', {amount: 5000});
  await call('staff', 'PATCH', `/docs/payments/${id}`, {amount: 5500});
  await call('admin', 'DELETE', `/docs/payments/${id}`);
  await call('staff', 'POST', '/docs/enquiries', {name: 'Not audited'});
  assert.deepEqual(store.auditLog.map(a => a.action), ['insert', 'update', 'delete']);
  assert.equal(store.auditLog[1].email, 'staff@sb.in');
  assert.equal((await call('staff', 'GET', '/audit')).status, 403);
  assert.equal((await call('admin', 'GET', '/audit')).body.entries.length, 3);
});

test('team: only the owner invites and changes roles, and the last owner stays', async () => {
  const {call, team} = setup();
  assert.equal((await call('admin', 'POST', '/team', {email: 'a@b.in', role: 'staff'})).status, 403);
  assert.equal((await call('owner', 'POST', '/team', {email: 'new@sb.in', role: 'staff'})).status, 200);
  assert.equal((await call('owner', 'POST', '/team', {email: 'bad', role: 'staff'})).status, 400);
  assert.equal((await call('owner', 'POST', '/team', {email: 'x@sb.in', role: 'superuser'})).status, 400);
  assert.equal((await call('owner', 'PUT', '/team/owner-user', {role: 'staff'})).status, 400, 'cannot demote yourself');
  assert.equal((await call('owner', 'PUT', '/team/staff-user', {role: 'pending'})).status, 200);
  assert.equal(team.people.find(p => p.user_id === 'staff-user').role, 'pending');
  assert.equal((await call('admin', 'GET', '/team')).body.people.length, 3);
  assert.equal((await call('staff', 'GET', '/team')).status, 403);
});

test('website enquiries: anyone can add a New enquiry and nothing else', async () => {
  const {call, store} = setup();
  const r = await call(null, 'POST', '/public/enquiry', {name: ' Asha ', email: 'asha@example.com', kind: 'Corporate training', stage: 'Won', source: 'Referral', notes: 'Hi', sample: true});
  assert.equal(r.status, 200);
  const [saved] = [...store.items.values()];
  const d = JSON.parse(saved.d);
  assert.equal(d.name, 'Asha');
  assert.equal(d.stage, 'New');
  assert.equal(d.source, 'Website');
  assert.equal(d.kind, 'Corporate training');
  assert.ok(!('sample' in d));
  assert.equal((await call(null, 'POST', '/public/enquiry', {email: 'x@y.in'})).status, 400, 'name required');
  assert.equal((await call(null, 'POST', '/public/enquiry', {name: 'Bot', email: 'b@b.in', website: 'spam'})).status, 200);
  assert.equal(store.items.size, 1, 'honeypot submissions are dropped');
  assert.equal((await call(null, 'GET', '/docs')).status, 401);
  assert.equal((await call(null, 'POST', '/docs/enquiries', {name: 'x'})).status, 401);
});
