-- Aggregated engagement for posts visible to the signed-in user.
-- Counts unique senders of direct-message shares, not external link clicks.
create or replace function public.patiyiz_post_engagement_counts(p_post_ids uuid[])
returns table (post_id uuid, saved_count bigint, repost_count bigint, sent_count bigint)
language sql stable security definer set search_path = ''
as $pati$
 select p.id,
 (select count(distinct s.user_id) from public.post_saves s where s.post_id = p.id),
 (select count(distinct r.user_id) from public.patiyiz_reposts r where r.post_id = p.id),
 (select count(distinct m.sender_id) from public.messages m
  where m.body like '📨 Paylaşım: %'
  and m.body like '%#post-' || p.id::text)
 from public.posts p
 where auth.uid() is not null
 and p.id = any(coalesce(p_post_ids[1:40], array[]::uuid[]))
 and not public.patiyiz_users_blocked(auth.uid(), p.author_id)
 and (p.author_id = auth.uid()
  or exists (select 1 from public.profiles u where u.id = p.author_id and u.is_private = false)
  or exists (select 1 from public.follows f where f.follower_id=auth.uid() and f.followee_id=p.author_id))
$pati$;
revoke all on function public.patiyiz_post_engagement_counts(uuid[]) from public;
revoke all on function public.patiyiz_post_engagement_counts(uuid[]) from anon;
grant execute on function public.patiyiz_post_engagement_counts(uuid[]) to authenticated;
