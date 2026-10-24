const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const health=fs.readFileSync('health-file.js','utf8');
const badges=fs.readFileSync('achievements.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const admin=fs.readFileSync('admin.html','utf8');
const sql=fs.readFileSync('supabase/patiyiz-health-and-admin-notifications-20261024.sql','utf8');
const deleted=fs.readFileSync('supabase/functions/patiyiz-delete-account/index.ts','utf8');
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
function portal(){
 const context={window:{},console,Date};
 vm.runInNewContext(health,context,{filename:'health-file.js'});
 let rows=[],reads=0;
 const sb={
  from(table){assert.equal(table,'patiyiz_health_documents');return {
   select(){return this},eq(){return this},order(){return this},limit:async()=>{reads++;return {data:rows,error:null}},
   insert:async input=>{rows.push({...input,id:'one'});return {error:null}},
   delete(){return {eq(){return Promise.resolve({error:null})}}}
  }},
  storage:{from(bucket){assert.equal(bucket,'patiyiz-health-private');return {
   upload:async()=>({error:null}),remove:async()=>({error:null}),createSignedUrl:async()=>({data:{signedUrl:'https://test.invalid/file'},error:null})
  }}}
 };
 const pets=[{id:'pet-one',owner_id:'user-one',name:'Pati',species:'dog',breed:'',age:'2'}];
 const p=context.window.PatiyizHealthFile.create({
  sb,getUser:()=>({id:'user-one'}),getPets:()=>pets,getReminders:()=>[],getWeights:()=>[],
  esc,notify(){},onChange(){}
 });
 return {p,rows,reads:()=>reads,pets};
}
test('Private health file defaults to owned pets and has a file form',async()=>{
 const {p}=portal();
 assert.match(p.render(),/Dijital Pati Sağlık Dosyası/);
 assert.match(p.render(),/pati-health-record-form/);
 assert.match(p.render(),/health-file/);
 assert.match(p.render(),/Yalnızca sana özel/i);
 await p.load();
 assert.equal(p.state.loaded,true);
});
test('Health metadata saves for the signed-in owner and never invents a public document URL',async()=>{
 const {p}=portal();await p.load();
 const fields={
  'health-file':{files:[]},'health-title':{value:'Kontrol muayenesi'},
  'health-type':{value:'vet'},'health-date':{value:'2026-10-24'},'health-notes':{value:'Genel bakım notu'}
 };
 await p.save({querySelector:s=>fields[s.match(/name="([^"]+)"/)[1]],reset(){}});
 assert.equal(p.state.docs.length,1);
 assert.equal(p.state.docs[0].owner_id,'user-one');
 assert.equal(p.state.docs[0].pet_id,'pet-one');
 assert.equal(p.state.docs[0].object_path,null);
 assert.doesNotMatch(health,/getPublicUrl/);
 assert.match(health,/createSignedUrl\(record\.object_path,90\)/);
});
test('Badge thresholds and 101/101 completion require verified cloud values',()=>{
 const ctx={window:{},Date,console};vm.runInNewContext(badges,ctx);
 const a=ctx.window.PatiyizAchievements.create({esc,notify(){}});
 const fakeProgress=new Set(Array.from({length:101},(_,i)=>'fake-'+i));
 const locked=a.render({freeCompleted:new Set(),premiumCompleted:new Set(),premiumMember:false,cloudReady:false});
 assert.match(locked,/İlk Adım/);
 assert.match(locked,/101 dersi tamamlayınca açılır/);
 const done=a.render({freeCompleted:fakeProgress,premiumCompleted:new Set(),premiumMember:false,cloudReady:true});
 assert.match(done,/Belgeyi oluştur \/ PDF/);
 assert.ok(!done.includes('Resmî mesleki'));
 assert.match(badges,/Resmî meslek/);
});
test('Premium dashboard is connected to daily training and achievement pages',()=>{
 const script=fs.readFileSync('premium-academy.js','utf8');
 assert.match(script,/PREMIUM KONTROL PANELİ/);
 assert.match(script,/data-action="premium-achievements"/);
 assert.match(script,/data-action="premium-resume"/);
 assert.match(app,/case 'premium-resume'/);
 assert.match(app,/case 'premium-achievements'/);
 assert.match(app,/healthfile:healthFilePage/);
 assert.match(app,/achievements:achievementsPage/);
 assert.match(app,/case 'healthfile-open'/);
});
test('Storage and health tables restrict access to the owner and always private bucket',()=>{
 assert.match(sql,/patiyiz-health-private','patiyiz-health-private',false/);
 assert.match(sql,/create policy "health_documents_select_owner"/);
 assert.match(sql,/create policy "health_documents_insert_owner_pet"/);
 assert.match(sql,/p\.owner_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/create policy "health_bucket_read_owner"/);
 assert.match(sql,/storage\.foldername\(name\)/);
 assert.match(sql,/revoke all on public\.patiyiz_health_documents from anon,authenticated/);
 assert.match(sql,/grant select,insert,delete on public\.patiyiz_health_documents to authenticated/);
 assert.match(deleted,/healthBucket="patiyiz-health-private"/);
 assert.match(deleted,/admin\.storage\.from\(healthBucket\)\.remove/);
});
test('Only administrators can broadcast with idempotency, rate limit and audit',()=>{
 assert.match(admin,/data-tab="announcements"/);
 assert.match(admin,/patiyiz_admin_announce/);
 assert.match(admin,/patiyiz_admin_announcement_history/);
 assert.match(admin,/confirm\('DİKKAT!/);
 assert.match(sql,/patiyiz_admins a where a\.user_id=uid/);
 assert.match(sql,/pg_catalog\.pg_advisory_xact_lock/);
 assert.match(sql,/where id=p_campaign/);
 assert.match(sql,/interval '10 minutes'/);
 assert.match(sql,/interval '1 day'/);
 assert.match(sql,/r_count>1000/);
 assert.match(sql,/insert into public\.notifications/);
 assert.match(sql,/revoke all on function public\.patiyiz_admin_announce/);
 assert.match(sql,/grant execute on function public\.patiyiz_admin_announce/);
 assert.doesNotMatch(admin,/service_role/);
});
test('All three scripts and administrator inline JavaScript are syntactically valid',()=>{
 for(const [name,source] of [['health-file.js',health],['achievements.js',badges]])assert.doesNotThrow(()=>new vm.Script(source,{filename:name}));
 const matches=[...admin.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.ok(matches.length>=1);
 assert.doesNotThrow(()=>new vm.Script(matches.at(-1)[1],{filename:'admin.html:inline'}));
 assert.match(html,/health-file\.js/);assert.match(html,/achievements\.js/);
 assert.ok(html.indexOf('health-file.js')<html.indexOf('src="app.js'));
});
