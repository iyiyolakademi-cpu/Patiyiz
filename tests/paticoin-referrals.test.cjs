const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8'),sql=fs.readFileSync('supabase/paticoin-referrals-20261024.sql','utf8'),html=fs.readFileSync('index.html','utf8');
test('Davet kodları benzersiz, her hesap yalnız bir kod kullanabilir',()=>{
 assert.match(sql,/user_id uuid primary key/);
 assert.match(sql,/code text not null unique/);
 assert.match(sql,/referred_user_id uuid primary key/);
 assert.match(sql,/patiyiz_no_self_referral check\(referred_user_id<>referrer_user_id\)/);
 assert.match(sql,/if inviter_id=uid then raise exception/);
 assert.match(sql,/on conflict \(referred_user_id\) do nothing/);
});
test('Davet puanları her iki hesaba tek transaction içinde kaydedilir',()=>{
 assert.match(sql,/values \(uid,'referral_join',50\),\(inviter_id,'referral_friend:'/);
 assert.match(sql,/balance=balance\+50,lifetime_earned=lifetime_earned\+50/);
 assert.match(sql,/where user_id in \(uid,inviter_id\)/);
 assert.match(sql,/order by user_id for update/);
 assert.match(sql,/grant execute on function public.patiyiz_redeem_invite\(text\) to authenticated/);
 assert.match(sql,/revoke all on public.patiyiz_invite_codes,public.patiyiz_referrals from anon,authenticated/);
 assert.match(sql,/enable row level security/);
 assert.doesNotMatch(sql,/grant (insert|update|delete) on public.patiyiz_referrals to authenticated/);
});
test('PatiCoin görev ekranında kod, paylaşma ve kullanma sunulur',()=>{
 assert.match(app,/function patiInviteShare\(\)/);
 assert.match(app,/function patiInviteRedeem\(\)/);
 assert.match(app,/case 'paticoin-invite-redeem'/);
 assert.match(app,/case 'paticoin-invite-share'/);
 assert.match(app,/patiyiz_my_invite_info/);
 assert.match(app,/patiyiz_redeem_invite/);
 assert.match(app,/data-action="paticoin-invite-redeem"/);
 assert.match(app,/data-action="paticoin-invite-share"/);
 assert.match(html,/app\.js\?v=20261024-invite-rewards-1/);
});
test('Kazanma ekranı Harika tuşu tıklanmadan kapanmaz',()=>{
 const a=app.indexOf('function patiCoinAnimation(amount,titles){');
 const b=app.indexOf('function patiRewardsPage(){',a);
 const body=app.slice(a,b);
 assert.match(body,/addEventListener\('click',close\)/);
 assert.doesNotMatch(body,/setTimeout\(close/);
 assert.match(body,/Harika!/);
});
