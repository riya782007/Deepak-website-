// Live backend: Supabase (Postgres + sign-in + realtime). Every table holds one
// JSON document per row, protected by row-level security (supabase/migrations).
import {createClient} from '@supabase/supabase-js';

const TABLES = ['enquiries', 'students', 'programmes', 'batches', 'trainers', 'payments', 'payouts', 'engagements', 'config'];

// Map database errors onto the codes the console already explains to people.
function normalise(error) {
  const c = error && (error.code || '');
  if (c === '42501' || c === 'P0002' || /permission|row-level security|not found/i.test(error?.message || '')) return {code: 'invalid_argument', cause: error};
  return {code: 'unknown', cause: error};
}

function makeDb(sb) {
  const collection = c => {
    if (!TABLES.includes(c)) throw new Error('Unknown collection ' + c);
    return {
      onSnapshot(cb, onError) {
        const rows = new Map();
        const emit = () => cb({docs: [...rows].map(([id, data]) => ({id, data: () => data}))});
        let ready = false;
        const channel = sb.channel('rt-' + c)
          .on('postgres_changes', {event: '*', schema: 'public', table: c}, p => {
            if (p.eventType === 'DELETE') rows.delete(p.old.id); else rows.set(p.new.id, p.new.data);
            if (ready) emit();
          })
          .subscribe();
        (async () => {
          try {
            for (let from = 0; ; from += 1000) {
              const {data, error} = await sb.from(c).select('id,data').order('id').range(from, from + 999);
              if (error) throw error;
              data.forEach(r => rows.set(r.id, r.data));
              if (data.length < 1000) break;
            }
            ready = true; emit();
          } catch (e) { onError && onError(normalise(e)); }
        })();
        return () => sb.removeChannel(channel);
      },
      async add(d) {
        const {data, error} = await sb.from(c).insert({data: d}).select('id').single();
        if (error) throw normalise(error);
        return {id: data.id};
      },
      doc: id => ({
        async update(patch) {
          const {error} = await sb.rpc('patch_doc', {tbl: c, doc_id: id, patch});
          if (error) throw normalise(error);
        },
        async set(d) {
          const {error} = await sb.from(c).upsert({id, data: d});
          if (error) throw normalise(error);
        },
        async delete() {
          const {data, error} = await sb.from(c).delete().eq('id', id).select('id');
          if (error) throw normalise(error);
          if (!data.length) throw {code: 'invalid_argument'}; // row-level security refused it silently
        }
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
        update: p => col.doc(id).update(p)
      };
    }
  };
}

// Simple full-screen panels shown before the console starts.
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
function closeGate() {
  document.getElementById('gate')?.remove();
  document.getElementById('app').hidden = false;
}

function signInScreen(sb) {
  const el = panel(`<h1>Sign in</h1><p>Enter your work email. We’ll email you a sign-in link; no password needed.</p>
    <form id="signin" class="f" style="grid-template-columns:1fr"><label class="fld"><span>Work email</span><input id="signin-email" type="email" autocomplete="email" required></label>
    <div class="f-acts" style="justify-content:flex-start"><button class="btn pri" type="submit">Email me a sign-in link</button></div><p id="signin-msg" role="status" class="gate-msg"></p></form>`);
  el.querySelector('#signin').addEventListener('submit', async e => {
    e.preventDefault();
    const email = el.querySelector('#signin-email').value.trim();
    const msg = el.querySelector('#signin-msg');
    const btn = el.querySelector('button[type=submit]');
    btn.disabled = true;
    const {error} = await sb.auth.signInWithOtp({email, options: {emailRedirectTo: location.origin + location.pathname}});
    btn.disabled = false;
    msg.textContent = error
      ? (/rate/i.test(error.message) ? 'Too many sign-in emails were sent. Wait a few minutes and try again.' : 'Couldn’t send the link. Check the email address and try again.')
      : `Check ${email} for a sign-in link. You can close this tab after opening it.`;
  });
}

export async function liveBackend(url, key) {
  const sb = createClient(url, key, {auth: {persistSession: true, detectSessionInUrl: true}});
  const {data: {session}} = await sb.auth.getSession();
  if (!session) {
    signInScreen(sb);
    sb.auth.onAuthStateChange((event, s) => { if (s) location.reload(); });
    return null;
  }
  const user = session.user;
  const signOut = async () => { await sb.auth.signOut(); location.reload(); };
  const {data: me} = await sb.from('staff').select('user_id,email,name,role').eq('user_id', user.id).maybeSingle();
  const role = me?.role || 'pending';
  if (role === 'pending') {
    const el = panel(`<h1>Waiting for approval</h1><p>You’re signed in as <b></b>. The console owner needs to give you a role before you can see records. Ask them to open Setup, then Team and roles.</p><div class="f-acts" style="justify-content:flex-start"><button class="btn" id="gate-out">Sign out</button></div>`);
    el.querySelector('b').textContent = user.email;
    el.querySelector('#gate-out').addEventListener('click', signOut);
    return null;
  }
  closeGate();
  return {
    mode: 'live',
    role,
    me: {id: user.id, name: me?.name || user.email, email: user.email},
    db: makeDb(sb),
    signOut,
    team: {
      async list() {
        const {data, error} = await sb.from('staff').select('user_id,email,name,role,created_at').order('created_at');
        if (error) throw error;
        return data;
      },
      async setRole(id, newRole) {
        const {data, error} = await sb.from('staff').update({role: newRole}).eq('user_id', id).select('user_id');
        if (error || !data.length) throw error || new Error('refused');
      }
    }
  };
}
