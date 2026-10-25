const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('ios-reels.css','utf8');
const build=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const app=fs.readFileSync('app.js','utf8');
const source=app.slice(app.indexOf('let patiyizReelsObserver=null;'),app.indexOf('function closePatiCreate()'));
assert.ok(source.startsWith('let patiyizReelsObserver=null;'));
function init(){
 let callback;
 const buttons=[];
 const videos=Array.from({length:3},(_,id)=>{
  const button={innerHTML:'',labels:{},setAttribute(k,v){this.labels[k]=v}};
  buttons.push(button);
  return {id,dataset:{},muted:true,paused:true,preload:'none',readyState:1,
   playCalls:0,pauseCalls:0,play(){
    this.playCalls++;
    if(!this.muted&&id===2)return Promise.reject(new Error('NotAllowedError'));
    this.paused=false;return Promise.resolve();
   },
   pause(){this.pauseCalls++;this.paused=true},
   closest:()=>({querySelector:()=>button})
  };
 });
 const doc={hidden:false,documentElement:{classList:{contains:c=>c==='patiyiz-ios-reels'}},
   querySelectorAll:()=>videos,querySelector:()=>({})};
 const ctx={Map,Promise,console,document:doc,window:{PatiyizNative:undefined,matchMedia:()=>({matches:false})},
  IntersectionObserver:class{constructor(cb){callback=cb}observe(){}disconnect(){}},
  ico:String,notify:()=>{}};
 ctx.window.IntersectionObserver=ctx.IntersectionObserver;
 const api=vm.runInNewContext(source+'\n({setupReelsViewer,reelToggleSound})',ctx);
 return {api,callback:()=>callback,videos,buttons};
}
test('iPhone Home Screen detection stays scoped to standalone iOS only',()=>{
 const script=html.match(/<script>\(function\(\)\{try\{var ua=navigator\.userAgent[\s\S]*?<\/script>/)?.[0];
 assert.ok(script);
 function apply(agent,standalone){
  const classes=[];
  const ctx={navigator:{userAgent:agent,platform:'iPhone',maxTouchPoints:5,standalone},
   window:{matchMedia:()=>({matches:standalone})},document:{documentElement:{classList:{add:c=>classes.push(c)}}}};
  vm.runInNewContext(script.replace(/^<script>/,'').replace(/<\/script>$/,''),ctx);
  return classes;
 }
 assert.ok(apply('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',true).includes('patiyiz-ios-reels'));
 assert.equal(apply('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',false).length,0);
 assert.equal(apply('Mozilla/5.0 (Linux; Android 15)',true).length,0);
});
test('iOS standalone Reels CSS fills viewer but respects safe areas',()=>{
 assert.match(html,/href="ios-reels\.css\?/);
 assert.match(build,/'ios-reels\.css'/);
 assert.match(css,/html\.patiyiz-ios-reels/);
 assert.match(css,/object-fit:cover!important/);
 assert.match(css,/height:100dvh!important/);
 assert.match(css,/safe-area-inset-top/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.doesNotMatch(css,/html\.patiyiz-native-android/);
});
test('iPhone muted autoplay continues when audible autoplay is rejected',async()=>{
 const p=init();p.api.setupReelsViewer();const cb=p.callback();
 cb([{target:p.videos[0],isIntersecting:true,intersectionRatio:.98}]);
 assert.equal(p.videos[0].muted,false);
 assert.equal(p.videos[0].paused,false);
 const sound={closest:()=>({querySelector:()=>p.videos[0]}),innerHTML:'',labels:{},setAttribute(k,v){this.labels[k]=v}};
 p.api.reelToggleSound(sound);
 assert.equal(p.videos[0].muted,true);
 p.api.reelToggleSound(sound);
 assert.equal(p.videos[0].muted,false);
 cb([{target:p.videos[1],isIntersecting:true,intersectionRatio:.92},{target:p.videos[0],isIntersecting:false,intersectionRatio:0}]);
 assert.equal(p.videos[0].paused,true);
 assert.equal(p.videos[1].muted,false);
 cb([{target:p.videos[2],isIntersecting:true,intersectionRatio:.95},{target:p.videos[1],isIntersecting:false,intersectionRatio:0}]);
 await Promise.resolve();await Promise.resolve();
 assert.equal(p.videos[1].paused,true);
 assert.equal(p.videos[2].muted,true);
 assert.equal(p.videos[2].paused,false);
 assert.equal(p.buttons[2].labels['aria-label'],'Sesi aç');
});
