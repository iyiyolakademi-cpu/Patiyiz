const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const uploader=fs.readFileSync('patiyiz-upload.js','utf8');
const html=fs.readFileSync('index.html','utf8');
function part(start,end){const a=app.indexOf(start),b=app.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,'missing '+start);return app.slice(a,b)}

test('Akış videoları oynatılana kadar remote src taşımaz',()=>{
 const ctx={me:{id:'user'},data:{comments:[],likes:[],pets:[]},blocked:new Set(),liked:new Set(),saved:new Set(),
  userRow:()=>'',ico:()=>'',profile:()=>({display_name:'Test'}),displayName:()=>'',esc:String,day:()=>'',formatPatiPostBody:x=>x};
 const postCard=vm.runInNewContext(part('function postCard(','function patiDetailCandidates(')+'\npostCard',ctx);
 const markup=postCard({id:'p1',author_id:'user',video_url:'https://cdn.example/movie.mov',body:''},true);
 assert.match(markup,/data-pati-video-src="https:\/\/cdn.example\/movie.mov"/);
 assert.doesNotMatch(markup,/<video[^>]+ src="/);
 assert.match(markup,/<video[^>]+preload="none"/);
});

test('Reels ilk oynatıcıyı açar, diğer videoları indirmez',()=>{
 const posts=[0,1,2].map(n=>({id:'p'+n,author_id:'user',video_url:'https://cdn.example/'+n+'.mov',created_at:'2026-10-27'}));
 const main={innerHTML:''};
 const ctx={main,me:{id:'user'},data:{posts,likes:[],comments:[]},blocked:new Set(),liked:new Set(),saved:new Set(),
  profile:()=>({id:'user',display_name:'Test',handle:'test'}),avatar:()=>'',displayName:()=>'',ico:()=>'',esc:String,cut:s=>s};
 const reelsPage=vm.runInNewContext(part('function reelsPage(){','function closePatiCreate()')+'\nreelsPage',ctx);
 reelsPage();
 assert.match(main.innerHTML,/class="pati-reel-video" src="https:\/\/cdn.example\/2.mov"/);
 assert.match(main.innerHTML,/class="pati-reel-video" data-pati-video-src="https:\/\/cdn.example\/1.mov"/);
 assert.match(main.innerHTML,/class="pati-reel-video" data-pati-video-src="https:\/\/cdn.example\/0.mov"/);
 assert.equal((main.innerHTML.match(/class="pati-reel-video" src="/g)||[]).length,1);
});

test('Yeni yüklemelerde HTTP önbelleği bir gün olur',()=>{
 assert.match(uploader,/cacheControl:'86400'/);
 assert.match(uploader,/upload\(key,file,\{contentType:mime,cacheControl:'86400'/);
 assert.match(app,/bucket:'patiyiz-videos'.+cacheControl:'86400'/);
 assert.match(html,/app\.js\?v=20261024-release-reliability-1[^"]*quota=20261027/);
});
test('Canlı sorgular tek oturuma göre filtrelenir, arka planda kanal kapanır',()=>{
 const partLive=part('async function refreshLiveTables(){','function queueLiveUpdate(){');
 assert.match(partLive,/\.or\('sender_id\.eq\.'/);
 assert.match(partLive,/\.eq\('owner_id',userId\)/);
 assert.match(app,/if\(document.hidden\)stopLive\(\);else refreshOnReturn\(\)/);
});
