-- Patiyiz / Ana Sayfa: authoritatively counted interactions for a page of posts.
-- SECURITY INVOKER keeps existing posts and comments RLS (incl. blocked users).
create or replace function public.patiyiz_feed_post_counts(p_post_ids uuid[])
returns table(post_id uuid, like_count bigint, comment_count bigint)
language sql stable security invoker set search_path = ''
as $$
 select p.id as post_id,
        (select count(*) from public.post_likes l where l.post_id=p.id) as like_count,
        (select count(*) from public.comments c where c.post_id=p.id) as comment_count
 from public.posts p
 where p.id = any(coalesce(p_post_ids, array[]::uuid[]))
 limit 80
$$;
revoke all on function public.patiyiz_feed_post_counts(uuid[]) from public,anon;
grant execute on function public.patiyiz_feed_post_counts(uuid[]) to authenticated;
comment on function public.patiyiz_feed_post_counts(uuid[])
 is 'For at most 80 RLS-visible posts, return exact RLS-visible like/comment counts.';
