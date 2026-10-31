-- Patiyiz: 60 consecutive login days, 100 non-cash shop balance + 200 TRY cash reward request.
-- Cash remains pending until reviewed and paid separately by an authorized operator.
-- One-time per user; only server-maintained streak data qualifies.
create table if not exists public.patiyiz_streak60_cash_claims (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 amount_try integer not null default 200 check (amount_try = 200),
 status text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
 requested_at timestamptz not null default now(),
 reviewed_at timestamptz,
 paid_at timestamptz,
 admin_note text
);
alter table public.patiyiz_streak60_cash_claims enable row level security;
revoke all on public.patiyiz_streak60_cash_claims from public, anon, authenticated;
grant select on public.patiyiz_streak60_cash_claims to authenticated;
drop policy if exists "streak60 cash claim own read" on public.patiyiz_streak60_cash_claims;
create policy "streak60 cash claim own read" on public.patiyiz_streak60_cash_claims
 for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.patiyiz_streak60_reward(p_claim boolean default false)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
 uid uuid := (select auth.uid());
 today date := (now() at time zone 'Europe/Istanbul')::date;
 streak integer := 0;
 visit date;
 eligible boolean := false;
 awarded integer := 0;
 inserted_id uuid;
 cash_status text;
 balance_now integer := 0;
begin
 if uid is null then raise exception 'Oturum açmalısın.' using errcode='28000'; end if;
 select current_streak, last_visit_on into streak, visit
 from public.patiyiz_login_streaks where user_id = uid;
 eligible := coalesce(streak,0) >= 60 and visit = today;

 if p_claim then
  if not eligible then raise exception '60 günlük kesintisiz seri henüz tamamlanmadı.' using errcode='22023'; end if;
  insert into public.patiyiz_reward_wallets(user_id) values(uid) on conflict(user_id) do nothing;
  perform 1 from public.patiyiz_reward_wallets where user_id=uid for update;
  insert into public.patiyiz_reward_ledger(user_id,task_code,delta)
    values(uid,'streak60:shop_balance',100)
    on conflict(user_id,task_code) do nothing returning id into inserted_id;
  if inserted_id is not null then
   update public.patiyiz_reward_wallets
    set balance=balance+100,lifetime_earned=lifetime_earned+100,updated_at=now()
    where user_id=uid;
   awarded := 100;
  end if;
  insert into public.patiyiz_streak60_cash_claims(user_id, amount_try)
    values(uid,200) on conflict(user_id) do nothing;
 end if;

 select status into cash_status from public.patiyiz_streak60_cash_claims where user_id=uid;
 select balance into balance_now from public.patiyiz_reward_wallets where user_id=uid;
 return jsonb_build_object(
  'eligible',eligible,'streak',coalesce(streak,0),
  'claimed',cash_status is not null,'cash_status',cash_status,
  'cash_amount_try',200,'shop_bonus',100,'awarded_balance',awarded,
  'balance',coalesce(balance_now,0)
 );
end;
$$;
revoke all on function public.patiyiz_streak60_reward(boolean) from public, anon;
grant execute on function public.patiyiz_streak60_reward(boolean) to authenticated;
comment on table public.patiyiz_streak60_cash_claims is
 '200 TRY cash reward requests after 60 consecutive Istanbul-calendar login days; claim does not imply payment.';
