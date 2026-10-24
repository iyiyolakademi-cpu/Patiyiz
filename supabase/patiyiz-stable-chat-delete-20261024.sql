-- Stable Patiyiz messaging: secure sender edits and cross-device deletion signals.
-- Delete RPC lives in authenticated Edge Function; customers cannot DELETE messages directly.
-- Grant only mutable text columns; existing sender-only RLS and 15 minute edit trigger stay enforced.
grant update(body,edited_at) on public.messages to authenticated;
revoke delete on public.messages from public,anon,authenticated;

create table if not exists public.patiyiz_dm_deletion_events(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 message_id uuid not null,
 deleted_at timestamptz not null default now()
);
create index if not exists patiyiz_dm_deletion_events_owner_date_idx
 on public.patiyiz_dm_deletion_events(owner_id,deleted_at desc);
alter table public.patiyiz_dm_deletion_events enable row level security;
revoke all on public.patiyiz_dm_deletion_events from public,anon,authenticated;
grant select on public.patiyiz_dm_deletion_events to authenticated;
drop policy if exists "dm_deletion_events_self_select" on public.patiyiz_dm_deletion_events;
create policy "dm_deletion_events_self_select" on public.patiyiz_dm_deletion_events
 for select to authenticated using (owner_id=(select auth.uid()));

create or replace function public.patiyiz_notify_deleted_dm() returns trigger
 language plpgsql security definer set search_path=''
 as $body$
 begin
  insert into public.patiyiz_dm_deletion_events(owner_id,message_id)
   values(old.sender_id,old.id),(old.receiver_id,old.id);
  return old;
 end
 $body$;
revoke all on function public.patiyiz_notify_deleted_dm() from public,anon,authenticated;
drop trigger if exists patiyiz_dm_deleted_signal on public.messages;
create trigger patiyiz_dm_deleted_signal after delete on public.messages
 for each row execute function public.patiyiz_notify_deleted_dm();

-- Publish owner-scoped deletion events via realtime; trigger row data contains no message text.
do $body$
begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
   and schemaname='public' and tablename='patiyiz_dm_deletion_events') then
  alter publication supabase_realtime add table public.patiyiz_dm_deletion_events;
 end if;
end
$body$;
