// Request handling for the console API, kept free of AWS calls so it can be tested
// with in-memory fakes (tests/api.test.mjs). aws.mjs supplies the real store and team.
import {randomBytes} from 'node:crypto';
import {deepMerge} from './merge.mjs';

export const COLLECTIONS = ['enquiries', 'students', 'programmes', 'batches', 'trainers', 'payments', 'payouts', 'engagements', 'config'];
const AUDITED = new Set(['students', 'payments', 'payouts', 'trainers', 'engagements']);
export const ROLES = ['viewer', 'staff', 'admin', 'owner'];
const RANK = {pending: 0, viewer: 1, staff: 2, admin: 3, owner: 4};
const KINDS = ['Student course', 'Corporate training', 'HR consulting', 'Technology project', 'Student services', 'Personal development'];
const TOMBSTONE_DAYS = 30;
const OVERLAP_MS = 60e3; // re-send the last minute of changes so nothing is missed between polls

const newId = () => Date.now().toString(36) + randomBytes(6).toString('hex');
const stamp = now => new Date(now).toISOString() + '#' + randomBytes(3).toString('hex');

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const need = (ok, status, message) => { if (!ok) throw new HttpError(status, message); };

export function roleFrom(claims) {
  const groups = claims['cognito:groups'] || [];
  return [...ROLES].reverse().find(r => groups.includes(r)) || 'pending';
}

const publicDoc = item => ({c: item.c, id: item.id, u: item.u, deleted: !!item.deleted, data: item.deleted ? null : JSON.parse(item.d)});

function cleanEnquiry(body) {
  const s = (v, max) => String(v ?? '').trim().slice(0, max);
  const name = s(body.name, 120);
  const email = s(body.email, 200);
  const phone = s(body.phone, 40);
  need(name.length > 0, 400, 'Name is required');
  need(email.length > 0 || phone.length > 0, 400, 'Email or phone is required');
  need(!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 400, 'Email looks wrong');
  const today = new Date(Date.now() + 330 * 60e3).toISOString().slice(0, 10); // India date
  return {
    name, phone, email,
    kind: KINDS.includes(body.kind) ? body.kind : 'Student course',
    programmeId: '', source: 'Website', stage: 'New', centre: '', followUp: today,
    notes: s(body.notes, 4000)
  };
}

