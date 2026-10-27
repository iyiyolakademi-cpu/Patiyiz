const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
function part(start,end){
 const a=app.indexOf(start),b=app.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'missing source boundary '+start);
 return app.slice(a,b);
}
function video(name,preload='metadata'){
 return {name,paused:true,dataset:{},preload,readyState:0,played:0,pausedCalls:0,loaded:0,
  play(){this.paused=false;this.played++;return Promise.resolve()},
  pause(){this.paused=true;this.pausedCalls++},
  load(){this.loaded++}};
}
function observerHarness(start,end,selector){
 const source=part(start,end);
 let callback,options,tracked=[];
 const videos=Array.from({length:70},(_,i)=>video('v'+i,i>1?'none':'metadata'));
 const ctx={
  document:{hidden:false,querySelectorAll:()=>videos,querySelector:()=>({})},
  window:{matchMedia:()=>({matches:false})},
  IntersectionObserver:class{constructor(cb,opts){callback=cb;options=opts}observe(v){tracked.push(v)}disconnect(){}},
  patiyizVideoObserver:null,patiyizReelsObserver:null,
  patiyizFeedActiveVideo:null,patiyizFeedSoundEnabled:false,patiFeedSoundButton:()=>{}
 };
 ctx.window.IntersectionObserver=ctx.IntersectionObserver;
 vm.runInNewContext(source+'\n'+start.match(/function (\w+)/)[1]+'()',ctx);
 assert.equal(tracked.length,70);
 return {videos,callback,options,ctx};
}
test('Ana akış ilk açılışta 40 gönderiyle sınırlıdır ve kademeli devam eder',()=>{
 assert.match(app,/pageLimits=\{posts:40,messages:150,notifications:150\}/);
 assert.match(app,/async function loadMore\(key\)\{pageLimits\[key\]=\(pageLimits\[key\]\|\|40\)\+50/);
});
test('Akış videosu görünürken 70 videoyu tekrar tekrar pause etmez',async()=>{
 const {videos,callback}=observerHarness('function setupFeedVideos(){',"document.addEventListener('visibilitychange'",'.pati-video-frame video');
 callback([{target:videos[0],isIntersecting:true,intersectionRatio:.8}]);
 assert.equal(videos[0].played,1);
 callback([{target:videos[1],isIntersecting:true,intersectionRatio:.85}]);
 assert.equal(videos[0].pausedCalls,1);
 assert.equal(videos[1].played,1);
 assert.equal(videos.slice(2).reduce((n,v)=>n+v.pausedCalls,0),0);
 callback([{target:videos[1],isIntersecting:false,intersectionRatio:0}]);
 assert.equal(videos[1].paused,true);
});
test('Reels yalnız aktif videoyu yükler; yaklaşan videoda metadata isteği yapılmaz',()=>{
 const {videos,callback,options}=observerHarness('function setupReelsViewer(){','function reelTogglePlay(','.pati-reel-video');
 assert.equal(options.rootMargin,'70% 0px 70% 0px');
 callback([{target:videos[2],isIntersecting:true,intersectionRatio:.2}]);
 assert.equal(videos[2].preload,'none');
 assert.equal(videos[2].loaded,0);
 callback([{target:videos[0],isIntersecting:true,intersectionRatio:.8}]);
 callback([{target:videos[1],isIntersecting:true,intersectionRatio:.9}]);
 assert.equal(videos[0].pausedCalls,1);
 assert.equal(videos[1].played,1);
 assert.equal(videos.slice(3).reduce((n,v)=>n+v.pausedCalls,0),0);
});
test('Arka planda veya internet yokken Realtime sorgusu kuyruğa alınmaz',()=>{
 const source=part('function queueLiveUpdate(){','function startLive()');
 let scheduled=0;
 const ctx={me:{id:'tester'},document:{hidden:true},navigator:{onLine:true},
   liveReloadTimer:null,clearTimeout(){},setTimeout(){scheduled++;return 1}};
 const fn=vm.runInNewContext(source+'\nqueueLiveUpdate',ctx);
 fn();assert.equal(scheduled,0);
 ctx.document.hidden=false;ctx.navigator.onLine=false;
 fn();assert.equal(scheduled,0);
 ctx.navigator.onLine=true;fn();assert.equal(scheduled,1);
});
test('Arka plan veri setleri en fazla dört eşzamanlı sorguyla hazırlanır',async()=>{
 const source=part("async function load(mode='all')",'async function refreshKeys(');
 const keys=[...new Set([...app.matchAll(/\['[a-z_]+','([a-zA-Z]+)',\d+\]/g)].map(x=>x[1]))];
 let concurrent=0,max=0,queries=0;
 const ctx={me:{id:'tester'},data:Object.fromEntries(keys.map(k=>[k,[]])),
  pageLimits:{posts:40,messages:150,notifications:150},pageMore:{},
  patiyizLoadedTables:new Set(),patiyizLoadToken:0,Set,Promise,console,
  liked:new Set(),saved:new Set(),followed:new Set(),voted:new Set(),favorites:new Set(),blocked:new Set(),
  sb:{from(){return {select(){return this},order(){return this},range(){return this},
     then(resolve,reject){queries++;concurrent++;max=Math.max(max,concurrent);
       return Promise.resolve().then(()=>{concurrent--;resolve({data:[]})}).catch(reject)}}}}
 };
 const load=vm.runInNewContext(source+'\nload',ctx);
 await load('deferred');
 assert.ok(queries>15,'all deferred tables were loaded');
 assert.ok(max<=4,'peak concurrent queries '+max);
 assert.equal(concurrent,0);
});
