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
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // Browsers that opened the review copy before Resources existed get its samples too.
      if (!saved.resources) saved.resources = freshStore().resources;
      return saved;
    }
  } catch {}
  return freshStore();
}

const AUDITED = new Set(['students', 'payments', 'payouts', 'trainers', 'engagements', 'resources']);

export function demoBackend({review = false} = {}) {
  let store = load();
  const subs = {};
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {} };
  const snap = c => ({docs: Object.entries(store[c] || {}).map(([id, d]) => ({id, data: () => d}))});
  const fire = c => queueMicrotask(() => (subs[c] || []).forEach(fn => fn()));
  const clone = d => JSON.parse(JSON.stringify(d));
  // Same record of changes the live API keeps, so the Recent changes panel can be tried here.
  const log = (c, action, before, after) => {
    if (!AUDITED.has(c)) return;
    (store._audit ||= []).push({at: new Date().toISOString(), email: 'You', action, coll: c, before: before ? JSON.stringify(before) : null, after: after ? JSON.stringify(after) : null});
    store._audit = store._audit.slice(-200);
  };

  const collection = c => ({
    onSnapshot(cb) {
      const fn = () => cb(snap(c));
      (subs[c] ||= []).push(fn);
      queueMicrotask(fn);
      return () => { subs[c] = subs[c].filter(x => x !== fn); };
    },
    async add(d) {
      const id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()).replace(/-/g, '').slice(0, 20);
      (store[c] ||= {})[id] = clone(d); log(c, 'insert', null, d); persist(); fire(c); return {id};
    },
    doc: id => ({
      async update(patch) { if (!store[c]?.[id]) throw {code: 'not_found'}; const before = store[c][id]; store[c][id] = deepMerge(before, clone(patch)); log(c, 'update', before, store[c][id]); persist(); fire(c); },
      async set(d) { const before = store[c]?.[id]; (store[c] ||= {})[id] = clone(d); log(c, before ? 'update' : 'insert', before, d); persist(); fire(c); },
      async delete() { log(c, 'delete', store[c][id], null); delete store[c][id]; persist(); fire(c); }
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
    mode: 'demo', review, role: 'owner', me: {id: 'demo', name: review ? 'Reviewer' : 'Demo user'}, db, team: null,
    audit: {list: async () => [...(store._audit || [])].reverse()},
    // Review copy: small files are kept in this browser as data, so nothing leaves the device.
    uploads: {
      upload(file, onProgress = () => {}) {
        if (file.size > 1.5 * 1048576) return Promise.reject(new Error('In this review copy, files up to 1.5 MB stay in your browser. The live console takes PDFs up to 25 MB and videos up to 200 MB.'));
        return new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onprogress = e => e.lengthComputable && onProgress(e.loaded / e.total);
          r.onload = () => { onProgress(1); resolve({key: '', url: r.result, name: file.name, size: file.size, type: file.type}); };
          r.onerror = () => reject(new Error('Couldn’t read that file.'));
          r.readAsDataURL(file);
        });
      }
    },
    reset() { try { localStorage.removeItem(KEY); localStorage.removeItem('sb-review-tour-hidden'); } catch {} location.reload(); }
  };
}
