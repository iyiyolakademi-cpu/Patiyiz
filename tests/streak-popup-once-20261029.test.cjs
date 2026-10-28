const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('patiyiz-delight-20261029.js','utf8');
function setup(storage=new Map()){
 const appended=[],timers=[];
 const fakeButton={addEventListener(){}};
 const nodes=[];
 const document={
  hidden:false,
  body:{appendChild(el){appended.push(el);nodes.push(el)}},
  createElement(tag){
   const el={tag,className:'',innerHTML:'',_classes:new Set(),
    classList:{add(...args){args.forEach(a=>el._classes.add(a))},remove(...args){args.forEach(a=>el._classes.delete(a))}},
    querySelector(selector){return selector==='.pati-streak-close'?fakeButton:null},
    addEventListener(){},contains(){return false},remove(){const i=nodes.indexOf(el);if(i>=0)nodes.splice(i,1)}
   };
   return el;
  },
  addEventListener(){},removeEventListener(){},querySelector(){return null}
 };
 const w={
  matchMedia(){return {matches:true}},
  setTimeout(fn,ms){timers.push({fn,ms});return timers.length}
 };
 const context={window:w,document,Date,Intl,console,localStorage:{
  getItem:k=>storage.get(k)||null,setItem(k,v){storage.set(k,v)}
 },setTimeout:w.setTimeout,clearTimeout(){},requestAnimationFrame:fn=>fn()};
 vm.runInNewContext(code,context);
 return {api:w.PatiyizDelight,storage,appended,timers,nodes};
}
test('first confirmed login shows one one-time, auto-closing week overlay',()=>{
 const x=setup(),state={ready:true,count:16,best:19};
 assert.equal(x.api.showStreakOnce(state,{userId:'person-1',day:'2026-10-29'}),true);
 assert.equal(x.api.showStreakOnce(state,{userId:'person-1',day:'2026-10-29'}),false);
 assert.equal(x.appended.length,1);
 const html=x.appended[0].innerHTML;
 assert.match(html,/class="pati-streak-count">16<\/div>/);
 for(const day of ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'])assert.ok(html.includes(day),day);
 assert.match(html,/is-done/);
 assert.ok(x.timers.some(t=>t.ms===5100),'5.1-second automatic dismiss timer');
 assert.equal(x.storage.get('patiyiz-streak-popup:person-1:2026-10-29'),'1');
});
test('dismiss prevents repeat after re-render or reload; new calendar day can display',()=>{
 const storage=new Map(),state={ready:true,count:4,best:4};
 let x=setup(storage);
 assert.equal(x.api.showStreakOnce(state,{userId:'u',day:'2026-10-29'}),true);
 x.api.closeStreak();
 assert.equal(x.api.showStreakOnce(state,{userId:'u',day:'2026-10-29'}),false);
 x=setup(storage);
 assert.equal(x.api.showStreakOnce(state,{userId:'u',day:'2026-10-29'}),false);
 assert.equal(x.api.showStreakOnce({...state,count:5},{userId:'u',day:'2026-10-30'}),true);
});
test('pending, unauthenticated, or invalid dates never show a streak celebration',()=>{
 const x=setup();
 assert.equal(x.api.showStreakOnce({ready:false,count:0},{userId:'u',day:'2026-10-29'}),false);
 assert.equal(x.api.showStreakOnce({ready:true,count:3},{userId:'',day:'2026-10-29'}),false);
 assert.equal(x.api.showStreakOnce({ready:true,count:3},{userId:'u',day:'October 29'}),false);
 assert.equal(x.appended.length,0);
});
