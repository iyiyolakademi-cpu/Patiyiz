-- PatiCoin redemption fulfillment and inventory, audited and admin-only.
-- Initial available stock is zero until a real inventory count is entered by an admin.
alter table public.patiyiz_reward_items
 add column if not exists stock_available integer not null default 0 check(stock_available>=0);
alter table public.patiyiz_reward_redemptions
 add column if not exists stock_reserved boolean not null default false,
 add column if not exists admin_note text,
 add column if not exists proof_url text,
 add column if not exists processed_by uuid references auth.users(id) on delete set null,
 add column if not exists reviewed_at timestamptz;
alter table public.patiyiz_reward_redemptions
 drop constraint if exists patiyiz_reward_redemptions_status_check;
alter table public.patiyiz_reward_redemptions
 add constraint patiyiz_reward_redemptions_status_check
 check(status in ('pending','approved','preparing','fulfilled','cancelled'));
create index if not exists patiyiz_reward_order_status_date
 on public.patiyiz_reward_redemptions(status,created_at desc);
create index if not exists patiyiz_reward_order_processed_by
 on public.patiyiz_reward_redemptions(processed_by);

create table if not exists public.patiyiz_reward_fulfillment_events(
 id uuid primary key default gen_random_uuid(),
 redemption_id uuid not null references public.patiyiz_reward_redemptions(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 previous_status text not null,
 next_status text not null,
 note text,
 proof_url text,
 created_at timestamptz not null default now()
);
create index if not exists patiyiz_reward_events_redemption_date
 on public.patiyiz_reward_fulfillment_events(redemption_id,created_at desc);

create table if not exists public.patiyiz_reward_inventory_events(
 id uuid primary key default gen_random_uuid(),
 item_id text not null references public.patiyiz_reward_items(id),
 actor_id uuid references auth.users(id) on delete set null,
 previous_stock integer not null,
 next_stock integer not null,
 operation text not null,
 created_at timestamptz not null default now()
);
create index if not exists patiyiz_reward_inventory_events_item_date
 on public.patiyiz_reward_inventory_events(item_id,created_at desc);
alter table public.patiyiz_reward_fulfillment_events enable row level security;
alter table public.patiyiz_reward_inventory_events enable row level security;
revoke all on public.patiyiz_reward_fulfillment_events,public.patiyiz_reward_inventory_events from anon,authenticated;
grant select on public.patiyiz_reward_fulfillment_events to authenticated;
create policy "reward user reads own fulfillment history"
 on public.patiyiz_reward_fulfillment_events for select to authenticated
 using (exists(select 1 from public.patiyiz_reward_redemptions o
               where o.id=redemption_id and o.user_id=(select auth.uid())));
-- The administrator sees all orders and stock only through the admin-checking RPCs.

create or replace function public.patiyiz_admin_reward_dashboard()
 returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); payload jsonb;
begin
 if uid is null or not exists(select 1 from public.patiyiz_admins a where a.user_id=uid)
  then raise exception 'Admin access required' using errcode='42501'; end if;
 select jsonb_build_object(
  'orders',coalesce((select jsonb_agg(to_jsonb(t)) from(
   select r.id,r.user_id,r.item_id,r.pet_id,r.destination,r.coins_spent,
    r.status,r.stock_reserved,r.admin_note,r.proof_url,r.created_at,r.reviewed_at,r.fulfilled_at,
    coalesce(p.display_name,p.handle,'Üye') as display_name,p.handle,
    i.name as product_name,i.emoji,pet.name as pet_name
   from public.patiyiz_reward_redemptions r
   left join public.profiles p on p.id=r.user_id
   join public.patiyiz_reward_items i on i.id=r.item_id
   left join public.pets pet on pet.id=r.pet_id
   order by case r.status when 'pending' then 0 when 'approved' then 1 when 'preparing' then 2 else 3 end,
    r.created_at desc limit 250
  ) t),'[]'::jsonb),
  'stock',coalesce((select jsonb_agg(to_jsonb(t)) from (
    select i.id,i.name,i.emoji,i.kind,i.coins,i.stock_available,i.enabled
    from public.patiyiz_reward_items i order by i.sort_order,i.name
  ) t),'[]'::jsonb),
  'events',coalesce((select jsonb_agg(to_jsonb(t)) from (
   select e.redemption_id,e.previous_status,e.next_status,e.note,e.proof_url,e.created_at
   from public.patiyiz_reward_fulfillment_events e
   order by e.created_at desc limit 250
  )t),'[]'::jsonb),
  'inventory_events',coalesce((select jsonb_agg(to_jsonb(t)) from (
   select e.item_id,e.previous_stock,e.next_stock,e.operation,e.created_at
   from public.patiyiz_reward_inventory_events e
   order by e.created_at desc limit 100
  )t),'[]'::jsonb),
  'counts',jsonb_build_object(
   'pending',(select count(*) from public.patiyiz_reward_redemptions where status='pending'),
   'approved',(select count(*) from public.patiyiz_reward_redemptions where status='approved'),
   'preparing',(select count(*) from public.patiyiz_reward_redemptions where status='preparing'),
   'fulfilled',(select count(*) from public.patiyiz_reward_redemptions where status='fulfilled'),
   'cancelled',(select count(*) from public.patiyiz_reward_redemptions where status='cancelled')
  )
 ) into payload;
 return payload;
end $$;

create or replace function public.patiyiz_admin_reward_stock(p_item_id text,p_quantity integer)
 returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); previous integer;
