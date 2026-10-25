-- Applied to the Patiyiz Supabase project on 2026-10-25.
-- Separate environment donation workflow; no automatic claim that a seedling was planted.
alter table public.patiyiz_reward_items drop constraint if exists patiyiz_reward_items_kind_check;
alter table public.patiyiz_reward_items add constraint patiyiz_reward_items_kind_check
 check (kind in ('food','supply','donation'));
alter table public.patiyiz_reward_redemptions drop constraint if exists patiyiz_reward_redemptions_destination_check;
alter table public.patiyiz_reward_redemptions add constraint patiyiz_reward_redemptions_destination_check
 check (destination in ('own_pet','street_animals','environment'));
alter table public.patiyiz_reward_redemptions drop constraint if exists reward_own_pet_required;
alter table public.patiyiz_reward_redemptions add constraint reward_own_pet_required
 check ((destination='own_pet' and pet_id is not null)
 or (destination in ('street_animals','environment') and pet_id is null));
insert into public.patiyiz_reward_items(id,name,description,kind,coins,emoji,enabled,sort_order,stock_available)
values('fidan-bagisi','1 Fidan Bağışı','Doğa için bir fidan dikimi talebi. İşlem ancak yönetici onayı ve kanıt bağlantısıyla tamamlanır.','donation',1100,'🌱',true,5,0)
on conflict(id) do nothing;

create or replace function public.patiyiz_redeem_reward(p_item_id text,p_destination text,p_pet_id uuid default null)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare
 uid uuid:=auth.uid();
 product record;
 balance_now integer;
 order_id uuid;
begin
 if uid is null then raise exception 'Oturum açmalısınız' using errcode='28000'; end if;
 if not exists(select 1 from auth.users u where u.id=uid and u.created_at<=now()-interval '7 days') then
  raise exception 'Ödül alabilmek için hesabın en az 7 günlük olmalı';
 end if;
 if (select count(*) from public.patiyiz_daily_active a where a.user_id=uid
   and a.active_day>=(now() at time zone 'Europe/Istanbul')::date-29)<3 then
  raise exception 'Ödül alabilmek için son 30 günde 3 farklı gün aktif olmalısın';
 end if;
 if exists(select 1 from public.patiyiz_reward_redemptions r where r.user_id=uid
   and r.status<>'cancelled' and r.created_at>now()-interval '14 days') then
  raise exception 'Her 14 günde yalnızca bir ödül talebi oluşturabilirsin';
 end if;
 select id,name,coins,kind into product from public.patiyiz_reward_items where id=p_item_id and enabled=true;
 if not found then raise exception 'Ürün bulunamadı'; end if;
 if product.kind='donation' then
  if p_destination is distinct from 'environment' or p_pet_id is not null then
   raise exception 'Fidan bağışını doğa desteği olarak seçmelisin';
  end if;
 else
  if p_destination is null or p_destination not in ('own_pet','street_animals') then
   raise exception 'Geçersiz destek hedefi';
  end if;
  if p_destination='own_pet' then
   if p_pet_id is null or not exists(select 1 from public.pets where id=p_pet_id and owner_id=uid) then
    raise exception 'Kendi hayvanınızı seçin';
   end if;
  elsif p_pet_id is not null then
   raise exception 'Sokak hayvanları için hayvan profili seçmeyin';
  end if;
 end if;
 insert into public.patiyiz_reward_wallets(user_id) values(uid) on conflict(user_id) do nothing;
 select balance into balance_now from public.patiyiz_reward_wallets where user_id=uid for update;
 if balance_now<product.coins then raise exception 'Yetersiz PatiCoin bakiyesi'; end if;
 insert into public.patiyiz_reward_redemptions(user_id,item_id,coins_spent,destination,pet_id)
 values(uid,product.id,product.coins,p_destination,p_pet_id) returning id into order_id;
 update public.patiyiz_reward_wallets set balance=balance-product.coins,updated_at=now() where user_id=uid;
 insert into public.patiyiz_reward_ledger(user_id,redemption_id,delta) values(uid,order_id,-product.coins);
 return jsonb_build_object('id',order_id,'status','pending','item',product.name,
  'spent',product.coins,'balance',balance_now-product.coins,'destination',p_destination);
end
$function$;
revoke execute on function public.patiyiz_redeem_reward(text,text,uuid) from public,anon;
grant execute on function public.patiyiz_redeem_reward(text,text,uuid) to authenticated;
comment on column public.patiyiz_reward_redemptions.destination is
 'own_pet, street_animals or environment. Environment is used for verified tree planting requests.';
