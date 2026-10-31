const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sql=fs.readFileSync('supabase/patiyiz-reward-missions-20261024.sql','utf8');
const piece=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return app.slice(i,j)};
test('En Aktif 5 Pati appears immediately after the second feed post',()=>{
 const home=piece('function homePage(){','function savedPostsPage(){');
 assert.doesNotMatch(home,/pati-home-feed-tabs/);
 assert.match(home,/storiesStrip\(\)/);
 assert.doesNotMatch(home,/patiLeaderBoard\(\)/); assert.match(app,/function patiWeeklyBoard\(\)/);
});
test('Saving a post uses server-verified storage and avoids concurrent optimistic toggles',()=>{
 const fn=piece('async function togglePostSave(id){','async function doToggle(');
 assert.match(fn,/pendingPostSaves\.has\(id\)/);
 assert.match(fn,/from\('post_saves'\)\.upsert/);
 assert.match(fn,/onConflict:'user_id,post_id'/);
 assert.match(fn,/\.maybeSingle\(\)/);
 assert.match(fn,/if\(stored===wasSaved\)throw Error/);
 assert.match(app,/case 'save':void togglePostSave\(id\);break/);
 assert.doesNotMatch(app,/case 'save':run\(\(\)=>doToggle/);
 assert.match(app,/k==='saves'&&savesEpoch/);
 assert.match(app,/function savedPostsPage\(\)/);
});
test('A saved post persists across database verification and can be unsaved',async()=>{
 const fn=piece('async function togglePostSave(id){','async function doToggle(');
 let rows=[],calls=0;
 const btn={disabled:false,classList:{toggle(){}},setAttribute(){},removeAttribute(){}};
 const ctx={me:{id:'person'},saved:new Set(),data:{saves:[]},pendingPostSaves:new Set(),savesChangeEpoch:0,console,notify(){},friendly:e=>String(e),view:'home',
  document:{querySelectorAll(){return [btn]}},render(){},
  sb:{from(name){assert.equal(name,'post_saves');return {
   upsert:async data=>{calls++;rows=[data];return {error:null}},
   delete(){return {eq(){return this},then(resolve){rows=[];return Promise.resolve(resolve({error:null}))}}},
   select(){return {eq(){return this},maybeSingle:async()=>({data:rows[0]||null,error:null})}}
  }}}
 };
 const toggle=vm.runInNewContext(fn+'\ntogglePostSave',ctx);
 await toggle('post-1');assert.ok(ctx.saved.has('post-1'));assert.equal(rows.length,1);
 await toggle('post-1');assert.ok(!ctx.saved.has('post-1'));assert.equal(rows.length,0);
 assert.equal(btn.disabled,false);assert.equal(calls,1);
});
test('New PatiCoin missions are exact-period idempotent, server-validated and backward compatible',()=>{
 const old=['profile_complete','pet_created','first_post','first_story','first_follow','three_posts'];
 for(const name of old)assert.match(sql,new RegExp("'"+name+"'::text|'"+name+"',"));
 const daily=['daily_visit','daily_post','daily_story','daily_comment','daily_lesson'];
 const weekly=['weekly_active3','weekly_posts3','weekly_lessons3','weekly_comments5'];
 for(const task of [...daily,...weekly])assert.match(sql,new RegExp("'"+task+"'"));
 assert.match(sql,/task\.code\|\|':'\|\|to_char\(local_day/);
 assert.match(sql,/task\.code\|\|':'\|\|to_char\(local_week/);
 assert.match(sql,/perform 1 from public\.patiyiz_reward_wallets where user_id=uid for update/);
 assert.match(sql,/on conflict\(user_id,task_code\) do nothing/);
 assert.match(sql,/patiyiz_education_progress/);
 assert.match(sql,/patiyiz_pet_reminders/);
 assert.doesNotMatch(sql,/truncate|delete\s+from\s+public\.patiyiz_reward_(wallets|ledger)/i);
});
test('PatiCoin menu is organized while private Health File has its own section',()=>{
 const nav=piece('const nav=[','const cfg=');
 assert.doesNotMatch(nav,/\['rewards'/);
 assert.doesNotMatch(nav,/\['shop'/);
 assert.match(nav,/\['my-pet','Hayvanım'/);
 const menu=piece('function openMobileFeaturesMenu()','const patiCoinTasks=[');
 assert.match(menu,/title:'PatiCoin ve koleksiyonum'/);
 assert.match(menu,/Pati Mağaza/);
 assert.match(menu,/Pati Mağaza/);
 assert.doesNotMatch(menu,/Dijital Sağlık Dosyası/);
 assert.match(html,/id="pati-header-coins"/);
 assert.match(html,/id="pati-desktop-coins"/);
 assert.match(html,/src="health-file\.js/);
 assert.match(app,/case 'saved-posts':navigate\('saved-posts'\)/);
 const profile=piece('function profilePage(){','function formField(');
 assert.doesNotMatch(profile,/Kaydettiklerim/);assert.match(app,/\['saved-posts','Kaydettiğim gönderiler','bookmark'\]/);
 assert.doesNotMatch(profile,/data-action="paticoin-shop"/);
});
test('There are 15 one-time, five daily and four weekly missions',()=>{
 const source=piece('const patiCoinTasks=[','let patiCoinState=');
 const counts={one:0,daily:0,weekly:0};
 for(const line of source.split('\n').filter(l=>l.trim().startsWith("['"))){
  if(line.includes(",'daily'"))counts.daily++;
  else if(line.includes(",'weekly'"))counts.weekly++;
  else counts.one++;
 }
 assert.deepEqual(counts,{one:15,daily:5,weekly:4});
 assert.match(app,/function patiCoinMissionKey\(code,group\)/);
 assert.match(app,/new Intl\.DateTimeFormat\('sv-SE',\{timeZone:'Europe\/Istanbul'/);
 assert.match(app,/Tek Seferlik Görevler/);
 assert.match(app,/Günlük Görevler/);
 assert.match(app,/Haftalık Görevler/);
});
