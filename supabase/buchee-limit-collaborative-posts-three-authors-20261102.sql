-- BucheeSocial: 3 total participants per collaborative post (author + 2 accepted/pending).
-- Live applied with migration name buchee_limit_collaborative_posts_to_three_authors.
-- Preserve existing rows; replace one-partner unique constraint with concurrency-safe trigger.
ALTER TABLE public.patiyiz_post_collaborators
  DROP CONSTRAINT IF EXISTS patiyiz_post_collaborators_one_partner;
CREATE OR REPLACE FUNCTION public.buchee_enforce_three_post_authors()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $function$
DECLARE active_partners integer;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.post_id::text,20261102));
  SELECT count(*) INTO active_partners
  FROM public.patiyiz_post_collaborators AS collaborator
  WHERE collaborator.post_id=NEW.post_id AND collaborator.status IN ('pending','accepted');
  IF active_partners >= 2 THEN
    RAISE EXCEPTION 'Bir gönderi, sahibi dahil en fazla 3 kişiyle paylaşılabilir.'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS buchee_post_three_authors_limit ON public.patiyiz_post_collaborators;
CREATE TRIGGER buchee_post_three_authors_limit
BEFORE INSERT ON public.patiyiz_post_collaborators
FOR EACH ROW EXECUTE FUNCTION public.buchee_enforce_three_post_authors();
