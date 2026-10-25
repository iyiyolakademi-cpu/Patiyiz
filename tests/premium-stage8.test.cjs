const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('premium-academy.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('premium-stage8.css','utf8');
function setup({member=true,expiresAt=null,courseDays=3,failCatalog=false}={}){
 const calls=[],notices=[],baseLesson=(day)=>({
  course_id:'dog-30',day_no:day,module_name:'Başlangıç',title:'Uygulama '+day,activity:'Güvenli alan ve pozitif eğitim '+day,reflection:'Öğrendiklerini değerlendir '+day
 });
 const tables={
  patiyiz_premium_courses:[{id:'dog-30',title:'Köpek Kampı',subtitle:'Adım adım güvenli öğrenme',days:courseDays,icon:'🐕',tag:'Köpek'}],
  patiyiz_premium_progress:[],
  patiyiz_premium_lessons:[baseLesson(1),baseLesson(2)]
 };
 let failEntitlement=false;
 const sb={from(name){calls.push('read:'+name);const chain={
  select(){return this},eq(){return this},
  order(){return Promise.resolve({data:tables[name],error:failCatalog&&name==='patiyiz_premium_courses'?{message:'offline'}:null})},
  maybeSingle(){return Promise.resolve({
   data:name==='patiyiz_premium_entitlements'&&member?{expires_at:expiresAt}:null,
   error:name==='patiyiz_premium_entitlements'&&failEntitlement?{message:'offline'}:null
  })},
  then(resolve,reject){return Promise.resolve({data:tables[name]||[],error:null}).then(resolve,reject)},
  upsert(record){calls.push('write:'+name);return Promise.resolve({data:record,error:null})},
  delete(){calls.push('delete:'+name);return this}
 };return chain}};
 const ctx={window:{},console,Date};
 vm.runInNewContext(src,ctx,{filename:'premium-academy.js'});
 const ctrl=ctx.window.PatiyizPremiumAcademy.create({sb,userId:'test-account',esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),notify:(...args)=>notices.push(args),onChange:()=>{}});
 return {ctrl,calls,notices,tables,failEntitlement:()=>{failEntitlement=true}};
}
test('Existing authenticated content and waitlist remain server-owned and payment-free',()=>{
 assert.match(src,/from\('patiyiz_premium_entitlements'\)/);
 assert.match(src,/from\('patiyiz_premium_progress'\)/);
 assert.match(src,/from\('patiyiz_premium_waitlist'\)/);
 assert.doesNotMatch(src,/from\('patiyiz_premium_entitlements'\)\.(insert|upsert|update)/);
 assert.doesNotMatch(src,/paymentIntent|checkout\.sessions|createPayment/);
});
test('Nonmember does not download or reveal paid lessons',async()=>{
 const {ctrl,calls}=setup({member:false});
 await ctrl.load();
 await ctrl.open('dog-30');
 assert.match(ctrl.render(),/🔒 Premium dersleri/);
 assert.ok(!calls.includes('read:patiyiz_premium_lessons'));
 assert.equal(ctrl.state.member,false);
});
test('Expired entitlement cannot show or complete private lessons after a stale page',async()=>{
 const {ctrl,calls}=setup();
 await ctrl.load();await ctrl.open('dog-30');ctrl.openDay(1);
 assert.match(ctrl.render(),/Güvenli alan ve pozitif eğitim 1/);
 ctrl.state.expiresAt=new Date(Date.now()-1000).toISOString();
 const page=ctrl.render();
 assert.equal(ctrl.state.member,false);
 assert.equal(ctrl.state.lessons.size,0);
 assert.ok(!page.includes('Güvenli alan ve pozitif eğitim 1'));
 await ctrl.complete();
 assert.ok(!calls.includes('write:patiyiz_premium_progress'));
});
test('Failed entitlement refresh hides previously retrieved private lesson bodies',async()=>{
 const {ctrl,failEntitlement}=setup();
 await ctrl.load();await ctrl.open('dog-30');ctrl.openDay(1);
 failEntitlement();await ctrl.load();
 assert.equal(ctrl.state.member,false);
 assert.equal(ctrl.state.lessons.size,0);
 assert.equal(ctrl.state.completed.size,0);
 assert.ok(!ctrl.render().includes('Güvenli alan ve pozitif eğitim 1'));
 assert.match(ctrl.render(),/Premium bilgileri yüklenemedi/);
});
test('Resume safely falls back to an actually available daily lesson',async()=>{
 const {ctrl}=setup();
 await ctrl.load();
 await ctrl.resume('dog-30',99);
 assert.equal(ctrl.state.selected,'dog-30');
 assert.equal(ctrl.state.day,1);
 await ctrl.complete();
 await ctrl.resume('dog-30',99);
 assert.equal(ctrl.state.day,2);
});
test('Member day navigation renders previous and next controls',async()=>{
 const {ctrl}=setup();
 await ctrl.load();await ctrl.open('dog-30');ctrl.openDay(1);
 const first=ctrl.render();
 assert.match(first,/premium-day-navigation/);
 assert.match(first,/Sonraki gün/);
 assert.doesNotMatch(first,/Önceki gün/);
 ctrl.openDay(2);const last=ctrl.render();
 assert.match(last,/Önceki gün/);
 assert.doesNotMatch(last,/Sonraki gün/);
});
test('Dashboard progress excludes unrelated saved records and never exceeds 100%',async()=>{
 const {ctrl}=setup({courseDays:3});
 await ctrl.load();
 ctrl.state.completed.add('hidden-course:1');
 ctrl.state.completed.add('dog-30:1');
 ctrl.state.completed.add('dog-30:2');
 ctrl.state.completed.add('dog-30:50');
 const text=ctrl.render();
 assert.match(text,/Genel ilerleme/);
 assert.match(text,/%67/);
 assert.doesNotMatch(text,/%133/);
 assert.match(text,/2\/3 tamamlandı/);
});
test('Unavailable catalog shows retry rather than endless loading',async()=>{
 const {ctrl}=setup({member:false,failCatalog:true});
 await ctrl.load();
 const page=ctrl.render();
 assert.match(page,/Bilgilere ulaşılamadı/);
 assert.match(page,/data-action="premium-refresh"/);
 assert.doesNotMatch(page,/bilgileri yükleniyor/i);
});
test('Prices explicitly remain draft and signup cannot collect payment',async()=>{
 const {ctrl}=setup({member:false});
 await ctrl.load();const page=ctrl.render();
 assert.match(page,/Tek eğitim paketi/);
 assert.match(page,/Patiyiz Premium Yıllık/);
 assert.match(page,/Fiyatlar yalnızca taslaktır/);
 assert.match(page,/bu işlem ödeme ya da üyelik oluşturmaz/i);
});
test('Premium styles are isolated, cache refreshed and route uses safer resume',()=>{
 assert.match(html,/premium-stage8\.css\?v=20261025-premium-v2/);
 assert.match(html,/premium-academy\.js\?v=20261025-premium-v2/);
 assert.match(html,/premium20261025=8/);
 assert.match(css,/#main-content \.premium-v2/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/data-pati-theme="dark"/);
 assert.match(app,/premiumPortal\.resume\(id,Number\(target\.dataset\.day\)\)/);
});