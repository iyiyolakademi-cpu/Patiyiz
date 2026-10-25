const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-inspired.css','utf8');
const html=fs.readFileSync('index.html','utf8');
function piece(start,end){
 const a=app.indexOf(start),b=app.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,start);
 return app.slice(a,b);
}
test('Follow and unfollow immediately update cached follower and following counts',async()=>{
 const ctx={
  me:{id:'self'},profileId:'other',view:'profile',
  data:{posts:[],follows:[{follower_id:'third',followee_id:'other'}],likes:[],saves:[]},
  liked:new Set(),saved:new Set(),followed:new Set(),voted:new Set(),favorites:new Set(),
  document:{querySelectorAll:()=>[]},profileCountCache:new Map([['other',{value:{posts:0,followers:12,following:3},at:Date.now()}],['self',{value:{posts:0,followers:2,following:4},at:Date.now()}]]),
  profileCountRevision:new Map(),pendingProfileFollows:new Set(),renderProfileCounts(){},render(){},syncProfileCounts(){},console,Date,
  sb:{from:()=>({insert:async()=>({error:null}),delete:()=>({eq(){return this},then(ok){ok({error:null})}})})}
 };
 const toggle=vm.runInNewContext(piece('async function doToggle(table,keys,present){','async function deleteOwnedMedia(')+'\ndoToggle',ctx);
 let promise=toggle('follows',{follower_id:'self',followee_id:'other'},false);
 assert.equal(ctx.profileCountCache.get('other').value.followers,13);
 assert.equal(ctx.profileCountCache.get('self').value.following,5);
 assert.equal(ctx.followed.has('other'),true);
 await promise;
 promise=toggle('follows',{follower_id:'self',followee_id:'other'},true);
 assert.equal(ctx.profileCountCache.get('other').value.followers,12);
 assert.equal(ctx.profileCountCache.get('self').value.following,4);
 assert.equal(ctx.followed.has('other'),false);
 await promise;
});
test('Follow rollback reverts optimistic counts if Supabase rejects mutation',async()=>{
 const ctx={me:{id:'self'},profileId:'other',view:'profile',
  data:{posts:[],follows:[],likes:[],saves:[]},liked:new Set(),saved:new Set(),followed:new Set(),voted:new Set(),favorites:new Set(),
  document:{querySelectorAll:()=>[]},profileCountCache:new Map([['other',{value:{posts:0,followers:7,following:1},at:Date.now()}]]),
  profileCountRevision:new Map(),pendingProfileFollows:new Set(),renderProfileCounts(){},render(){},syncProfileCounts(){},console,Date,
  sb:{from:()=>({insert:async()=>({error:new Error('Connection failed')})})}
 };
 const toggle=vm.runInNewContext(piece('async function doToggle(table,keys,present){','async function deleteOwnedMedia(')+'\ndoToggle',ctx);
 const promise=toggle('follows',{follower_id:'self',followee_id:'other'},false);
 assert.equal(ctx.profileCountCache.get('other').value.followers,8);
 await assert.rejects(promise,/Connection failed/);
 assert.equal(ctx.profileCountCache.get('other').value.followers,7);
 assert.equal(ctx.followed.has('other'),false);
});
test('Home video playback is exclusive, audible when supported and has silent autoplay fallback',()=>{
 const source=piece('function setupFeedVideos(){',"document.addEventListener('visibilitychange'");
 assert.match(source,/const ratios=new Map\(\)/);
 assert.match(source,/patiyizFeedActiveVideo\?\.pause\(\)/);
 assert.match(source,/video\.muted=!patiyizFeedSoundEnabled/);
 assert.match(source,/video\.play\(\)\.catch/);
 assert.match(app,/case 'video-sound':\{const v=/);
 assert.match(app,/patiyizFeedSoundEnabled=v\.muted/);
 assert.match(app,/playsinline webkit-playsinline/);
});
test('Instagram-style comments show a post summary, likes and collapsible threaded replies',()=>{
 const comments=piece('function showComments(postId){','function modal(');
 assert.match(comments,/pati-comment-post-summary/);
 assert.match(comments,/pati-sheet-comment/);
 assert.match(comments,/pati-comment-replies-toggle/);
 assert.match(comments,/comment-thread-toggle/);
 assert.match(comments,/pati-instagram-comments/);
 assert.match(comments,/pati-comment-editor-row/);
 assert.match(comments,/Yorum ekle/);
 assert.match(app,/case 'comment-thread-toggle':/);
 assert.match(app,/case 'comment-form':\{[\s\S]*?\.insert\(record\)\.select\('\*'\)\.single\(\)/);
 assert.match(css,/\.pati-instagram-comments-backdrop/);
 assert.match(css,/height:min\(77dvh,830px\)/);
 assert.match(css,/\.pati-sheet-comment/);
});
test('Profile top margin is seamless and both assets get cache-busting versions',()=>{
 assert.match(css,/#app-root:not\(\.hidden\):has\(#main-content \.pati-ig-profile\)>\.mobile-header/);
 assert.match(css,/#main-content \.pati-ig-profile \.pati-ig-summary/);
 assert.match(html,/igcomments20261025=1/);
});
