const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const switchJs=fs.readFileSync('patiyiz-header-feed-menu-20261031.js','utf8');
const mobileCss=fs.readFileSync('patiyiz-mobile-feed-switch-20261101.css','utf8');

test('Phone header has a real visible toggle and exactly two categories before script execution',()=>{
 const header=html.split('<header class="mobile-header">')[1]?.split('</header>')[0];
 assert.ok(header);
 assert.match(header,/<button type="button" id="pati-feed-menu-trigger"/);
 assert.match(header,/aria-controls="pati-feed-menu"/);
 assert.match(header,/<div id="pati-feed-menu"[^>]*hidden>/);
 assert.equal((header.match(/data-pati-feed-choice=/g)||[]).length,2);
 assert.match(header,/data-pati-feed-choice="media"/);
 assert.match(header,/data-pati-feed-choice="text"/);
 assert.match(mobileCss,/@media\(max-width:360px\)/);
 assert.match(mobileCss,/#pati-feed-menu\[hidden\]/);
 assert.match(mobileCss,/z-index:300!important/);
 const mainStyles=html.indexOf('patiyiz-balance-light-chat-20261031.css');
 const lastMobileStyle=html.indexOf('patiyiz-mobile-feed-switch-20261101.css');
 assert.ok(lastMobileStyle>mainStyles,'Mobile override must be last');
 assert.doesNotThrow(()=>new Function(switchJs));
});

test('Media timeline excludes tweets and questions; text timeline excludes photos and Reels',()=>{
 const start=app.indexOf('/* Separate social media from tweet-like text');
 const end=app.indexOf("\nlet patiFeedReelTarget='';",start);
 assert.ok(start>=0&&end>start);
 const rows=[
  {id:'photo',image_url:'photo.jpg',created_at:'2026-11-01T13:00:00Z'},
  {id:'tweet',body:'Yalnızca yazı',created_at:'2026-11-01T12:00:00Z'},
  {id:'reel',post_format:'reels',video_url:'clip.mp4',created_at:'2026-11-01T11:00:00Z'},
 ];
 const state=vm.runInNewContext(app.slice(start,end)+
  '\n({render:patiHomeCombinedFeed,setMode:mode=>{patiHomeContentMode=mode}})',{
   localStorage:{getItem:()=>null},
   window:{addEventListener(){}},
   data:{questions:[{id:'q',author_id:'other',created_at:'2026-11-01T10:00:00Z'}]},
   patiHomeQuestionsState:{owner:'viewer',rows:[]},
   patiyizLoadedTables:new Set(['posts']),
   blocked:new Set(),me:{id:'viewer'},
   postCard:p=>'<post>'+p.id+'</post>',
   patiHomeQuestionCard:q=>'<question>'+q.id+'</question>',
   empty:message=>'<empty>'+message+'</empty>'
 });
 const media=state.render(rows);
 assert.match(media,/<post>photo<\/post>/);
 assert.match(media,/<post>reel<\/post>/);
 assert.doesNotMatch(media,/<post>tweet<\/post>|<question>/);
 state.setMode('text');
 const text=state.render(rows);
 assert.match(text,/<post>tweet<\/post>/);
 assert.match(text,/<question>q<\/question>/);
 assert.doesNotMatch(text,/<post>photo<\/post>|<post>reel<\/post>/);
 assert.match(app,/localStorage\.getItem\('patiyiz-home-feed-mode'\)/);
 assert.match(switchJs,/localStorage\.setItem\(STORAGE_KEY,mode\)/);
});

test('Native Capacitor staging collects the same mobile JS and final CSS from index',()=>{
 const build=fs.readFileSync('native-capacitor/scripts/build-web.mjs','utf8');
 assert.match(build,/htmlSource\.matchAll/);
 assert.match(build,/if\(\/\^\[a-zA-Z0-9\._-\]\+/);
 assert.match(html,/patiyiz-header-feed-menu-20261031\.js\?v=3-mobile-static/);
 assert.match(html,/patiyiz-mobile-feed-switch-20261101\.css\?v=1-mobile-first/);
});
