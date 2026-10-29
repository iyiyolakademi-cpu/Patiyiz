const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const follower=fs.readFileSync('follower-milestones.js','utf8');
const css=fs.readFileSync('profile-explore-coin-polish.css','utf8');
const section=(from,to)=>{const start=app.indexOf(from),end=app.indexOf(to,start+from.length);assert.ok(start>=0&&end>start,'missing '+from);return app.slice(start,end)};

test('Canlı hikâyeler kişilerin hikâyeleri bitince sıradaki kişiye geçebilecek şekilde sıraya dizilir',()=>{
 const now=Date.now(),stamp=n=>new Date(now-n*1000).toISOString(),future=stamp(-200);
 const rows=[
  {id:'bob-new',author_id:'bob',created_at:stamp(1),expires_at:future},
  {id:'bob-old',author_id:'bob',created_at:stamp(9),expires_at:future},
  {id:'ann-new',author_id:'ann',created_at:stamp(2),expires_at:future},
  {id:'owner',author_id:'owner',created_at:stamp(10),expires_at:future},
  {id:'blocked',author_id:'blocked',created_at:stamp(0),expires_at:future},
  {id:'expired',author_id:'ann',created_at:stamp(50),expires_at:stamp(1)}
 ];
 const ctx={data:{stories:rows},blocked:new Set(['blocked']),me:{id:'owner'},Map,Date,Set};
 const build=vm.runInNewContext(section('function patiBuildLiveStorySequence(','function openHighlightStory(')+'\npatiBuildLiveStorySequence',ctx);
 const queue=build('bob');assert.ok(queue);
 assert.deepEqual(Array.from(queue.items.map(x=>x.id)),['bob-old','bob-new','ann-new','owner']);
 assert.equal(queue.items[queue.index].id,'bob-old');
 assert.equal(build('blocked'),null);
});

test('Hikâye oynatıcıdaki çubuk yalnızca aktif kişiyi gösterir ve tepki / anket alanı yoktur',()=>{
 const frame=section('function showStoryFrame(){','async function syncStoryLike(');
 assert.match(frame,/storyGroupItems/);
 assert.match(frame,/storyGroupIndex/);
 assert.match(frame,/upcoming\?\.image_url/);
 assert.match(frame,/data-action="story-like"/);
 assert.doesNotMatch(frame,/data-action="story-emoji"/);
 assert.doesNotMatch(frame,/pati-story-interactive/);
 const composer=section('function openStoryComposer(','async function renderEditedStoryFile(');
 assert.doesNotMatch(composer,/name="interaction_mode"/);
 assert.match(follower,/class="pati-goal-logo" src="patiyiz-selected-logo.svg/);
 assert.doesNotMatch(follower,/pati-goal-medal/);
});

test('Mobil sekme kaydırmaları yatay ve yeterince büyük olduğunda gezinir; galeri korunur',()=>{
 const listeners={};const routes=[];
 const dom={
  getElementById:()=>null,
  querySelector:()=>null,
  documentElement:{clientWidth:390},
  addEventListener(name,fn){listeners[name]=fn}
 };
 const win={innerWidth:390,matchMedia:()=>({matches:true})};
 const context={document:dom,window:win,me:{id:'me'},view:'home',profileId:'',exploreTab:'media',Date,patiSwipeNavDirection:0,
  navigate(route){routes.push(route);context.view=route}};
 const source=section('const patiSwipeTabs=[','let storyTouchY=null,storyTouchX=null;');
 vm.runInNewContext(source,context);
 const target={closest(sel){return sel==='#main-content'?{}:null}};
 const carousel={closest(sel){return sel==='#main-content'?{}:sel.includes('.pati-carousel')?{}:null}};
 const down=(x,y,tgt=target)=>listeners.touchstart({touches:[{clientX:x,clientY:y}],target:tgt});
 const up=(x,y,tgt=target)=>listeners.touchend({changedTouches:[{clientX:x,clientY:y}],touches:[],target:tgt});
 down(300,240);up(100,245);assert.deepEqual(routes,['explore']);
 down(300,240);up(100,250);assert.deepEqual(routes,['explore','reels']);
 down(100,240);up(280,237);assert.deepEqual(routes,['explore','reels','explore']);
 down(250,100,carousel);up(80,102,carousel);assert.equal(routes.length,3);
 down(230,100);up(80,250);assert.equal(routes.length,3,'vertical scrolling does not change tabs');
 down(8,160);up(120,164);assert.equal(routes.length,3,'reserved device back-swipe edge');
});

test('Geçişler yönlerine göre kayar ve azaltılmış hareket tercihini izler',()=>{
 assert.match(app,/pati-view-swipe-next/);
 assert.match(app,/pati-view-swipe-prev/);
 assert.match(css,/@keyframes pati-tab-enter-next/);
 assert.match(css,/@keyframes pati-tab-enter-prev/);
 assert.match(css, /prefers-reduced-motion:reduce/);
});
