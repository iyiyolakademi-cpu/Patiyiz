-- 2026-10-29: repair post pin inserts and retain the three-post limit.
-- The former INSERT RLS policy counted rows in the same RLS-protected table,
-- causing infinite policy recursion on authenticated inserts.
BEGIN;
CREATE OR REPLACE FUNCTION public.patiyiz_enforce_post_pin_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE pin_total integer;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.owner_id::text, 29026));
  SELECT count(*) INTO pin_total FROM public.patiyiz_post_pins WHERE owner_id = NEW.owner_id;
  IF pin_total >= 3 THEN
    RAISE EXCEPTION 'Profilinde en fazla 3 gönderi sabitleyebilirsin.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.patiyiz_enforce_post_pin_limit() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS patiyiz_guard_post_pin_limit ON public.patiyiz_post_pins;
CREATE TRIGGER patiyiz_guard_post_pin_limit
 BEFORE INSERT ON public.patiyiz_post_pins
 FOR EACH ROW EXECUTE FUNCTION public.patiyiz_enforce_post_pin_limit();
DROP POLICY IF EXISTS pins_add ON public.patiyiz_post_pins;
CREATE POLICY pins_add ON public.patiyiz_post_pins FOR INSERT TO authenticated
 WITH CHECK (
 owner_id = (SELECT auth.uid())
 AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = owner_id)
 );
REVOKE ALL ON TABLE public.patiyiz_post_pins FROM anon;
REVOKE UPDATE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.patiyiz_post_pins FROM authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.patiyiz_post_pins TO authenticated;
COMMIT;
