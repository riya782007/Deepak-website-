// Live backend on AWS: Cognito for sign-in, one Lambda function URL for data.
// No SDK: Cognito's sign-in API and our API are both plain JSON over HTTPS.
import {deepMerge} from './merge.js';

const COLLECTIONS = ['enquiries', 'students', 'programmes', 'batches', 'trainers', 'payments', 'payouts', 'engagements', 'config'];
const KEY = 'sb-console-session';
const POLL_MS = 15000;

// ---------- Cognito ----------
function cognito(region, clientId) {
  const call = async (action, body) => {
    const res = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': 'AWSCognitoIdentityProviderService.' + action},
      body: JSON.stringify({ClientId: clientId, ...body})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw {name: (data.__type || '').split('#').pop(), message: data.message || ''};
    return data;
  };
  return {
    signIn: (email, password) => call('InitiateAuth', {AuthFlow: 'USER_PASSWORD_AUTH', AuthParameters: {USERNAME: email, PASSWORD: password}}),
    newPassword: (session, username, password) => call('RespondToAuthChallenge', {ChallengeName: 'NEW_PASSWORD_REQUIRED', Session: session, ChallengeResponses: {USERNAME: username, NEW_PASSWORD: password}}),
    refresh: token => call('InitiateAuth', {AuthFlow: 'REFRESH_TOKEN_AUTH', AuthParameters: {REFRESH_TOKEN: token}}),
    forgot: email => call('ForgotPassword', {Username: email}),
    confirmForgot: (email, code, password) => call('ConfirmForgotPassword', {Username: email, ConfirmationCode: code, Password: password}),
    revoke: token => call('RevokeToken', {Token: token}).catch(() => {})
  };
}

const claimsOf = jwt => JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const store = s => { try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch {} };
const fromResult = (r, refresh) => ({id: r.AuthenticationResult.IdToken, refresh: r.AuthenticationResult.RefreshToken || refresh, exp: claimsOf(r.AuthenticationResult.IdToken).exp * 1000});

// Friendly wording for Cognito's error names.
function say(e) {
  switch (e && e.name) {
    case 'NotAuthorizedException': return /disabled/i.test(e.message) ? 'This account has been switched off. Ask the console owner.' : 'Email or password is wrong.';
    case 'UserNotFoundException': return 'Email or password is wrong.';
    case 'InvalidPasswordException': return 'Choose a password of at least 10 characters with lowercase letters and a number.';
    case 'CodeMismatchException': return 'That code is wrong. Check the latest email.';
    case 'ExpiredCodeException': return 'That code has expired. Ask for a new one.';
    case 'LimitExceededException': case 'TooManyRequestsException': return 'Too many attempts. Wait a few minutes and try again.';
    case 'PasswordResetRequiredException': return 'You need to reset your password. Use “Forgot password”.';
    default: return 'Couldn’t sign in. Check your connection and try again.';
  }
}

// ---------- Sign-in panels ----------
function panel(html) {
  let el = document.getElementById('gate');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gate';
    el.className = 'gate';
    document.body.appendChild(el);
  }
  document.getElementById('app').hidden = true;
  el.innerHTML = `<div class="gate-card"><div class="brand"><div class="mark" aria-hidden="true">sb</div><div><b>Soft Binomials</b><small>Admin console</small></div></div>${html}</div>`;
  return el;
}
const closeGate = () => { document.getElementById('gate')?.remove(); document.getElementById('app').hidden = false; };
const field = (id, label, type, extra = '') => `<label class="fld"><span>${label}</span><input id="${id}" type="${type}" required ${extra}></label>`;
const form = (id, fields, button, links = '') => `<form id="${id}" class="f" style="grid-template-columns:1fr">${fields}<div class="f-acts" style="justify-content:flex-start;gap:12px;flex-wrap:wrap"><button class="btn pri" type="submit">${button}</button>${links}</div><p role="status" class="gate-msg"></p></form>`;

function bind(el, id, handler) {
  const f = el.querySelector('#' + id);
  const msg = f.querySelector('.gate-msg');
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = f.querySelector('button[type=submit]');
    btn.disabled = true;
    msg.textContent = '';
    try { await handler(f, msg); } catch (err) { msg.textContent = say(err); } finally { btn.disabled = false; }
  });
}

