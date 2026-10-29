-- 29 October 2026: story view authorization and low-risk FK query indexes.
-- No existing story, user, message, coin, or other user data is modified.
CREATE OR REPLACE FUNCTION public.patiyiz_record_story_view(p_story_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_viewer uuid := (SELECT auth.uid());
  v_owner uuid;
BEGIN
  IF v_viewer IS NULL THEN
    RAISE EXCEPTION 'Login required' USING ERRCODE='42501';
  END IF;

  -- SECURITY DEFINER bypasses the normal story SELECT RLS. Re-check every
  -- audience restriction before allowing a viewer event to be written.
  SELECT s.author_id INTO v_owner
  FROM public.patiyiz_stories AS s
  WHERE s.id = p_story_id
    AND s.expires_at > now()
    AND (
      s.author_id = v_viewer
      OR s.audience = 'everyone'
      OR (s.audience = 'close_friends'
          AND public.patiyiz_is_close_friend(s.author_id, v_viewer))
    )
    AND NOT public.patiyiz_users_blocked(v_viewer, s.author_id);

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Story unavailable' USING ERRCODE='42501';
  END IF;
  IF v_owner = v_viewer THEN RETURN; END IF;

  INSERT INTO public.patiyiz_story_views
    (story_id, viewer_id, first_viewed_at, last_viewed_at)
  VALUES (p_story_id, v_viewer, now(), now())
  ON CONFLICT (story_id, viewer_id)
  DO UPDATE
    SET last_viewed_at = GREATEST(
      public.patiyiz_story_views.last_viewed_at,
      EXCLUDED.last_viewed_at
    );
END
$function$;
REVOKE ALL ON FUNCTION public.patiyiz_record_story_view(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.patiyiz_record_story_view(uuid) TO authenticated;

-- Complement FK lookups used by direct messages, close friends, group rooms
-- and collaborative posts. Existing PK/unique indexes remain untouched.
CREATE INDEX IF NOT EXISTS patiyiz_close_friends_friend_idx
  ON public.patiyiz_close_friends(friend_id);
CREATE INDEX IF NOT EXISTS patiyiz_dm_hidden_threads_peer_idx
  ON public.patiyiz_dm_hidden_threads(peer_id);
CREATE INDEX IF NOT EXISTS patiyiz_dm_message_pins_peer_idx
  ON public.patiyiz_dm_message_pins(peer_id);
CREATE INDEX IF NOT EXISTS patiyiz_group_chats_creator_idx
  ON public.patiyiz_group_chats(creator_id);
CREATE INDEX IF NOT EXISTS patiyiz_group_messages_sender_idx
  ON public.patiyiz_group_messages(sender_id);
CREATE INDEX IF NOT EXISTS patiyiz_post_collaborators_invited_by_idx
  ON public.patiyiz_post_collaborators(invited_by);
