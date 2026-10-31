const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('patiyiz-reels-fast-feed-20261031.css','utf8');

const pick=(begin,end)=>{
 const i=app.indexOf(begin),j=app.indexOf(end,i+begin.length);
 assert.ok(i>=0&&j>i,'cannot locate '+begin);
 return app.slice(i,j);
};
test('Reels batches are smaller while independent paging still supports every video',()=>{
 assert.match(app,/const PATI_REELS_PAGE=16;/);
 const source=pick('async function patiLoadMoreReels(','function reelsPage(){');
 assert.match(source,/not\('video_url','is',null\)/);
 assert.match(source,/range\(state\.offset,state\.offset\+PATI_REELS_PAGE-1\)/);
 assert.match(source,/state\.hasMore=rows\.length===PATI_REELS_PAGE/);
 assert.match(source,/patiReelsFeed!==state/);
 assert.match(source,/patiReelsFeed===state/);
});
test('Appending fetched videos does not rebuild currently playing Reel',async()=>{
 const page={owner:'viewer',rows:[{id:'old',video_url:'old.mp4'}],offset:1,hasMore:true,ready:true,loading:false,error:''};
 const newRows=Array.from({length:16},(_,i)=>({id:'next'+i,author_id:'known',video_url:'new'+i+'.mp4'}));
 let appends=0,renders=0;
 const ctx={me:{id:'viewer'},patiyizLoadToken:1,patiReelsFeed:page,view:'reels',
  PATI_REELS_PAGE:16,document:{querySelector:()=>({})},
  data:{posts:[],profiles:[{id:'known'}]},
  reelsPage(append){assert.equal(append,true);appends++},render(){renders++},
  sb:{from(){return{select(){return this},not(){return this},order(){return this},
   range(){return Promise.resolve({data:newRows,error:null})}}}},
  globalThis:{},Set,Map,Promise,console};
 const fn=vm.runInNewContext(pick('async function patiLoadMoreReels(','function reelsPage(){')+'\npatiLoadMoreReels',ctx);
 await fn(false);
 assert.equal(appends,1);assert.equal(renders,0);
 assert.equal(page.rows.length,17);assert.equal(page.offset,17);
 assert.equal(page.hasMore,true);
});
test('Reels preloads one following video, auto-fetches near the end and delays overlay',()=>{
 const source=pick('function setupReelsViewer(){','function reelHandleTap(');
 assert.match(source,/const prepareNext=video=>/);
 assert.match(source,/videos\[position\+1\]/);
 assert.match(source,/lowData\?'metadata':'auto'/);
 assert.match(source,/const loadNearEnd=\(\)=>/);
 assert.match(source,/if\(idx\+4>=videos\.length\)void patiLoadMoreReels\(\)/);
 assert.match(source,/onScroll=\(\)=>\{\s*loadNearEnd\(\)/);
 assert.match(source,/patiReelsBound==='1'/);
 assert.match(source,/setTimeout\(\(\)=>\{[\s\S]*?\},850\)/);
 assert.match(source,/isSelectedReel\(\)/);
 assert.match(source,/pati-reel-buffering-error/);
 assert.match(source,/deferBuffer/);
});
test('Existing playback actions, iOS fallback and seek controls are still present',()=>{
 const source=pick('function reelsPage(){','function closePatiCreate()');
 for(const action of ['reel-play','reel-speed','reel-sound','reel-seek','like','comment','pati-repost','share-post','save']){
  assert.ok(source.includes('data-action="'+action+'"'),action);
 }
 assert.match(source,/reelsPage\(\)/);
 assert.match(source,/existingViewport\.insertAdjacentHTML\('beforeend',cardsHTML\+footerHTML\)/);
 assert.match(source,/setupReelsViewer\(\)/);
 const setup=pick('function setupReelsViewer(){','function reelHandleTap(');
 assert.match(setup,/patiIsIOSStandaloneReels\(\)/);
 assert.match(setup,/IntersectionObserver/);
 assert.match(setup,/video\.play\(\)/);
 assert.match(setup,/patiUpdateReelsSoundButton/);
 assert.match(setup,/patiReelsCleanup/);
});
test('Delayed spinner is small, error remains readable, and CSS is last',()=>{
 assert.match(css,/\.pati-reel-buffering:not\(\.pati-reel-buffering-error\)/);
 assert.match(css,/width:46px!important/);
 assert.match(css,/pati-reel-buffering-error/);
 assert.match(css,/pati-reel-loading-label/);
 const newStyle='patiyiz-reels-fast-feed-20261031.css?v=1';
 const dark='patiyiz-dark-mode-all-screens-20261031.css?v=1';
 assert.ok(index.indexOf(newStyle)>index.indexOf(dark));
 new vm.Script(app);
 let braces=0;for(const char of css){if(char==='{')braces++;if(char==='}')braces--;assert.ok(braces>=0)}assert.equal(braces,0);
});
