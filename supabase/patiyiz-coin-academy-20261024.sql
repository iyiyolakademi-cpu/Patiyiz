-- Patiyiz balanced PatiCoin / permanent Academy progress (24 Oct 2026).
-- Only NEW, unclaimed activity awards use reduced amounts. Historical balances, ledger and orders stay untouched.
-- Catalog raises prices for FUTURE orders; existing redemption coins_spent is historical and unchanged.
update public.patiyiz_reward_items
set coins=case id
 when 'mama-mini' then 500
 when 'mama-kilo' then 1400
 when 'mama-kabi' then 900
 when 'mama-destek' then 650
 else coins end
where id in ('mama-mini','mama-kilo','mama-kabi','mama-destek');

CREATE OR REPLACE FUNCTION public.patiyiz_claim_completed_tasks()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 uid uuid:=auth.uid();
 task record;
 eligible boolean;
 created_id uuid;
 awarded jsonb:='[]'::jsonb;
 new_balance integer;
begin
 if uid is null then raise exception 'Oturum açmalısınız' using errcode='28000'; end if;
 insert into public.patiyiz_reward_wallets(user_id) values(uid) on conflict(user_id) do nothing;
 perform 1 from public.patiyiz_reward_wallets where user_id=uid for update;
 for task in select * from (values
   ('profile_complete'::text,45,'Profili tamamla'::text),
   ('pet_created',35,'Hayvan profili ekle'),
   ('first_post',30,'İlk paylaşımını yap'),
   ('first_story',25,'İlk hikâyeni paylaş'),
   ('first_follow',15,'İlk hesabı takip et'),
   ('three_posts',45,'Üç gönderi paylaş')
 ) as t(code,coins,title)
 loop
  eligible:=false;
  if task.code='profile_complete' then
   select exists(select 1 from public.profiles p where p.id=uid
    and length(btrim(coalesce(p.display_name,'')))>=2
    and length(btrim(coalesce(p.handle,'')))>=2
    and length(btrim(coalesce(p.bio,'')))>=10
    and length(btrim(coalesce(p.avatar_url,'')))>0) into eligible;
  elsif task.code='pet_created' then
   select exists(select 1 from public.pets p where p.owner_id=uid) into eligible;
  elsif task.code='first_post' then
   select exists(select 1 from public.posts p where p.author_id=uid) into eligible;
  elsif task.code='first_story' then
   select exists(select 1 from public.patiyiz_stories s where s.author_id=uid) into eligible;
  elsif task.code='first_follow' then
   select exists(select 1 from public.follows f where f.follower_id=uid) into eligible;
  elsif task.code='three_posts' then
   select (select count(*) from public.posts p where p.author_id=uid)>=3 into eligible;
  end if;
  if not eligible then continue; end if;
  created_id:=null;
  insert into public.patiyiz_reward_ledger(user_id,task_code,delta)
    values(uid,task.code,task.coins)
    on conflict(user_id,task_code) do nothing returning id into created_id;
  if created_id is not null then
   update public.patiyiz_reward_wallets
    set balance=balance+task.coins,lifetime_earned=lifetime_earned+task.coins,updated_at=now()
    where user_id=uid;
   awarded:=awarded||jsonb_build_array(jsonb_build_object('code',task.code,'title',task.title,'coins',task.coins));
  end if;
 end loop;
 select balance into new_balance from public.patiyiz_reward_wallets where user_id=uid;
 return jsonb_build_object('awarded',awarded,'balance',new_balance);
end $function$
;
revoke all on function public.patiyiz_claim_completed_tasks() from public,anon;
grant execute on function public.patiyiz_claim_completed_tasks() to authenticated;

CREATE OR REPLACE FUNCTION public.patiyiz_redeem_reward(p_item_id text, p_destination text, p_pet_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 uid uuid:=auth.uid();
 product record;
 balance_now integer;
 order_id uuid;
begin
 if uid is null then raise exception 'Oturum açmalısınız' using errcode='28000'; end if;
 -- Only established and meaningfully active accounts may redeem physical rewards.
 if not exists(select 1 from auth.users u where u.id=uid and u.created_at<=now()-interval '7 days') then
  raise exception 'Ödül alabilmek için hesabın en az 7 günlük olmalı';
 end if;
 if (select count(*) from public.patiyiz_daily_active a where a.user_id=uid and a.active_day>=(now() at time zone 'Europe/Istanbul')::date-29) < 3 then
  raise exception 'Ödül alabilmek için son 30 günde 3 farklı gün aktif olmalısın';
 end if;
 if exists(select 1 from public.patiyiz_reward_redemptions r where r.user_id=uid
   and r.status <> 'cancelled' and r.created_at > now()-interval '14 days') then
  raise exception 'Her 14 günde yalnızca bir ödül talebi oluşturabilirsin';
 end if;
 if p_destination not in ('own_pet','street_animals') or p_destination is null then
  raise exception 'Geçersiz destek hedefi';
 end if;
 if p_destination='own_pet' then
  if p_pet_id is null or not exists(select 1 from public.pets where id=p_pet_id and owner_id=uid)
    then raise exception 'Kendi hayvanınızı seçin'; end if;
 elsif p_pet_id is not null then raise exception 'Sokak hayvanları için hayvan profili seçmeyin'; end if;
 select id,name,coins into product from public.patiyiz_reward_items
  where id=p_item_id and enabled=true;
 if not found then raise exception 'Ürün bulunamadı'; end if;
 insert into public.patiyiz_reward_wallets(user_id) values(uid) on conflict(user_id) do nothing;
 select balance into balance_now from public.patiyiz_reward_wallets where user_id=uid for update;
 if balance_now<product.coins then raise exception 'Yetersiz PatiCoin bakiyesi'; end if;
 insert into public.patiyiz_reward_redemptions(user_id,item_id,coins_spent,destination,pet_id)
 values(uid,product.id,product.coins,p_destination,p_pet_id) returning id into order_id;
 update public.patiyiz_reward_wallets set balance=balance-product.coins,updated_at=now() where user_id=uid;
 insert into public.patiyiz_reward_ledger(user_id,redemption_id,delta)
 values(uid,order_id,-product.coins);
 return jsonb_build_object('id',order_id,'status','pending','item',product.name,
  'spent',product.coins,'balance',balance_now-product.coins,'destination',p_destination);
end $function$
;
revoke all on function public.patiyiz_redeem_reward(text,text,uuid) from public,anon;
grant execute on function public.patiyiz_redeem_reward(text,text,uuid) to authenticated;

-- Account-bound education completion, never trust local browser state as an authority.
create table if not exists public.patiyiz_education_progress(
 user_id uuid not null references auth.users(id) on delete cascade,
 lesson_id text not null check(length(lesson_id) between 1 and 80),
 completed_at timestamptz not null default now(),
 primary key(user_id,lesson_id)
);
create index if not exists patiyiz_education_progress_user_date
 on public.patiyiz_education_progress(user_id,completed_at desc);
alter table public.patiyiz_education_progress enable row level security;
revoke all on public.patiyiz_education_progress from public,anon,authenticated;
grant select,insert on public.patiyiz_education_progress to authenticated;
drop policy if exists "education progress read own" on public.patiyiz_education_progress;
drop policy if exists "education progress insert own" on public.patiyiz_education_progress;
create policy "education progress read own" on public.patiyiz_education_progress
 for select to authenticated using(user_id=(select auth.uid()));
create policy "education progress insert own" on public.patiyiz_education_progress
 for insert to authenticated with check(user_id=(select auth.uid()));
