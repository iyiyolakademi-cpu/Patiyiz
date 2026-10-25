const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('wellness-stage12.css','utf8');
const day=days=>new Date(Date.now()+days*86400000).toISOString();
function harness(){
 const pets=[{id:'cat',owner_id:'person',name:'Şeker'},{id:'dog',owner_id:'person',name:'Mavi'},{id:'foreign',owner_id:'other',name:'Gizli'}];
 const reminders=[
  {id:'old',pet_id:'cat',title:'Karma aşı',kind:'vaccine',due_at:day(-2),remind_minutes_before:60,repeat_days:365,note:'Kontrol',completed_at:null},
  {id:'soon',pet_id:'cat',title:'Veteriner kontrolü',kind:'vet',due_at:day(2),remind_minutes_before:60,repeat_days:null,note:'',completed_at:null},
  {id:'complete',pet_id:'cat',title:'İlaç',kind:'medicine',due_at:day(-8),remind_minutes_before:60,repeat_days:null,note:'',completed_at:day(-7)},
  {id:'otherpet',pet_id:'dog',title:'Mama',kind:'food',due_at:day(3),remind_minutes_before:60,repeat_days:null,note:'',completed_at:null}
 ];
 const weights=[{id:'w1',pet_id:'cat',weight_kg:4.8,measured_on:'2026-09-10',note:'İlk kayıt'},{id:'w2',pet_id:'cat',weight_kg:5,measured_on:'2026-10-10',note:'Kontrol'},{id:'w3',pet_id:'dog',weight_kg:10,measured_on:'2026-10-10',note:''}];
 const ctx={
  data:{pets},me:{id:'person'},view:'wellness',patiWellnessOwnedPets:()=>pets.filter(p=>p.owner_id==='person'),patiWellness:{reminders,weights,loaded:true,loading:false,notified:new Set(),error:''},
  patiWellnessPetId:'cat',patiWellnessTab:'active',patiReminderNames:{vaccine:'Aşı takvimi',vet:'Veteriner randevusu',food:'Mama / öğün',medicine:'İlaç hatırlatması'},
  main:{innerHTML:''},console,Date,esc:x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),day:x=>x,
  document:{},notify:()=>{},patiWellnessFetch:()=>{}
 };
 const start=app.indexOf('function patiWellnessDayKey(){'),end=app.indexOf('async function patiWellnessToggle(id){',start);
 assert.ok(start>0&&end>start,'wellness functions exist');
 vm.createContext(ctx);vm.runInContext(app.slice(start,end)+'\nglobalThis.api={patiWellnessDayKey,patiWellnessValidDate,patiWellnessDateLocal,patiWellnessRemindersFor,patiWellnessWeightHistory,patiWellnessPage,patiWellnessValidateReminder,patiWellnessValidateWeight};',ctx);
 return {ctx,api:ctx.api,reminders,weights};
}
test('Reminders respect selected pet and active/late/completed filters',()=>{
 const {ctx,api}=harness();
 assert.deepEqual(Array.from(api.patiWellnessRemindersFor('cat','active'),r=>r.id),['old','soon']);
 assert.deepEqual(Array.from(api.patiWellnessRemindersFor('cat','late'),r=>r.id),['old']);
 assert.deepEqual(Array.from(api.patiWellnessRemindersFor('cat','completed'),r=>r.id),['complete']);
 assert.deepEqual(Array.from(api.patiWellnessRemindersFor('cat','all'),r=>r.id),['old','soon','complete']);
 assert.deepEqual(Array.from(api.patiWellnessRemindersFor('dog','all'),r=>r.id),['otherpet']);
});
test('Weight history sorts newest first for one pet only',()=>{
 const {api}=harness();
 assert.deepEqual(Array.from(api.patiWellnessWeightHistory('cat'),w=>w.id),['w2','w1']);
 assert.deepEqual(Array.from(api.patiWellnessWeightHistory('dog'),w=>w.id),['w3']);
});
test('Health home shows health reminders, counters, edit actions and non-guaranteed alerts',()=>{
 const {api,ctx}=harness();api.patiWellnessPage();
 const page=ctx.main.innerHTML;
 assert.match(page,/Hayvan Sağlığı & Takvimi/);
 assert.match(page,/Aktif hatırlatma/);
 assert.match(page,/Geciken/);
 assert.match(page,/5 kg/);
 assert.match(page,/data-action="wellness-reminder-edit"/);
 assert.match(page,/data-action="wellness-weight-edit"/);
 assert.match(page,/data-action="wellness-filter"/);
 assert.match(page,/garanti edilmez/);
 assert.doesNotMatch(page,/Gizli/);
});
test('Completed reminders are history only and do not expose completion/edit controls',()=>{
 const {ctx,api}=harness();
 vm.runInContext("patiWellnessTab='completed'",ctx);
 api.patiWellnessPage();
 const page=ctx.main.innerHTML;
 assert.match(page,/✓ Tamamlandı/);
 assert.doesNotMatch(page,/data-action="wellness-reminder-done"/);
 assert.doesNotMatch(page,/data-action="wellness-reminder-edit"/);
});
test('Reminders only accept authenticated user pets and sanctioned repeat/notice intervals',()=>{
 const {api}=harness();
 const base={pet_id:'cat',kind:'vaccine',title:'Karma aşı',note:'Kontrol',due_at:day(3),remind_minutes_before:60,repeat_days:365};
 assert.equal(api.patiWellnessValidateReminder({...base}).kind,'vaccine');
 assert.throws(()=>api.patiWellnessValidateReminder({...base,pet_id:'foreign'}),/Kendi hayvanını/);
 assert.throws(()=>api.patiWellnessValidateReminder({...base,kind:'javascript'}),/Geçerli hatırlatma türü/);
 assert.throws(()=>api.patiWellnessValidateReminder({...base,repeat_days:9999}),/tekrar aralığı/);
 assert.throws(()=>api.patiWellnessValidateReminder({...base,remind_minutes_before:9999}),/bildirim öncesi/);
 assert.throws(()=>api.patiWellnessValidateReminder({...base,title:'X'}),/Hatırlatma adı/);
});
test('Weight validation blocks future dates and invalid numbers',()=>{
 const {api}=harness();
 const base={pet_id:'cat',weight_kg:4.8,measured_on:'2026-10-24',note:'Kontrol'};
 assert.equal(api.patiWellnessValidateWeight({...base}).weight_kg,4.8);
 assert.throws(()=>api.patiWellnessValidateWeight({...base,pet_id:'foreign'}),/Kendi hayvanını/);
 assert.throws(()=>api.patiWellnessValidateWeight({...base,weight_kg:350}),/Kilo/);
 assert.throws(()=>api.patiWellnessValidateWeight({...base,measured_on:'2099-04-01'}),/Ölçüm tarihi/);
 assert.equal(api.patiWellnessValidDate('2026-02-30'),false);
 assert.equal(api.patiWellnessValidDate('2026-02-28'),true);
});
test('Reminder edits use server owner scoping and do not modify completion state',()=>{
 assert.match(app,/\.update\(rec\)\.eq\('id',editId\)\.eq\('owner_id',me\.id\)\.is\('completed_at',null\)\.select\('\*'\)/);
 assert.match(app,/if\(!r\.data\?\.length\)throw Error\('Hatırlatma kaydedilemedi/);
 assert.match(app,/if\(editId&&!patiWellness\.reminders\.some/);
 assert.match(app,/patiWellness\.notified\.delete\(r\.data\[0\]\.id\)/);
});
test('Weight updates and deletion protect ownership and verify affected rows',()=>{
 assert.match(app,/\.from\('patiyiz_pet_weights'\)\.update\(rec\)\.eq\('id',editId\)\.eq\('owner_id',me\.id\)\.select\('\*'\)/);
 assert.match(app,/if\(!r\.data\?\.length\)throw Error\('Kilo kaydı kaydedilemedi/);
 assert.match(app,/\.delete\(\)\.eq\('id',id\)\.eq\('owner_id',me\.id\)\.select\('id'\)/);
});
test('Fetching reads account-owned records; completion retains idempotent server RPC',()=>{
 assert.match(app,/from\('patiyiz_pet_reminders'\)\.select\([^\n]+\)\.eq\('owner_id',uid\)/);
 assert.match(app,/from\('patiyiz_pet_weights'\)\.select\([^\n]+\)\.eq\('owner_id',uid\)/);
 assert.match(app,/rpc\('patiyiz_complete_pet_reminder',\{p_id:id\}\)/);
 assert.match(app,/!patiWellness\.error\)void patiWellnessFetch\(true\)/);
});
test('Responsive styles are isolated and both themes remain readable',()=>{
 assert.match(html,/wellness-stage12\.css\?v=20261025-wellness-v2/);
 assert.match(html,/wellness20261025=12/);
 assert.match(css,/#main-content \.wellness-v2/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/data-pati-theme="dark"/);
 assert.match(css,/:focus-visible/);
});
