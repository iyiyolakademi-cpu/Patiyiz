-- Patiyiz: public Instagram link editable only by existing profile-owner RLS.
-- Apply once to Supabase. No messages, users, or stories are rewritten.
ALTER TABLE public.profiles
 ADD COLUMN IF NOT EXISTS instagram_url text NOT NULL DEFAULT '';
COMMENT ON COLUMN public.profiles.instagram_url IS
 'Optional canonical public Instagram profile link, provided by the profile owner.';
DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_constraint WHERE conname='profiles_instagram_url_format'
    AND conrelid='public.profiles'::regclass
 ) THEN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_instagram_url_format
   CHECK (instagram_url='' OR instagram_url ~ '^https://www[.]instagram[.]com/[A-Za-z0-9._]{1,30}/$');
 END IF;
END $$;
