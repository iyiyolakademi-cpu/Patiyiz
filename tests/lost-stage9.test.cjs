const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('lost-stage9.css','utf8');
function sample(){
 const data={lost:[
  {id:'one',owner_id:'owner',name:'Mavi',species:'Kedi',city:'İzmir',district:'Buca',description:'Siyah tasma',found:false,created_at:'2026-10-25T12:00:00Z',last_seen:'2026-10-24'},
  {id:'two',owner_id:'other',name:'Pamuk',species:'Köpek',city:'Ankara',district:'Çankaya',description:'Beyaz tüy',found:true,created_at:'2026-10-24T12:00:00Z',last_seen:'2026-10-23'},
  {id:'three',owner_id:'other',name:'Tarçın',species:'Kedi',city:'İzmir',district:'Karşıyaka',description:'Kahverengi gözlü',found:false,created_at:'2026-10-23T12:00:00Z',last_seen:'2026-10-22'},
  {id:'four',owner_id:'hidden',name:'Engelli',species:'Kuş',city:'İstanbul',district:'Kadıköy',description:'Kayıp kuş',found:false,created_at:'2026-10-21T12:00:00Z',last_seen:'2026-10-20'}
 ]};
 const results={innerHTML:'',textContent:''},count={textContent:''},ctx={data,blocked:new Set(['hidden']),me:{id:'owner'},view:'lost',
 esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
 petIcon:()=> '🐾',day:s=>s,main:{innerHTML:''},
 document:{getElementById:id=>id==='lost-results'?results:id==='lost-results-count'?count:null},
 requestAnimationFrame:()=>{},console};
 const from=app.indexOf("let lostStatus='missing'"),to=app.indexOf('function adoptionPage(){',from);
 assert.ok(from>0&&to>from);
 const script=app.slice(from,to);
 vm.createContext(ctx);
 vm.runInContext(script+'\nglobalThis.api={lostFold,lostMatches,lostCards,lostPage,lostUpdateResults};',ctx);
 return {ctx,api:ctx.api,results,count};
}
test('New lost cards prioritize currently missing animals and exclude blocked authors',()=>{
 const {ctx,api}=sample();
 assert.deepEqual(Array.from(api.lostMatches(),x=>x.id),['one','three']);
 vm.runInContext("lostStatus='all'",ctx);
 assert.deepEqual(Array.from(api.lostMatches(),x=>x.id),['one','three','two']);
});
test('Search covers animal, district and species with Turkish accents',()=>{
 const {ctx,api}=sample();
 vm.runInContext("lostSearch='KARSIYAKA'",ctx);
 assert.deepEqual(Array.from(api.lostMatches(),x=>x.id),['three']);
 vm.runInContext("lostSearch='';lostSpecies='Kedi'",ctx);
 assert.deepEqual(Array.from(api.lostMatches(),x=>x.id),['one','three']);
 vm.runInContext("lostSpecies='Tümü';lostStatus='found'",ctx);
 assert.deepEqual(Array.from(api.lostMatches(),x=>x.id),['two']);
 vm.runInContext("lostStatus='mine'",ctx);
 assert.deepEqual(Array.from(api.lostMatches(),x=>x.id),['one']);
});
test('Owner and nonowner report cards expose different allowed actions',()=>{
 const {api,ctx}=sample();
 const own=api.lostCards([ctx.data.lost[0]]);
 const others=api.lostCards([ctx.data.lost[2]]);
 assert.match(own,/data-action="lost-edit"/);
 assert.match(own,/data-action="toggle-found"/);
 assert.match(own,/data-action="delete-lost"/);
 assert.doesNotMatch(own,/data-action="chat"/);
 assert.match(others,/data-action="chat"/);
 assert.match(others,/data-action="report"/);
 assert.doesNotMatch(others,/data-action="lost-edit"/);
});
test('Instant search updates cards without replacing input',()=>{
 const {api,ctx,results,count}=sample();
 vm.runInContext("lostSearch='buca'",ctx);api.lostUpdateResults();
 assert.match(results.innerHTML,/Mavi/);
 assert.doesNotMatch(results.innerHTML,/Tarçın/);
 assert.equal(count.textContent,'1 ilan');
});
test('Listing heading and state filters remain visible with empty records',()=>{
 const {api,ctx}=sample();ctx.data.lost=[];
 api.lostPage();
 assert.match(ctx.main.innerHTML,/Kayıp İlanları/);
 assert.match(ctx.main.innerHTML,/İlan oluştur/);
 assert.match(ctx.main.innerHTML,/Kayıp \(0\)/);
 assert.match(ctx.main.innerHTML,/İlanlarım \(0\)/);
 assert.match(ctx.main.innerHTML,/Filtreleri temizle/);
});
test('Creation validates dates and privacy-sensitive information',()=>{
 const from=app.indexOf('function lostValidateRecord(rec){'),to=app.indexOf('function composeAdoption(',from);
 assert.ok(from>0&&to>from);
 const c={Date,Error};vm.createContext(c);
 vm.runInContext(app.slice(from,to)+'\nglobalThis.validate=lostValidateRecord;',c);
 const base={name:'Mavi',species:'Kedi',city:'İzmir',district:'Buca',description:'Siyah tasmalı ve çekingen kedi',last_seen:'2026-10-20'};
 assert.deepEqual(JSON.parse(JSON.stringify(c.validate({...base}))),base);
 assert.throws(()=>c.validate({...base,last_seen:'2099-12-01'}),/Gelecekteki tarih/);
 assert.throws(()=>c.validate({...base,description:'Telefonum 0532 123 45 67 numaralı'}),/telefon numarası/);
 assert.throws(()=>c.validate({...base,description:'Kırmızı bina daire 12 önünde görülmüş'}),/Açık adres/);
});
test('Edit respects ownership, updates only changed photo and validates row results',()=>{
 assert.match(app,/case 'lost-form':/);
 assert.match(app,/if\(id&&!previous\)throw Error\('Bu ilanı düzenleme yetkin yok/);
 assert.match(app,/if\(file\)\{const image=await upload\(file\)/);
 assert.match(app,/\.eq\('owner_id',me.id\)\.select\('\*'\)/);
 assert.match(app,/if\(!r\.data\?\.length\)throw Error\('İlan kaydedilemedi/);
 assert.match(app,/form\.dataset\.edit=a\?\.id\|\|''/);
});
test('Found status requires owner check, confirmation, and backend verification',()=>{
 assert.match(app,/case 'toggle-found':\{const a=data\.lost\.find\(x=>x\.id===id&&x\.owner_id===me\.id\)/);
 assert.match(app,/const found=!a\.found/);
 assert.match(app,/if\(!confirm\(found\?/);
 assert.match(app,/\.update\(\{found\}\)\.eq\('id',id\)\.eq\('owner_id',me\.id\)\.select\('\*'\)/);
});
test('Share includes working app deep link and search remains live',()=>{
 assert.match(app,/url\.searchParams\.set\('lost',a\.id\)/);
 assert.match(app,/async function routePendingLost\(\)/);
 assert.match(app,/await lostRefresh\(\)/);
 assert.match(app,/if\(e\.target\?\.id!=='lost-search'\)return/);
});
test('Camera and gallery provide preview and previous image is retained when not replaced',()=>{
 assert.match(app,/data-action="lost-gallery"/);
 assert.match(app,/data-action="lost-camera"/);
 assert.match(app,/lostPhotoObjectUrl=URL\.createObjectURL\(file\)/);
 assert.match(app,/URL\.revokeObjectURL\(lostPhotoObjectUrl\)/);
});
test('Existing reports table remains intact and new mobile CSS is scoped',()=>{
 assert.match(app,/patiyizLoadedTables\.add\('lost_reports'\)/);
 assert.match(html,/lost-stage9\.css\?v=20261025-lost-v2/);
 assert.match(html,/lost20261025=9/);
 assert.match(css,/#main-content \.lost-v2/);
 assert.match(css,/@media\(max-width:690px\)/);
 assert.match(css,/data-pati-theme="dark"/);
});