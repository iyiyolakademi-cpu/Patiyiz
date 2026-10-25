const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('adoption-stage10.css','utf8');
const items=[
 {id:'a',owner_id:'owner',name:'Şeker',species:'Kedi',city:'İzmir',district:'Buca',gender:'Dişi',age:'2 yaş',description:'Sevecen, yavru kedilerle arkadaş',adopted:false,created_at:'2026-10-25T11:00:00Z'},
 {id:'b',owner_id:'other',name:'Boncuk',species:'Köpek',city:'Ankara',district:'Çankaya',gender:'Erkek',age:'1 yaş',description:'Oyuncu ve sevimli köpek',adopted:true,created_at:'2026-10-25T10:00:00Z'},
 {id:'c',owner_id:'other',name:'Pamuk',species:'Kedi',city:'İzmir',district:'Karşıyaka',gender:'Dişi',age:'3 yaş',description:'Sakin, yetişkin kedi',adopted:false,created_at:'2026-10-24T10:00:00Z'},
 {id:'d',owner_id:'blocked',name:'Engelli ilan',species:'Kuş',city:'İstanbul',district:'Kadıköy',gender:'Erkek',age:'1 yaş',description:'Engellenmiş kullanıcı ilanı',adopted:false,created_at:'2026-10-23T10:00:00Z'}
];
function harness(){
 const results={innerHTML:''},count={textContent:''};
 const ctx={me:{id:'owner'},blocked:new Set(['blocked']),view:'adoption',data:{adoption:items.map(x=>({...x}))},main:{innerHTML:''},
 petIcon:()=> '🐾',day:s=>s,esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
 document:{getElementById:id=>id==='adoption-results'?results:id==='adoption-results-count'?count:null},console};
 const begin=src.indexOf("let adoptionStatus='open'"),end=src.indexOf("function carePage(){",begin);
 assert.ok(begin>0&&end>begin,'adoption helper functions exist');
 vm.createContext(ctx);
 vm.runInContext(src.slice(begin,end)+'\nglobalThis.api={adoptionFold,adoptionMatches,adoptionCards,adoptionUpdateResults,adoptionPage};',ctx);
 return {ctx,api:ctx.api,results,count};
}
test('Yuva arayanlar shown first; blocked profiles do not appear',()=>{
 const {api,ctx}=harness();
 assert.deepEqual(Array.from(api.adoptionMatches(),x=>x.id),['a','c']);
 vm.runInContext("adoptionStatus='all'",ctx);
 assert.deepEqual(Array.from(api.adoptionMatches(),x=>x.id),['a','c','b']);
});
test('Species and statuses intersect and completed ads remain accessible to owners',()=>{
 const {api,ctx}=harness();
 vm.runInContext("adoptionSpecies='Kedi'",ctx);
 assert.deepEqual(Array.from(api.adoptionMatches(),x=>x.id),['a','c']);
 vm.runInContext("adoptionStatus='mine'",ctx);
 assert.deepEqual(Array.from(api.adoptionMatches(),x=>x.id),['a']);
 vm.runInContext("adoptionSpecies='Tümü';adoptionStatus='adopted'",ctx);
 assert.deepEqual(Array.from(api.adoptionMatches(),x=>x.id),['b']);
});
test('Turkish accent insensitive search covers name, city, district and description',()=>{
 const {ctx,api}=harness();
 vm.runInContext("adoptionSearch='karsiyaka'",ctx);
 assert.deepEqual(Array.from(api.adoptionMatches(),x=>x.id),['c']);
 vm.runInContext("adoptionSearch='SEKER'",ctx);
 assert.deepEqual(Array.from(api.adoptionMatches(),x=>x.id),['a']);
 vm.runInContext("adoptionSearch='YETISKIN'",ctx);
 assert.deepEqual(Array.from(api.adoptionMatches(),x=>x.id),['c']);
});
test('Owner can edit and close, nonowner can message and report only',()=>{
 const {api}=harness();
 const own=api.adoptionCards([items[0]]);
 assert.match(own,/data-action="adoption-edit"/);
 assert.match(own,/data-action="adoption-toggle"/);
 assert.match(own,/data-action="adoption-delete"/);
 const other=api.adoptionCards([items[2]]);
 assert.match(other,/data-action="chat"/);
 assert.match(other,/data-action="report"/);
 assert.doesNotMatch(other,/data-action="adoption-edit"/);
 assert.doesNotMatch(api.adoptionCards([items[1]]),/data-action="chat"/);
});
test('Instant search updates results without replacing input',()=>{
 const {ctx,api,results,count}=harness();
 vm.runInContext("adoptionSearch='Buca'",ctx);
 api.adoptionUpdateResults();
 assert.match(results.innerHTML,/Şeker/);
 assert.doesNotMatch(results.innerHTML,/Pamuk/);
 assert.equal(count.textContent,'1 ilan');
});
test('Empty state and summary stay visible with no records',()=>{
 const {ctx,api}=harness();ctx.data.adoption=[];
 api.adoptionPage();
 assert.match(ctx.main.innerHTML,/Sahiplendirme/);
 assert.match(ctx.main.innerHTML,/Yuva arıyor \(0\)/);
 assert.match(ctx.main.innerHTML,/Filtreleri temizle/);
 assert.match(ctx.main.innerHTML,/İlan oluştur/);
});
test('Client checks contact details and unsafe street-address information',()=>{
 const from=src.indexOf('function adoptionValidateRecord(rec){'),to=src.indexOf('function composeCare(',from);
 assert.ok(from>0&&to>from);
 const ctx={};vm.createContext(ctx);
 vm.runInContext(src.slice(from,to)+'\nglobalThis.validate=adoptionValidateRecord;',ctx);
 const base={name:'Pamuk',species:'Kedi',gender:'Dişi',age:'2 yaş',city:'İzmir',district:'Bornova',description:'Sakin karakterli, bakımı düzenli, aşı karnesi mevcut'};
 assert.equal(ctx.validate({...base}).city,'İzmir');
 assert.throws(()=>ctx.validate({...base,description:'Beni 0532 123 45 67 numaradan ara'}),/Telefon numarası/);
 assert.throws(()=>ctx.validate({...base,description:'Mavi bina daire 12 konumunda bekliyor'}),/Açık adres/);
 assert.throws(()=>ctx.validate({...base,description:'Az'}),/en az 15/);
});
test('Edit checks identity, preserves photos, server verifies affected rows',()=>{
 assert.match(src,/form\.dataset\.edit=a\?\.id\|\|''/);
 assert.match(src,/if\(editId&&!data\.adoption\.some\(x=>x\.id===editId&&x\.owner_id===me\.id\)\)/);
 assert.match(src,/if\(file\)\{const image=await upload\(file\)/);
 assert.match(src,/\.update\(rec\)\.eq\('id',editId\)\.eq\('owner_id',me\.id\)\.select\('\*'\)/);
 assert.match(src,/if\(!out\.data\?\.length\)throw Error\('İlan kaydedilemedi/);
});
test('Completed-status changes enforce ownership and require confirmation',()=>{
 assert.match(src,/case 'adoption-toggle':\{const a=data\.adoption\.find\(x=>x\.id===id&&x\.owner_id===me\.id\)/);
 assert.match(src,/if\(!confirm\(adopted\?/);
 assert.match(src,/\.update\(\{adopted\}\)\.eq\('id',id\)\.eq\('owner_id',me\.id\)\.select\('\*'\)/);
});
test('Shared URLs open relevant listing and filters support live search',()=>{
 assert.match(src,/url\.searchParams\.set\('adoption',x\.id\)/);
 assert.match(src,/async function routePendingAdoption\(\)/);
 assert.match(src,/await adoptionRefresh\(\)/);
 assert.match(src,/if\(e\.target\?\.id!=='adoption-search'\)return/);
});
test('Photo native inputs and preview use existing safe image upload',()=>{
 assert.match(src,/data-action="adoption-gallery"/);
 assert.match(src,/data-action="adoption-camera"/);
 assert.match(src,/input\.files\?\.\[0\]/);
 assert.match(src,/name="photo_camera"/);
 assert.match(src,/class="pati-upload-preview"/);
});
test('Design is isolated, mobile friendly and cache version refreshed',()=>{
 assert.match(html,/adoption-stage10\.css\?v=20261025-adoption-v2/);
 assert.match(html,/adoption20261025=10/);
 assert.match(css,/#main-content \.adopt-v2/);
 assert.match(css,/@media\(max-width:690px\)/);
 assert.match(css,/data-pati-theme="dark"/);
});