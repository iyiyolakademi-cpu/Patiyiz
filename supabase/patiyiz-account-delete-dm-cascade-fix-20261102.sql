-- BucheeSocial / 2 Kasım 2026
-- Applied via Supabase migration "prevent_dm_deletion_events_during_account_cascade".
-- Cascading auth.users deletions must not recreate child references to deleted users.
-- Direct, user-initiated message deletes retain their notifications.
CREATE OR REPLACE FUNCTION public.patiyiz_notify_deleted_dm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  INSERT INTO public.patiyiz_dm_deletion_events (owner_id, message_id)
  SELECT participant.user_id, OLD.id
  FROM (VALUES (OLD.sender_id), (OLD.receiver_id)) AS participant(user_id)
  WHERE EXISTS (
    SELECT 1 FROM auth.users AS active_user
    WHERE active_user.id = participant.user_id
  );
  RETURN OLD;
END;
$function$;
