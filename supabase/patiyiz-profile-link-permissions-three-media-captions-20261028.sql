-- 2026-10-28: Profile edits and optional media descriptions.
-- Authenticated visitors can modify only allowed fields in their own profiles.
-- Existing profiles_update RLS USING/WITH CHECK (id = auth.uid()) continues to apply.
-- Do not grant UPDATE on is_verified or other staff-controlled columns.
GRANT UPDATE (display_name, handle, city, bio, avatar_url, profile_links)
 ON TABLE public.profiles TO authenticated;

-- Limit new and existing profile links to three (no data exceeds this cap).
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_profile_links_array_limit;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_profile_links_array_limit
 CHECK (jsonb_typeof(profile_links)='array' AND jsonb_array_length(profile_links)<=3);

-- Keep a caption obligatory for text-only posts. Photos / carousels / Reels
-- are allowed without written description. Existing 1500-character limit remains.
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_body_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_body_check CHECK (
 char_length(btrim(body)) <= 1500
 AND (
   char_length(btrim(body)) >= 1
   OR nullif(btrim(coalesce(image_url,'')),'') IS NOT NULL
   OR nullif(btrim(coalesce(video_url,'')),'') IS NOT NULL
   OR coalesce(array_length(images,1),0)>0
 )
);
-- Story captions already have an empty-string default and require no change.

-- Private story media is stored in an authorized private bucket. Public URL must be
-- blank for close friends, so image_url validation must allow that representation.
ALTER TABLE public.patiyiz_stories DROP CONSTRAINT IF EXISTS patiyiz_stories_image_url_check;
ALTER TABLE public.patiyiz_stories ADD CONSTRAINT patiyiz_stories_image_url_check CHECK (
 (audience='close_friends' AND image_url='' AND private_image_path IS NOT NULL)
 OR (audience='everyone' AND char_length(image_url) BETWEEN 10 AND 2000)
);
