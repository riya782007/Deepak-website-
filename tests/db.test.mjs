// Checks the console database's roles and row-level security on a real Postgres engine (PGlite).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';

test('database roles and permissions', async () => {
const db = new PGlite();
// Minimal stand-ins for what Supabase provides.
await db.exec(`
create role anon nologin; create role authenticated nologin;
grant usage on schema public to anon, authenticated;
create schema auth;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
`);
await db.exec(await readFile(new URL('../supabase/migrations/0001_operations_console.sql', import.meta.url), 'utf8'));
const U={owner:'00000000-0000-0000-0000-000000000001',staff:'00000000-0000-0000-0000-000000000002',viewer:'00000000-0000-0000-0000-000000000003',newbie:'00000000-0000-0000-0000-000000000004'};
for(const [k,id] of Object.entries(U)) await db.query(`insert into auth.users(id,email) values ($1,$2)`,[id,k+'@sb.in']);
assert.ok((await db.query(`select count(*)::int n from public.staff where role='pending'`)).rows[0].n===4, 'new sign-ins start as pending');
await db.exec(`update public.staff set role='owner' where email='owner@sb.in'`);
async function as(role,uid,sql,params=[]){
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','${uid||''}',false); set role ${role};`);
  try{return await db.query(sql,params)}finally{await db.exec('reset role')}
}
// owner assigns roles
await as('authenticated',U.owner,`update public.staff set role='staff' where email='staff@sb.in'`);
await as('authenticated',U.owner,`update public.staff set role='viewer' where email='viewer@sb.in'`);
const roles=(await db.query(`select email,role from public.staff order by email`)).rows.map(r=>r.email+':'+r.role).join(' ');
assert.ok(roles.includes('staff@sb.in:staff')&&roles.includes('viewer@sb.in:viewer'), 'owner sets roles: ');
// staff cannot promote themselves
const r1=await as('authenticated',U.staff,`update public.staff set role='owner' where email='staff@sb.in' returning 1`);
assert.ok(r1.rows.length===0, 'staff cannot change roles');
// staff writes
const ins=await as('authenticated',U.staff,`insert into public.students(data) values ('{"name":"Asha","fees":{"a":1},"docs":["x"]}') returning id`);
const id=ins.rows[0].id; assert.ok(!!id, 'staff can add a student');
await as('authenticated',U.staff,`select public.patch_doc('students',$1,'{"fees":{"b":2},"docs":["y"]}')`,[id]);
const d=(await db.query(`select data from public.students where id=$1`,[id])).rows[0].data;
assert.ok(d.fees.a===1&&d.fees.b===2&&d.docs.length===1&&d.docs[0]==='y'&&d.name==='Asha', 'patch_doc deep-merges objects and replaces arrays');
const del1=await as('authenticated',U.staff,`delete from public.students where id=$1 returning id`,[id]);
assert.ok(del1.rows.length===0, 'staff cannot delete');
// viewer
assert.ok((await as('authenticated',U.viewer,`select count(*)::int n from public.students`)).rows[0].n===1, 'viewer can read');
let refused=false;try{await as('authenticated',U.viewer,`insert into public.students(data) values ('{"name":"x"}')`)}catch(e){refused=true}
assert.ok(refused, 'viewer cannot add');
let pr=false;try{await as('authenticated',U.viewer,`select public.patch_doc('students',$1,'{"name":"hack"}')`,[id])}catch(e){pr=/Not found or not allowed/.test(e.message)}
assert.ok(pr, 'viewer cannot patch');
// pending user sees nothing
assert.ok((await as('authenticated',U.newbie,`select count(*)::int n from public.students`)).rows[0].n===0, 'pending user sees no records');
// anon website form
await as('anon',null,`insert into public.enquiries(data) values ('{"name":"Web lead","phone":"9000000000","source":"Website","stage":"New"}')`);
assert.ok(true, 'website visitor can submit an enquiry');
let a1=false;try{await as('anon',null,`insert into public.enquiries(data) values ('{"name":"x","source":"Website","stage":"Converted"}')`)}catch(e){a1=true}
assert.ok(a1, 'website visitor cannot set another stage');
let a2=false;try{await as('anon',null,`select * from public.enquiries`)}catch(e){a2=true}
assert.ok(a2, 'website visitor cannot read enquiries');
let a3=false;try{await as('anon',null,`insert into public.students(data) values ('{"name":"x"}')`)}catch(e){a3=true}
assert.ok(a3, 'website visitor cannot write other tables');
let a4=false;try{await as('anon',null,`select public.patch_doc('enquiries','x','{}')`)}catch(e){a4=true}
assert.ok(a4, 'website visitor cannot call patch_doc');
// owner delete + audit
const del2=await as('authenticated',U.owner,`delete from public.students where id=$1 returning id`,[id]);
assert.ok(del2.rows.length===1, 'owner can delete');
const au=(await as('authenticated',U.owner,`select action from public.audit_log where doc_id=$1 order by id`,[id])).rows.map(r=>r.action).join(',');
assert.ok(au==='INSERT,UPDATE,DELETE', 'audit log records changes: ');
assert.ok((await as('authenticated',U.staff,`select count(*)::int n from public.audit_log`)).rows[0].n===0, 'staff cannot read the audit log');
let lo=false;try{await as('authenticated',U.owner,`update public.staff set role='admin' where email='owner@sb.in'`)}catch(e){lo=/owner is required/.test(e.message)}
assert.ok(lo, 'last owner cannot be demoted');

await db.close();
});
