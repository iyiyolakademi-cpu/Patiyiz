'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('buchee-reels-phase4-20261103.css','utf8');
const setup=app.slice(app.indexOf('function setupReelsViewer(){'),app.indexOf('function reelHandleTap(',app.indexOf('function setupReelsViewer(){')));
const page=app.slice(app.indexOf('function reelsPage(){'),app.indexOf('function closePatiCreate()',app.indexOf('function reelsPage(){')));
test('Reels retains existing videos, five social actions, camera and seek features',()=>{
 for(const action of ['reel-play','reel-sound','reel-seek','like','comment','pati-repost','share-post','save','pati-create-reels'])assert.ok(page.includes('data-action="'+action+'"'),action);
 assert.match(page,/const source=page\?\.ready\?\[\.\.\.page\.rows,\.\.\.data\.posts\]:data\.posts/);
 assert.match(page,/const remaining=existingViewport\?items\.filter/);
 assert.match(page,/existingViewport\.insertAdjacentHTML\('beforeend',cardsHTML\+footerHTML\)/);
 assert.match(page,/patiReelsCarry=null/);
 assert.match(page,/author\.handle\|\|'buchee'/);
});
test('Audio button is explicitly visible in the right-side rail even during playback',()=>{
 assert.match(css,/\.pati-reel-item>\.pati-reel-utility\{/);
 assert.match(css,/left:auto!important;right:max\(9px,env\(safe-area-inset-right,0px\)\)!important/);
 assert.match(css,/visibility:visible!important;opacity:1!important/);
 assert.match(css,/bottom:calc\(69px \+ env\(safe-area-inset-bottom,0px\)\)!important/);
 assert.match(css,/\[data-action="reel-sound"\]\{/);
 assert.match(css,/pointer-events:auto!important/);
 assert.match(css,/\[data-action="reel-speed"\]\{\s*display:none!important/);
});
test('Caption and action positions allow small screens without hiding core actions',()=>{
 assert.match(page,/pati-reel-caption'\+\(!/);
 assert.match(page,/is-empty/);
 assert.match(css,/\.pati-reel-caption\.is-empty\{/);
 assert.match(css,/\.pati-reel-rail>button\{/);
 assert.match(css,/\(max-height:570px\)/);
 assert.match(css,/min-height:46px!important/);
 assert.match(css,/\.pati-reel-info>/);
 assert.match(css,/scroll-snap-type:y mandatory/);
 assert.match(css,/object-fit:contain/);
});
test('No-IntersectionObserver devices still follow snapped video when scrolling and honor manual pause',async()=>{
 const videos=Array.from({length:3},(_,i)=>({
  id:i,paused:true,muted:true,preload:'none',readyState:3,dataset:{},
  playCount:0,pauseCount:0,
  getAttribute(){return ''},hasAttribute(){return false},load(){},
  play(){this.paused=false;this.playCount++;return Promise.resolve()},
  pause(){this.paused=true;this.pauseCount++}
 }));
 const events=new Map();
 const viewport={clientHeight:600,scrollTop:0,addEventListener(n,fn){events.set(n,fn)},removeEventListener(n){events.delete(n)}};
 const ctx={window:{},document:{hidden:false,querySelectorAll:()=>videos,querySelector:()=>viewport,getElementById:()=>null},
  patiyizReelsObserver:null,patiyizReelsCleanup:null,patiyizReelsSoundEnabled:false,Map,Promise,console,
  patiUpdateReelsSoundButton(){},view:'reels'};
 const run=vm.runInNewContext(setup+'\nsetupReelsViewer',ctx);
 run();
 assert.equal(videos[0].paused,false);
 viewport.scrollTop=600;events.get('scroll')();
 assert.equal(videos[0].paused,true);assert.equal(videos[1].paused,false);
 videos[2].dataset.manualPause='1';
 viewport.scrollTop=1200;events.get('scroll')();
 assert.equal(videos[1].paused,true);assert.equal(videos[2].playCount,0);
 delete videos[2].dataset.manualPause;
 events.get('scrollend')();
 assert.equal(videos[2].paused,false);
 ctx.patiyizReelsCleanup();
 assert.equal(events.size,0);
});
test('Reels empty state provides a real upload action, retaining pager and loading states',()=>{
 assert.match(page,/role="status"/);
 assert.match(page,/data-action="pati-create-reels">Reels çek/);
 assert.match(page,/page\?\.loading\?'Reels videoları hazırlanıyor/);
 assert.match(page,/reels-more/);
 assert.match(setup,/loadNearEnd/);
 assert.match(setup,/pati-reel-buffering-error/);
});
test('Style asset is loaded late without modifying shared core CSS or other screens',()=>{
 assert.match(html,/buchee-reels-phase4-20261103\.css\?v=20261103v1/);
 assert.match(html,/<script src="app\.js\?v=20\d{6}-[a-z0-9-]+/);
 assert.ok(html.indexOf('buchee-reels-phase4-20261103.css')>html.indexOf('buchee-messages-phase3-20261103.css'));
 assert.doesNotMatch(css,/html\[data-pati-view="messages"\]|html\[data-pati-view="home"\]/);
 new vm.Script(app);
 let depth=0;for(const c of css){if(c==='{')depth++;if(c==='}')depth--;assert.ok(depth>=0)}assert.equal(depth,0);
});