export function createApp({store, team, verify, now = () => Date.now()}) {
  async function writeDoc(user, c, id, data, {mustExist, mustNotExist} = {}) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const before = await store.get(c, id);
      if (mustExist) need(before && !before.deleted, 404, 'Not found');
      if (mustNotExist) need(!before, 409, 'Already exists');
      const next = typeof data === 'function' ? data(before && !before.deleted ? JSON.parse(before.d) : {}) : data;
      need(next && typeof next === 'object' && !Array.isArray(next), 400, 'Record must be an object');
      const item = {c, id, d: JSON.stringify(next), v: (before?.v || 0) + 1, u: stamp(now()), g: 'doc', by: user.id};
      need(item.d.length < 350_000, 413, 'Record is too large');
      try {
        await store.put(item, before ? before.v : null);
      } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') continue; // someone saved at the same moment; merge again
        throw e;
      }
      if (AUDITED.has(c)) await store.audit({at: new Date(now()).toISOString(), by: user.id, email: user.email, action: before && !before.deleted ? 'update' : 'insert', coll: c, docId: id, before: before && !before.deleted ? before.d : null, after: item.d});
      return item;
    }
    throw new HttpError(409, 'Busy, try again');
  }

  const routes = {
    'GET /me': async u => ({id: u.id, email: u.email, name: u.name, role: u.role}),

    'GET /docs': async (u, {query}) => {
      need(RANK[u.role] >= RANK.viewer, 403, 'No access');
      const at = now();
      let items;
      if (query.since) items = await store.changesSince(String(query.since));
      else items = (await Promise.all(COLLECTIONS.map(c => store.list(c)))).flat().filter(i => !i.deleted);
      const floor = new Date(at - OVERLAP_MS).toISOString();
      const cursor = query.since && query.since > floor ? query.since : floor;
      return {docs: items.map(publicDoc), cursor};
    },

    'POST /docs/:c': async (u, {params, body}) => {
      need(RANK[u.role] >= RANK.staff, 403, 'Read only');
      return publicDoc(await writeDoc(u, params.c, newId(), body, {mustNotExist: true}));
    },

    'PUT /docs/:c/:id': async (u, {params, body}) => {
      need(RANK[u.role] >= RANK.staff, 403, 'Read only');
      return publicDoc(await writeDoc(u, params.c, params.id, body));
    },

    'PATCH /docs/:c/:id': async (u, {params, body}) => {
      need(RANK[u.role] >= RANK.staff, 403, 'Read only');
      need(body && typeof body === 'object' && !Array.isArray(body), 400, 'Patch must be an object');
      return publicDoc(await writeDoc(u, params.c, params.id, old => deepMerge(old, body), {mustExist: true}));
    },

    'DELETE /docs/:c/:id': async (u, {params}) => {
      need(RANK[u.role] >= RANK.admin, 403, 'Only admins can delete');
      const before = await store.get(params.c, params.id);
      need(before && !before.deleted, 404, 'Not found');
      const item = {c: params.c, id: params.id, d: '{}', v: before.v + 1, u: stamp(now()), g: 'doc', by: u.id, deleted: true, ttl: Math.floor(now() / 1000) + TOMBSTONE_DAYS * 86400};
      await store.put(item, before.v);
      if (AUDITED.has(params.c)) await store.audit({at: new Date(now()).toISOString(), by: u.id, email: u.email, action: 'delete', coll: params.c, docId: params.id, before: before.d, after: null});
      return {ok: true};
    },

    'GET /audit': async (u, {query}) => {
      need(RANK[u.role] >= RANK.admin, 403, 'Only admins can read the audit trail');
      return {entries: await store.listAudit(Math.min(Number(query.limit) || 200, 1000))};
    },

    'GET /team': async u => {
      need(RANK[u.role] >= RANK.admin, 403, 'No access');
      return {people: await team.list()};
    },

    'POST /team': async (u, {body}) => {
      need(u.role === 'owner', 403, 'Only the owner manages the team');
      const email = String(body.email || '').trim().toLowerCase();
      need(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 400, 'Email looks wrong');
      need(ROLES.includes(body.role), 400, 'Pick a role');
      return team.invite({email, name: String(body.name || '').trim().slice(0, 120), role: body.role});
    },

    'PUT /team/:id': async (u, {params, body}) => {
      need(u.role === 'owner', 403, 'Only the owner manages the team');
      const role = body.role;
      need(role === 'pending' || ROLES.includes(role), 400, 'Unknown role');
      need(params.id !== u.id || role === 'owner', 400, 'You can’t remove your own owner role');
      if (role !== 'owner') {
        const people = await team.list();
        const target = people.find(p => p.user_id === params.id);
        need(target, 404, 'Not found');
        const owners = people.filter(p => p.role === 'owner' && p.enabled !== false);
        need(!(target.role === 'owner' && owners.length <= 1), 400, 'There must always be at least one owner');
      }
      await team.setRole(params.id, role);
      return {ok: true};
    },

    'POST /public/enquiry': async (_u, {body}) => {
      if (body.website) return {ok: true}; // honeypot field filled in by bots: accept and drop
      const data = cleanEnquiry(body);
      await writeDoc({id: 'website', email: ''}, 'enquiries', newId(), data, {mustNotExist: true});
      return {ok: true};
    }
  };

  const compiled = Object.entries(routes).map(([key, fn]) => {
    const [method, path] = key.split(' ');
    const names = [];
    const re = new RegExp('^' + path.replace(/:(\w+)/g, (_, n) => (names.push(n), '([^/]+)')) + '/?$');
    return {method, re, names, fn, open: path.startsWith('/public/')};
  });

  return async function handle({method, path, headers = {}, query = {}, body}) {
    try {
      const route = compiled.find(r => r.method === method && r.re.test(path));
      need(route, 404, 'Not found');
      const m = path.match(route.re);
      const params = Object.fromEntries(route.names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
      if (params.c) need(COLLECTIONS.includes(params.c), 404, 'Unknown collection');
      if (params.id) need(/^[\w-]{1,80}$/.test(params.id), 400, 'Bad id');
      let user = null;
      if (!route.open) {
        const token = String(headers.authorization || '').replace(/^Bearer\s+/i, '');
        let claims;
        try { claims = await verify(token); } catch { throw new HttpError(401, 'Sign in again'); }
        user = {id: claims['cognito:username'] || claims.sub, email: claims.email, name: claims.name || claims.email, role: roleFrom(claims)};
      }
      let parsed = {};
      if (body) { try { parsed = JSON.parse(body); } catch { throw new HttpError(400, 'Body must be JSON'); } }
      return {status: 200, body: await route.fn(user, {params, query, body: parsed})};
    } catch (e) {
      if (e instanceof HttpError) return {status: e.status, body: {error: e.message}};
      console.error(e);
      return {status: 500, body: {error: 'Something went wrong'}};
    }
  };
}
