const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('patiyiz-inspired.css','utf8'),sql=fs.readFileSync('supabase/paticoin-rewards-20261024.sql','utf8');
const segment=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return app.slice(i,j)};

test('Ödül görevlerinde altı gerçek görev ve puan bulunur',()=>{
 const match=segment('const patiCoinTasks=[','function side(){');
 for(const [name,amount] of [['profile_complete',45],['pet_created',35],['first_post',30],['first_story',25],['first_follow',15],['three_posts',45]]){
  assert.match(match,new RegExp("'"+name+"',[^\\n]*?,"+amount+","));
  assert.match(sql,new RegExp("'"+name+"'"));
 }
 assert.match(sql,/unique\(user_id,task_code\)/);
 assert.match(sql,/on conflict\(user_id,task_code\) do nothing/);
 assert.match(sql,/for update/);
});
test('Bakiyeye yalnızca yetkili RPC yazabilir; RLS sadece sahip kaydını okutur',()=>{
 for(const table of ['patiyiz_reward_wallets','patiyiz_reward_ledger','patiyiz_reward_redemptions','patiyiz_reward_items'])
  assert.match(sql,new RegExp('alter table public\\.'+table+' enable row level security'));
 assert.match(sql,/revoke all on public\.patiyiz_reward_wallets/);
 assert.match(sql,/security definer set search_path=''/);
 assert.match(sql,/uid uuid:=auth.uid\(\)/);
 assert.match(sql,/balance_now<product.coins/);
 assert.match(sql,/owner_id=uid/);
 assert.match(sql,/grant execute on function public.patiyiz_redeem_reward\(text,text,uuid\) to authenticated/);
 assert.doesNotMatch(sql,/grant\s+(insert|update|delete)\s+on\s+public\.patiyiz_reward_wallets\s+to\s+authenticated/i);
});
test('Mağazada iki hedef ve pet seçimi sunulur, teslimat gerçekleşti denmez',()=>{
 const x=segment('function patiCoinShowCheckout(id){','function side(){');
 assert.match(x,/value="own_pet"/);
 assert.match(x,/value="street_animals"/);
 assert.match(x,/data-action="paticoin-confirm"/);
 assert.match(x,/patiyiz_redeem_reward/);
 assert.match(x,/beklemeye alınır/);assert.match(x,/Talebin alındı/);
 assert.match(x,/btn.disabled=true/);
 assert.match(x,/data\.pets\.filter\(p=>p\.owner_id===me\.id\)/);
});
test('Coin kazanma animasyonu ve profil/menü bağlantıları korunur',()=>{
 assert.match(app,/function patiCoinAnimation\(amount,titles\)/);
 assert.match(app,/paticoin-celebration/);
 assert.match(app,/case 'paticoin-buy':patiCoinShowCheckout\(id\)/);
 assert.match(app,/case 'paticoin-confirm':patiCoinConfirm\(\)/);
 assert.match(app,/rewards:patiRewardsPage,shop:patiShopPage/);
 assert.match(app,/Görevler & PatiCoin/);
 assert.match(app,/Pati Mağaza/);
 assert.match(app,/paticoin-profile-link/);\n assert.doesNotMatch(app,/data-action=\"paticoin-shop\">🛍️ Pati Mağaza<\/button><\/div>:'\)\+/);
 assert.match(css,/@keyframes patiCoinBounce/);
 assert.match(html,/app\.js\?v=20261024-release-reliability-1/);
});
