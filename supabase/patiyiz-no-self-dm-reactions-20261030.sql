-- Patiyiz 2026-10-30: only the recipient can react to a direct message.
-- A person can still like their own posts and Reels (post_likes is unaffected).
-- The existing sender-only client checks remain an additional UI safeguard.
alter policy "pati_dm_reactions_insert"
 on public.patiyiz_dm_reactions
 with check (
   user_id = (select auth.uid())
   and exists (
     select 1 from public.messages m
     where m.id = message_id
       and m.receiver_id = (select auth.uid())
       and m.sender_id <> (select auth.uid())
       and not public.patiyiz_users_blocked(m.sender_id,m.receiver_id)
   )
 );

alter policy "pati_dm_reactions_update"
 on public.patiyiz_dm_reactions
 using (
   user_id = (select auth.uid())
   and exists (
     select 1 from public.messages m
     where m.id = message_id
       and m.receiver_id = (select auth.uid())
       and m.sender_id <> (select auth.uid())
       and not public.patiyiz_users_blocked(m.sender_id,m.receiver_id)
   )
 )
 with check (
   user_id = (select auth.uid())
   and exists (
     select 1 from public.messages m
     where m.id = message_id
       and m.receiver_id = (select auth.uid())
       and m.sender_id <> (select auth.uid())
       and not public.patiyiz_users_blocked(m.sender_id,m.receiver_id)
   )
 );
