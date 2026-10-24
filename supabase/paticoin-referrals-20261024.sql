-- Patiyiz friend referral rewards. 50 PatiCoin to each distinct account, exactly once per invitee.
-- Access only through authenticated, user-bound RPCs; no raw client inserts or updates.
create table if not exists public.patiyiz_invite_codes (
 user_id uuid primary key references auth.users(id) on delete cascade,
 code text not null unique check (code ~ '^P[A-F0-9]{8}$'),
 created_at timestamptz not null default now()
);
create table if not exists public.patiyiz_referrals (
 referred_user_id uuid primary key references auth.users(id) on delete cascade,
 referrer_user_id uuid not null references auth.users(id) on delete cascade,
 code_used text not null,
 reward_each integer not null default 50 check (reward_each=50),
 created_at timestamptz not null default now(),
 constraint patiyiz_no_self_referral check(referred_user_id<>referrer_user_id)
);
create index if not exists patiyiz_referrals_referrer_date_idx
 on public.patiyiz_referrals(referrer_user_id,created_at desc);
alter table public.patiyiz_invite_codes enable row level security;
alter table public.patiyiz_referrals enable row level security;
revoke all on public.patiyiz_invite_codes,public.patiyiz_referrals from anon,authenticated;
-- Neither table has a direct SELECT/INSERT/UPDATE/DELETE policy.
-- Codes, redemption eligibility and earned rewards are available only through the functions below.

create or replace function public.patiyiz_my_invite_info()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 uid uuid:=auth.uid();
 invite_code text;
 attempts integer;
 invited_count integer;
 used_code boolean;
begin
 if uid is null then raise exception 'Giriş yapmalısınız' using errcode='28000'; end if;
 select code into invite_code from public.patiyiz_invite_codes where user_id=uid;
 if invite_code is null then
  for attempts in 1..12 loop
   insert into public.patiyiz_invite_codes(user_id,code)
    values (uid,'P'||upper(substring(replace(pg_catalog.gen_random_uuid()::text,'-','') from 1 for 8)))
    on conflict do nothing returning code into invite_code;
   if invite_code is null then
    select code into invite_code from public.patiyiz_invite_codes where user_id=uid;
   end if;
   exit when invite_code is not null;
  end loop;
 end if;
 if invite_code is null then raise exception 'Davet kodu oluşturulamadı, yeniden dene'; end if;
 select count(*) into invited_count from public.patiyiz_referrals where referrer_user_id=uid;
 select exists(select 1 from public.patiyiz_referrals where referred_user_id=uid) into used_code;
 return jsonb_build_object(
  'code',invite_code,'invited_count',invited_count,'already_used',used_code,
  'coins_each',50);
end $$;

create or replace function public.patiyiz_redeem_invite(p_code text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 uid uuid:=auth.uid();
 clean_code text:=upper(btrim(coalesce(p_code,'')));
 inviter_id uuid;
 lock_row record;
 created_user_id uuid;
 new_balance integer;
begin
 if uid is null then raise exception 'Giriş yapmalısınız' using errcode='28000'; end if;
 if clean_code !~ '^P[A-F0-9]{8}$' then raise exception 'Geçerli bir davet kodu gir.'; end if;
 select user_id into inviter_id from public.patiyiz_invite_codes where code=clean_code;
 if inviter_id is null then raise exception 'Davet kodu bulunamadı.'; end if;
 if inviter_id=uid then raise exception 'Kendi davet kodunu kullanamazsın.'; end if;
 if exists(select 1 from public.patiyiz_referrals where referred_user_id=uid)
  then raise exception 'Bu hesap zaten bir davet kodu kullandı.'; end if;

 -- One claim per account. Concurrent uses race on referred_user_id unique key.
 insert into public.patiyiz_referrals(referred_user_id,referrer_user_id,code_used,reward_each)
 values(uid,inviter_id,clean_code,50)
 on conflict (referred_user_id) do nothing returning referred_user_id into created_user_id;
 if created_user_id is null then raise exception 'Bu hesap zaten bir davet kodu kullandı.'; end if;

 insert into public.patiyiz_reward_wallets(user_id) values(uid),(inviter_id)
 on conflict(user_id) do nothing;
 -- Lock both wallets in stable order to avoid opposite referral deadlocks.
 for lock_row in
  select user_id from public.patiyiz_reward_wallets
  where user_id in (uid,inviter_id) order by user_id for update
 loop
  null;
 end loop;

 insert into public.patiyiz_reward_ledger(user_id,task_code,delta)
 values (uid,'referral_join',50),(inviter_id,'referral_friend:'||uid::text,50);
 update public.patiyiz_reward_wallets
 set balance=balance+50,lifetime_earned=lifetime_earned+50,updated_at=now()
 where user_id in (uid,inviter_id);
 select balance into new_balance from public.patiyiz_reward_wallets where user_id=uid;
 return jsonb_build_object('awarded',50,'inviter_awarded',50,
  'balance',new_balance,'message','Davet kodu kullanıldı; iki hesap da 50 PatiCoin kazandı.');
end $$;

revoke execute on function public.patiyiz_my_invite_info() from public,anon;
revoke execute on function public.patiyiz_redeem_invite(text) from public,anon;
grant execute on function public.patiyiz_my_invite_info() to authenticated;
grant execute on function public.patiyiz_redeem_invite(text) to authenticated;
comment on table public.patiyiz_referrals is 'A different authenticated account can redeem only one invitation; rewards are atomic and cannot be awarded by direct table writes.';
