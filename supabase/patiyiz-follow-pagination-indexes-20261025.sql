-- Patiyiz scalable follower lists (25 October 2026)
-- Index order follows the authenticated, paginated PostgREST queries.
-- No user records or follow relationships are changed.
create index if not exists patiyiz_follows_followers_page_idx
 on public.follows (followee_id, created_at desc, follower_id desc);
create index if not exists patiyiz_follows_following_page_idx
 on public.follows (follower_id, created_at desc, followee_id desc);
