const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const reel=fs.readFileSync('patiyiz-reels-compact-controls-20261031.css','utf8');
const dark=fs.readFileSync('patiyiz-dark-mode-all-screens-20261031.css','utf8');

test('Reels contains five social actions and separate playback utility toolbar',()=>{
 const start=app.indexOf('function reelsPage(){'),end=app.indexOf('function closePatiCreate()',start);
 assert.ok(start>=0&&end>start);
 const source=app.slice(start,end);
 const rail=source.slice(source.indexOf("'<div class=\"pati-reel-rail\""),source.indexOf("'</div><div class=\"pati-reel-utility\""));
 const utility=source.slice(source.indexOf('pati-reel-utility'),source.indexOf('pati-reel-utility')+520);
 assert.match(source,/pati-reel-utility/);
 for(const action of ['like','comment','pati-repost','share-post','save'])assert.ok(rail.includes('data-action="'+action+'"'),action);
 assert.doesNotMatch(rail,/data-action="reel-speed"|data-action="reel-sound"/);
 assert.match(utility,/data-action="reel-speed"/);
 assert.match(utility,/data-action="reel-sound"/);
 assert.match(source,/pati-reel-progress/);
 assert.match(app,/function reelToggleSound\(button\)/);
});

test('Compact Reels layout cannot collide with seek line on supported viewport heights',()=>{
 assert.match(reel,/\.pati-reel-item>\.pati-reel-utility/);
 assert.match(reel,/bottom:max\(60px,calc\(env\(safe-area-inset-bottom,0px\) \+ 51px\)\)/);
 assert.match(reel,/\.pati-reel-progress\{/);
 assert.match(reel,/bottom:max\(12px,env\(safe-area-inset-bottom,0px\)\)/);
 assert.match(reel,/bottom:max\(114px,calc\(env\(safe-area-inset-bottom,0px\) \+ 102px\)\)/);
 assert.match(reel,/@media\(max-height:650px\)/);
 assert.match(reel,/@media\(max-height:480px\)/);
 assert.match(reel,/\[data-action="like"\]/);
 assert.match(reel,/\[data-action="save"\]/);
});

test('Dark mode centralizes theme tokens and covers screenshots and major screens',()=>{
 assert.match(app,/document\.documentElement\.dataset\.patiTheme=value/);
 assert.match(index,/localStorage\.getItem\("patiyiz_theme"\)/);
 assert.match(dark,/html\[data-pati-theme="dark"\]/);
 for(const name of ['pati-ig-profile','pati-ig-summary','pati-profile-coin-balance',
  'pati-feed-card','pati-social-actions','pati-settings-row','pati-mobile-menu-item',
  'pati-alerts','pati-notifications-simple','pati-dm-layout','pati-insights',
  'pati-search-screen','pati-explore-media-screen','pati-community-card',
  'modal-backdrop','pati-share-preview','pati-share-quick','story-viewers-sheet']){
  assert.ok(dark.includes(name),name);
 }
 assert.match(dark,/--pati-social-surface:#1b1d23/);
 assert.match(dark,/--pui-paper:#1b1d23/);
 assert.match(dark,/\.pati-profile-menu-trigger svg/);
});

test('Dark mode retains media, reactions and colored story overlays',()=>{
 assert.match(dark,/filter:none!important;opacity:1!important/);
 assert.match(dark,/pati-reel-video/);
 assert.match(dark,/story-big-photo/);
 assert.match(dark,/story-big-video/);
 assert.match(dark,/\.pati-social-actions>button\.active\[data-action="like"\]/);
 assert.match(dark,/\.pati-social-actions>button\.active\[data-action="save"\]/);
 assert.doesNotMatch(dark,/filter:invert\(/);
 assert.doesNotMatch(dark,/background-color:#1b1d23!important[\s\S]*?\.pati-reel-video\{/);
});

test('Final CSS files are both loaded in the correct order, with valid script and bracket syntax',()=>{
 const a=index.indexOf('patiyiz-social-immersive-v2-20261031.css?v=1');
 const b=index.indexOf('patiyiz-reels-compact-controls-20261031.css?v=1');
 const c=index.indexOf('patiyiz-dark-mode-all-screens-20261031.css?v=1');
 assert.ok(a>0&&b>a&&c>b);
 new vm.Script(app);
 for(const [name,css] of [['Reels',reel],['Dark',dark]]){
  let depth=0;
  for(const ch of css){if(ch==='{')depth++;if(ch==='}')depth--;assert.ok(depth>=0,name+' unbalanced close');}
  assert.equal(depth,0,name+' unbalanced blocks');
 }
});
