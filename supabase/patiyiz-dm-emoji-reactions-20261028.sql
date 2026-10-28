-- Patiyiz private DM reactions. Participants only, one reaction per user per message.
-- Idempotent for repeated deployment; existing message rows remain untouched.
create table if not exists public.patiyiz_dm_reactions (
 message_id uuid not null references public.messages(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 emoji text not null check (emoji in ('❤️','😂','😮','😢','👏','🐾')),
 created_at timestamptz not null default now(),
 primary key (message_id,user_id)
);
create index if not exists patiyiz_dm_reactions_user_idx on public.patiyiz_dm_reactions(user_id,created_at desc);
alter table public.patiyiz_dm_reactions enable row level security;
revoke all on table public.patiyiz_dm_reactions from public,anon,authenticated;
grant select,insert,delete on table public.patiyiz_dm_reactions to authenticated;
grant update(emoji) on table public.patiyiz_dm_reactions to authenticated;

drop policy if exists pati_dm_reactions_read on public.patiyiz_dm_reactions;
create policy pati_dm_reactions_read on public.patiyiz_dm_reactions for select to authenticated
using (exists (
 select 1 from public.messages m where m.id=message_id
 and (m.sender_id=(select auth.uid()) or m.receiver_id=(select auth.uid()))
 and not public.patiyiz_users_blocked(m.sender_id,m.receiver_id)
));
drop policy if exists pati_dm_reactions_insert on public.patiyiz_dm_reactions;
create policy pati_dm_reactions_insert on public.patiyiz_dm_reactions for insert to authenticated
with check (
 user_id=(select auth.uid()) and exists (
  select 1 from public.messages m where m.id=message_id
  and (m.sender_id=(select auth.uid()) or m.receiver_id=(select auth.uid()))
  and not public.patiyiz_users_blocked(m.sender_id,m.receiver_id)
 )
);
drop policy if exists pati_dm_reactions_update on public.patiyiz_dm_reactions;
create policy pati_dm_reactions_update on public.patiyiz_dm_reactions for update to authenticated
using (user_id=(select auth.uid()) and exists (
 select 1 from public.messages m where m.id=message_id
 and (m.sender_id=(select auth.uid()) or m.receiver_id=(select auth.uid()))
 and not public.patiyiz_users_blocked(m.sender_id,m.receiver_id)
))
with check (user_id=(select auth.uid()) and exists (
 select 1 from public.messages m where m.id=message_id
 and (m.sender_id=(select auth.uid()) or m.receiver_id=(select auth.uid()))
 and not public.patiyiz_users_blocked(m.sender_id,m.receiver_id)
));
drop policy if exists pati_dm_reactions_delete on public.patiyiz_dm_reactions;
create policy pati_dm_reactions_delete on public.patiyiz_dm_reactions for delete to authenticated
using (user_id=(select auth.uid()));