function signInFlow(auth) {
  return new Promise(resolve => {
    const showSignIn = note => {
      const el = panel(`<h1>Sign in</h1><p>${note || 'Use the email your console owner invited.'}</p>
        ${form('signin', field('si-email', 'Work email', 'email', 'autocomplete="username"') + field('si-pass', 'Password', 'password', 'autocomplete="current-password"'), 'Sign in', '<button class="btn ghost" type="button" id="si-forgot">Forgot password</button>')}`);
      el.querySelector('#si-forgot').addEventListener('click', () => showForgot(el.querySelector('#si-email').value.trim()));
      bind(el, 'signin', async f => {
        const email = f.querySelector('#si-email').value.trim();
        const r = await auth.signIn(email, f.querySelector('#si-pass').value);
        if (r.ChallengeName === 'NEW_PASSWORD_REQUIRED') return showNewPassword(r.Session, r.ChallengeParameters.USER_ID_FOR_SRP || email);
        resolve(fromResult(r));
      });
    };
    const showNewPassword = (session, username) => {
      const el = panel(`<h1>Choose your password</h1><p>This replaces the temporary password from your invitation. Use at least 10 characters with lowercase letters and a number.</p>
        ${form('newpass', field('np-pass', 'New password', 'password', 'autocomplete="new-password" minlength="10"'), 'Save and sign in')}`);
      bind(el, 'newpass', async f => resolve(fromResult(await auth.newPassword(session, username, f.querySelector('#np-pass').value))));
    };
    const showForgot = email => {
      const el = panel(`<h1>Reset your password</h1><p>We’ll email you a code.</p>
        ${form('forgot', field('fp-email', 'Work email', 'email', 'autocomplete="username"'), 'Email me a code', '<button class="btn ghost" type="button" id="fp-back">Back to sign in</button>')}`);
      el.querySelector('#fp-email').value = email || '';
      el.querySelector('#fp-back').addEventListener('click', () => showSignIn());
      bind(el, 'forgot', async f => { const e = f.querySelector('#fp-email').value.trim(); await auth.forgot(e); showReset(e); });
    };
    const showReset = email => {
      const el = panel(`<h1>Enter the code</h1><p>If <b></b> has console access, a code is on its way. It can take a minute.</p>
        ${form('reset', field('rs-code', 'Code from the email', 'text', 'inputmode="numeric" autocomplete="one-time-code"') + field('rs-pass', 'New password', 'password', 'autocomplete="new-password" minlength="10"'), 'Save new password', '<button class="btn ghost" type="button" id="rs-back">Back to sign in</button>')}`);
      el.querySelector('p b').textContent = email;
      el.querySelector('#rs-back').addEventListener('click', () => showSignIn());
      bind(el, 'reset', async f => { await auth.confirmForgot(email, f.querySelector('#rs-code').value.trim(), f.querySelector('#rs-pass').value); showSignIn('Password saved. Sign in with your new password.'); });
    };
    showSignIn();
  });
}

