-- Universal public profile links with no site-specific restriction.
-- The existing profile RLS SELECT and owner-only UPDATE policies remain unchanged.
ALTER TABLE public.profiles
 ADD COLUMN IF NOT EXISTS profile_links jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conrelid='public.profiles'::regclass AND conname='profiles_public_links_shape_check'
 ) THEN
  ALTER TABLE public.profiles
   ADD CONSTRAINT profiles_public_links_shape_check
   CHECK (
    CASE WHEN jsonb_typeof(profile_links)='array'
      THEN jsonb_array_length(profile_links)<=8 AND octet_length(profile_links::text)<=9000
      ELSE false
    END
   );
 END IF;
END $$;

-- Transfer an older single profile link into the new multi-link array only when
-- the new array is empty. Never remove an existing user-saved profile_links array.
UPDATE public.profiles
 SET profile_links=jsonb_build_array(jsonb_build_object('title','','url',instagram_url))
 WHERE instagram_url ~ '^https://www[.]instagram[.]com/[A-Za-z0-9._]{1,30}/$'
  AND jsonb_typeof(profile_links)='array'
  AND jsonb_array_length(profile_links)=0;

COMMENT ON COLUMN public.profiles.profile_links IS
 'Optional public web links (up to eight), each with title and http(s) URL; profile owner may update.';
