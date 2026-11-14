-- Soft Binomials operations console: tables, roles and row-level security.
-- Run once in the Supabase SQL editor (or `supabase db push`). Project region: ap-south-1 (Mumbai).


-- ---------- staff and roles ----------
create table if not exists public.staff (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text,
  role       text not null default 'pending' check (role in ('pending','viewer','staff','admin','owner')),
  created_at timestamptz not null default now()
);

-- Role of the signed-in person. Security definer so policies on staff don't recurse;
-- it only ever returns the caller's own role.
create or replace function public.staff_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.staff where user_id = auth.uid()
$$;
create or replace function public.can_read()   returns boolean language sql stable as $$ select coalesce(public.staff_role() in ('viewer','staff','admin','owner'), false) $$;
create or replace function public.can_write()  returns boolean language sql stable as $$ select coalesce(public.staff_role() in ('staff','admin','owner'), false) $$;
create or replace function public.can_delete() returns boolean language sql stable as $$ select coalesce(public.staff_role() in ('admin','owner'), false) $$;

-- Everyone who signs in gets a Pending row with no access until the owner sets a role.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.staff (user_id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.staff enable row level security;
revoke all on public.staff from anon;
grant select, update, delete on public.staff to authenticated;
create policy staff_read   on public.staff for select using (public.can_read() or user_id = auth.uid());
create policy staff_owner_update on public.staff for update
  using (public.staff_role() = 'owner') with check (public.staff_role() = 'owner');
create policy staff_owner_delete on public.staff for delete
  using (public.staff_role() = 'owner' and user_id <> auth.uid());

-- An owner can't remove the last owner by accident.
create or replace function public.keep_an_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner')
     and (select count(*) from public.staff where role = 'owner' and user_id <> old.user_id) = 0 then
    raise exception 'At least one owner is required';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists staff_keep_owner on public.staff;
create trigger staff_keep_owner before update or delete on public.staff
  for each row execute function public.keep_an_owner();

-- ---------- helpers ----------
create or replace function public.touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- Nested objects merge key by key; arrays and plain values are replaced (same as admin/merge.js).
create or replace function public.jsonb_deep_merge(a jsonb, b jsonb) returns jsonb
language sql immutable as $$
  select case
    when jsonb_typeof(a) = 'object' and jsonb_typeof(b) = 'object' then (
      select coalesce(jsonb_object_agg(k,
        case when a ? k and b ? k then public.jsonb_deep_merge(a -> k, b -> k)
             when b ? k then b -> k else a -> k end), '{}'::jsonb)
      from (select jsonb_object_keys(a) as k union select jsonb_object_keys(b)) keys)
    else b end
$$;

-- ---------- document tables ----------
do $$
declare t text;
begin
  foreach t in array array['enquiries','students','programmes','batches','trainers','payments','payouts','engagements','config'] loop
    execute format($f$
      create table if not exists public.%1$I (
        id         text primary key default replace(gen_random_uuid()::text, '-', ''),
        data       jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        created_by uuid default auth.uid()
      );
      alter table public.%1$I enable row level security;
      drop policy if exists %1$s_read on public.%1$I;
      drop policy if exists %1$s_insert on public.%1$I;
      drop policy if exists %1$s_update on public.%1$I;
      drop policy if exists %1$s_delete on public.%1$I;
      create policy %1$s_read   on public.%1$I for select using (public.can_read());
      create policy %1$s_insert on public.%1$I for insert with check (public.can_write());
      create policy %1$s_update on public.%1$I for update using (public.can_write()) with check (public.can_write());
      create policy %1$s_delete on public.%1$I for delete using (public.can_delete());
      drop trigger if exists %1$s_touch on public.%1$I;
      create trigger %1$s_touch before update on public.%1$I for each row execute function public.touch();
      revoke all on public.%1$I from anon;
      grant select, insert, update, delete on public.%1$I to authenticated;
    $f$, t);
  end loop;
end $$;

-- Merge a partial change into one document. Runs as the caller, so row-level security applies.
create or replace function public.patch_doc(tbl text, doc_id text, patch jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare result jsonb;
begin
  if tbl not in ('enquiries','students','programmes','batches','trainers','payments','payouts','engagements','config') then
    raise exception 'Unknown table %', tbl;
  end if;
  execute format('update public.%I set data = public.jsonb_deep_merge(data, $1) where id = $2 returning data', tbl)
    into result using patch, doc_id;
  if result is null then raise exception 'Not found or not allowed' using errcode = 'P0002'; end if;
  return result;
end $$;
revoke execute on function public.patch_doc(text, text, jsonb) from anon, public;
grant execute on function public.patch_doc(text, text, jsonb) to authenticated;

-- ---------- website enquiry form ----------
-- Visitors (anon) may only add a New enquiry marked as coming from the website. They can't read anything.
drop policy if exists enquiries_from_website on public.enquiries;
create policy enquiries_from_website on public.enquiries for insert to anon
  with check (
    data ->> 'source' = 'Website'
    and data ->> 'stage' = 'New'
    and coalesce(data ->> 'name', '') <> ''
    and not (data ? 'sample')
    and pg_column_size(data) < 8000
    and created_by is null
  );
grant insert on public.enquiries to anon;

-- ---------- audit trail for money and people ----------
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  table_name text not null,
  doc_id     text not null,
  action     text not null,
  old_data   jsonb,
  new_data   jsonb,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create policy audit_read on public.audit_log for select using (public.can_delete());
revoke all on public.audit_log from anon;
grant select on public.audit_log to authenticated;

create or replace function public.audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (table_name, doc_id, action, old_data, new_data)
  values (tg_table_name, coalesce(new.id, old.id), tg_op,
          case when tg_op <> 'INSERT' then old.data end,
          case when tg_op <> 'DELETE' then new.data end);
  return coalesce(new, old);
end $$;
do $$
declare t text;
begin
  foreach t in array array['students','payments','payouts','engagements','trainers'] loop
    execute format('drop trigger if exists %1$s_audit on public.%1$I; create trigger %1$s_audit after insert or update or delete on public.%1$I for each row execute function public.audit();', t);
  end loop;
end $$;

-- ---------- live updates ----------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['enquiries','students','programmes','batches','trainers','payments','payouts','engagements','config'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- After the owner signs in once, make them the owner:
--   update public.staff set role = 'owner' where email = 'owner@yourcompany.in';
