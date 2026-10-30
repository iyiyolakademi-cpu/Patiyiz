const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8'),css=fs.readFileSync('post-detail-twitter-text-stage16.css','utf8'),html=fs.readFileSync('index.html','utf8'),native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
const grab=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'missing '+a);return app.slice(i,j)};
const candidates=grab('function patiDetailCandidates(source){','function patiDetailPage(){');
const detail=grab('function patiDetailPage(){','function openPost(');
const open=grab('function openPost(id){','let storyItems=');
const home=grab('function homePage(){','let savedPostsLoading=');
const scroll=grab('function patiDmScrollLatest(history,peer){','function patiDmThreadKey');
const textCard=grab('function postCard(p,priority=false){','function patiDetailCandidates(source){');
const make=(id,day,type='image',author_id='owner')=>({id,author_id,body:'Pet '+id,created_at:'2026-10-'+String(day).padStart(2,'0')+'T12:00:00Z',...(type==='image'?{image_url:id+'.jpg'}:type==='video'?{video_url:id+'.mp4'}:{})});
function fixture(){
 const rows=[make('p1',25),make('p2',24),make('p3',23),make('p4',22,'video'),make('p5',21),make('t1',20,'text')];
 const c={data:{posts:rows},blocked:new Set(),me:{id:'viewer'},profileId:'owner',profilePostsTab:'media',patiExploreMedia:{owner:'viewer',ready:true,rows:[]},Date,Map,String};
 vm.createContext(c);vm.runInContext(candidates+'\nglobalThis.getCandidates=patiDetailCandidates',c);return c;
}
test('Profile #3 opens a continuous media sequence: up #2/#1, down #4/#5',()=>{
 const c=fixture(),posts=c.getCandidates('profile');
 assert.deepEqual(Array.from(posts,x=>x.id),['p1','p2','p3','p4','p5']);
 assert.equal(posts[2].id,'p3');
 assert.deepEqual(Array.from(posts.slice(2),x=>x.id),['p3','p4','p5']);
 assert.deepEqual(Array.from(posts.slice(0,2),x=>x.id),['p1','p2']);
});
test('Profile video and text tabs restrict the sequence without mixing media types',()=>{
 const c=fixture();c.profilePostsTab='videos';assert.deepEqual(Array.from(c.getCandidates('profile'),x=>x.id),['p4']);
 c.profilePostsTab='text';assert.deepEqual(Array.from(c.getCandidates('profile'),x=>x.id),['t1']);
 c.profilePostsTab='media';c.blocked.add('owner');assert.equal(c.getCandidates('profile').length,0);
});
test('Explore sequence merges paginated remote photos/videos and maintains order',()=>{
 const c=fixture();c.patiExploreMedia.rows=[make('remote-new',26,'image','other'),make('p3',23)];
 assert.deepEqual(Array.from(c.getCandidates('explore'),p=>p.id),['remote-new','p1','p2','p3','p4','p5']);
 c.blocked.add('other');assert.equal(c.getCandidates('explore')[0].id,'p1');
});
test('Detail screen renders selected image/video plus every later and earlier post',()=>{
 const c=fixture(),rows=c.getCandidates('profile'),targets=rows.map((p,i)=>({dataset:{detailPostId:p.id},offsetTop:i*420}));
 const list={isConnected:true,scrollTop:0,querySelectorAll:()=>targets};
 let inner='',read=0;
 c.main={get innerHTML(){return inner},set innerHTML(v){inner=v}};
 c.document={querySelector:()=>read++?list:null,getElementById:()=>list};
 c.patiDetailState={rows,initialId:'p3',positioned:false};
 c.blocked=new Set();c.ico=n=>n;c.esc=String;c.postCard=p=>'<article>'+p.id+'</article>';c.empty=()=>'<p>Yok</p>';
 c.requestAnimationFrame=fn=>fn();
 vm.runInContext(detail+'\nglobalThis.showDetail=patiDetailPage',c);
 c.showDetail();assert.equal(list.scrollTop,840);
 assert.equal((inner.match(/data-detail-post-id=/g)||[]).length,5);
 assert.ok(inner.indexOf('data-detail-post-id="p2"')<inner.indexOf('data-detail-post-id="p3"'));
 assert.ok(inner.indexOf('data-detail-post-id="p3"')<inner.indexOf('data-detail-post-id="p4"'));
 list.scrollTop=1040;
 c.showDetail();assert.equal(list.scrollTop,1040,'re-render preserves where person scrolled');
 assert.match(inner,/role="feed"/);
});
test('Opening a post retains return source and preserves profile context',()=>{
 assert.match(open,/origin=view/);
 assert.match(open,/patiDetailCandidates\(origin\)/);
 assert.match(open,/origin,rows:options,initialId:id/);
 assert.match(open,/profileId,profilePostsTab,returnScroll/);
 assert.match(home,/if\(selectedPostId&&patiDetailState\)\{patiDetailPage\(\);return\}/);
 assert.match(app,/case 'post-back':\{[\s\S]*?detail\?\.origin[\s\S]*?profileId=detail.profileId/);
});
test('DM opens a conversation at the last message, even after async fetch',()=>{
 const ctx={view:'messages',personId:'peer-1',requestAnimationFrame:fn=>fn()};
 vm.createContext(ctx);vm.runInContext(scroll+'\nglobalThis.scrollLatest=patiDmScrollLatest',ctx);
 const list={isConnected:true,scrollTop:0,scrollHeight:1250};
 ctx.scrollLatest(list,'peer-1');assert.equal(list.scrollTop,1250);
 list.scrollTop=0;ctx.personId='peer-2';ctx.scrollLatest(list,'peer-1');assert.equal(list.scrollTop,0,'old async loads cannot scroll a different chat');
 assert.match(app,/patiDmOpenAtLatest\(id\);personId=id;mobileChatOpen=true/);
 assert.match(app,/const pinIntent=patiDmShouldPinLatest\(personId\)/);
 assert.match(app,/const openLatest=patiDmPendingLatestPeer===personId&&threadReady/);
 assert.match(app,/patiDmScrollLatest\(history,personId\)/);
 assert.match(app,/if\(anchor&&typeof requestAnimationFrame==='function'\)requestAnimationFrame/);
});
test('DM thread fetch is newest first on server, ascending inside conversation',()=>{
 assert.match(app,/\.order\('created_at',\{ascending:false\}\)\.limit\(PATI_DM_THREAD_PAGE\)/);
 assert.match(app,/let conv=\[\.\.\.\(hiddenState\.ready\?/);
 assert.match(app,/\.filter\(x=>patiDmLastVisible\(personId,x\.created_at\)\)\.sort\(\(a,b\)=>new Date\(a\.created_at\)-new Date\(b\.created_at\)\)/);
 assert.match(app,/next\.scrollTop=Math\.max\(0,anchor\.top\+next\.scrollHeight-anchor\.height\)/);
});
test('Text-only posts keep author details and readable X-like text layout',()=>{
 assert.match(textCard,/pati-feed-text-only/);
 assert.match(textCard,/userRow\(p\.author_id,''\)/);
 assert.match(textCard,/pati-feed-text-content/);
 assert.match(textCard,/formatPatiPostBody\(body\)/);
 assert.match(textCard,/pati-social-actions/);
 assert.match(css,/\.pati-feed-text-only \.pati-feed-card-header \.pati-profile-row small/);
 assert.match(css,/#2691d5/);
 assert.match(css,/font-size:clamp\(15px,2\.5vw,17px\)/);
 assert.match(css,/@media\(max-width:740px\)/);
 assert.match(css,/data-pati-theme="dark"/);
});
test('Detail view has scroll-snap and safe-area responsive heights',()=>{
 assert.match(css,/scroll-snap-type:y proximity/);
 assert.match(css,/overscroll-behavior:contain/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(html,/post-detail-twitter-text-stage16\.css\?v=20261025-detail-v1/);
 assert.match(html,/detail20261025=16/);
 assert.match(native,/post-detail-twitter-text-stage16\.css/);
});
