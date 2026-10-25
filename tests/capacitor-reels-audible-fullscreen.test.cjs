const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('native-capacitor/src/native-reels.css','utf8');
const activity=fs.readFileSync('native-capacitor/scripts/setup-camera-gallery.mjs','utf8');
const build=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const shell=fs.readFileSync('native-capacitor/src/native-shell.js','utf8');
function mockVideo(id){
 return {id,preload:'none',readyState:0,muted:false,paused:true,playCalls:0,pauseCalls:0,loadCalls:0,dataset:{},
  play(){this.paused=false;this.playCalls++;return Promise.resolve()},
  pause(){this.paused=true;this.pauseCalls++},
  load(){this.loadCalls++}};
}
function player(native=true){
 const videos=[mockVideo('one'),mockVideo('two'),mockVideo('three')];
 let observer,options;
 const main={innerHTML:''};
 const ctx={
  console,Map,Promise,
  document:{hidden:false,querySelectorAll:()=>videos,querySelector:()=>({})},
  window:{PatiyizNative:{isNative:native},matchMedia:()=>({matches:false})},
  IntersectionObserver:class{constructor(fn,opts){observer=fn;options=opts}observe(){}disconnect(){}},
  data:{posts:videos.map((v,i)=>({id:v.id,author_id:'alice',video_url:'https://example.invalid/reel'+i+'.mp4',created_at:'2026-10-25',video_cover_url:'cover'+i+'.jpg'})),likes:[],comments:[]},
  main,blocked:new Set(),liked:new Set(),saved:new Set(),
  profile:()=>({id:'alice',display_name:'Ali',handle:'ali'}),avatar:()=>'',displayName:()=>'Ali',
  ico:name=>name,esc:String,cut:String,notify:()=>{}
 };
 ctx.window.IntersectionObserver=ctx.IntersectionObserver;
 const start=app.indexOf('let patiyizReelsObserver=null;');
 const end=app.indexOf('function closePatiCreate()',start);
 assert.ok(start>=0&&end>start);
 const api=vm.runInNewContext(app.slice(start,end)+'\n({setupReelsViewer,reelToggleSound,reelTogglePlay,reelsPage})',ctx);
 return {videos,api,ctx,main,getObserver:()=>observer,getOptions:()=>options};
}
test('Native Android Reel starts audibly, while web preserves muted autoplay',()=>{
 const n=player(true);n.api.reelsPage();
 assert.match(n.main.innerHTML,/playsinline webkit-playsinline loop preload="auto"/);
 assert.doesNotMatch(n.main.innerHTML,/playsinline webkit-playsinline muted loop/);
 assert.match(n.main.innerHTML,/aria-label="Sesi kapat" aria-pressed="true"/);
 const w=player(false);w.api.reelsPage();
 assert.match(w.main.innerHTML,/playsinline webkit-playsinline muted loop preload="auto"/);
 assert.match(w.main.innerHTML,/aria-label="Sesi aç" aria-pressed="false"/);
});
test('Swiping away pauses old audio and swiping back restarts the prior Reel with sound',()=>{
 const p=player(true);p.api.setupReelsViewer();const observer=p.getObserver();
 observer([{target:p.videos[0],isIntersecting:true,intersectionRatio:.91}]);
 assert.equal(p.videos[0].paused,false);assert.equal(p.videos[0].muted,false);
 observer([{target:p.videos[1],isIntersecting:true,intersectionRatio:.95},{target:p.videos[0],isIntersecting:true,intersectionRatio:.2}]);
 assert.equal(p.videos[0].paused,true);assert.equal(p.videos[1].paused,false);
 assert.equal(p.videos[1].muted,false);
 observer([{target:p.videos[0],isIntersecting:false,intersectionRatio:0}]);
 observer([{target:p.videos[0],isIntersecting:true,intersectionRatio:.98},{target:p.videos[1],isIntersecting:true,intersectionRatio:.14}]);
 assert.equal(p.videos[1].paused,true);assert.equal(p.videos[0].paused,false);
 assert.equal(p.videos[0].muted,false);assert.equal(p.videos[0].playCalls,2);
});
test('Sound button mutes intentionally and keeps preference on next Reel',()=>{
 const p=player(true);p.api.setupReelsViewer();const observer=p.getObserver();
 observer([{target:p.videos[0],isIntersecting:true,intersectionRatio:.8}]);
 const button={innerHTML:'',labels:{},closest:()=>({querySelector:()=>p.videos[0]}),setAttribute(k,v){this.labels[k]=v}};
 p.api.reelToggleSound(button);
 assert.equal(p.videos[0].muted,true);
 assert.equal(button.labels['aria-label'],'Sesi aç');
 observer([{target:p.videos[1],isIntersecting:true,intersectionRatio:.94},{target:p.videos[0],isIntersecting:false,intersectionRatio:0}]);
 assert.equal(p.videos[1].muted,true);
 assert.equal(p.videos[1].paused,false);
});
test('Manual pause is released after exiting the Reel and returning',()=>{
 const p=player(true);p.api.setupReelsViewer();const observer=p.getObserver();
 observer([{target:p.videos[0],isIntersecting:true,intersectionRatio:.9}]);
 const button={closest:()=>({querySelector:()=>p.videos[0]})};
 p.api.reelTogglePlay(button);
 assert.equal(p.videos[0].paused,true);
 assert.equal(p.videos[0].dataset.manualPause,'1');
 observer([{target:p.videos[0],isIntersecting:false,intersectionRatio:0}]);
 observer([{target:p.videos[1],isIntersecting:true,intersectionRatio:.9}]);
 observer([{target:p.videos[1],isIntersecting:false,intersectionRatio:0},{target:p.videos[0],isIntersecting:true,intersectionRatio:.9}]);
 assert.equal(p.videos[0].paused,false);
 assert.equal(p.videos[0].dataset.manualPause,undefined);
});
test('Android setup enables audible WebView media without changing production website',()=>{
 assert.match(activity,/setMediaPlaybackRequiresUserGesture\(false\)/);
 assert.match(shell,/App\.addListener\('appStateChange'/);
 assert.match(shell,/patiyiz:native-resume-media/);
 assert.match(app,/document\.addEventListener\('patiyiz:native-resume-media'/);
 assert.match(build,/native-reels\.css/);
 assert.match(build,/src\/native-reels\.css/);
 assert.match(css,/object-fit:cover!important/);
 assert.match(css,/height:100dvh!important/);
 assert.match(css,/html\.patiyiz-native-android/);
 assert.match(css,/#app-root:has\(#main-content \.pati-reels-viewport\)/);
});
