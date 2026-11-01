-- 2026-11-01 Social Puan Mağazası price refresh and proposed low-point items.
-- Existing reward inventory and historical orders are untouched. New items start at
-- stock=0 until the operator physically verifies stock and enables fulfillment.
begin;
update public.patiyiz_reward_items
 set coins=case id
  when 'mama-mini' then 220
  when 'mama-kilo' then 900
  when 'mama-kabi' then 450
  when 'mama-destek' then 300
  when 'fidan-bagisi' then 700
  else coins end
where id in ('mama-mini','mama-kilo','mama-kabi','mama-destek','fidan-bagisi');
insert into public.patiyiz_reward_items
 (id,name,description,kind,coins,emoji,enabled,sort_order,stock_available)
values
 ('mini-sticker','Mini Çıkartma Seti','Küçük çıkartma seti; stok doğrulandıktan sonra satın alınabilir.','supply',120,'🎨',true,6,0),
 ('mini-notebook','Cep Not Defteri','Günlük notlar için cep boy defter. Stok doğrulanmayı bekliyor.','supply',180,'📓',true,7,0),
 ('keychain-basic','Sade Anahtarlık','Günlük kullanım için küçük anahtarlık; stok doğrulaması bekleniyor.','supply',160,'🔑',true,8,0),
 ('phone-stand-basic','Telefon Standı','Masa üstünde kullanılabilen küçük telefon standı; stok doğrulaması bekleniyor.','supply',250,'📱',true,9,0)
on conflict (id) do nothing;
commit;
