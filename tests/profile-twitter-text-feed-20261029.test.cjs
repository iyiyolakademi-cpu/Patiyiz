const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('patiyiz-profile-chat-repair-20261029.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
function source(from,to){
 const start=app.indexOf(from),end=app.indexOf(to,start+from.length);
 assert.ok(start>=0&&end>start,'Missing code boundary '+from);
 return app.slice(start,end);
}
const p={
 id:'owner',display_name:'Yazar',handle:'yazar',bio:'',is_private:false
};
const posts=[
 {id:'text-1',author_id:'owner',body:'Bir düşünce',created_at:'2026-10-29T12:00:00Z',images:[]},
 {id:'text-2',author_id:'owner',body:'İkinci düşünce',created_at:'2026-10-28T12:00:00Z',images:[]},
 {id:'image-1',author_id:'owner',body:'Fotoğraflı',image_url:'image.jpg',created_at:'2026-10-27T12:00:00Z'},
 {id:'video-1',author_id:'owner',body:'Video',video_url:'video.mp4',post_format:'post',created_at:'2026-10-26T12:00:00Z'},
 {id:'reels-1',author_id:'owner',body:'Reels',video_url:'reels.mp4',post_format:'reels',created_at:'2026-10-25T12:00:00Z'},
 {id:'video-array',author_id:'owner',body:'Sadece çoklu video',media_videos:['fallback.mp4'],created_at:'2026-10-24T12:00:00Z'},
];
test('Profile Yazılar returns its original full-length timeline, not a tiled photo grid',()=>{
 const snippet=source('function profilePage(){','function formField(');
 const c={
  me:{id:'owner'},profileId:'',profilePostsTab:'text',
  profile:()=>p,blocked:new Set(),followed:new Set(),
  data:{posts,stories:[],pets:[],pins:[{owner_id:'owner',post_id:'text-1',created_at:'2026-10-28'}],highlightItems:[],highlightAlbums:[],follows:[]},
  profileCountCache:new Map(),main:{innerHTML:''},Date,Set,Number,Math,
  patiSafetyRefresh:()=>{},patiLoadProfileViewCounts:()=>{},syncProfileCounts:()=>{},
  patiyizProgressCard:()=>'',patiVerificationProfileAction:()=>'',patiProfileLinksHTML:()=>'',verifiedBadge:()=>'',avatar:()=>'<i class="avatar"></i>',
  button:(name,action)=>'<button data-action="'+action+'">'+name+'</button>',
  esc:String,cut:String,ico:()=>'',postCard:(x)=>'<article class="pati-feed-text-only" data-post-id="'+x.id+'">'+x.body+'</article>'
 };
 vm.createContext(c);vm.runInContext(snippet+'\nglobalThis.showProfile=profilePage',c);
 c.showProfile();
 assert.match(c.main.innerHTML,/class="pati-profile-text-feed"/);
 assert.match(c.main.innerHTML,/role="feed"/);
 assert.match(c.main.innerHTML,/Bir düşünce/);
 assert.match(c.main.innerHTML,/İkinci düşünce/);
 assert.match(c.main.innerHTML,/Sabitlenmiş yazı/);
 assert.match(c.main.innerHTML,/data-action="profile-open-post"/);
 assert.doesNotMatch(c.main.innerHTML,/class="pati-profile-tile/);
 assert.equal((c.main.innerHTML.match(/data-post-id="/g)||[]).length,2);
 c.profilePostsTab='media';c.showProfile();
 assert.match(c.main.innerHTML,/class="pati-ig-grid"/);
 assert.match(c.main.innerHTML,/data-id="image-1"/);
 assert.match(c.main.innerHTML,/data-id="video-1"/);
 assert.match(c.main.innerHTML,/data-id="video-array"/);
 assert.doesNotMatch(c.main.innerHTML,/data-id="text-1"/);
 c.profilePostsTab='reels';c.showProfile();
 assert.match(c.main.innerHTML,/data-id="reels-1"/);
 assert.doesNotMatch(c.main.innerHTML,/data-id="video-1"/);
 c.profilePostsTab='videos';c.showProfile();
 assert.match(c.main.innerHTML,/data-id="video-array"/);
 assert.doesNotMatch(c.main.innerHTML,/data-id="reels-1"/);
});
test('Profile text is X-like across light, dark and narrow mobile layouts',()=>{
 assert.match(css,/\.pati-profile-text-feed\{/);
 assert.match(css,/flex-direction:column!important/);
 assert.match(css,/\.pati-profile-text-item\{/);
 assert.match(css,/\.pati-feed-card\.pati-feed-text-only\{/);
 assert.match(css,/border-radius:0!important/);
 assert.match(css,/white-space:pre-wrap!important/);
 assert.match(css,/html\[data-pati-theme="dark"\].*\.pati-profile-text-feed/);
 assert.match(css,/@media\(max-width:740px\)/);
 assert.match(html,/profile_text_feed=20261029/);
 assert.match(html,/text_feed=20261029/);
 assert.match(native,/'patiyiz-profile-chat-repair-20261029\.css'/);
});
test('Media and text detail candidates are consistent with own and collaborator posts',()=>{
 const snippet=source('function patiDetailCandidates(source){','function patiDetailPage(){');
 const rows=[...posts,{id:'collab',author_id:'collaborator',body:'İş birliği yazısı',created_at:'2026-10-23T12:00:00Z'}];
 const c={
  profileId:'owner',profilePostsTab:'text',me:{id:'owner'},
  data:{posts:rows},blocked:new Set(),
  patiCollabPartnerPosts:()=>rows,patiRepostedPosts:()=>[],
  patiExploreMedia:{owner:'owner',ready:false,rows:[]},Date,Map,String
 };
 vm.createContext(c);vm.runInContext(snippet+'\nglobalThis.getCandidates=patiDetailCandidates',c);
 assert.deepEqual(Array.from(c.getCandidates('profile'),x=>x.id),['text-1','text-2','collab']);
 c.profilePostsTab='videos';
 assert.deepEqual(Array.from(c.getCandidates('profile'),x=>x.id),['video-1','video-array']);
 c.profilePostsTab='reels';
 assert.deepEqual(Array.from(c.getCandidates('profile'),x=>x.id),['reels-1']);
});
test('Legacy multi-video post renders playable video, never an empty text card',()=>{
 const snippet=source('function postCard(p,priority=false){','function patiDetailCandidates(source){');
 const c={
  me:{id:'owner'},profile:()=>p,
  data:{comments:[],likes:[],pets:[],posts:[]},
  blocked:new Set(),liked:new Set(),saved:new Set(),
  esc:String,ico:n=>'<i>'+n+'</i>',day:()=>'',userRow:()=>'<span>Yazar</span>',
  photo:()=>'<div>photo</div>',displayName:()=>'Yazar',formatPatiPostBody:String,
  patiyizFeedSoundEnabled:false,patiOwnRepost:()=>false,PATI_REPOST_ICON:'<i></i>'
 };
 vm.createContext(c);vm.runInContext(snippet+'\nglobalThis.makeCard=postCard',c);
 const result=c.makeCard(posts.find(x=>x.id==='video-array'));
 assert.match(result,/pati-feed-has-media/);
 assert.match(result,/data-pati-video-src="fallback.mp4"/);
 assert.doesNotMatch(result,/pati-feed-text-only/);
});
