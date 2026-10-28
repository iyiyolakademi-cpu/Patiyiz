-- Patiyiz / Complete group deletion (2026-10-28).
-- Existing group creator is the ONLY authenticated user allowed to delete the group.
-- Foreign keys on patiyiz_group_members.group_id and patiyiz_group_messages.group_id
-- already use ON DELETE CASCADE. No other users' groups are affected.
GRANT DELETE ON public.patiyiz_group_chats TO authenticated;
DROP POLICY IF EXISTS group_chats_creator_delete ON public.patiyiz_group_chats;
CREATE POLICY group_chats_creator_delete ON public.patiyiz_group_chats
 FOR DELETE TO authenticated USING (creator_id=(select auth.uid()));
