-- Patiyiz streak goals: one selected goal, four possible one-time PatiCoin rewards.
-- Server date and streak are authoritative; never trust claimed days or coin amount from the client.
create table if not exists public.patiyiz_streak_goals(
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_days integer not null check(target_days in (3,7,14,30)),
  selected_at timestamptz not null default now()
);
alter table public.patiyiz_streak_goals enable row level security;
revoke all on public.patiyiz_streak_goals from public,anon,authenticated;
grant select on public.patiyiz_streak_goals to authenticated;
drop policy if exists "streak goals read own" on public.patiyiz_streak_goals;
create policy "streak goals read own" on public.patiyiz_streak_goals
 for select to authenticated using(user_id=(select auth.uid()));

create or replace function public.patiyiz_streak_goal(p_target integer default null)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
 uid uuid := (select auth.uid());
 today date := (now() at time zone 'Europe/Istanbul')::date;
 streak integer := 0;
 longest integer := 0;
 last_day date;
 target integer;
 coins integer := 0;
 awarded integer := 0;
 inserted uuid;
 balance_now integer;
 won jsonb := '[]'::jsonb;
begin
 if uid is null then raise exception 'Önce giriş yapmalısın.' using errcode='28000'; end if;
 if p_target is not null and p_target not in (3,7,14,30) then
  raise exception 'Geçersiz seri hedefi.' using errcode='22023';
 end if;
 -- Read only the signed-in user's server-maintained streak.
 select s.current_streak,s.longest_streak,s.last_visit_on
 into streak,longest,last_day
 from public.patiyiz_login_streaks s where s.user_id=uid;
 streak:=coalesce(streak,0);
 longest:=coalesce(longest,0);
 if last_day is null or last_day < today-1 then streak:=0; end if;

 -- A user may choose one FUTURE goal. Completed goals cannot be farmed again.
 if p_target is not null then
  if streak>=p_target then
    raise exception 'Bu seride bu gün sayısına ulaştın. Daha yüksek bir hedef seç.' using errcode='22023';
  end if;
  if exists(select 1 from public.patiyiz_reward_ledger l where l.user_id=uid
            and l.task_code='streak_goal:'||p_target::text) then
    raise exception 'Bu seri hedefinin ödülünü daha önce aldın. Başka hedef seç.' using errcode='22023';
  end if;
  insert into public.patiyiz_streak_goals(user_id,target_days,selected_at)
   values(uid,p_target,now())
   on conflict(user_id) do update set target_days=excluded.target_days,selected_at=now();
 end if;

 -- Only server-controlled awards: wallet row lock serializes concurrent claims.
 insert into public.patiyiz_reward_wallets(user_id) values(uid)
   on conflict(user_id) do nothing;
 perform 1 from public.patiyiz_reward_wallets w where w.user_id=uid for update;
 select g.target_days into target from public.patiyiz_streak_goals g where g.user_id=uid;
 if target is not null and streak>=target and last_day >= today-1 then
  coins:=case target when 3 then 10 when 7 then 25 when 14 then 60 when 30 then 150 else 0 end;
  insert into public.patiyiz_reward_ledger(user_id,task_code,delta)
   values(uid,'streak_goal:'||target::text,coins)
   on conflict(user_id,task_code) do nothing returning id into inserted;
  if inserted is not null then
   update public.patiyiz_reward_wallets
    set balance=balance+coins,lifetime_earned=lifetime_earned+coins,updated_at=now()
    where user_id=uid;
   awarded:=coins;
  end if;
 end if;
 select w.balance into balance_now from public.patiyiz_reward_wallets w where w.user_id=uid;
 select coalesce(jsonb_agg(substring(l.task_code from 13)::integer order by l.created_at),'[]'::jsonb)
 into won from public.patiyiz_reward_ledger l
 where l.user_id=uid and l.task_code in ('streak_goal:3','streak_goal:7','streak_goal:14','streak_goal:30');
 return jsonb_build_object(
  'current_streak',streak,'longest_streak',longest,'last_visit_on',last_day,
  'goal_days',target,'earned_goals',won,'awarded_coins',awarded,'balance',balance_now
 );
end;
$$;
revoke all on function public.patiyiz_streak_goal(integer) from public,anon;
grant execute on function public.patiyiz_streak_goal(integer) to authenticated;