// ---------- Data ----------
function makeDb(api) {
  const cache = Object.fromEntries(COLLECTIONS.map(c => [c, new Map()]));
  const listeners = Object.fromEntries(COLLECTIONS.map(c => [c, new Set()]));
  const errorListeners = new Set();
  let cursor = null, loading = null, timer = null;

  const emit = c => {
    const snap = {docs: [...cache[c]].map(([id, data]) => ({id, data: () => data}))};
    listeners[c].forEach(cb => cb(snap));
  };
  const apply = docs => {
    const touched = new Set();
    for (const d of docs) {
      if (!cache[d.c]) continue;
      if (d.deleted) cache[d.c].delete(d.id); else cache[d.c].set(d.id, d.data);
      touched.add(d.c);
    }
    touched.forEach(emit);
  };
  const poll = async () => {
    clearTimeout(timer);
    try {
      const r = await api('GET', '/docs?since=' + encodeURIComponent(cursor));
      apply(r.docs);
      cursor = r.cursor;
    } catch (e) { console.warn('Refresh failed', e); }
    schedule();
  };
  const schedule = () => { clearTimeout(timer); if (!document.hidden) timer = setTimeout(poll, POLL_MS); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && cursor) poll(); else clearTimeout(timer); });
  const start = () => loading ??= api('GET', '/docs').then(r => {
    apply(r.docs);
    COLLECTIONS.forEach(emit); // empty collections still need a first snapshot
    cursor = r.cursor;
    schedule();
  }).catch(e => { loading = null; errorListeners.forEach(f => f(e)); throw e; });

  const after = r => { if (r && r.c) apply([r]); return r; };
  const collection = c => {
    if (!cache[c]) throw new Error('Unknown collection ' + c);
    return {
      onSnapshot(cb, onError) {
        listeners[c].add(cb);
        if (onError) errorListeners.add(onError);
        start().then(() => cb({docs: [...cache[c]].map(([id, data]) => ({id, data: () => data}))})).catch(() => {});
        return () => { listeners[c].delete(cb); if (onError) errorListeners.delete(onError); };
      },
      add: async d => ({id: after(await api('POST', `/docs/${c}`, d)).id}),
      doc: id => ({
        update: async p => {
          // Show the change immediately, then take the server's merged copy.
          if (cache[c].has(id)) { cache[c].set(id, deepMerge(cache[c].get(id), p)); emit(c); }
          after(await api('PATCH', `/docs/${c}/${encodeURIComponent(id)}`, p));
        },
        set: async d => { after(await api('PUT', `/docs/${c}/${encodeURIComponent(id)}`, d)); },
        delete: async () => { await api('DELETE', `/docs/${c}/${encodeURIComponent(id)}`); apply([{c, id, deleted: true}]); }
      })
    };
  };
  return {
    collection,
    doc(path) {
      const [c, id] = path.split('/');
      const col = collection(c);
      return {
        onSnapshot: (cb, onError) => col.onSnapshot(s => { const d = s.docs.find(x => x.id === id); cb({exists: !!d, data: () => d && d.data()}); }, onError),
        set: d => col.doc(id).set(d),
        update: async p => { if (cache[c].has(id)) return col.doc(id).update(p); return col.doc(id).set(p); }
      };
    }
  };
}

// ---------- Entry ----------
export async function awsBackend({api: apiUrl, region, clientId}) {
  const auth = cognito(region, clientId);
  let session = load();
  if (!session) { session = await signInFlow(auth); store(session); }

  let refreshing = null;
  const token = async (force = false) => {
    if (!force && session.exp - Date.now() > 60e3) return session.id;
    refreshing ??= auth.refresh(session.refresh).then(r => { session = fromResult(r, session.refresh); store(session); })
      .catch(() => { store(null); location.reload(); }).finally(() => { refreshing = null; });
    await refreshing;
    return session.id;
  };
  const base = apiUrl.replace(/\/$/, '');
  const api = async (method, path, body, retried) => {
    const res = await fetch(base + path, {
      method,
      headers: {Authorization: 'Bearer ' + await token(retried), ...(body !== undefined ? {'Content-Type': 'application/json'} : {})},
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    if (res.status === 401 && !retried) return api(method, path, body, true);
    const data = await res.json().catch(() => ({}));
    if (res.status === 403) throw {code: 'invalid_argument', message: data.error};
    if (!res.ok) throw {code: 'unknown', status: res.status, message: data.error};
    return data;
  };

  const signOut = async () => { await auth.revoke(session.refresh); store(null); location.reload(); };
  let me;
  try { me = await api('GET', '/me'); } catch (e) { store(null); location.reload(); return null; }

  if (me.role === 'pending') {
    const el = panel(`<h1>No access yet</h1><p>You’re signed in as <b></b>, but you don’t have a role. Ask the console owner to give you one in Setup, then Team and roles.</p><div class="f-acts" style="justify-content:flex-start"><button class="btn" id="gate-out">Sign out</button></div>`);
    el.querySelector('b').textContent = me.email;
    el.querySelector('#gate-out').addEventListener('click', signOut);
    return null;
  }
  closeGate();
  return {
    mode: 'live',
    role: me.role,
    me: {id: me.id, name: me.name || me.email, email: me.email},
    db: makeDb(api),
    signOut,
    audit: me.role === 'owner' || me.role === 'admin' ? {list: async () => (await api('GET', '/audit?limit=100')).entries} : null,
    team: me.role !== 'owner' && me.role !== 'admin' ? null : {
      list: async () => (await api('GET', '/team')).people,
      setRole: (id, role) => api('PUT', `/team/${encodeURIComponent(id)}`, {role}),
      invite: (email, name, role) => api('POST', '/team', {email, name, role})
    }
  };
}
