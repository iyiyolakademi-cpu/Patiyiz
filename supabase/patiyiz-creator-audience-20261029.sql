-- Patiyiz creator audience: privacy-preserving, optional self-reported demographics.
-- Nothing is inferred from names, photos, profile text, or device metadata.
create table if not exists public.patiyiz_audience_demographics (
 user_id uuid primary key references auth.users(id) on delete cascade,
 gender text check(gender in ('woman','man','other','undisclosed')),
 updated_at timestamptz not null default now()
);
alter table public.patiyiz_audience_demographics enable row level security;
revoke all on table public.patiyiz_audience_demographics from public,anon,authenticated;
grant select,insert,update,delete on public.patiyiz_audience_demographics to authenticated;
drop policy if exists patiyiz_audience_self_read_20261029 on public.patiyiz_audience_demographics;
create policy patiyiz_audience_self_read_20261029 on public.patiyiz_audience_demographics
 for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists patiyiz_audience_self_insert_20261029 on public.patiyiz_audience_demographics;
create policy patiyiz_audience_self_insert_20261029 on public.patiyiz_audience_demographics
 for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists patiyiz_audience_self_update_20261029 on public.patiyiz_audience_demographics;
create policy patiyiz_audience_self_update_20261029 on public.patiyiz_audience_demographics
 for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists patiyiz_audience_self_delete_20261029 on public.patiyiz_audience_demographics;
create policy patiyiz_audience_self_delete_20261029 on public.patiyiz_audience_demographics
 for delete to authenticated using(user_id=(select auth.uid()));

-- The viewer population is de-duplicated over the selected range. Return no breakdown
-- for fewer than 10 distinct visitors and hide any group containing fewer than 5.
-- City comes only from voluntarily entered profile cities, gender from the private
-- optional table; each grouping is labelled as visitor data, not total reach.
create or replace function public.patiyiz_creator_audience(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare
 v_owner uuid := auth.uid();
 v_days integer := least(greatest(coalesce(p_days,30),7),90);
 v_sample integer := 0;
 v_cities jsonb := '[]'::jsonb;
 v_gender jsonb := '[]'::jsonb;
begin
 if v_owner is null then
  raise exception 'Oturum gerekli' using errcode='42501';
 end if;
 select count(distinct viewer_id) into v_sample
 from public.patiyiz_profile_visit_daily
 where profile_id=v_owner
 and visit_day >= ((now() at time zone 'UTC')::date-(v_days-1));
 if v_sample < 10 then
  return jsonb_build_object('days',v_days,'sample',v_sample,'cities',v_cities,
                           'genders',v_gender,'minimum_sample',10);
 end if;

 with visitors as (
  select distinct viewer_id
  from public.patiyiz_profile_visit_daily
  where profile_id=v_owner
    and visit_day >= ((now() at time zone 'UTC')::date-(v_days-1))
 ), grouped as (
  select left(btrim(p.city),60) as label, count(*)::integer as total
  from visitors v join public.profiles p on p.id=v.viewer_id
  where length(btrim(coalesce(p.city,''))) between 2 and 60
  group by left(btrim(p.city),60)
  having count(*) >= 5
  order by count(*) desc
  limit 5
 )
 select coalesce(jsonb_agg(jsonb_build_object('name',label,'count',total)),'[]'::jsonb)
 into v_cities from grouped;

 with visitors as (
  select distinct viewer_id
  from public.patiyiz_profile_visit_daily
  where profile_id=v_owner
    and visit_day >= ((now() at time zone 'UTC')::date-(v_days-1))
 ), grouped as (
  select d.gender as label,count(*)::integer as total
  from visitors v join public.patiyiz_audience_demographics d on d.user_id=v.viewer_id
  where d.gender in ('woman','man','other')
  group by d.gender
  having count(*) >= 5
 )
 select coalesce(jsonb_agg(jsonb_build_object('name',label,'count',total)),'[]'::jsonb)
 into v_gender from grouped;
 return jsonb_build_object('days',v_days,'sample',v_sample,'cities',v_cities,
                           'genders',v_gender,'minimum_sample',10);
end
$fn$;
revoke all on function public.patiyiz_creator_audience(integer) from public,anon;
grant execute on function public.patiyiz_creator_audience(integer) to authenticated;
