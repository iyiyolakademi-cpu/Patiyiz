-- Allow the author to like their own active story, while preserving RLS visibility,
-- expiry, and blocked-user restrictions. Delete and read policies stay unchanged.
alter policy "story_likes_self_insert"
 on public.patiyiz_story_likes
 with check (
  user_id = (select auth.uid())
  and exists (
   select 1 from public.patiyiz_stories s
   where s.id = patiyiz_story_likes.story_id
    and s.expires_at > now()
    and not public.patiyiz_users_blocked((select auth.uid()),s.author_id)
  )
 );
