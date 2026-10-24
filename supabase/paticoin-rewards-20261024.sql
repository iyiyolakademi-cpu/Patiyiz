-- Patiyiz PatiCoin economy. Coin requests do not constitute physical shipment or confirmed donation.
create table if not exists public.patiyiz_reward_wallets (
 user_id uuid primary key references auth.users(id) on delete cascade,
 balance integer not null default 0 check(balance >= 0),
 lifetime_earned integer not null default 0 check(lifetime_earned >= 0),
 updated_at timestamptz not null default now()
);
create table if not exists public.patiyiz_reward_ledger (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 task_code text,
 redemption_id uuid,
 delta integer not null check(delta <> 0),
 created_at timestamptz not null default now(),
 constraint patiyiz_reward_task_unique unique(user_id,task_code)
);
create table if not exists public.patiyiz_reward_items (
 id text primary key,
 name text not null,
 description text not null,
 kind text not null check(kind in ('food','supply')),
 coins integer not null check(coins>0),
 emoji text not null default '🐾',
 enabled boolean not null default true,
 sort_order integer not null default 0
);
create table if not exists public.patiyiz_reward_redemptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 item_id text not null references public.patiyiz_reward_items(id),
 coins_spent integer not null check(coins_spent > 0),
 destination text not null check(destination in ('own_pet','street_animals')),
 pet_id uuid references public.pets(id) on delete set null,
 status text not null default 'pending' check(status in ('pending','fulfilled','cancelled')),
 created_at timestamptz not null default now(),
 fulfilled_at timestamptz,
 constraint reward_own_pet_required check(
  (destination='own_pet' and pet_id is not null)
  or (destination='street_animals' and pet_id is null))
);
create index if not exists patiyiz_reward_ledger_user_created on public.patiyiz_reward_ledger(user_id,created_at desc);
create index if not exists patiyiz_redemption_user_created on public.patiyiz_reward_redemptions(user_id,created_at desc);
create index if not exists patiyiz_redemption_pending on public.patiyiz_reward_redemptions(created_at) where status='pending';
create index if not exists patiyiz_redemption_item_id on public.patiyiz_reward_redemptions(item_id);
create index if not exists patiyiz_redemption_pet_id on public.patiyiz_reward_redemptions(pet_id);
alter table public.patiyiz_reward_wallets enable row level security;
alter table public.patiyiz_reward_ledger enable row level security;
alter table public.patiyiz_reward_items enable row level security;
alter table public.patiyiz_reward_redemptions enable row level security;
revoke all on public.patiyiz_reward_wallets, public.patiyiz_reward_ledger, public.patiyiz_reward_items, public.patiyiz_reward_redemptions from anon, authenticated;
grant select on public.patiyiz_reward_wallets, public.patiyiz_reward_ledger, public.patiyiz_reward_items, public.patiyiz_reward_redemptions to authenticated;
create policy "paticoin read own wallet" on public.patiyiz_reward_wallets for select to authenticated using ((select auth.uid())=user_id);
create policy "paticoin read own movements" on public.patiyiz_reward_ledger for select to authenticated using ((select auth.uid())=user_id);
create policy "paticoin public active catalog" on public.patiyiz_reward_items for select to authenticated using (enabled=true);
create policy "paticoin read own orders" on public.patiyiz_reward_redemptions for select to authenticated using ((select auth.uid())=user_id);
insert into public.patiyiz_reward_items(id,name,description,kind,coins,emoji,sort_order) values
 ('mama-mini','Mini Mama Paketi','250 g mama için destek veya teslimat talebi.','food',150,'🥣',1),
 ('mama-kilo','1 kg Mama Paketi','1 kg kuru mama için destek veya teslimat talebi.','food',360,'🐕',2),
 ('mama-kabi','Mama ve Su Kabı','Hayvanlar için mama ve su kabı talebi.','supply',240,'💧',3),
 ('mama-destek','Sokak Hayvanları Mama Desteği','Sokak hayvanları için mama desteği talebi.','food',120,'🐾',4)
on conflict(id) do nothing;

-- All balance writes are restricted to controlled, atomic RPCs.
create or replace function public.patiyiz_claim_completed_tasks()
returns jsonb language plpgsql security definer set search_path=''
as $$
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
   ('profile_complete'::text,100,'Profili tamamla'::text),
   ('pet_created',80,'Hayvan profili ekle'),
   ('first_post',60,'İlk paylaşımını yap'),
   ('first_story',40,'İlk hikâyeni paylaş'),
   ('first_follow',25,'İlk hesabı takip et'),
   ('three_posts',70,'Üç gönderi paylaş')
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
end $$;
revoke execute on function public.patiyiz_claim_completed_tasks() from public,anon;
grant execute on function public.patiyiz_claim_completed_tasks() to authenticated;

create or replace function public.patiyiz_redeem_reward(p_item_id text,p_destination text,p_pet_id uuid default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 uid uuid:=auth.uid();
 product record;
 balance_now integer;
 order_id uuid;
begin
 if uid is null then raise exception 'Oturum açmalısınız' using errcode='28000'; end if;
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
end $$;
revoke execute on function public.patiyiz_redeem_reward(text,text,uuid) from public,anon;
grant execute on function public.patiyiz_redeem_reward(text,text,uuid) to authenticated;

comment on table public.patiyiz_reward_redemptions is
 'PatiCoin requests only. Pending entries are not evidence of donation, payment or physical delivery.';
