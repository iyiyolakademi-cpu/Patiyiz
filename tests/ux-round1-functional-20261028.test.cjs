const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');

test('Pinned conversations survive rerenders and are separated by signed-in account',()=>{
 const start=app.indexOf('function patiDmPins(){');
 const end=app.indexOf('function messagesPage(){',start);
 assert.ok(start>=0&&end>start);
 const storage=new Map(),states=[];
 const localStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,value)};
 const ctx={me:{id:'account-a'},blocked:new Set(),localStorage,render:()=>states.push('render'),notify:()=>{},console};
 vm.runInNewContext(app.slice(start,end)+'\nthis.api={patiDmPins,patiDmPinToggle}',ctx);
 ctx.api.patiDmPinToggle('friend-1');
 assert.equal(ctx.api.patiDmPins().has('friend-1'),true);
 assert.equal(storage.get('patiyiz-dm-pins:account-a'),'["friend-1"]');
 ctx.me={id:'account-b'};
 assert.equal(ctx.api.patiDmPins().has('friend-1'),false);
 ctx.api.patiDmPinToggle('friend-2');
 ctx.me={id:'account-a'};
 assert.equal(ctx.api.patiDmPins().has('friend-1'),true);
 assert.equal(ctx.api.patiDmPins().has('friend-2'),false);
 ctx.api.patiDmPinToggle('friend-1');
 assert.equal(ctx.api.patiDmPins().has('friend-1'),false);
 assert.equal(states.length,3);
});

test('Lost and adoption pages offer real city filtering with existing search state',()=>{
 assert.match(app,/data-action="lost-city-quick"/);
 assert.match(app,/data-action="adoption-city-quick"/);
 assert.match(app,/case 'lost-city-quick':lostSearch=id==='Tümü'\?'':id;lostPage\(\)/);
 assert.match(app,/case 'adoption-city-quick':adoptionSearch=id==='Tümü'\?'':id;adoptionPage\(\)/);
});

test('Profile empty state has real composer; shop deficit is real balance subtraction',()=>{
 assert.match(app,/data-action="pati-create-post">Paylaşım oluştur/);
 assert.match(app,/Yetersiz PatiCoin · Eksik:/);
 assert.match(app,/Math\.max\(0,Number\(p\.coins\)-Number\(patiCoinState\.balance\)\)/);
 assert.match(app,/pati-settings-safety/);
});
