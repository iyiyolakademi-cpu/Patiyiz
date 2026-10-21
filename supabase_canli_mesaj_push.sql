-- PATIYIZ: Mevcut verileri koruyan EK kurulum.
-- Supabase SQL Editor'da BIR KEZ calistirin.
-- Mevcut messages.read_at alani kullanilir.
grant update(read_at) on public.messages to authenticated;
drop policy if exists messages_mark_read on public.messages;
create policy messages_mark_read on public.messages for update to authenticated
 using (receiver_id=(select auth.uid()))
 with check (receiver_id=(select auth.uid()));
-- Existing publication'a tablo ekle (Postgres changes).
do $$ begin
 if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
  alter publication supabase_realtime add table public.messages;
 end if;
 if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
  alter publication supabase_realtime add table public.notifications;
 end if;
end $$;

create table if not exists public.push_subscriptions(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 endpoint text not null unique,
 p256dh text not null,
 auth_secret text not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint push_endpoint_length check(char_length(endpoint)<2048)
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon,authenticated;
grant select,insert,delete,update on public.push_subscriptions to authenticated;
drop policy if exists push_subscriptions_owner_select on public.push_subscriptions;
drop policy if exists push_subscriptions_owner_insert on public.push_subscriptions;
drop policy if exists push_subscriptions_owner_update on public.push_subscriptions;
drop policy if exists push_subscriptions_owner_delete on public.push_subscriptions;
create policy push_subscriptions_owner_select on public.push_subscriptions for select to authenticated using(user_id=(select auth.uid()));
create policy push_subscriptions_owner_insert on public.push_subscriptions for insert to authenticated with check(user_id=(select auth.uid()));
create policy push_subscriptions_owner_update on public.push_subscriptions for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy push_subscriptions_owner_delete on public.push_subscriptions for delete to authenticated using(user_id=(select auth.uid()));
-- Push tokens should never be publicly readable.
