const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const likeCss=fs.readFileSync('patiyiz-post-likers-fullscreen-20261030.css','utf8');
const profileCss=fs.readFileSync('patiyiz-comment-profile-only-20261030.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const native=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');

test('App JS compiles, comment-to-profile closes comment sheet and clears post overlay state',()=>{
 new vm.Script(app);
 const fn=app.slice(app.indexOf('function patiOpenProfileOnly(userId){'),app.indexOf('async function patiOpenMentionProfile(',app.indexOf('function patiOpenProfileOnly(userId){')));
 assert.match(fn,/document\.getElementById\('comment-form'\)/);
 assert.match(fn,/closeModal\(true\)/);
 assert.match(fn,/patiDetailState=null/);
 assert.match(fn,/selectedPostId=''/);
 assert.match(fn,/profileId=userId/);
 assert.match(fn,/navigate\('profile'\)/);
 assert.match(app,/case 'view-user':patiOpenProfileOnly\(id\)/);
 assert.match(app,/patiOpenProfileOnly\(person\.id\)/);
});
test('Comment author and post author avatar/name have profile-only actions',()=>{
 const comments=app.slice(app.indexOf('function showComments(postId){'),app.indexOf('const PATI_MOBILE_FULL_PAGE_FORMS',app.indexOf('function showComments(postId){')));
 assert.match(comments,/class="pati-comment-profile-avatar"/);
 assert.match(comments,/class="pati-comment-profile-name"/);
 assert.match(comments,/data-action="view-user"/);
 assert.match(profileCss,/#comment-form \.pati-comment-profile-name/);
 assert.match(profileCss,/#comment-form \.pati-comment-profile-avatar/);
});
test('Feed like count and reels like number open likes list separately from the actual heart',()=>{
 const cards=app.slice(app.indexOf('function postCard(p,priority=false){'),app.indexOf('function patiDetailCandidates(',app.indexOf('function postCard(p,priority=false){')));
 assert.match(cards,/class="pati-post-like-summary" data-action="post-likers"/);
 assert.match(cards,/data-action="like"/);
 const reels=app.slice(app.indexOf('function reelsPage(){'),app.indexOf('function closePatiCreate(){'));
 assert.match(reels,/class="pati-reel-count pati-reel-likers-trigger" data-action="post-likers"/);
 assert.match(reels,/data-action="like"/);
 assert.match(app,/case 'post-likers':patiOpenPostLikers\(id\)/);
 assert.match(app,/case 'post-likers-more':void patiLoadPostLikers\(\)/);
});
test('Full screen list fetches paginated real likes, resolves accounts and opens selected profile',()=>{
 const list=app.slice(app.indexOf('let patiPostLikersState='),app.indexOf('function postCard(p,priority=false){'));
 assert.match(list,/sb\.from\('post_likes'\)\.select\('user_id,created_at'\)/);
 assert.match(list,/\.eq\('post_id',postId\)\.order\('created_at'/);
 assert.match(list,/\.range\(offset,offset\+limit-1\)/);
 assert.match(list,/sb\.from\('profiles'\)\.select\('id,display_name,handle,avatar_url,is_verified,is_private'\)/);
 assert.match(list,/data-action="view-user" data-id=/);
 assert.match(list,/pati-post-likers-form/);
 assert.match(list,/aria-label','Beğenenler listesini kapat'/);
 assert.match(likeCss,/height:100dvh!important/);
 assert.match(likeCss,/\.pati-post-liker-person/);
});
test('Chat opening pins newest message until photos settle, but stops if user interacts',()=>{
 const start=app.indexOf('function patiDmScrollLatest(history,peer){');
 const block=app.slice(start,app.indexOf('// Conversations are hidden only',start));
 assert.match(block,/history\.style\.overflowAnchor='none'/);
 assert.match(block,/history\.scrollTop=Math\.max\(0,history\.scrollHeight-history\.clientHeight\)/);
 assert.match(block,/new ResizeObserver\(\(\)=>pin\(\)\)/);
 assert.match(block,/history\.addEventListener\(name,stopByUser/);
 assert.match(block,/history\.querySelectorAll\('img,video'\)/);
 assert.match(block,/setTimeout\(cleanup,15000\)/);
 const page=app.slice(app.indexOf('function messagesPage(){'),app.indexOf('function pushKeyBytes(',app.indexOf('function messagesPage(){')));
 assert.match(page,/patiDmScrollLatest\(history,personId\)/);
 assert.match(page,/if\(openLatest\|\|pinIntent\|\|!oldHistory\|\|oldChatId!==personId\)/);
 assert.match(page,/oldWasAtBottom/);
});
test('iPhone web and native Android bundle profile & fullscreen styles and new app cache key',()=>{
 assert.match(html,/patiyiz-comment-profile-only-20261030\.css\?v=1/);
 assert.match(html,/patiyiz-post-likers-fullscreen-20261030\.css\?v=1/);
 assert.match(html,/comment_profile_likers_fullscreen=20261030/);
 assert.match(native,/'patiyiz-comment-profile-only-20261030\.css'/);
 assert.match(native,/'patiyiz-post-likers-fullscreen-20261030\.css'/);
 assert.ok(html.indexOf('patiyiz-post-likers-fullscreen-20261030.css')<html.indexOf('patiyiz-crop-insights-mobile-final-20261029.css'));
});
