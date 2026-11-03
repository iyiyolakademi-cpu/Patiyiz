'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const sw=fs.readFileSync('patiyiz-sw.js','utf8');
const updater=fs.readFileSync('buchee-pwa-auto-update-20261102.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const workflow=fs.readFileSync('.github/workflows/quality.yml','utf8');
function workerHarness({offline=false,scope='https://buchee.example/app/'}={}){
 const handlers={},queries=[],stored=new Map();
 const response=(body)=>({ok:true,type:'basic',body,clone(){return response(body)}});
 const offlinePage=response('offline');
 const cachedResponse=response('old');
 let network=offline;
 const ctx={
  self:{location:{origin:'https://buchee.example'},registration:{scope,showNotification(){}},
   addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},
  caches:{
   open:async()=>({match:async request=>request==='./offline.html'?offlinePage:stored.get(request.url),
    put:async(request,r)=>{stored.set(request.url,r)},
    add:async()=>{}}),
   keys:async()=>[],delete:async()=>{}
  },
  fetch:async(request,options)=>{queries.push({url:request.url,cache:options.cache});if(network)throw Error('offline');return response('fresh')},
  URL,Promise,Response:{error:()=>response('error')},console
 };
 vm.runInNewContext(sw,ctx);
 const request=(name,mode='same-origin')=>({url:new URL(name,scope).href,mode,method:'GET'});
 async function fetchFile(name,mode='same-origin'){
  let promise=null;
  handlers.fetch({request:request(name,mode),respondWith(p){promise=p},waitUntil(){}});
  return promise?await promise:null;
 }
 return{queries,stored,handlers,request,fetchFile,setOffline:x=>{network=x},cachedResponse};
}
test('PWA code and all five screen CSS assets are always network-first',async()=>{
 const h=workerHarness();
 for(const file of ['app.js','buchee-home-feed-phase1-20261103.css',
  'buchee-explore-phase2-20261103.css','buchee-messages-phase3-20261103.css',
  'buchee-reels-phase4-20261103.css','buchee-profile-phase5-20261103.css']){
  h.stored.set(h.request(file+'?v=old').url,h.cachedResponse);
  const res=await h.fetchFile(file+'?v=old');
  assert.equal(res.body,'fresh',file);
 }
 assert.equal(h.queries.length,6);
 assert.ok(h.queries.every(x=>x.cache==='no-cache'));
});
test('PWA keeps offline assets but never caches or intercepts nested user media',async()=>{
 const h=workerHarness({offline:true});
 h.stored.set(h.request('buchee-profile-phase5-20261103.css?v=1').url,h.cachedResponse);
 assert.equal((await h.fetchFile('buchee-profile-phase5-20261103.css?v=1')).body,'old');
 assert.equal((await h.fetchFile('/app/avatars/user/profile.png')),null);
 assert.equal((await h.fetchFile('/app/media/file.webp?token=private')),null);
 assert.equal((await h.fetchFile('buchee-app-icon-192.png?signature=private')),null);
 assert.equal((await h.fetchFile('./', 'navigate')).body,'offline');
});
test('New service worker replaces old static cache while keeping push and offline support',()=>{
 assert.match(sw,/buchee-static-v20261103-release-phase6-1/);
 assert.match(sw,/BUCHEE_CACHE_PREFIXES/);
 assert.match(sw,/BUCHEE_SKIP_WAITING/);
 assert.match(sw,/self\.clients\.claim\(\)/);
 assert.match(sw,/self\.registration\.showNotification/);
 assert.match(sw,/request\.mode === 'navigate'/);
 assert.match(sw,/fetch\(request, \{cache: 'no-cache'\}\)/);
 new vm.Script(sw);
});
test('PWA update skips native runtime and avoids reloading unsent messages',async()=>{
 const listeners={},controllerListeners={};let reloads=0,stored=0,handler=null;
 const context={
  window:{PatiyizNative:{isNative:true},isSecureContext:true},
  navigator:{serviceWorker:{addEventListener(){throw Error('native worker registration')}}},
  document:{},
 };
 assert.doesNotThrow(()=>vm.runInNewContext(updater,context));
 context.window.PatiyizNative.isNative=false;
 context.window.addEventListener=(name,fn)=>listeners[name]=fn;
 context.window.location={reload:()=>{reloads++}};
 context.navigator.onLine=true;
 context.navigator.serviceWorker={
  controller:{},
  addEventListener:(name,fn)=>{controllerListeners[name]=fn},
  register:async()=>({update:async()=>{},waiting:null})
 };
 let focused={matches:()=>false};
 let msg={value:'Gönderilmeyen mesaj'};
 const doc={
  visibilityState:'visible',activeElement:focused,
  querySelector:(q)=>q.startsWith('#message-form')?msg:null,
  addEventListener(){}};
 context.document=doc;
 context.sessionStorage={getItem:()=>0,setItem:()=>{stored++}};
 context.Date=class extends Date{static now(){return 100000}};
 vm.runInNewContext(updater,context);
 assert.equal(typeof controllerListeners.controllerchange,'function');
 controllerListeners.controllerchange();
 assert.equal(reloads,0);assert.equal(stored,0);
 msg.value='';
 controllerListeners.controllerchange();
 assert.equal(reloads,1);assert.equal(stored,1);
});
test('Release audit is visible in CI; HTML and native packager keep all five screen styles',()=>{
 assert.match(workflow,/patiyiz-release-audit\.mjs --json/);
 for(const name of ['buchee-home-feed-phase1-20261103.css','buchee-explore-phase2-20261103.css',
  'buchee-messages-phase3-20261103.css','buchee-reels-phase4-20261103.css','buchee-profile-phase5-20261103.css']){
  assert.match(html,new RegExp(name.replace(/\./g,'\\.')+'\\?v='));
 }
 assert.match(html,/buchee-pwa-auto-update-20261102\.js\?v=20261103-release-phase6-1/);
 assert.match(fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8'),/htmlSource\.matchAll/);
});
test('Release readiness remains blocked until real-world security and device checks',()=>{
 const r=spawnSync(process.execPath,['scripts/patiyiz-release-audit.mjs','--json'],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const report=JSON.parse(r.stdout);
 assert.equal(report.ready,false);
 for(const required of ['private_media_two_account_negative_test','android_two_accounts_media_messaging_push','ios_pwa_camera_reels_messaging_push','account_deletion_and_storage_cleanup','backup_restore_and_capacity_test']){
  assert.ok(report.blocked.some(x=>x.name.includes(required)),required);
 }
});
