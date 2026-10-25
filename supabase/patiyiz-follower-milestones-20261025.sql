-- Patiyiz follower milestones, 25 October 2026.
-- Existing PatiCoin wallet and one-time task ledger are reused. No balances are reset.
-- Each real follower counts only once (follows has a composite primary key).
-- Admin verification / blue check is intentionally NOT granted by follower count.
create schema if not exists patiyiz_private;
revoke all on schema patiyiz_private from public, anon, authenticated;

create or replace function patiyiz_private.grant_follower_milestones(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $body$
declare
  follower_count bigint;
  reward record;
  new_id uuid;
  newly_awarded jsonb := '[]'::jsonb;
  earned_codes jsonb;
begin
  if p_user is null then
    raise exception 'Geçersiz hesap' using errcode = '22023';
  end if;

  select count(*) into follower_count
  from public.follows where followee_id = p_user;

  if follower_count >= 1000 then
    insert into public.patiyiz_reward_wallets(user_id)
    values (p_user) on conflict (user_id) do nothing;
    perform 1 from public.patiyiz_reward_wallets
    where user_id = p_user for update;

    for reward in select * from (values
      (1000, 100, 'İlk Bin Pati'),
      (5000, 300, 'Gümüş Pati'),
      (10000, 700, 'Altın Pati'),
      (50000, 1500, 'Platin Pati'),
      (100000, 3000, 'Elmas Pati')
    ) as tiers(threshold,coins,title) order by threshold
    loop
      if follower_count < reward.threshold then
        continue;
      end if;
      new_id := null;
      insert into public.patiyiz_reward_ledger(user_id,task_code,delta)
      values (p_user, 'followers_' || reward.threshold::text, reward.coins)
      on conflict (user_id,task_code) do nothing
      returning id into new_id;

      if new_id is not null then
        update public.patiyiz_reward_wallets
        set balance = balance + reward.coins,
            lifetime_earned = lifetime_earned + reward.coins,
            updated_at = now()
        where user_id = p_user;
        newly_awarded := newly_awarded || jsonb_build_array(
          jsonb_build_object('code','followers_' || reward.threshold::text,
                             'title',reward.title, 'coins',reward.coins)
        );
      end if;
    end loop;
  end if;

  select coalesce(jsonb_agg(task_code order by task_code), '[]'::jsonb)
    into earned_codes
  from public.patiyiz_reward_ledger
  where user_id = p_user and task_code in
    ('followers_1000','followers_5000','followers_10000',
     'followers_50000','followers_100000');

  return jsonb_build_object(
    'followers',follower_count,
    'claimed',earned_codes,
    'awarded',newly_awarded
  );
end
$body$;

revoke all on function patiyiz_private.grant_follower_milestones(uuid)
from public, anon, authenticated;

-- Automatically award on a successful follow; a user RPC also re-checks older accounts
-- and covers concurrent inserts that observe a pre-threshold snapshot.
create or replace function patiyiz_private.on_new_follower()
returns trigger
language plpgsql
security definer
set search_path = ''
as $body$
begin
  perform patiyiz_private.grant_follower_milestones(new.followee_id);
  return new;
end
$body$;
revoke all on function patiyiz_private.on_new_follower()
from public, anon, authenticated;

drop trigger if exists patiyiz_award_follower_milestone on public.follows;
create trigger patiyiz_award_follower_milestone
after insert on public.follows
for each row execute function patiyiz_private.on_new_follower();

-- Authenticated account owners may claim/inspect only their own milestones.
create or replace function public.patiyiz_my_follower_milestones()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $body$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Oturum açmalısınız' using errcode = '28000';
  end if;
  return patiyiz_private.grant_follower_milestones(uid);
end
$body$;
revoke all on function public.patiyiz_my_follower_milestones()
from public, anon;
grant execute on function public.patiyiz_my_follower_milestones()
to authenticated;
