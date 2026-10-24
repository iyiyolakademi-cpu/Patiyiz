-- Authenticated daily active users, share attempts and server-verified public engagement leaderboard.
create table if not exists public.patiyiz_daily_active(
 user_id uuid not null references auth.users(id) on delete cascade,
 active_day date not null,
 first_seen_at timestamptz not null default now(),
 primary key(user_id,active_day)
);
create index if not exists patiyiz_daily_active_day on public.patiyiz_daily_active(active_day);
alter table public.patiyiz_daily_active enable row level security;
revoke all on public.patiyiz_daily_active from anon,authenticated;

create table if not exists public.patiyiz_share_attempts(
 user_id uuid not null references auth.users(id) on delete cascade,
 attempt_id uuid not null,
 kind text not null check(kind in ('post','reels','story')),
 status text not null default 'attempt' check(status in ('attempt','success','failed')),
 created_at timestamptz not null default now(),
 finished_at timestamptz,
 primary key(user_id,attempt_id)
);
create index if not exists patiyiz_share_attempts_date on public.patiyiz_share_attempts(created_at);
alter table public.patiyiz_share_attempts enable row level security;
revoke all on public.patiyiz_share_attempts from anon,authenticated;

create or replace function public.patiyiz_track_daily_active()
returns void language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Giriş yapmalısınız' using errcode='28000'; end if;
 insert into public.patiyiz_daily_active(user_id,active_day)
 values(uid,(now() at time zone 'Europe/Istanbul')::date) on conflict do nothing;
end $$;

create or replace function public.patiyiz_track_share(p_attempt_id uuid,p_kind text,p_status text)
returns void language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); saved record;
begin
 if uid is null then raise exception 'Giriş yapmalısınız' using errcode='28000'; end if;
 if p_attempt_id is null or p_kind not in ('post','reels','story') or
    p_status not in ('attempt','success','failed') then raise exception 'Geçersiz paylaşım olayı'; end if;
 if p_status='attempt' then
   insert into public.patiyiz_share_attempts(user_id,attempt_id,kind,status)
   values(uid,p_attempt_id,p_kind,'attempt') on conflict do nothing;
 else
   update public.patiyiz_share_attempts set status=p_status,finished_at=now()
    where user_id=uid and attempt_id=p_attempt_id and kind=p_kind and status='attempt';
 end if;
end $$;

-- Ranking is computed from actual publicly visible community records, not client-submitted points.
-- 7-day score caps reduce repeat-like or mass posting advantages.
create or replace function public.patiyiz_active_top_five()
returns jsonb language sql stable security definer set search_path=''
as $$
with counts as(
 select author_id user_id,least(count(*),15)::int * 6 score
 from public.posts where created_at >= now()-interval '7 days' group by author_id
 union all
 select author_id,least(count(*),30)::int * 2
 from public.comments where created_at >= now()-interval '7 days' group by author_id
 union all
 select user_id,least(count(*),45)::int
 from public.post_likes where created_at >= now()-interval '7 days' group by user_id
),ranked as (
 select c.user_id,sum(c.score)::int points
 from counts c group by c.user_id
 order by points desc,c.user_id limit 5
)
select coalesce(jsonb_agg(jsonb_build_object(
 'user_id',r.user_id,'handle',p.handle,'display_name',p.display_name,
 'avatar_url',p.avatar_url,'is_verified',p.is_verified,'score',r.points
 ) order by r.points desc,r.user_id),'[]'::jsonb)
from ranked r join public.profiles p on p.id=r.user_id
$$;

create or replace function public.patiyiz_admin_engagement_stats()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); response jsonb;
begin
 if uid is null or not exists(select 1 from public.patiyiz_admins a where a.user_id=uid)
 then raise exception 'Admin access required' using errcode='42501'; end if;
 select jsonb_build_object(
 'dau_today',(select count(*) from public.patiyiz_daily_active where active_day=(now() at time zone 'Europe/Istanbul')::date),
 'active_7days',(select count(distinct user_id) from public.patiyiz_daily_active where active_day>=(now() at time zone 'Europe/Istanbul')::date-6),
 'posts_7days',(select count(*) from public.posts where created_at>=now()-interval '7 days'),
 'stories_7days',(select count(*) from public.patiyiz_stories where created_at>=now()-interval '7 days'),
 'share_attempts_7days',(select count(*) from public.patiyiz_share_attempts where created_at>=now()-interval '7 days'),
 'share_success_7days',(select count(*) from public.patiyiz_share_attempts where created_at>=now()-interval '7 days' and status='success'),
 'share_failed_7days',(select count(*) from public.patiyiz_share_attempts where created_at>=now()-interval '7 days' and status='failed'),
 'share_pending_7days',(select count(*) from public.patiyiz_share_attempts where created_at>=now()-interval '7 days' and status='attempt'),
 'daily',coalesce((select jsonb_agg(jsonb_build_object('day',days.d,'users',(select count(*) from public.patiyiz_daily_active a where a.active_day=days.d)) order by days.d)
 from (select generate_series((now() at time zone 'Europe/Istanbul')::date-6,(now() at time zone 'Europe/Istanbul')::date,interval '1 day')::date d) days),'[]'::jsonb)
 ) into response;
 return response;
end $$;
revoke execute on function public.patiyiz_track_daily_active() from public,anon;
revoke execute on function public.patiyiz_track_share(uuid,text,text) from public,anon;
revoke execute on function public.patiyiz_active_top_five() from public,anon;
revoke execute on function public.patiyiz_admin_engagement_stats() from public,anon;
grant execute on function public.patiyiz_track_daily_active() to authenticated;
grant execute on function public.patiyiz_track_share(uuid,text,text) to authenticated;
grant execute on function public.patiyiz_active_top_five() to authenticated;
grant execute on function public.patiyiz_admin_engagement_stats() to authenticated;
comment on function public.patiyiz_admin_engagement_stats() is 'Share attempt statistics are browser telemetry, not an exact measure of abandoned/offline uploads. Counts start on deployment.';
