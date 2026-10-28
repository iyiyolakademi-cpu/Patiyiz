-- Patiyiz / profile links for any website or social platform (2026-10-28).
-- Keep existing profile RLS; only the profile owner can update links.
ALTER TABLE public.profiles
 ADD COLUMN IF NOT EXISTS profile_links jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint
   WHERE conname='profiles_profile_links_array_limit'
    AND conrelid='public.profiles'::regclass
 ) THEN
  ALTER TABLE public.profiles
   ADD CONSTRAINT profiles_profile_links_array_limit
    CHECK (jsonb_typeof(profile_links)='array' AND jsonb_array_length(profile_links)<=12);
 END IF;
END $$;

-- Preserve previously added public external link for existing profiles.
-- The user-facing editor is now entirely generic, not provider-specific.
UPDATE public.profiles
 SET profile_links=jsonb_build_array(jsonb_build_object('title','Bağlantı','url',instagram_url))
 WHERE profile_links='[]'::jsonb
   AND NULLIF(btrim(instagram_url),'') IS NOT NULL;

COMMENT ON COLUMN public.profiles.profile_links IS
 'Array of up to twelve external website links with custom title and URL';
