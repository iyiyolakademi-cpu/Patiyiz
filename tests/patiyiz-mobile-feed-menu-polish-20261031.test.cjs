const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('patiyiz-feed-menu-chat-mobile-20261031.css','utf8');
const slice=(a,b)=>{const start=app.indexOf(a),end=app.indexOf(b,start+a.length);assert.ok(start>=0&&end>start,a);return app.slice(start,end)};
test('App loads one new mobile CSS after previous visual rules',()=>{
 assert.match(html,/patiyiz-feed-menu-chat-mobile-20261031\.css\?v=1/);
 assert.ok(html.indexOf('patiyiz-clean-release-20261031.css')<html.indexOf('patiyiz-feed-menu-chat-mobile-20261031.css'));
 new vm.Script(app);
});
test('Home uses real account-readable Q&A and interleaves with posts',()=>{
 assert.match(app,/async function patiLoadHomeQuestions\(\)/);
 assert.match(app,/sb\.from\('questions'\)\.select\('\*'\)\.order\('created_at',\{ascending:false\}\)\.limit\(12\)/);
 assert.match(app,/patiyizLoadToken!==token/);
 assert.match(app,/data-action="replies"/);
 assert.match(app,/function patiHomeCombinedFeed\(posts\)/);
 const source=slice('function patiHomeCombinedFeed(posts){','let patiFeedReelTarget=');
 const result=vm.runInNewContext(source+';patiHomeCombinedFeed', {
  patiHomeQuestionsState:{owner:'user-a',ready:true,rows:[{id:'q1',author_id:'user-b',title:'Aşı sorusu',body:'Veteriner önerisi?',created_at:'2026-10-31'}]},
  me:{id:'user-a'},blocked:new Set(), postCard:p=>'<div class="post">'+p.id+'</div>',
  patiHomeQuestionCard:q=>'<div class="question">'+q.id+'</div>'
 });
 const markup=result([{id:'p1'},{id:'p2'},{id:'p3'},{id:'p4'}]);
 assert.equal((markup.match(/class="question"/g)||[]).length,1);
 assert.ok(markup.indexOf('p3')<markup.indexOf('q1'));
});
test('Feed reel card focuses fullscreen Reels screen rather than opening in-place player',()=>{
 assert.match(app,/const isFeedReel=p\.post_format==='reels'/);
 assert.match(app,/data-action="pati-feed-open-reel"/);
 assert.match(app,/case 'pati-feed-open-reel':patiOpenFeedReel\(id\)/);
 assert.match(app,/function patiOpenFeedReel\(postId\)/);
 assert.match(app,/navigate\('reels'\)/);
 assert.match(app,/const focusReelId=/);
 assert.match(app,/area\.scrollTop=nodes\.indexOf\(focused\)\*area\.clientHeight/);
 assert.match(app,/patiFeedReelTarget='';/);
});
test('Menu shows one most recent notification and opens full list from Tümü',()=>{
 const source=slice('function patiMenuNotificationsHTML(){','function patiMenuRenderNotifications(){');
 assert.match(source,/notificationVisible\(\)\.slice\(0,1\)/);
 assert.match(source,/data-view="notifications"/);
 assert.match(source,/>Tümü<\/button>/);
 assert.match(css,/#tools-form \.pati-menu-mobile-20261031 \.pati-mobile-menu-item/);
});
test('One visible mobile back button and edge-to-edge chat layout',()=>{
 assert.match(css,/#main-content>\.pati-page-back/);
 assert.match(css,/#main-content \.pati-streaks-back/);
 assert.match(css,/#main-content \.pati-dm-inbox-back/);
 assert.match(css,/#main-content \.pati-profile-back/);
 assert.match(css,/#main-content:has\(\.pati-dm-layout\)/);
});
test('Profile stats white, actions closer with saved button',()=>{
 assert.match(css,/background:#fff!important/);
 assert.match(css,/#main-content \.pati-ig-profile \.pati-profile-insights-preview/);
 assert.match(css,/pati-social-actions>button\.pati-save-action/);
 const card=slice('function postCard(p,priority=false){','function patiDetailCandidates(');
 assert.match(card,/data-action="like"/);
 assert.match(card,/data-action="share-post"/);
 assert.match(card,/data-action="save"/);
});