begin
 if uid is null or not exists(select 1 from public.patiyiz_admins a where a.user_id=uid)
  then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_quantity is null or p_quantity<0 or p_quantity>100000
  then raise exception 'Stok miktarı 0 ile 100000 arasında olmalı'; end if;
 select stock_available into previous from public.patiyiz_reward_items
  where id=p_item_id for update;
 if not found then raise exception 'Ürün bulunamadı'; end if;
 update public.patiyiz_reward_items set stock_available=p_quantity where id=p_item_id;
 insert into public.patiyiz_reward_inventory_events(item_id,actor_id,previous_stock,next_stock,operation)
 values(p_item_id,uid,previous,p_quantity,'manual_stock_count');
 return jsonb_build_object('id',p_item_id,'stock_available',p_quantity);
end $$;

create or replace function public.patiyiz_admin_reward_transition(
 p_redemption_id uuid,p_next_status text,p_note text default null,p_proof_url text default null
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 uid uuid:=auth.uid();
 current_order record;
 remaining_stock integer;
 cleaned_note text:=nullif(btrim(coalesce(p_note,'')),'');
 cleaned_proof text:=nullif(btrim(coalesce(p_proof_url,'')),'');
 new_balance integer;
begin
 if uid is null or not exists(select 1 from public.patiyiz_admins a where a.user_id=uid)
  then raise exception 'Admin access required' using errcode='42501'; end if;
 select * into current_order from public.patiyiz_reward_redemptions
  where id=p_redemption_id for update;
 if not found then raise exception 'Talep bulunamadı'; end if;
 if not (
   (current_order.status='pending' and p_next_status in ('approved','cancelled')) or
   (current_order.status='approved' and p_next_status in ('preparing','cancelled')) or
   (current_order.status='preparing' and p_next_status in ('fulfilled','cancelled'))
 ) then raise exception 'Bu durum geçişine izin verilmiyor'; end if;
 if length(coalesce(cleaned_note,''))>700 then raise exception 'Açıklama çok uzun'; end if;
 if length(coalesce(cleaned_proof,''))>1000 then raise exception 'Kanıt bağlantısı çok uzun'; end if;
 if cleaned_proof is not null and cleaned_proof !~* '^https://[a-z0-9.-]+(:[0-9]{1,5})?(/[^[:space:]]*)?$'
  then raise exception 'Kanıt bağlantısı geçerli bir HTTPS adresi olmalı'; end if;
 if p_next_status='fulfilled' and cleaned_proof is null
  then raise exception 'Teslimat veya bağış kanıtı bağlantısı gerekli'; end if;
 if p_next_status='cancelled' and cleaned_note is null
  then raise exception 'İptal gerekçesi gerekli'; end if;

 if p_next_status='approved' then
  update public.patiyiz_reward_items set stock_available=stock_available-1
   where id=current_order.item_id and stock_available>0 returning stock_available into remaining_stock;
  if not found then raise exception 'Stok yetersiz. Önce gerçek stok miktarını girin.'; end if;
  update public.patiyiz_reward_redemptions set stock_reserved=true where id=p_redemption_id;
  insert into public.patiyiz_reward_inventory_events(item_id,actor_id,previous_stock,next_stock,operation)
   values(current_order.item_id,uid,remaining_stock+1,remaining_stock,'approve_reserve');
 end if;
 if p_next_status='cancelled' then
  if current_order.stock_reserved then
   update public.patiyiz_reward_items set stock_available=stock_available+1
    where id=current_order.item_id returning stock_available into remaining_stock;
   insert into public.patiyiz_reward_inventory_events(item_id,actor_id,previous_stock,next_stock,operation)
    values(current_order.item_id,uid,remaining_stock-1,remaining_stock,'cancel_release');
  end if;
  insert into public.patiyiz_reward_wallets(user_id) values(current_order.user_id) on conflict(user_id) do nothing;
  update public.patiyiz_reward_wallets
   set balance=balance+current_order.coins_spent,updated_at=now()
   where user_id=current_order.user_id returning balance into new_balance;
  insert into public.patiyiz_reward_ledger(user_id,task_code,delta)
   values(current_order.user_id,'refund:'||current_order.id::text,current_order.coins_spent);
 end if;

 update public.patiyiz_reward_redemptions
 set status=p_next_status,admin_note=coalesce(cleaned_note,admin_note),
     proof_url=coalesce(cleaned_proof,proof_url),processed_by=uid,reviewed_at=now(),
     fulfilled_at=case when p_next_status='fulfilled' then now() else fulfilled_at end,
     stock_reserved=case when p_next_status='cancelled' then false else stock_reserved end
 where id=p_redemption_id;
 insert into public.patiyiz_reward_fulfillment_events
   (redemption_id,actor_id,previous_status,next_status,note,proof_url)
 values(p_redemption_id,uid,current_order.status,p_next_status,cleaned_note,cleaned_proof);
 return jsonb_build_object('id',p_redemption_id,'status',p_next_status,
  'balance_after_refund',new_balance,'stock_available',remaining_stock);
end $$;

revoke execute on function public.patiyiz_admin_reward_dashboard() from public,anon;
revoke execute on function public.patiyiz_admin_reward_stock(text,integer) from public,anon;
revoke execute on function public.patiyiz_admin_reward_transition(uuid,text,text,text) from public,anon;
grant execute on function public.patiyiz_admin_reward_dashboard() to authenticated;
grant execute on function public.patiyiz_admin_reward_stock(text,integer) to authenticated;
grant execute on function public.patiyiz_admin_reward_transition(uuid,text,text,text) to authenticated;
comment on column public.patiyiz_reward_items.stock_available is 'Real available item count. Starts at 0; decremented at admin approval, restored on admin cancellation.';
comment on column public.patiyiz_reward_redemptions.proof_url is 'Admin-added HTTPS evidence link; the application must not imply delivery was completed before status=fulfilled.';
