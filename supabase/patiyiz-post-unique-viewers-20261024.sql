-- Per-post unique viewer totals for photo, text and Reels; no public viewer identities.
-- One counted view per authenticated account per post, ever. An owner does not count.
create table if not exists public.patiyiz_post_view_events(
 post_id uuid not null references public.posts(id) on delete cascade,
 viewer_id uuid not null references auth.users(id) on delete cascade,
 first_seen_at timestamptz not null default now(),
 primary key(post_id,viewer_id)
);
create table if not exists public.patiyiz_post_view_totals(
 post_id uuid primary key references public.posts(id) on delete cascade,
 view_count bigint not null default 0 check(view_count>=0)
);
alter table public.patiyiz_post_view_events enable row level security;
alter table public.patiyiz_post_view_totals enable row level security;
revoke all on public.patiyiz_post_view_events from public,anon,authenticated;
revoke all on public.patiyiz_post_view_totals from public,anon,authenticated;
grant select on public.patiyiz_post_view_totals to authenticated;
drop policy if exists "post_view_totals_visible_posts" on public.patiyiz_post_view_totals;
create policy "post_view_totals_visible_posts" on public.patiyiz_post_view_totals
 for select to authenticated using (
   exists(select 1 from public.posts p where p.id=post_id)
 );
create or replace function public.patiyiz_record_post_view(p_post_id uuid)
returns bigint language plpgsql security definer set search_path=''
as $function$
declare
 viewer uuid := (select auth.uid());
 inserted uuid;
 total bigint;
begin
 if viewer is null then raise exception 'Oturum açmalısın' using errcode='28000'; end if;
 if p_post_id is null or not exists(
  select 1 from public.posts p where p.id=p_post_id and p.author_id<>viewer
    and not public.patiyiz_users_blocked(viewer,p.author_id)
 ) then return 0; end if;
 insert into public.patiyiz_post_view_events(post_id,viewer_id) values(p_post_id,viewer)
 on conflict(post_id,viewer_id) do nothing returning viewer_id into inserted;
 if inserted is not null then
  insert into public.patiyiz_post_view_totals(post_id,view_count) values(p_post_id,1)
  on conflict(post_id) do update
  set view_count=public.patiyiz_post_view_totals.view_count+1
  returning view_count into total;
 else
  select view_count into total from public.patiyiz_post_view_totals where post_id=p_post_id;
 end if;
 return coalesce(total,0);
end
$function$;
revoke all on function public.patiyiz_record_post_view(uuid) from public,anon;
grant execute on function public.patiyiz_record_post_view(uuid) to authenticated;
