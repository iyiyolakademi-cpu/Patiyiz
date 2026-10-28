-- Patiyiz: account-scoped daily login streak, using the Istanbul calendar day.
-- No Coin balance mutations. Anonymous users cannot read or call the check-in RPC.
create table if not exists public.patiyiz_login_streaks (
 user_id uuid primary key references auth.users(id) on delete cascade,
 current_streak integer not null default 0 check (current_streak >= 0),
 longest_streak integer not null default 0 check (longest_streak >= current_streak),
 last_visit_on date not null,
 updated_at timestamptz not null default now()
);
alter table public.patiyiz_login_streaks enable row level security;
revoke all on public.patiyiz_login_streaks from public, anon;
grant select,insert,update on public.patiyiz_login_streaks to authenticated;

drop policy if exists "streak read own" on public.patiyiz_login_streaks;
create policy "streak read own" on public.patiyiz_login_streaks
 for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "streak insert own" on public.patiyiz_login_streaks;
create policy "streak insert own" on public.patiyiz_login_streaks
 for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "streak update own" on public.patiyiz_login_streaks;
create policy "streak update own" on public.patiyiz_login_streaks
 for update to authenticated
 using (user_id = (select auth.uid()))
 with check (user_id = (select auth.uid()));

-- Atomic and idempotent under two devices opening simultaneously.
-- Real days are determined by the database, not by user-provided dates.
create or replace function public.patiyiz_checkin_streak()
returns table(current_streak integer, longest_streak integer, last_visit_on date)
language plpgsql security invoker
set search_path = ''
as $$
declare v_user uuid := (select auth.uid());
declare v_today date := (now() at time zone 'Europe/Istanbul')::date;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='28000'; end if;
 return query
 insert into public.patiyiz_login_streaks as old
  (user_id,current_streak,longest_streak,last_visit_on,updated_at)
 values (v_user,1,1,v_today,now())
 on conflict (user_id) do update set
  current_streak = case
   when old.last_visit_on >= v_today then old.current_streak
   when old.last_visit_on = v_today - 1 then old.current_streak + 1
   else 1 end,
  longest_streak = greatest(old.longest_streak,case
   when old.last_visit_on >= v_today then old.current_streak
   when old.last_visit_on = v_today - 1 then old.current_streak + 1
   else 1 end),
  last_visit_on = greatest(old.last_visit_on,v_today),
  updated_at = case when old.last_visit_on < v_today then now() else old.updated_at end
 returning old.current_streak,old.longest_streak,old.last_visit_on;
end;
$$;
revoke all on function public.patiyiz_checkin_streak() from public, anon;
grant execute on function public.patiyiz_checkin_streak() to authenticated;
