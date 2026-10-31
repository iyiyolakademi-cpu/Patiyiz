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

test('Light-only theme removes the dark-mode toggle without affecting video and story features',()=>{
 assert.match(app,/document\.documentElement\.dataset\.patiTheme='light'/);
 assert.doesNotMatch(app,/case 'theme-set':/);
 assert.doesNotMatch(index,/patiyiz-dark-mode-all-screens-20261031\.css\?v=1/);
 assert.match(index,/patiyiz-balance-light-chat-20261031\.css\?v=1/);
 assert.match(app,/pati-reel-video/);
 assert.match(app,/story-big-video/);
 assert.match(app,/pati-social-actions/);
});

test('Final CSS files are both loaded in the correct order, with valid script and bracket syntax',()=>{
 const a=index.indexOf('patiyiz-social-immersive-v2-20261031.css?v=1');
 const b=index.indexOf('patiyiz-reels-compact-controls-20261031.css?v=1');
 const c=index.indexOf('patiyiz-balance-light-chat-20261031.css?v=2-paticoin');
 assert.ok(a>0&&b>a&&c>b);
 new vm.Script(app);
 for(const [name,css] of [['Reels',reel],['Dark',dark]]){
  let depth=0;
  for(const ch of css){if(ch==='{')depth++;if(ch==='}')depth--;assert.ok(depth>=0,name+' unbalanced close');}
  assert.equal(depth,0,name+' unbalanced blocks');
 }
});
