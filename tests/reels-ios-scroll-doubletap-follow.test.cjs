const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const start=app.indexOf('let patiyizReelsObserver=null;');
const end=app.indexOf('function closePatiCreate()',start);
assert.ok(start>=0&&end>start);
const source=app.slice(start,end);
function harness(){
 let callback;
 const handlers=new Map(),timers=new Map();
 let clock=1000,tid=0,likes=0;
 const viewport={scrollTop:0,clientHeight:600,
  addEventListener(name,fn){handlers.set(name,fn)},
  removeEventListener(name){handlers.delete(name)}};
 const videos=Array.from({length:3},(_,id)=>({
  id,muted:true,paused:true,preload:'none',readyState:3,dataset:{},playCount:0,pauseCount:0,
  play(){this.paused=false;this.playCount++;return Promise.resolve()},
  pause(){this.paused=true;this.pauseCount++},
  load(){},
 }));
 const htmlNode={classList:{contains:key=>key==='patiyiz-ios-reels'}};
 const posts=videos.map((v,i)=>({id:'post'+i,author_id:i===1?'self':'alice',video_url:'https://example.com/'+i+'.mp4',created_at:'2026-10-25'}));
 const main={innerHTML:''};
 const ctx={console,Map,Promise,Set,Date:class Date{static now(){return clock}},
  document:{hidden:false,documentElement:htmlNode,querySelectorAll:()=>videos,querySelector:()=>viewport},
  window:{PatiyizNative:undefined,matchMedia:()=>({matches:false})},
  IntersectionObserver:class{constructor(cb){callback=cb}observe(){}disconnect(){}},
  main,data:{posts,likes:[],comments:[]},me:{id:'self'},liked:new Set(),saved:new Set(),followed:new Set(),
  blocked:new Set(),profile:id=>({id,display_name:'Kişi',handle:'kisi'}),
  avatar:()=>'<span class="avatar"></span>',displayName:()=> 'Kişi',esc:String,cut:String,ico:x=>'<svg>'+x+'</svg>',
  notify:()=>{},togglePostLike:async()=>{likes++},
  setTimeout(fn){const id=++tid;timers.set(id,fn);return id},
  clearTimeout(id){timers.delete(id)}
 };
 ctx.window.IntersectionObserver=ctx.IntersectionObserver;
 const api=vm.runInNewContext(source+'\n({setupReelsViewer,reelsPage,reelHandleTap})',ctx);
 return {api,ctx,videos,viewport,handlers,timers,callback:()=>callback,clock:n=>{clock=n},likes:()=>likes};
}
test('Reels profile label is replaced by follow and clickable avatar',()=>{
 const p=harness();p.api.reelsPage();
 assert.match(p.main?.innerHTML||p.ctx.main.innerHTML,/class="pati-reel-avatar-link" data-action="view-user"/);
 assert.match(p.ctx.main.innerHTML,/class="pati-reel-follow" data-action="follow" data-id="alice"/);
 assert.match(p.ctx.main.innerHTML,/Takip et/);
 assert.doesNotMatch(p.ctx.main.innerHTML,/>Profil<\/button>/);
 assert.equal((p.ctx.main.innerHTML.match(/class="pati-reel-follow"/g)||[]).length,2);
 assert.match(p.ctx.main.innerHTML,/class="pati-reel-heart-burst"/);
 assert.match(css,/\.pati-reel-avatar-link/);
 assert.match(css,/\.pati-reel-heart-burst\.pop/);
});
test('Double tap likes once without pausing, single tap pauses normally',()=>{
 const p=harness();
 const video=p.videos[0];video.paused=false;
 const heart={classList:{remove(){},add(){}},offsetWidth:3};
 const item={dataset:{post:'post0'},querySelector:key=>key==='video'?video:heart};
 const button={isConnected:true,closest:()=>item};
 p.api.reelHandleTap(button);
 assert.equal(p.timers.size,1);
 p.clock(1170);p.api.reelHandleTap(button);
 assert.equal(p.timers.size,0);assert.equal(p.likes(),1);
 assert.equal(video.pauseCount,0);
 p.clock(2000);p.api.reelHandleTap(button);
 assert.equal(p.timers.size,1);
 for(const fn of p.timers.values())fn();
 assert.equal(video.paused,true);
});
test('iPhone scroll-snap activates next and previous video even without observer threshold callback',()=>{
 const p=harness();p.api.setupReelsViewer();
 assert.equal(p.videos[0].paused,false);
 assert.equal(p.videos[0].muted,false);
 const handler=p.handlers.get('scroll');assert.equal(typeof handler,'function');
 p.viewport.scrollTop=600;handler();
 assert.equal(p.videos[0].paused,true);
 assert.equal(p.videos[1].paused,false);
 p.viewport.scrollTop=1200;handler();
 assert.equal(p.videos[1].paused,true);
 assert.equal(p.videos[2].paused,false);
 p.viewport.scrollTop=0;handler();
 assert.equal(p.videos[2].paused,true);
 assert.equal(p.videos[0].paused,false);
 assert.equal(p.videos[0].playCount,2);
});
test('Follow action maintains current Reel screen without re-render',()=>{
 assert.match(app,/isFollow&&view==='reels'/);
 assert.match(app,/\.pati-reel-follow\[data-id=/);
 assert.match(app,/case 'follow':run\(\(\)=>doToggle\('follows'/);
 assert.match(app,/case 'reel-play':reelHandleTap\(target\)/);
 assert.match(index,/app\.js\?v=20261024-release-reliability-1[^\"]*reels20261025=1/);
});
