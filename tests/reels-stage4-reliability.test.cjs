const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8'),css=fs.readFileSync('reels-stage4.css','utf8');
const part=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return app.slice(i,j)};
test('Reels loads 65 videos in three independently scoped pages, not global post reload',async()=>{
 const posts=Array.from({length:65},(_,i)=>({id:'v'+i,author_id:'owner',video_url:'v'+i+'.mp4',created_at:'2026-10-25T10:00:00Z'}));
 const calls=[];
 const ctx={me:{id:'viewer'},patiyizLoadToken:2,view:'home',data:{posts:[],profiles:[{id:'owner'}]},Set,Map,Promise,console,
  PATI_REELS_PAGE:30,patiReelsFeed:{owner:'',rows:[],offset:0,hasMore:true,loading:false,ready:false,error:''},
  sb:{from(table){calls.push({table});return{
   select(){return this},not(col,op,val){calls.push({col,op,val});return this},order(){return this},
   range(from,to){calls.push({from,to});return Promise.resolve({data:posts.slice(from,to+1),error:null})}
  }}}};
 const fn=vm.runInNewContext(part('async function patiLoadMoreReels(','function reelsPage(){')+'\npatiLoadMoreReels',ctx);
 await fn(true);await fn();await fn();
 assert.equal(ctx.data.posts.length,65);assert.equal(ctx.patiReelsFeed.rows.length,65);
 assert.equal(ctx.patiReelsFeed.hasMore,false);
 assert.deepEqual(calls.filter(x=>x.from!==undefined).map(x=>[x.from,x.to]),[[0,29],[30,59],[60,89]]);
 assert.equal(calls.filter(x=>x.table).length,3);
 assert.ok(calls.filter(x=>x.table).every(x=>x.table==='posts'));
});
test('Reels network errors preserve loaded rows and allow retry',async()=>{
 const initial={owner:'viewer',rows:[{id:'old'}],offset:1,hasMore:true,ready:true,loading:false,error:''};
 const ctx={me:{id:'viewer'},patiyizLoadToken:0,view:'home',data:{posts:[],profiles:[]},Map,Set,Promise,console,
 PATI_REELS_PAGE:30,patiReelsFeed:initial,
 sb:{from(){return{select(){return this},not(){return this},order(){return this},range(){return Promise.resolve({error:new Error('offline')})}}}}};
 const fn=vm.runInNewContext(part('async function patiLoadMoreReels(','function reelsPage(){')+'\npatiLoadMoreReels',ctx);
 await fn();assert.equal(initial.offset,1);assert.equal(initial.rows.length,1);assert.match(initial.error,/Tekrar/);
});
test('Reels original autoplay, volume, video seek, and actions remain intact',()=>{
 const page=part('function reelsPage(){','function closePatiCreate()');
 for(const v of ['pati-reel-video','data-action="reel-play"','data-action="reel-sound"','data-action="reel-seek"','data-action="like"','data-action="comment"','data-action="share-post"','data-action="save"','reels-more'])assert.ok(page.includes(v),v);
 const setup=part('function setupReelsViewer(){','function reelHandleTap(');
 assert.match(setup,/IntersectionObserver/);
 assert.match(setup,/video\.play\(\)/);
 assert.match(setup,/nextVideo\.dataset\.manualPause/);
 assert.match(app,/case 'reels-more':void patiLoadMoreReels\(\)/);
 assert.match(css,/pati-reels-load-more/);
 assert.match(fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8'),/reels-stage4\.css/);
});
