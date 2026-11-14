// Demo backend: sample records kept in this browser only (localStorage), with the
// same small interface as the live store, so the console can be shown without a database.
import seed from './demo-seed.json';
import {deepMerge} from './merge.js';

const KEY = 'sb-console-demo-v1';
const SEED_DAY = '2026-11-12';
const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Move every date in the sample so the demo always looks current.
function shift(value, days) {
  if (typeof value === 'string' && ISO.test(value)) {
    const d = new Date(value + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  if (Array.isArray(value)) return value.map(v => shift(v, days));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[ISO.test(k) ? shift(k, days) : k] = shift(v, days);
    return out;
  }
  return value;
}

function freshStore() {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const days = Math.round((Date.parse(local) - Date.parse(SEED_DAY)) / 864e5);
  const store = {};
  for (const [col, docs] of Object.entries(seed)) {
    store[col] = {};
    for (const {id, ...data} of docs) store[col][id] = shift(data, days);
  }
  store.config = {main: {orgName: 'Soft Binomials India', centres: ['Nagpur', 'Mumbai', 'Online', 'Client site']}};
  return store;
}

function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch {}
  return freshStore();
}

export function demoBackend() {
  let store = load();
  const subs = {};
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {} };
  const snap = c => ({docs: Object.entries(store[c] || {}).map(([id, d]) => ({id, data: () => d}))});
  const fire = c => queueMicrotask(() => (subs[c] || []).forEach(fn => fn()));
  const clone = d => JSON.parse(JSON.stringify(d));

  const collection = c => ({
    onSnapshot(cb) {
      const fn = () => cb(snap(c));
      (subs[c] ||= []).push(fn);
      queueMicrotask(fn);
      return () => { subs[c] = subs[c].filter(x => x !== fn); };
    },
    async add(d) {
      const id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()).replace(/-/g, '').slice(0, 20);
      (store[c] ||= {})[id] = clone(d); persist(); fire(c); return {id};
    },
    doc: id => ({
      async update(patch) { if (!store[c]?.[id]) throw {code: 'not_found'}; store[c][id] = deepMerge(store[c][id], clone(patch)); persist(); fire(c); },
      async set(d) { (store[c] ||= {})[id] = clone(d); persist(); fire(c); },
      async delete() { delete store[c][id]; persist(); fire(c); }
    })
  });

  const db = {
    collection,
    doc(path) {
      const [c, id] = path.split('/');
      const col = collection(c);
      return {
        onSnapshot: cb => col.onSnapshot(s => { const d = s.docs.find(x => x.id === id); cb({exists: !!d, data: () => d && d.data()}); }),
        set: d => col.doc(id).set(d),
        update: p => col.doc(id).update(p)
      };
    }
  };

  return {
    mode: 'demo', role: 'owner', me: {id: 'demo', name: 'Demo user'}, db, team: null,
    reset() { try { localStorage.removeItem(KEY); } catch {} location.reload(); }
  };
}
