const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('care-stage11.css','utf8');
const today=new Date().toLocaleDateString('sv-SE');
const dateOffset=days=>new Date(Date.now()+days*86400000).toLocaleDateString('sv-SE');
const records=[
 {id:'c1',owner_id:'self',pet_id:'p1',title:'Karma aşı kontrolü',category:'Aşı',due_date:today,done:false,created_at:'2026-10-24'},
 {id:'c2',owner_id:'self',pet_id:'p2',title:'Veteriner randevusu',category:'Veteriner',due_date:dateOffset(-3),done:false,created_at:'2026-10-20'},
 {id:'c3',owner_id:'self',pet_id:'p1',title:'Akşam maması',category:'Mama',due_date:dateOffset(3),done:false,created_at:'2026-10-23'},
 {id:'c4',owner_id:'self',pet_id:null,title:'Tırnak bakımı',category:'Bakım',due_date:today,done:true,created_at:'2026-10-21'},
 {id:'c5',owner_id:'other',pet_id:'p3',title:'Başkasının ilacı',category:'İlaç',due_date:today,done:false,created_at:'2026-10-24'}
];
function harness(){
 const result={innerHTML:''},count={textContent:''};
 const ctx={
  me:{id:'self'},view:'care',careFilter:'all',
  data:{care:records.map(x=>({...x})),pets:[{id:'p1',owner_id:'self',name:'Şeker'},{id:'p2',owner_id:'self',name:'Mavi'},{id:'p3',owner_id:'other',name:'Gizli'}]},
  main:{innerHTML:''},
  esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
  day:s=>s,document:{getElementById:id=>id==='care-results'?result:id==='care-result-count'?count:null},
  console,Date
 };
 const a=app.indexOf("let carePetFilter='all'"),b=app.indexOf('let dmRecorder=',a);
 assert.ok(a>0&&b>a);
 vm.createContext(ctx);
 vm.runInContext(app.slice(a,b)+'\nglobalThis.api={careToday,careDueState,careDateValid,careFold,careOwnItems,careVisibleItems,careCard,carePage,careUpdateResults};',ctx);
 return {ctx,api:ctx.api,result,count};
}
test('Care timeline only shows current user tasks and keeps existing records',()=>{
 const {api}=harness();
 assert.deepEqual(Array.from(api.careVisibleItems(),x=>x.id),['c2','c1','c3','c4']);
 assert.equal(api.careOwnItems().length,4);
});
test('Today, upcoming, overdue and completed categories are mutually exclusive',()=>{
 const {ctx,api}=harness();
 const groups={today:['c1'],upcoming:['c3'],late:['c2'],done:['c4']};
 for(const [status,expected] of Object.entries(groups)){
  ctx.careFilter=status;
  assert.deepEqual(Array.from(api.careVisibleItems(),x=>x.id),expected,status);
 }
 assert.equal(api.careDueState(records[0]),'today');
 assert.equal(api.careDueState(records[1]),'late');
 assert.equal(api.careDueState(records[2]),'upcoming');
 assert.equal(api.careDueState(records[3]),'done');
});
test('Per-pet and category filters intersect and hidden owner pets do not leak',()=>{
 const {ctx,api}=harness();
 vm.runInContext("carePetFilter='p1';careCategoryFilter='Mama'",ctx);
 assert.deepEqual(Array.from(api.careVisibleItems(),x=>x.id),['c3']);
 vm.runInContext("carePetFilter='none';careCategoryFilter='Tümü'",ctx);
 assert.deepEqual(Array.from(api.careVisibleItems(),x=>x.id),['c4']);
 vm.runInContext("carePetFilter='p3'",ctx);
 assert.deepEqual(Array.from(api.careVisibleItems(),x=>x.id),[]);
});
test('Turkish search searches task title, categories and owned pet names',()=>{
 const {ctx,api}=harness();
 vm.runInContext("careSearch='SEKER'",ctx);
 assert.deepEqual(Array.from(api.careVisibleItems(),x=>x.id),['c1','c3']);
 vm.runInContext("careSearch='asI'",ctx);
 assert.deepEqual(Array.from(api.careVisibleItems(),x=>x.id),['c1']);
 vm.runInContext("careSearch='gizli'",ctx);
 assert.deepEqual(Array.from(api.careVisibleItems(),x=>x.id),[]);
});
test('Search renders only matching result cards without replacing input',()=>{
 const {ctx,api,result,count}=harness();
 vm.runInContext("careSearch='veteriner'",ctx);
 api.careUpdateResults();
 assert.match(result.innerHTML,/Veteriner randevusu/);
 assert.doesNotMatch(result.innerHTML,/Karma aşı kontrolü/);
 assert.equal(count.textContent,'1 görev');
});
test('Dashboard shows counters and a truthful alarm disclaimer',()=>{
 const {ctx,api}=harness();
 api.carePage();
 const page=ctx.main.innerHTML;
 assert.match(page,/Bakım Takvimi/);
 assert.match(page,/Görev ekle/);
 assert.match(page,/Sağlık hatırlatmaları/);
 assert.match(page,/tek başına telefon bildirimi, SMS veya e-posta göndermez/);
 assert.match(page,/Bugün \(1\)/);
 assert.match(page,/Geciken \(1\)/);
 assert.match(page,/Tamamlanan \(1\)/);
 assert.match(page,/data-action="care-pet-filter"/);
});
test('Card controls include edit, completion and owner delete',()=>{
 const {api}=harness();
 const card=api.careCard(records[0]);
 assert.match(card,/data-action="care-done"/);
 assert.match(card,/data-action="care-edit"/);
 assert.match(card,/data-action="care-del"/);
 assert.match(api.careCard(records[3]),/Geri al/);
});
test('Care dates reject impossible values and accept historical/future valid dates',()=>{
 const {api}=harness();
 assert.equal(api.careDateValid('2026-02-30'),false);
 assert.equal(api.careDateValid('garbage'),false);
 assert.equal(api.careDateValid('2026-02-28'),true);
 assert.equal(api.careDateValid('2027-01-05'),true);
});
test('Edit validates required fields, category and own-pet membership',()=>{
 const start=app.indexOf('function careValidateRecord(record){'),end=app.indexOf('function editProfile(){',start);
 assert.ok(start>0&&end>start);
 const {ctx}=harness();
 vm.runInContext(app.slice(start,end)+'\nglobalThis.validate=careValidateRecord;',ctx);
 const valid={title:'Karma aşı',category:'Aşı',due_date:'2026-10-25',pet_id:'p1'};
 assert.equal(ctx.validate({...valid}).title,'Karma aşı');
 assert.throws(()=>ctx.validate({...valid,title:'X'}),/Görev adı/);
 assert.throws(()=>ctx.validate({...valid,category:'Hack'}),/kategori/);
 assert.throws(()=>ctx.validate({...valid,due_date:'2026-02-31'}),/görev tarihi/i);
 assert.throws(()=>ctx.validate({...valid,pet_id:'p3'}),/yetkin yok/);
});
test('Create, edit, complete and delete only access the current owner rows',()=>{
 assert.match(app,/case 'care-form':/);
 assert.match(app,/if\(editId&&!data\.care\.some\(x=>x\.id===editId&&x\.owner_id===me\.id\)\)/);
 assert.match(app,/\.update\(rec\)\.eq\('id',editId\)\.eq\('owner_id',me\.id\)/);
 assert.match(app,/case 'care-done':\{const item=data\.care\.find\(x=>x\.id===id&&x\.owner_id===me\.id\)/);
 assert.match(app,/case 'care-del':\{const item=data\.care\.find\(x=>x\.id===id&&x\.owner_id===me\.id\)/);
 assert.match(app,/\.delete\(\)\.eq\('id',id\)\.eq\('owner_id',me\.id\)/);
 assert.match(app,/if\(!result\.data\?\.length\)throw Error\('Görev kaydedilemedi/);
});
test('The responsive stylesheet is isolated, themed and cache refreshed',()=>{
 assert.match(html,/care-stage11\.css\?v=20261025-care-v2/);
 assert.match(html,/care20261025=11/);
 assert.match(css,/#main-content \.care-v2/);
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/data-pati-theme="dark"/);
 assert.match(css,/:focus-visible/);
});
