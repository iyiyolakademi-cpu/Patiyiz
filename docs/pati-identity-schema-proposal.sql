-- Pati Kimliği proposal | Review and deploy to the PATIYIZ Supabase project only.
-- Does not modify existing pets, lost_reports, messages or health records.
-- Before applying: verify pets.id and pets.owner_id are uuid (current web code uses both).
CREATE TABLE IF NOT EXISTS public.pati_identity_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL UNIQUE REFERENCES public.pets(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  token_hint text NOT NULL CHECK (length(token_hint)=4),
  enabled boolean NOT NULL DEFAULT true,
  show_photo boolean NOT NULL DEFAULT false,
  public_note text NOT NULL DEFAULT '' CHECK (char_length(public_note)<=200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pati_identity_tags_owner_idx ON public.pati_identity_tags(owner_id);
CREATE TABLE IF NOT EXISTS public.pati_identity_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid NOT NULL REFERENCES public.pati_identity_tags(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receipt_hash text NOT NULL UNIQUE CHECK (receipt_hash ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now()+interval '30 days')
);
CREATE INDEX IF NOT EXISTS pati_identity_threads_owner_idx ON public.pati_identity_threads(owner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.pati_identity_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.pati_identity_threads(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('finder','owner')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pati_identity_messages_thread_idx ON public.pati_identity_messages(thread_id, created_at);
-- Only the server calls this atomic limiter; it stores irreversible hashed keys, not raw IPs.
CREATE TABLE IF NOT EXISTS public.pati_identity_rate_limits (
  key_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0
);
CREATE OR REPLACE FUNCTION public.pati_identity_throttle(p_key_hash text,p_limit integer,p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE n integer;
BEGIN
  IF p_key_hash !~ '^[0-9a-f]{64}$' OR p_limit NOT BETWEEN 1 AND 100 OR p_window_seconds NOT BETWEEN 60 AND 86400 THEN
    RETURN false;
  END IF;
  INSERT INTO public.pati_identity_rate_limits (key_hash,window_started_at,attempts)
  VALUES(p_key_hash,now(),1)
  ON CONFLICT (key_hash) DO UPDATE SET
    attempts=CASE WHEN public.pati_identity_rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds)
      THEN 1 ELSE public.pati_identity_rate_limits.attempts+1 END,
    window_started_at=CASE WHEN public.pati_identity_rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds)
      THEN now() ELSE public.pati_identity_rate_limits.window_started_at END
  RETURNING attempts INTO n;
  RETURN n<=p_limit;
END $$;
ALTER TABLE public.pati_identity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pati_identity_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pati_identity_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pati_identity_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pati_identity_tags FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.pati_identity_threads FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.pati_identity_messages FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.pati_identity_rate_limits FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.pati_identity_tags, public.pati_identity_threads, public.pati_identity_messages TO authenticated;
CREATE POLICY pati_identity_tag_owner_read ON public.pati_identity_tags
  FOR SELECT TO authenticated USING(owner_id=(select auth.uid()));
CREATE POLICY pati_identity_thread_owner_read ON public.pati_identity_threads
  FOR SELECT TO authenticated USING(owner_id=(select auth.uid()));
CREATE POLICY pati_identity_message_owner_read ON public.pati_identity_messages
  FOR SELECT TO authenticated USING(owner_id=(select auth.uid()));
REVOKE ALL ON FUNCTION public.pati_identity_throttle(text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pati_identity_throttle(text,integer,integer) TO service_role;
-- All mutations & ALL anonymous lookup/contact happen through the audited Edge Function.
-- Do not expose a raw SELECT policy for anonymous users.
