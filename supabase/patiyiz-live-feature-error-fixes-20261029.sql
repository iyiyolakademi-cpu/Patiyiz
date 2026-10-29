-- Applied to live Patiyiz Supabase on 2026-10-29 as two migrations:
-- patiyiz_live_feature_permission_and_media_checks_20261029
-- patiyiz_server_edge_privileges_20261029
-- Reproducible, idempotent permissions and validation; no records are deleted.
BEGIN;
-- The private Edge Function verifies ownership and deletes messages for both parties.
-- These privileges are only for server-side service_role credentials.
GRANT SELECT,DELETE ON TABLE public.messages TO service_role;

-- Browser DM reactions: prevent changes to message_id/user_id. Client writes emoji only.
REVOKE UPDATE ON TABLE public.patiyiz_dm_reactions FROM authenticated;
GRANT UPDATE(emoji) ON TABLE public.patiyiz_dm_reactions TO authenticated;

-- Public story can have a playable video without an image cover.
-- Close friends media remains restricted to private storage.
ALTER TABLE public.patiyiz_stories DROP CONSTRAINT IF EXISTS patiyiz_stories_image_url_check;
ALTER TABLE public.patiyiz_stories ADD CONSTRAINT patiyiz_stories_image_url_check CHECK (
 (audience='close_friends' AND image_url='' AND private_image_path IS NOT NULL)
 OR (audience='everyone' AND (
  char_length(coalesce(image_url,'')) BETWEEN 10 AND 2000
  OR char_length(coalesce(video_url,'')) BETWEEN 10 AND 2000
 ))
);

-- Legacy video-array posts are valid even if video_url is empty.
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_body_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_body_check CHECK (
 char_length(btrim(coalesce(body,'')))<=1500 AND (
  char_length(btrim(coalesce(body,'')))>=1
  OR nullif(btrim(coalesce(image_url,'')),'') IS NOT NULL
  OR nullif(btrim(coalesce(video_url,'')),'') IS NOT NULL
  OR coalesce(array_length(images,1),0)>0
  OR coalesce(array_length(media_videos,1),0)>0
 )
);

-- The following permissions are required only for authenticated Edge Functions
-- running under a server-only key. Do not grant them to anon/authenticated.
GRANT SELECT ON TABLE public.patiyiz_admins TO service_role;
GRANT SELECT ON TABLE public.posts,public.patiyiz_stories,public.lost_reports,
 public.adoption_listings,public.patiyiz_voice_comments TO service_role;
GRANT SELECT,DELETE ON TABLE public.patiyiz_native_push_tokens TO service_role;
COMMIT;