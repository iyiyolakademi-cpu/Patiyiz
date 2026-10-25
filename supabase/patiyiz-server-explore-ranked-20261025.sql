-- Live migration also applied to Patiyiz Supabase.
-- Pagination and relevance are calculated by PostgreSQL instead of by the device.
-- SECURITY INVOKER ensures posts row policies and blocked-user restrictions remain active.
create or replace function public.patiyiz_explore_ranked(
  p_sort text default 'popular', p_limit integer default 45, p_offset integer default 0
) returns setof public.posts
language sql stable security invoker set search_path = ''
as $function$
 with counts as (select l.post_id, count(*)::bigint as likes from public.post_likes l group by l.post_id)
 select p.*
 from public.posts p
 left join counts c on c.post_id=p.id
 left join public.patiyiz_post_view_totals v on v.post_id=p.id
 where auth.uid() is not null
 and (p.image_url is not null or p.video_url is not null or cardinality(p.images)>0)
 order by
 case when p_sort='likes' then coalesce(c.likes,0) end desc nulls last,
 case when p_sort='views' then coalesce(v.view_count,0) end desc nulls last,
 case when p_sort not in ('recent','likes','views') then
 coalesce(c.likes,0)*8.0 + coalesce(v.view_count,0)*0.35
 + greatest(0.0,14.0-least(14.0,greatest(0.0,extract(epoch from (now()-p.created_at))/86400.0)))*0.18
 end desc nulls last,
 p.created_at desc,p.id desc
 limit greatest(1,least(coalesce(p_limit,45),60))
 offset greatest(0,least(coalesce(p_offset,0),3000));
$function$;
revoke all on function public.patiyiz_explore_ranked(text,integer,integer) from public,anon;
grant execute on function public.patiyiz_explore_ranked(text,integer,integer) to authenticated;
