-- Prevent an account liking its own story. Preserve all other checks:
-- only a logged-in user may like, only active stories, no blocked authors.
ALTER POLICY "story_likes_self_insert" ON public.patiyiz_story_likes
 WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
   SELECT 1
   FROM public.patiyiz_stories s
   WHERE s.id = patiyiz_story_likes.story_id
     AND s.expires_at > now()
     AND s.author_id <> (SELECT auth.uid())
     AND NOT public.patiyiz_users_blocked((SELECT auth.uid()),s.author_id)
  )
 );
