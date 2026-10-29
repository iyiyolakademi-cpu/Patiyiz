-- Applied to the live Patiyiz project on 2026-10-29.
-- Signed-in viewers can read ONLY their own story-view rows for ring state.
-- Existing story-owner read policy is preserved so the owner can see viewers.
-- Viewing your own story is tracked locally and is not counted as a visitor.
BEGIN;
ALTER TABLE public.patiyiz_story_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "viewer can read own watched story ids" ON public.patiyiz_story_views;
CREATE POLICY "viewer can read own watched story ids"
 ON public.patiyiz_story_views FOR SELECT TO authenticated
 USING (viewer_id=(SELECT auth.uid()));
GRANT SELECT(story_id,viewer_id) ON public.patiyiz_story_views TO authenticated;
COMMIT;