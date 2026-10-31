const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-ux-hayvanim-20261025.css','utf8');
const sql=fs.readFileSync('supabase/patiyiz-server-explore-ranked-20261025.sql','utf8');
function cut(from,to){const s=app.indexOf(from),e=app.indexOf(to,s+from.length);assert.ok(s>=0&&e>s,'missing '+from);return app.slice(s,e)}
test('Profil ilerlemesi dört isteğe bağlı hayvansız görevden oluşur ve küçüktür',()=>{
 const p=cut('function patiyizProgressCard(){','let patiyizReelsObserver');
 assert.match(p,/pati-progress-compact/);
 assert.match(p,/<details/);
 assert.match(p,/Evcil hayvan eklemek isteğe bağlıdır/);
 assert.doesNotMatch(p,/done:data\.pets\.some/);
 assert.match(css,/pati-progress-compact:not\(\[open\]\)/);
});
test('Keşfet sunucuda RLS ile sıralanır, sıralama değişimi yeni sayfalama başlatır',()=>{
 const load=cut('async function patiExploreLoadMedia(','async function patiExploreLookup(');
 assert.match(load,/sb\.rpc\('patiyiz_explore_ranked'/);
 assert.match(load,/state\.sort/);
 assert.match(app,/patiExploreLoadMedia\(true\)/);
 assert.match(sql,/security invoker/);
 assert.match(sql,/limit greatest\(1,least/);
 assert.match(sql,/auth\.uid\(\) is not null/);
});
test('Hikâye tek aşamalı seçim ve isteğe bağlı düzenleme sunar; gizli kalıcı hikâye kontrolü yoktur',()=>{
 const composer=cut('function openStoryComposer(','async function renderEditedStoryFile(');
 const profile=cut('function profilePage(){','function formField(');
 assert.match(composer,/compose\(null,'story',autoPick\)/);
 const unified=cut("function compose(post,mode='post',autoPick=true){",'function uploadStatus(');
 assert.match(unified,/Medya seç/);assert.match(unified,/Düzenle/);assert.match(unified,/Paylaş/);
 assert.doesNotMatch(composer,/Öne çıkanlara kaydet/);
 assert.doesNotMatch(profile,/pati-ig-highlight-section/);
 assert.match(app,/is_highlight:false/);
});
test('Mağaza gerçek stok alanını okur, durumları dürüstçe gösterir',()=>{
 const catalog=cut('function patiShopPage(){','function patiCoinShowCheckout(');
 assert.match(app,/kind,coins,emoji,stock_available/);
 for(const label of ['Stokta yok','Yetersiz Bakiye','Talebin beklemede'])assert.ok(catalog.includes(label),label);
 assert.match(catalog,/soldOut\|\|pending/);
 assert.match(catalog,/paticoin-rewards/);
});
test('Bakım, sağlık ve sağlık dosyası tek Hayvanım girişine bağlanır',()=>{
 assert.match(app,/\['my-pet','Hayvanım','heart'\]/);
 assert.match(app,/function patiMyPetCenterPage\(\)/);
 assert.match(app,/case 'pati-my-pet-tab'/);
 assert.match(app,/patiMyPetTab==='healthfile'/);
 assert.match(css,/pati-pet-center-tabs/);
 assert.match(html,/patiyiz-ux-hayvanim-20261025\.css/);
});
