-- Security follow-up: trigger functions are not public RPC endpoints.
-- Trigger execution is still performed by PostgreSQL; no app table writes.
REVOKE ALL ON FUNCTION public.patiyiz_guard_comment_20261029() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.patiyiz_guard_reaction_20261029() FROM PUBLIC, anon, authenticated;
