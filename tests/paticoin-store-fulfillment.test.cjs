const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const sql=fs.readFileSync('supabase/paticoin-store-fulfillment-20261024.sql','utf8');
const app=fs.readFileSync('app.js','utf8');
const admin=fs.readFileSync('admin.html','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const html=fs.readFileSync('index.html','utf8');
function portion(src,first,last){const i=src.indexOf(first),j=src.indexOf(last,i+first.length);assert.ok(i>=0&&j>i,'Expected '+first+' before '+last);return src.slice(i,j)}
test('Mağaza durumları bekliyor > onaylandı > hazırlanıyor > teslim ve iptal akışıdır',()=>{
 for(const code of ['pending','approved','preparing','fulfilled','cancelled'])assert.match(sql,new RegExp("'"+code+"'"));
 assert.match(sql,/current_order.status='pending' and p_next_status in \('approved','cancelled'\)/);
 assert.match(sql,/current_order.status='approved' and p_next_status in \('preparing','cancelled'\)/);
 assert.match(sql,/current_order.status='preparing' and p_next_status in \('fulfilled','cancelled'\)/);
 assert.match(sql,/if p_next_status='fulfilled' and cleaned_proof is null/);
 assert.match(sql,/if p_next_status='cancelled' and cleaned_note is null/);
});
test('Stok sayımı sadece yönetici tarafından ve stok yetersizse onay bloke',()=>{
 assert.match(sql,/create or replace function public.patiyiz_admin_reward_stock\(/);
 assert.match(sql,/stock_available integer not null default 0/);
 assert.match(sql,/stock_available=stock_available-1/);
 assert.match(sql,/and stock_available>0 returning stock_available/);
 assert.match(sql,/raise exception 'Stok yetersiz/);
 assert.match(sql,/stock_available=stock_available\+1/);
 assert.match(sql,/p_quantity>100000/);
 assert.match(sql,/manual_stock_count/);
});
test('İptal sadece bir kez iade yapabilir; atomik cüzdan ve finans defteri hareketi',()=>{
 assert.match(sql,/where id=p_redemption_id for update/);
 assert.match(sql,/if not \(/);
 assert.match(sql,/balance=balance\+current_order.coins_spent,updated_at=now\(\)/);
 assert.match(sql,/values\(current_order.user_id,'refund:'\|\|current_order.id::text,current_order.coins_spent\)/);
 assert.match(sql,/stock_reserved=case when p_next_status='cancelled' then false/);
});
test('Yalnız yetkili hesaplar RPC ile durum değiştirebilir; RLS ve işlem kayıtları korunur',()=>{
 for(const fn of ['patiyiz_admin_reward_dashboard','patiyiz_admin_reward_stock','patiyiz_admin_reward_transition']){
  assert.match(sql,new RegExp('create or replace function public\\.'+fn+'\\('));
  assert.match(sql,new RegExp('revoke execute on function public\\.'+fn+'\\('));
 }
 assert.match(sql,/where a.user_id=uid/);
 assert.match(sql,/auth.uid\(\)/);
 assert.match(sql,/security definer set search_path=''/);
 assert.match(sql,/patiyiz_reward_fulfillment_events enable row level security/);
 assert.match(sql,/patiyiz_reward_inventory_events enable row level security/);
 assert.match(sql,/revoke all on public.patiyiz_reward_fulfillment_events/);
 assert.match(sql,/o.user_id=\(select auth.uid\(\)\)/);
 assert.match(sql,/https:\/\/\[a-z0-9/);
});
test('Admin yönetim panelinde mağaza ve stok sekmeleri, onay ve kanıt kontrolleri var',()=>{
 assert.match(admin,/data-tab="reward_orders"/);
 assert.match(admin,/data-tab="reward_stock"/);
 assert.match(admin,/patiyiz_admin_reward_dashboard/);
 assert.match(admin,/patiyiz_admin_reward_transition/);
 assert.match(admin,/patiyiz_admin_reward_stock/);
 assert.match(admin,/Teslimat kanıtı HTTPS bağlantısı gerekli/);
 assert.match(admin,/İptal gerekçesi zorunlu/);
 assert.match(admin,/data-reward-action="transition"/);
 assert.match(admin,/data-reward-action="stock"/);
 assert.match(admin,/data-reward-order/);
 assert.match(admin,/audit|İşlem geçmişi|Son stok hareketleri/);
 const inline=admin.match(/<script>\s*([\s\S]*?)<\/script>/);
 assert.ok(inline);assert.doesNotThrow(()=>new vm.Script(inline[1]));
});
test('Kullanıcı mağazada kanıt, doğru durumlar ve geçmişini görür',()=>{
 const src=portion(app,'function patiShopPage(){','function patiCoinShowCheckout(');
 let markup='';
 const fn=vm.runInNewContext(src+'\npatiShopPage',{
  patiCoinState:{balance:77,items:[{id:'food',name:'Mini Mama',description:'Mama',coins:150,emoji:'🥣'}],
   orders:[{id:'o1',item_id:'food',coins_spent:150,destination:'street_animals',status:'fulfilled',admin_note:'Bağış teslim edildi',proof_url:'https://example.com/proof.jpg'}],
   history:[{redemption_id:'o1',next_status:'approved',created_at:'2026-10-24',note:'Kontrol'}]},
  main:{set innerHTML(v){markup=v}},
  esc:s=>String(s),day:s=>String(s)
 });
 fn();
 assert.match(markup,/Tamamlandı/);
 assert.match(markup,/Bağış teslim edildi/);
 assert.match(markup,/https:\/\/example.com\/proof.jpg/);
 assert.match(markup,/Sipariş hareketleri/);
 assert.match(markup,/data-action="paticoin-refresh"/);
 assert.match(app,/case 'paticoin-refresh':void patiCoinSync\(false\)/);
 assert.match(css,/\.paticoin-order-status/);
 assert.match(html,/app\.js\?v=20261024-release-reliability-1/);
});
