-- A personal, synced pinned message per direct-message conversation.
-- Existing messages remain untouched and deletion cascades only the pin record.
create table if not exists public.patiyiz_dm_message_pins (
 viewer_id uuid not null references public.profiles(id) on delete cascade,
 peer_id uuid not null references public.profiles(id) on delete cascade,
 message_id uuid not null references public.messages(id) on delete cascade,
 pinned_at timestamptz not null default now(),
 constraint patiyiz_dm_message_pins_pkey primary key (viewer_id, peer_id),
 constraint patiyiz_dm_message_pins_distinct check (viewer_id <> peer_id)
);
create index if not exists patiyiz_dm_message_pins_message_idx
 on public.patiyiz_dm_message_pins(message_id);
alter table public.patiyiz_dm_message_pins enable row level security;
revoke all on table public.patiyiz_dm_message_pins from public,anon,authenticated;
grant select,insert,update,delete on public.patiyiz_dm_message_pins to authenticated;

drop policy if exists dm_pins_select_own on public.patiyiz_dm_message_pins;
create policy dm_pins_select_own on public.patiyiz_dm_message_pins
 for select to authenticated using(viewer_id=(select auth.uid()));
drop policy if exists dm_pins_insert_own on public.patiyiz_dm_message_pins;
create policy dm_pins_insert_own on public.patiyiz_dm_message_pins
 for insert to authenticated with check (
  viewer_id=(select auth.uid())
  and not public.patiyiz_users_blocked(viewer_id,peer_id)
  and exists(
   select 1 from public.messages m
   where m.id=message_id
     and ((m.sender_id=viewer_id and m.receiver_id=peer_id)
       or (m.sender_id=peer_id and m.receiver_id=viewer_id))
  )
 );
drop policy if exists dm_pins_update_own on public.patiyiz_dm_message_pins;
create policy dm_pins_update_own on public.patiyiz_dm_message_pins
 for update to authenticated
 using(viewer_id=(select auth.uid()))
 with check(
  viewer_id=(select auth.uid())
  and not public.patiyiz_users_blocked(viewer_id,peer_id)
  and exists(
   select 1 from public.messages m
   where m.id=message_id
     and ((m.sender_id=viewer_id and m.receiver_id=peer_id)
       or (m.sender_id=peer_id and m.receiver_id=viewer_id))
  )
 );
drop policy if exists dm_pins_delete_own on public.patiyiz_dm_message_pins;
create policy dm_pins_delete_own on public.patiyiz_dm_message_pins
 for delete to authenticated using(viewer_id=(select auth.uid()));
