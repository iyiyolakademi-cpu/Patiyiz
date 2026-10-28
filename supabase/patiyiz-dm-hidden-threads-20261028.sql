-- Per-account conversation cleanup, without deleting other participants' messages.
-- Hiding is timestamp-based so a later new message revives the conversation.
create table if not exists public.patiyiz_dm_hidden_threads (
 viewer_id uuid not null references public.profiles(id) on delete cascade,
 peer_id uuid not null references public.profiles(id) on delete cascade,
 hidden_at timestamptz not null default now(),
 constraint patiyiz_dm_hidden_threads_pkey primary key(viewer_id,peer_id),
 constraint patiyiz_dm_hidden_threads_distinct check (viewer_id <> peer_id)
);
alter table public.patiyiz_dm_hidden_threads enable row level security;
revoke all on public.patiyiz_dm_hidden_threads from public,anon,authenticated;
grant select,insert(viewer_id,peer_id),update(hidden_at),delete on public.patiyiz_dm_hidden_threads to authenticated;
drop policy if exists dm_hidden_select_own on public.patiyiz_dm_hidden_threads;
create policy dm_hidden_select_own on public.patiyiz_dm_hidden_threads
 for select to authenticated using(viewer_id=(select auth.uid()));
drop policy if exists dm_hidden_insert_own on public.patiyiz_dm_hidden_threads;
create policy dm_hidden_insert_own on public.patiyiz_dm_hidden_threads
 for insert to authenticated with check(viewer_id=(select auth.uid()));
drop policy if exists dm_hidden_update_own on public.patiyiz_dm_hidden_threads;
create policy dm_hidden_update_own on public.patiyiz_dm_hidden_threads
 for update to authenticated
 using(viewer_id=(select auth.uid()))
 with check(viewer_id=(select auth.uid()));
drop policy if exists dm_hidden_delete_own on public.patiyiz_dm_hidden_threads;
create policy dm_hidden_delete_own on public.patiyiz_dm_hidden_threads
 for delete to authenticated using(viewer_id=(select auth.uid()));
