-- Patiyiz points store · Nov 1, 2026
-- Only four offerings remain visible; historical redemptions and inventory rows are preserved.
-- New cat/dog inventory starts at ZERO pending real-world verification.
begin;
update public.patiyiz_reward_items
set enabled=(id in ('kedi-mamasi-250','kopek-mamasi-250','mama-destek','fidan-bagisi'))
where enabled is distinct from (id in ('kedi-mamasi-250','kopek-mamasi-250','mama-destek','fidan-bagisi'));
insert into public.patiyiz_reward_items(id,name,description,kind,coins,emoji,enabled,sort_order,stock_available)
values
 ('kedi-mamasi-250','Kedi Maması · 250 g','Kediler için 250 gram kuru mama talebi. Stok doğrulandığında puanla alınabilir.','food',350,'🐈',true,1,0),
 ('kopek-mamasi-250','Köpek Maması · 250 g','Köpekler için 250 gram kuru mama talebi. Stok doğrulandığında puanla alınabilir.','food',350,'🐕',true,2,0)
on conflict (id) do update
set name=excluded.name,description=excluded.description,kind=excluded.kind,
    coins=excluded.coins,emoji=excluded.emoji,enabled=true,sort_order=excluded.sort_order;
update public.patiyiz_reward_items set sort_order=3,coins=400,emoji='🤝',
  name='Sokak Hayvanlarına Mama Desteği',
  description='Sokakta yaşayan hayvanlar için mama desteği talebi. Dağıtım ancak doğrulama ve kanıtla tamamlanır.'
where id='mama-destek';
update public.patiyiz_reward_items set sort_order=4,coins=700,emoji='🌱',
  name='Bir Fidan Bağışla' where id='fidan-bagisi';
commit;

-- 10,000 points / 1,000 TRY cash concept is deliberately NOT deployed as an
-- active payout feature pending payout funding, eligibility, anti-fraud rules,
-- taxation and legal review. The app shows this clearly as a planned program.
