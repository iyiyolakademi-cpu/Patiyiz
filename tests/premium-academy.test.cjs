const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const premium=fs.readFileSync('premium-academy.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sql=fs.readFileSync('supabase/patiyiz-premium-academy-20261024.sql','utf8');
function controller({member=false}={}){
 const log=[],alerts=[],tables={
  patiyiz_premium_courses:[{id:'dog-30',title:'Köpek Kampı',subtitle:'Yararlı',days:30,icon:'🐕',tag:'Köpek'}],
  patiyiz_premium_progress:[],
  patiyiz_premium_lessons:[{course_id:'dog-30',day_no:1,module_name:'Başlangıç',title:'Güvenli başlangıç',activity:'Evde güvenli alan oluştur.',reflection:'Stres belirtilerini not et.'}],
 };
 const sb={from(name){
  log.push(name);
  const chain={
   select(){return this},eq(){return this},order(){return Promise.resolve({data:tables[name]||[],error:null})},
   maybeSingle(){return Promise.resolve({data:name==='patiyiz_premium_entitlements'?(member?{expires_at:null}:null):null,error:null})},
   then(ok,fail){return Promise.resolve({data:tables[name]||[],error:null}).then(ok,fail)},
   upsert(row){log.push('write:'+name);if(name==='patiyiz_premium_progress')tables[name].push(row);return Promise.resolve({error:null})},
   delete(){log.push('delete:'+name);return this}
  };
  return chain;
 }};
 const ctx={window:{},Date,console};
 vm.runInNewContext(premium,ctx,{filename:'premium-academy.js'});
 const ctrl=ctx.window.PatiyizPremiumAcademy.create({
  sb,userId:'user-one',
  notify:(...args)=>alerts.push(args),
  esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'),
  onChange(){}
 });
 return {ctrl,log,alerts,tables};
}
test('Premium displays three product offers without pretending to charge users',async()=>{
 const {ctrl,log}=controller();
 await ctrl.load();
 assert.equal(ctrl.state.member,false);
 const page=ctrl.render();
 for(const plan of ['Tek eğitim paketi','Patiyiz Premium','Patiyiz Premium Yıllık'])assert.ok(page.includes(plan),plan);
 assert.match(page,/planlanan/i);
 assert.match(page,/Satışa henüz açılmadı/);
 assert.ok(!log.includes('patiyiz_premium_lessons'),'no premium content read before membership');
 await ctrl.open('dog-30');
 assert.match(ctrl.render(),/🔒 Premium dersleri/);
 assert.ok(!log.includes('patiyiz_premium_lessons'),'teasers must not fetch gated lessons');
});
test('An entitled account can read daily lessons and mark progress via database',async()=>{
 const {ctrl,log}=controller({member:true});
 await ctrl.load();
 assert.equal(ctrl.state.member,true);
 await ctrl.open('dog-30');
 assert.ok(log.includes('patiyiz_premium_lessons'));
 ctrl.openDay(1);
 assert.match(ctrl.render(),/Evde güvenli alan oluştur/);
 await ctrl.complete();
 assert.ok(ctrl.state.completed.has('dog-30:1'));
 assert.ok(log.includes('write:patiyiz_premium_progress'));
 assert.match(ctrl.render(),/Tamamlandı ve hesabına kaydedildi/);
});
test('Inactive users cannot award themselves Premium access or progress',async()=>{
 const {ctrl,log}=controller({member:false});
 await ctrl.load();
 await ctrl.open('dog-30');
 ctrl.openDay(1);
 await ctrl.complete();
 assert.ok(!log.includes('write:patiyiz_premium_progress'));
 assert.doesNotMatch(premium,/\.from\('patiyiz_premium_entitlements'\)\.upsert/);
 assert.doesNotMatch(premium,/\.from\('patiyiz_premium_entitlements'\)\.insert/);
});
test('The only preparatory signup stores opt-in interest, never initiates a charge',async()=>{
 const {ctrl,log,alerts}=controller();
 await ctrl.load();
 await ctrl.join();
 assert.equal(ctrl.state.waitlisted,true);
 assert.ok(log.includes('write:patiyiz_premium_waitlist'));
 assert.match(alerts[0][0],/ücretli üyelik başlatmaz/);
 await ctrl.leave();
 assert.equal(ctrl.state.waitlisted,false);
 assert.ok(log.includes('delete:patiyiz_premium_waitlist'));
});
test('Premium lesson bodies are absent from publicly served files and GitHub schema',()=>{
 assert.doesNotMatch(premium,/30. gün: kişisel devam planı|Gevşek tasma başlangıcı/);
 assert.doesNotMatch(sql,/jsonb_to_recordset|insert into public\.patiyiz_premium_lessons/);
 assert.match(sql,/create policy "premium_lessons_members_only"/);
 assert.match(sql,/patiyiz_premium_entitlements/);
 assert.match(sql,/expires_at > now\(\)/);
 assert.match(sql,/create policy "premium_progress_member_insert"/);
 assert.match(sql,/create policy "premium_waitlist_self_delete"/);
 assert.match(sql,/revoke insert,update,delete on public\.patiyiz_premium_entitlements/);
});
test('Premium is in navigation, feature drawer, renderer and before app boot scripts',()=>{
 assert.match(app,/\['premium','Premium Akademi','library'\]/);
 assert.match(app,/\['premium','✦ Premium Akademi','library'\]/);
 assert.match(app,/premium:premiumPage/);
 assert.match(app,/case 'premium-join'/);
 assert.match(app,/case 'premium-leave'/);
 assert.match(app,/case 'premium-complete'/);
 assert.match(app,/function premiumPage\(\)/);
 assert.match(app,/premiumPortal=null/);
 assert.ok(html.indexOf('premium-academy.js')>0);
 assert.ok(html.indexOf('premium-academy.js')<html.indexOf('src="app.js'));
 assert.match(html,/premium=1/);
});
